/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import { cancelJob, scheduleJob } from "node-schedule";
import { getTimes } from "suncalc";
import { Action } from "./actions/Action";
import { Condition } from "./actions/conditions/Condition";
import { Coordinate } from "./Coordinate";
import { AstroTriggerScheduler } from "./scheduler/AstroTriggerScheduler";
import { TimeTriggerScheduler } from "./scheduler/TimeTriggerScheduler";
import { UniversalTriggerScheduler } from "./scheduler/UniversalTriggerScheduler";
import { Schedule } from "./schedules/Schedule";
import { AstroTriggerSerializer } from "./serialization/AstroTriggerSerializer";
import { ConditionActionSerializer } from "./serialization/ConditionActionSerializer";
import { StringStateAndConstantConditionSerializer } from "./serialization/conditions/StringStateAndConstantConditionSerializer";
import { StringStateAndStateConditionSerializer } from "./serialization/conditions/StringStateAndStateConditionSerializer";
import { OnOffScheduleSerializer } from "./serialization/OnOffScheduleSerializer";
import { OnOffStateActionSerializer } from "./serialization/OnOffStateActionSerializer";
import { TimeTriggerSerializer } from "./serialization/TimeTriggerSerializer";
import { UniversalSerializer } from "./serialization/UniversalSerializer";
import { IoBrokerLoggingService } from "./services/IoBrokerLoggingService";
import { IoBrokerStateService } from "./services/IoBrokerStateService";
import { MessageService } from "./services/MessageService";
import { Trigger } from "./triggers/Trigger";

// Load your modules here, e.g.:
// import * as fs from "fs";

export class TimerSwitch extends utils.Adapter {
    private scheduleIdToSchedule: Map<string, Schedule> = new Map<string, Schedule>();
    private loggingService = new IoBrokerLoggingService(this);
    private stateService = new IoBrokerStateService(this, this.loggingService);
    private coordinate: Coordinate | undefined;
    private messageService: MessageService | undefined;
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "timer-switch",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    public static getEnabledIdFromScheduleId(scheduleId: string): string {
        return scheduleId.replace("data", "enabled");
    }

    public static getScheduleIdFromEnabledId(scheduleId: string): string {
        return scheduleId.replace("enabled", "data");
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        await this.initMessageService();
        await this.fixStateStructure(this.config.schedules);
        const record = await this.getStatesAsync(`timer-switch.${this.instance}.*.data`);
        for (const id in record) {
            const state = record[id];
            this.log.debug(`got state: ${state ? JSON.stringify(state) : "null"} with id: ${id}`);
            if (state) {
                this.log.info("ID: " + id);
                this.onScheduleChange(id, state.val as string);
            } else {
                this.log.error(`Could not retrieve state for ${id}`);
            }
        }
        //this.subscribeStates(`timer-switch.${this.instance}.*`);
        this.subscribeStates(`*`);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        this.log.info("cleaning everything up...");
        for (const id in this.scheduleIdToSchedule.keys()) {
            try {
                this.scheduleIdToSchedule.get(id)?.destroy();
            } catch (e) {
                this.logError(e as Error);
            }
        }
        try {
            this.scheduleIdToSchedule.clear();
        } catch (e) {
            this.logError(e as Error);
        } finally {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state) {
            if (!state.ack) {
                const command = id.split(".").pop();
                if (command === "data") {
                    this.log.debug("is schedule id start");
                    await this.onScheduleChange(id, state.val as string);
                    this.log.debug("is schedule id end");
                } else if (command === "enabled") {
                    this.log.debug("is enabled id start");
                    const dataId = TimerSwitch.getScheduleIdFromEnabledId(id);
                    const scheduleData = (await this.getStateAsync(dataId))?.val;
                    await this.onScheduleChange(dataId, scheduleData as string);
                    this.log.debug("is enabled id end");
                } else if (command === "sendto" && typeof state.val === "string") {
                    this.log.debug("is sendto id");
                    this.setSendTo(state.val);
                }
                this.stateService.setState(id, state.val as string, true);
            }
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     */
    private async onMessage(obj: ioBroker.Message): Promise<void> {
        if (typeof obj === "object" && obj.message) {
            try {
                this.log.info("obj: " + JSON.stringify(obj));
                if (this.messageService) {
                    await this.messageService.handleMessage(obj);
                } else {
                    this.log.error("Message service not initialized");
                }
            } catch (e) {
                this.logError(e as Error);
                this.log.error(`Could not handle message:`);
            }
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Private helper methods
    //------------------------------------------------------------------------------------------------------------------

    private async initMessageService(): Promise<void> {
        this.messageService = new MessageService(
            this.stateService,
            this.loggingService,
            this.scheduleIdToSchedule,
            this.createNewOnOffScheduleSerializer.bind(this),
        );
    }

    private async fixStateStructure(statesInSettings: { onOff: number[] }): Promise<void> {
        if (!statesInSettings) {
            statesInSettings = { onOff: [] };
        }
        if (!statesInSettings.onOff) {
            statesInSettings.onOff = [];
        }
        const prefix = `timer-switch.${this.instance}.`;
        const currentStates = await this.getStatesAsync(`${prefix}*.data`);
        for (const fullId in currentStates) {
            const split = fullId.split(".");
            const type = split[2];
            const id = Number.parseInt(split[3], 10);
            if (type == "onoff") {
                if (statesInSettings.onOff.includes(id)) {
                    statesInSettings.onOff = statesInSettings.onOff.filter((i) => i !== id);
                    this.log.debug("Found state " + fullId);
                } else {
                    this.log.debug("Deleting state " + fullId);
                    await this.deleteOnOffSchedule(id);
                }
            }
        }
        for (const i of statesInSettings.onOff) {
            this.log.debug("Onoff state " + i + " not found, creating");
            await this.createOnOffSchedule(i);
        }
    }

    private async deleteOnOffSchedule(id: number): Promise<void> {
        await this.delObjectAsync(`onoff.${id.toString()}`, { recursive: true });
    }

    private async createOnOffSchedule(id: number): Promise<void> {
        await this.setObjectNotExistsAsync("onoff", {
            type: "channel",
            common: {
                name: "onoff",
                desc: "Created by Adapter",
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`onoff.${id.toString()}`, {
            type: "channel",
            common: {
                name: id.toString(),
                desc: "Created by Adapter",
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`onoff.${id.toString()}.data`, {
            type: "state",
            common: {
                name: "data",
                read: true,
                write: true,
                type: "string",
                role: "json",
                def: `{
                    "type": "OnOffSchedule",
                    "name": "New Schedule",
                    "onAction": {
                        "type":"OnOffStateAction",
                        "valueType":"boolean",
                        "onValue":true,
                        "offValue":false,
                        "booleanValue":true,
                        "idsOfStatesToSet":["default.state"]
                        },
                    "offAction": {
                        "type":"OnOffStateAction",
                        "valueType":"boolean",
                        "onValue":true,
                        "offValue":false,
                        "booleanValue":false,
                        "idsOfStatesToSet":["default.state"]
                    },
                    "triggers":[]
                }`.replace(/\s/g, ""),
                desc: "Contains the schedule data (triggers, etc.)",
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`onoff.${id.toString()}.enabled`, {
            type: "state",
            common: {
                name: "enabled",
                read: true,
                write: true,
                type: "boolean",
                role: "switch",
                def: false,
                desc: "Enables/disables automatic switching for this schedule",
            },
            native: {},
        });
    }

    private async onScheduleChange(id: string, scheduleString: string): Promise<void> {
        this.log.debug("onScheduleChange: " + scheduleString + " " + id);
        if (this.scheduleIdToSchedule.get(id)) {
            this.log.debug("schedule found: " + this.scheduleIdToSchedule.get(id));
        }

        try {
            const schedule = (await this.createNewOnOffScheduleSerializer()).deserialize(scheduleString);
            const enabledState = await this.getStateAsync(TimerSwitch.getEnabledIdFromScheduleId(id));
            if (enabledState) {
                this.scheduleIdToSchedule.get(id)?.destroy();
                schedule.setEnabled(enabledState.val as boolean);
                this.scheduleIdToSchedule.set(id, schedule);
            } else {
                this.log.error(`Could not retrieve state enabled state for ${id}`);
            }
        } catch (e) {
            this.logError(e as Error);
        }
    }

    private async getCoordinate(): Promise<Coordinate> {
        if (this.coordinate) {
            return Promise.resolve(this.coordinate);
        } else {
            return new Promise((resolve, _) => {
                this.getForeignObject("system.config", (error, obj) => {
                    if (obj && obj.common) {
                        const lat = (obj.common as any).latitude;
                        const long = (obj.common as any).longitude;
                        if (lat && long) {
                            this.log.debug(`Got coordinates lat=${lat} long=${long}`);
                            resolve(new Coordinate(lat, long));
                            return;
                        }
                    }
                    this.log.error(
                        "Could not read coordinates from system.config, using Berlins coordinates as fallback",
                    );
                    resolve(new Coordinate(52, 13));
                });
            });
        }
    }

    private logError(error: Error): void {
        this.log.error(error.stack || `${error.name}: ${error.message}`);
    }

    private async createNewOnOffScheduleSerializer(): Promise<OnOffScheduleSerializer> {
        const actionSerializer = new UniversalSerializer<Action>([new OnOffStateActionSerializer(this.stateService)]);
        actionSerializer.useSerializer(
            new ConditionActionSerializer(
                new UniversalSerializer<Condition>([
                    new StringStateAndConstantConditionSerializer(this.stateService),
                    new StringStateAndStateConditionSerializer(this.stateService),
                ]),
                actionSerializer,
                this.loggingService,
            ),
        );
        const triggerSerializer = new UniversalSerializer<Trigger>([
            new TimeTriggerSerializer(actionSerializer),
            new AstroTriggerSerializer(actionSerializer),
        ]);
        return new OnOffScheduleSerializer(
            new UniversalTriggerScheduler([
                new TimeTriggerScheduler(scheduleJob, cancelJob, this.loggingService),
                new AstroTriggerScheduler(
                    new TimeTriggerScheduler(scheduleJob, cancelJob, this.loggingService),
                    getTimes,
                    await this.getCoordinate(),
                    this.loggingService,
                ),
            ]),
            actionSerializer,
            triggerSerializer,
        );
    }

    /**
     * Is called when vis-2 receives a message.
     */
    private async setSendTo(data: string): Promise<void> {
        const send = JSON.parse(data);
        this.log.info(JSON.stringify(send));
        try {
            if (this.messageService) {
                await this.messageService.handleMessage(send);
            } else {
                this.log.error("Message service not initialized");
            }
        } catch (e) {
            this.logError(e as Error);
            this.log.error(`Could not handle message:`);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new TimerSwitch(options);
} else {
    // otherwise start the instance directly
    (() => new TimerSwitch())();
}
