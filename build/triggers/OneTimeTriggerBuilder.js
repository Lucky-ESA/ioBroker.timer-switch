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
var OneTimeTriggerBuilder_exports = {};
__export(OneTimeTriggerBuilder_exports, {
  OneTimeTriggerBuilder: () => OneTimeTriggerBuilder
});
module.exports = __toCommonJS(OneTimeTriggerBuilder_exports);
var import_OneTimeTrigger = require("./OneTimeTrigger");
class OneTimeTriggerBuilder {
  action = null;
  id = "0";
  date = null;
  onDestroy = null;
  setAction(action) {
    this.action = action;
    return this;
  }
  setId(id) {
    this.id = id;
    return this;
  }
  setDate(date) {
    this.date = date;
    return this;
  }
  setOnDestroy(onDestroy) {
    this.onDestroy = onDestroy;
    return this;
  }
  build() {
    return new import_OneTimeTrigger.OneTimeTrigger(this.id, this.action, this.date, this.onDestroy);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OneTimeTriggerBuilder
});
//# sourceMappingURL=OneTimeTriggerBuilder.js.map
