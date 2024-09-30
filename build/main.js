"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var main_exports = {};
__export(main_exports, {
  TimerSwitch: () => TimerSwitch
});
module.exports = __toCommonJS(main_exports);
var utils = __toESM(require("@iobroker/adapter-core"));
var import_node_schedule = require("node-schedule");
var import_suncalc = require("suncalc");
var import_Coordinate = require("./Coordinate");
var import_AstroTriggerScheduler = require("./scheduler/AstroTriggerScheduler");
var import_OneTimeTriggerScheduler = require("./scheduler/OneTimeTriggerScheduler");
var import_TimeTriggerScheduler = require("./scheduler/TimeTriggerScheduler");
var import_UniversalTriggerScheduler = require("./scheduler/UniversalTriggerScheduler");
var import_AstroTriggerSerializer = require("./serialization/AstroTriggerSerializer");
var import_ConditionActionSerializer = require("./serialization/ConditionActionSerializer");
var import_StringStateAndConstantConditionSerializer = require("./serialization/conditions/StringStateAndConstantConditionSerializer");
var import_StringStateAndStateConditionSerializer = require("./serialization/conditions/StringStateAndStateConditionSerializer");
var import_OneTimeTriggerSerializer = require("./serialization/OneTimeTriggerSerializer");
var import_OnOffScheduleSerializer = require("./serialization/OnOffScheduleSerializer");
var import_OnOffStateActionSerializer = require("./serialization/OnOffStateActionSerializer");
var import_TimeTriggerSerializer = require("./serialization/TimeTriggerSerializer");
var import_UniversalSerializer = require("./serialization/UniversalSerializer");
var import_IoBrokerLoggingService = require("./services/IoBrokerLoggingService");
var import_IoBrokerStateService = require("./services/IoBrokerStateService");
var import_MessageService = require("./services/MessageService");
class TimerSwitch extends utils.Adapter {
  scheduleIdToSchedule = /* @__PURE__ */ new Map();
  loggingService = new import_IoBrokerLoggingService.IoBrokerLoggingService(this);
  stateService = new import_IoBrokerStateService.IoBrokerStateService(this, this.loggingService);
  coordinate;
  messageService;
  constructor(options = {}) {
    super({
      ...options,
      name: "timer-switch"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  static getEnabledIdFromScheduleId(scheduleId) {
    return scheduleId.replace("data", "enabled");
  }
  static getScheduleIdFromEnabledId(scheduleId) {
    return scheduleId.replace("enabled", "data");
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    await this.initMessageService();
    await this.fixStateStructure(this.config.schedules);
    const record = await this.getStatesAsync(`timer-switch.${this.instance}.*.data`);
    for (const id in record) {
      const state = record[id];
      this.log.debug(`got state: ${state ? JSON.stringify(state) : "null"} with id: ${id}`);
      if (state) {
        this.log.info("ID: " + id);
        this.onScheduleChange(id, state.val);
      } else {
        this.log.error(`Could not retrieve state for ${id}`);
      }
    }
    this.subscribeStates(`*`);
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  onUnload(callback) {
    var _a;
    this.log.info("cleaning everything up...");
    for (const id in this.scheduleIdToSchedule.keys()) {
      try {
        (_a = this.scheduleIdToSchedule.get(id)) == null ? void 0 : _a.destroy();
      } catch (e) {
        this.logError(e);
      }
    }
    try {
      this.scheduleIdToSchedule.clear();
    } catch (e) {
      this.logError(e);
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
  async onStateChange(id, state) {
    var _a;
    if (state) {
      if (!state.ack) {
        const command = id.split(".").pop();
        if (command === "data") {
          this.log.debug("is schedule id start");
          await this.onScheduleChange(id, state.val);
          this.log.debug("is schedule id end");
        } else if (command === "enabled") {
          this.log.debug("is enabled id start");
          const dataId = TimerSwitch.getScheduleIdFromEnabledId(id);
          const scheduleData = (_a = await this.getStateAsync(dataId)) == null ? void 0 : _a.val;
          await this.onScheduleChange(dataId, scheduleData);
          this.log.debug("is enabled id end");
        } else if (command === "sendto" && typeof state.val === "string") {
          this.log.debug("is sendto id");
          this.setSendTo(state.val);
        }
        this.stateService.setState(id, state.val, true);
      }
    }
  }
  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  /**
   * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
   * Using this method requires "common.messagebox" property to be set to true in io-package.json
   */
  async onMessage(obj) {
    if (typeof obj === "object" && obj.message) {
      try {
        this.log.debug("obj: " + JSON.stringify(obj));
        if (this.messageService) {
          await this.messageService.handleMessage(obj);
        } else {
          this.log.error("Message service not initialized");
        }
      } catch (e) {
        this.logError(e);
        this.log.error(`Could not handle message:`);
      }
    }
  }
  //------------------------------------------------------------------------------------------------------------------
  // Private helper methods
  //------------------------------------------------------------------------------------------------------------------
  async initMessageService() {
    this.messageService = new import_MessageService.MessageService(
      this.stateService,
      this.loggingService,
      this.scheduleIdToSchedule,
      this.createNewOnOffScheduleSerializer.bind(this),
      this
    );
  }
  async fixStateStructure(statesInSettings) {
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
  async deleteOnOffSchedule(id) {
    await this.delObjectAsync(`onoff.${id.toString()}`, { recursive: true });
  }
  async createOnOffSchedule(id) {
    await this.setObjectNotExistsAsync("onoff", {
      type: "channel",
      common: {
        name: "onoff",
        desc: "Created by Adapter"
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`onoff.${id.toString()}`, {
      type: "channel",
      common: {
        name: id.toString(),
        desc: "Created by Adapter"
      },
      native: {}
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
        desc: "Contains the schedule data (triggers, etc.)"
      },
      native: {}
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
        desc: "Enables/disables automatic switching for this schedule"
      },
      native: {}
    });
  }
  async onScheduleChange(id, scheduleString) {
    var _a;
    this.log.debug("onScheduleChange: " + scheduleString + " " + id);
    if (this.scheduleIdToSchedule.get(id)) {
      this.log.debug("schedule found: " + this.scheduleIdToSchedule.get(id));
    }
    try {
      const schedule = (await this.createNewOnOffScheduleSerializer(id)).deserialize(scheduleString);
      const enabledState = await this.getStateAsync(TimerSwitch.getEnabledIdFromScheduleId(id));
      if (enabledState) {
        (_a = this.scheduleIdToSchedule.get(id)) == null ? void 0 : _a.destroy();
        schedule.setEnabled(enabledState.val);
        this.scheduleIdToSchedule.set(id, schedule);
      } else {
        this.log.error(`Could not retrieve state enabled state for ${id}`);
      }
    } catch (e) {
      this.logError(e);
    }
  }
  async getCoordinate() {
    if (this.coordinate) {
      return Promise.resolve(this.coordinate);
    } else {
      return new Promise((resolve, _) => {
        this.getForeignObject("system.config", (error, obj) => {
          if (obj && obj.common) {
            const lat = obj.common.latitude;
            const long = obj.common.longitude;
            if (lat && long) {
              this.log.debug(`Got coordinates lat=${lat} long=${long}`);
              resolve(new import_Coordinate.Coordinate(lat, long));
              return;
            }
          }
          this.log.error(
            "Could not read coordinates from system.config, using Berlins coordinates as fallback"
          );
          resolve(new import_Coordinate.Coordinate(52, 13));
        });
      });
    }
  }
  logError(error) {
    this.log.error(error.stack || `${error.name}: ${error.message}`);
  }
  async createNewOnOffScheduleSerializer(dataId) {
    const actionSerializer = new import_UniversalSerializer.UniversalSerializer([new import_OnOffStateActionSerializer.OnOffStateActionSerializer(this.stateService)]);
    actionSerializer.useSerializer(
      new import_ConditionActionSerializer.ConditionActionSerializer(
        new import_UniversalSerializer.UniversalSerializer([
          new import_StringStateAndConstantConditionSerializer.StringStateAndConstantConditionSerializer(this.stateService),
          new import_StringStateAndStateConditionSerializer.StringStateAndStateConditionSerializer(this.stateService)
        ]),
        actionSerializer,
        this.loggingService
      )
    );
    const triggerSerializer = new import_UniversalSerializer.UniversalSerializer([
      new import_TimeTriggerSerializer.TimeTriggerSerializer(actionSerializer),
      new import_AstroTriggerSerializer.AstroTriggerSerializer(actionSerializer),
      new import_OneTimeTriggerSerializer.OneTimeTriggerSerializer(actionSerializer, (triggerId) => {
        var _a;
        (_a = this.messageService) == null ? void 0 : _a.handleMessage({
          message: {
            dataId,
            triggerId
          },
          command: "delete-trigger",
          from: "timer-switch.0"
        });
      })
    ]);
    return new import_OnOffScheduleSerializer.OnOffScheduleSerializer(
      new import_UniversalTriggerScheduler.UniversalTriggerScheduler([
        new import_TimeTriggerScheduler.TimeTriggerScheduler(import_node_schedule.scheduleJob, import_node_schedule.cancelJob, this.loggingService),
        new import_AstroTriggerScheduler.AstroTriggerScheduler(
          new import_TimeTriggerScheduler.TimeTriggerScheduler(import_node_schedule.scheduleJob, import_node_schedule.cancelJob, this.loggingService),
          import_suncalc.getTimes,
          await this.getCoordinate(),
          this.loggingService
        ),
        new import_OneTimeTriggerScheduler.OneTimeTriggerScheduler(import_node_schedule.scheduleJob, import_node_schedule.cancelJob, this.loggingService, this)
      ]),
      actionSerializer,
      triggerSerializer
    );
  }
  /**
   * Is called when vis-2 receives a message.
   */
  async setSendTo(data) {
    const send = JSON.parse(data);
    this.log.debug(JSON.stringify(send));
    try {
      if (this.messageService) {
        await this.messageService.handleMessage(send);
      } else {
        this.log.error("Message service not initialized");
      }
    } catch (e) {
      this.logError(e);
      this.log.error(`Could not handle message:`);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new TimerSwitch(options);
} else {
  (() => new TimerSwitch())();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TimerSwitch
});
//# sourceMappingURL=main.js.map
