"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var MessageService_exports = {};
__export(MessageService_exports, {
  MessageService: () => MessageService
});
module.exports = __toCommonJS(MessageService_exports);
var import_main = require("../main");
var import_OnOffSchedule = require("../schedules/OnOffSchedule");
var import_AstroTime = require("../triggers/AstroTime");
var import_AstroTriggerBuilder = require("../triggers/AstroTriggerBuilder");
var import_TimeTriggerBuilder = require("../triggers/TimeTriggerBuilder");
var import_Weekday = require("../triggers/Weekday");
class MessageService {
  constructor(stateService, logger, scheduleIdToSchedule, createOnOffScheduleSerializer) {
    this.stateService = stateService;
    this.logger = logger;
    this.scheduleIdToSchedule = scheduleIdToSchedule;
    this.createOnOffScheduleSerializer = createOnOffScheduleSerializer;
  }
  currentMessage = null;
  async handleMessage(message) {
    if (this.currentMessage) {
      setTimeout(() => this.handleMessage(message), 50);
      return;
    }
    this.currentMessage = message;
    const data = message.message;
    this.logger.logDebug(`Received ${message.command}`);
    this.logger.logDebug(JSON.stringify(message.message));
    const schedule = this.scheduleIdToSchedule.get(data.dataId);
    if (!schedule) {
      throw new Error("No schedule found for state " + data.dataId);
    }
    switch (message.command) {
      case "add-trigger":
        await this.addTrigger(schedule, data);
        break;
      case "update-trigger":
        await this.updateTrigger(schedule, JSON.stringify(data.trigger), data.dataId);
        break;
      case "delete-trigger":
        schedule.removeTrigger(data.triggerId);
        break;
      case "change-name":
        schedule.setName(data.name);
        break;
      case "enable-schedule":
        schedule.setEnabled(true);
        await this.stateService.setState(import_main.TimerSwitch.getEnabledIdFromScheduleId(data.dataId), true);
        break;
      case "disable-schedule":
        schedule.setEnabled(false);
        await this.stateService.setState(import_main.TimerSwitch.getEnabledIdFromScheduleId(data.dataId), false);
        break;
      case "change-switched-values":
        this.changeOnOffSchedulesSwitchedValues(schedule, data);
        break;
      case "change-switched-ids":
        this.changeOnOffSchedulesSwitchedIds(schedule, data.stateIds);
        break;
      default:
        throw new Error("Unknown command received");
    }
    if (schedule instanceof import_OnOffSchedule.OnOffSchedule) {
      await this.stateService.setState(
        data.dataId,
        (await this.createOnOffScheduleSerializer(data.dataId)).serialize(schedule)
      );
    } else {
      throw new Error("Cannot update schedule state after message, no serializer found for schedule");
    }
    this.logger.logDebug("Finished message " + message.command);
    this.currentMessage = null;
  }
  addTrigger(schedule, data) {
    let triggerBuilder;
    if (data.triggerType === "TimeTrigger") {
      this.logger.logDebug("Wants TimeTrigger");
      triggerBuilder = new import_TimeTriggerBuilder.TimeTriggerBuilder().setHour(0).setMinute(0);
    } else if (data.triggerType === "AstroTrigger") {
      this.logger.logDebug("Wants AstroTrigger");
      triggerBuilder = new import_AstroTriggerBuilder.AstroTriggerBuilder().setAstroTime(import_AstroTime.AstroTime.Sunrise).setShift(0);
    } else {
      throw new Error(`Cannot add trigger of type ${data.triggerType}`);
    }
    triggerBuilder.setWeekdays(import_Weekday.AllWeekdays).setId(this.getNextTriggerId(schedule.getTriggers()));
    if (data.actionType === "OnOffStateAction" && schedule instanceof import_OnOffSchedule.OnOffSchedule) {
      this.logger.logDebug("Wants OnOffStateAction");
      triggerBuilder.setAction(schedule.getOnAction());
    } else {
      throw new Error(`Cannot add trigger with action of type ${data.actionType}`);
    }
    schedule.addTrigger(triggerBuilder.build());
  }
  async addOneTimeTrigger(schedule, data) {
    const t = JSON.parse(data.trigger);
    t.id = this.getNextTriggerId(schedule.getTriggers());
    const trigger = (await this.createOnOffScheduleSerializer(data.dataId)).getTriggerSerializer(schedule).deserialize(JSON.stringify(t));
    schedule.addTrigger(trigger);
  }
  async updateTrigger(schedule, triggerString, dataId) {
    let updated;
    if (schedule instanceof import_OnOffSchedule.OnOffSchedule) {
      updated = (await this.createOnOffScheduleSerializer(dataId)).getTriggerSerializer(schedule).deserialize(triggerString);
    } else {
      throw new Error(`Can not deserialize trigger for schedule of type ${typeof schedule}`);
    }
    schedule.updateTrigger(updated);
  }
  changeOnOffSchedulesSwitchedValues(schedule, data) {
    if (!(schedule instanceof import_OnOffSchedule.OnOffSchedule)) {
      throw new Error("Cannot change switched values when schedule type is not OnOffSchedule");
    }
    schedule.setOnAction(this.changeSwitchedValueOfOnOffScheduleAction(schedule.getOnAction(), data));
    schedule.setOffAction(this.changeSwitchedValueOfOnOffScheduleAction(schedule.getOffAction(), data));
  }
  changeOnOffSchedulesSwitchedIds(schedule, stateIds) {
    if (!(schedule instanceof import_OnOffSchedule.OnOffSchedule)) {
      throw new Error("Cannot change switched ids when schedule type is not OnOffSchedule");
    }
    schedule.getOnAction().setIdsOfStatesToSet(stateIds);
    schedule.getOffAction().setIdsOfStatesToSet(stateIds);
  }
  changeSwitchedValueOfOnOffScheduleAction(action, data) {
    switch (data.valueType) {
      case "boolean":
        return action.toBooleanValueType();
        break;
      case "number":
        return action.toNumberValueType(data.onValue, data.offValue);
        break;
      case "string":
        return action.toStringValueType(data.onValue, data.offValue);
        break;
      default:
        throw new Error(`Value Type ${data.valueType} not supported`);
    }
  }
  getNextTriggerId(current) {
    const numbers = current.map((t) => t.getId()).map((id) => Number.parseInt(id, 10)).filter((id) => !Number.isNaN(id)).sort((a, b) => a - b);
    let newId = 0;
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] > newId) {
        break;
      } else {
        newId++;
      }
    }
    return newId.toString();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MessageService
});
//# sourceMappingURL=MessageService.js.map
