import { GetTimesResult } from "suncalc";
import { Coordinate } from "../Coordinate";
import { LoggingService } from "../services/LoggingService";
import { AstroTrigger } from "../triggers/AstroTrigger";
import { TimeTrigger } from "../triggers/TimeTrigger";
import { TimeTriggerBuilder } from "../triggers/TimeTriggerBuilder";
import { AllWeekdays } from "../triggers/Weekday";
import { TimeTriggerScheduler } from "./TimeTriggerScheduler";
import { TriggerScheduler } from "./TriggerScheduler";

export class AstroTriggerScheduler extends TriggerScheduler {
    private registered: AstroTrigger[] = [];
    private scheduled: [string, TimeTrigger][] = [];
    private readonly rescheduleTrigger = new TimeTriggerBuilder()
        .setId(`AstroTriggerScheduler-Rescheduler`)
        .setWeekdays(AllWeekdays)
        .setHour(2)
        .setMinute(0)
        .setAction({
            execute: () => {
                this.logger.logDebug(`Rescheduling astro triggers`);
                this.scheduled.forEach((s) => this.timeTriggerScheduler.unregister(s[1]));
                this.registered.forEach((r) => this.tryScheduleTriggerToday(r));
            },
        })
        .build();

    constructor(
        private readonly timeTriggerScheduler: TimeTriggerScheduler,
        private readonly getTimes: (date: Date, latitude: number, longitude: number) => GetTimesResult,
        private readonly coordinate: Coordinate,
        private readonly logger: LoggingService,
    ) {
        super();
        this.timeTriggerScheduler.register(this.rescheduleTrigger);
    }

    public register(trigger: AstroTrigger): void {
        this.logger.logDebug(`Register trigger ${trigger}`);
        if (this.isRegistered(trigger)) {
            throw new Error(`Trigger ${trigger} is already registered.`);
        }
        this.registered.push(trigger);
        this.tryScheduleTriggerToday(trigger);
    }

    public unregister(trigger: AstroTrigger): void {
        this.logger.logDebug(`Unregister trigger ${trigger}`);
        if (this.isRegistered(trigger)) {
            this.registered = this.registered.filter((t) => t.getId() !== trigger.getId());
            if (this.isScheduledToday(trigger)) {
                this.scheduled = this.scheduled.filter((s) => {
                    if (s[0] === trigger.getId()) {
                        this.timeTriggerScheduler.unregister(s[1]);
                        return false;
                    }
                    return true;
                });
            }
        } else {
            throw new Error(`Trigger ${trigger} is not registered.`);
        }
    }

    public destroy(): void {
        this.timeTriggerScheduler.destroy();
        this.registered = [];
        this.scheduled = [];
    }

    public forType(): string {
        return AstroTrigger.prototype.constructor.name;
    }

    private tryScheduleTriggerToday(trigger: AstroTrigger): void {
        const now = new Date();
        const next = this.nextDate(trigger);
        this.logger.logDebug(`Trying to schedule ${trigger} at ${next} (now is ${now}, day ${now.getDay()})`);
        if (next >= now && trigger.getWeekdays().includes(now.getDay())) {
            const timeTrigger = new TimeTriggerBuilder()
                .setId(`TimeTriggerForAstroTrigger:${trigger.getId()}`)
                .setHour(next.getHours())
                .setMinute(next.getMinutes())
                .setWeekdays([next.getDay()])
                .setAction({
                    execute: () => {
                        this.logger.logDebug(`Executing trigger ${trigger}`);
                        trigger.getAction().execute();
                    },
                })
                .build();
            this.logger.logDebug(`Scheduled with ${timeTrigger}`);
            this.timeTriggerScheduler.register(timeTrigger);
            this.scheduled.push([trigger.getId(), timeTrigger]);
        } else {
            this.logger.logDebug(`Didn't schedule`);
        }
    }

    private isRegistered(trigger: AstroTrigger): boolean {
        return this.registered.find((r) => r.getId() === trigger.getId()) != undefined;
    }

    private isScheduledToday(trigger: AstroTrigger): boolean {
        return this.scheduled.find((s) => s[0] === trigger.getId()) != undefined;
    }

    private nextDate(trigger: AstroTrigger): Date {
        const next = this.getTimes(new Date(), this.coordinate.getLatitude(), this.coordinate.getLongitude())[
            trigger.getAstroTime()
        ];
        next.setMinutes(next.getMinutes() + trigger.getShiftInMinutes());
        return next;
    }
}
