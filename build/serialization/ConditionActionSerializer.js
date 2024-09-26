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
var ConditionActionSerializer_exports = {};
__export(ConditionActionSerializer_exports, {
  ConditionActionSerializer: () => ConditionActionSerializer
});
module.exports = __toCommonJS(ConditionActionSerializer_exports);
var import_ConditionAction = require("../actions/ConditionAction");
class ConditionActionSerializer {
  constructor(conditionSerializer, actionSerializer, logger) {
    this.conditionSerializer = conditionSerializer;
    this.actionSerializer = actionSerializer;
    this.logger = logger;
  }
  deserialize(stringToDeserialize) {
    const json = JSON.parse(stringToDeserialize);
    if (json.type !== this.getType()) {
      throw new Error(`Can not deserialize object of type ${json.type}`);
    }
    return new import_ConditionAction.ConditionAction(
      this.conditionSerializer.deserialize(JSON.stringify(json.condition)),
      this.actionSerializer.deserialize(JSON.stringify(json.action)),
      this.logger
    );
  }
  serialize(objectToSerialize) {
    if (objectToSerialize == null) {
      throw new Error("objectToSerialize may not be null or undefined.");
    }
    if (objectToSerialize instanceof import_ConditionAction.ConditionAction) {
      return JSON.stringify({
        type: this.getType(),
        condition: JSON.parse(this.conditionSerializer.serialize(objectToSerialize.getCondition())),
        action: JSON.parse(this.actionSerializer.serialize(objectToSerialize.getAction()))
      });
    } else {
      throw new Error("objectToSerialize must be of type ConditionAction.");
    }
  }
  getType() {
    return import_ConditionAction.ConditionAction.prototype.constructor.name;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConditionActionSerializer
});
//# sourceMappingURL=ConditionActionSerializer.js.map
