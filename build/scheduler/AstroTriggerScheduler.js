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
var AstroTriggerScheduler_exports = {};
__export(AstroTriggerScheduler_exports, {
  AstroTriggerScheduler: () => AstroTriggerScheduler
});
module.exports = __toCommonJS(AstroTriggerScheduler_exports);
var import_AstroTrigger = require("../triggers/AstroTrigger");
var import_TimeTriggerBuilder = require("../triggers/TimeTriggerBuilder");
var import_Weekday = require("../triggers/Weekday");
var import_TriggerScheduler = require("./TriggerScheduler");
class AstroTriggerScheduler extends import_TriggerScheduler.TriggerScheduler {
  constructor(timeTriggerScheduler, getTimes, coordinate, logger) {
    super();
    this.timeTriggerScheduler = timeTriggerScheduler;
    this.getTimes = getTimes;
    this.coordinate = coordinate;
    this.logger = logger;
    this.timeTriggerScheduler.register(this.rescheduleTrigger);
  }
  registered = [];
  scheduled = [];
  rescheduleTrigger = new import_TimeTriggerBuilder.TimeTriggerBuilder().setId(`AstroTriggerScheduler-Rescheduler`).setWeekdays(import_Weekday.AllWeekdays).setHour(2).setMinute(0).setAction({
    execute: () => {
      this.logger.logDebug(`Rescheduling astro triggers`);
      this.scheduled.forEach((s) => this.timeTriggerScheduler.unregister(s[1]));
      this.registered.forEach((r) => this.tryScheduleTriggerToday(r));
    }
  }).build();
  register(trigger) {
    this.logger.logDebug(`Register trigger ${trigger}`);
    if (this.isRegistered(trigger)) {
      throw new Error(`Trigger ${trigger} is already registered.`);
    }
    this.registered.push(trigger);
    this.tryScheduleTriggerToday(trigger);
  }
  unregister(trigger) {
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
  destroy() {
    this.timeTriggerScheduler.destroy();
    this.registered = [];
    this.scheduled = [];
  }
  forType() {
    return import_AstroTrigger.AstroTrigger.prototype.constructor.name;
  }
  tryScheduleTriggerToday(trigger) {
    const now = /* @__PURE__ */ new Date();
    const next = this.nextDate(trigger);
    this.logger.logDebug(`Trying to schedule ${trigger} at ${next} (now is ${now}, day ${now.getDay()})`);
    if (next >= now && trigger.getWeekdays().includes(now.getDay())) {
      const timeTrigger = new import_TimeTriggerBuilder.TimeTriggerBuilder().setId(`TimeTriggerForAstroTrigger:${trigger.getId()}`).setHour(next.getHours()).setMinute(next.getMinutes()).setWeekdays([next.getDay()]).setAction({
        execute: () => {
          this.logger.logDebug(`Executing trigger ${trigger}`);
          trigger.getAction().execute();
        }
      }).build();
      this.logger.logDebug(`Scheduled with ${timeTrigger}`);
      this.timeTriggerScheduler.register(timeTrigger);
      this.scheduled.push([trigger.getId(), timeTrigger]);
    } else {
      this.logger.logDebug(`Didn't schedule`);
    }
  }
  isRegistered(trigger) {
    return this.registered.find((r) => r.getId() === trigger.getId()) != void 0;
  }
  isScheduledToday(trigger) {
    return this.scheduled.find((s) => s[0] === trigger.getId()) != void 0;
  }
  nextDate(trigger) {
    const next = this.getTimes(/* @__PURE__ */ new Date(), this.coordinate.getLatitude(), this.coordinate.getLongitude())[trigger.getAstroTime()];
    next.setMinutes(next.getMinutes() + trigger.getShiftInMinutes());
    return next;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AstroTriggerScheduler
});
//# sourceMappingURL=AstroTriggerScheduler.js.map
