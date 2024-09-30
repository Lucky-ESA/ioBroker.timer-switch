/*
	ioBroker.vis timer-switch Widget-Set

	version: "2.3.0-pre.1"

	Copyright 2019-2020 walli545 walli5446@gmail.com
*/
"use strict";

// add translations for edit mode
const iobSystemDic = systemDictionary;
let timeSwitchDic;
$.get("../timer-switch.admin/words.js", function (script) {
    let translation = script.substring(script.indexOf("{"), script.length);
    translation = translation.substring(0, translation.lastIndexOf(";"));
    try {
        console.log("translation: " + translation);
        timeSwitchDic = JSON.parse(translation);
        $.extend(systemDictionary, iobSystemDic);
        $.extend(systemDictionary, timeSwitchDic);
    } catch (e) {
        console.log(`Translate error: ${e}`);
    }
});

// export vis binds for widget
vis.binds["timer-switch"] = {
    version: "2.3.0-pre.1",
    showVersion: showVersion,
    createOnOffWidget: createOnOffWidget,
    onOffScheduleWidgets: {},
    getConditionStateIdsAndAlias: getConditionStateIdsAndAlias,
    getElementNameForTriggerType: getElementNameForTriggerType,
    getElementNameForActionType: getElementNameForActionType,
    sendMessage: sendMessage,
    translate: translate,
    addConditionToAction: addConditionToAction,
};
vis.binds["timer-switch"].showVersion();

function showVersion() {
    if (vis.binds["timer-switch"].version) {
        console.log("Version timer-switch: " + vis.binds["timer-switch"].version);
    }
}

function sendMessage(cmd, data) {
    console.log("cmd: " + cmd);
    console.log("cmddata: " + JSON.stringify(data));
    const sendto = {
        command: cmd,
        message: data,
    };
    console.log("cmdsend: " + JSON.stringify(sendto));
    //vis.setValue('timer-switch.0.sendto', JSON.stringify(sendto), false);
    try {
        servConn._socket.emit("sendTo", "timer-switch", cmd, data);
    } catch (e) {
        vis.conn.setState("timer-switch.0.sendto", { val: JSON.stringify(sendto), ack: false });
    }
}

function translate(word) {
    return translateWord(word, systemLang, timeSwitchDic);
}

function createOnOffWidget(widgetId, view, data, style) {
    console.debug(`Create on/off widget ${widgetId}`);
    console.log(data);
    const widgetElement = document.querySelector(`#${widgetId}`);
    if (!widgetElement) {
        console.warn("Widget not found, waiting ...");
        return setTimeout(function () {
            vis.binds["timer-switch"].createOnOffWidget(widgetId, view, data, style);
        }, 100);
    }

    if (!validateOnOffWidgetSettings(widgetElement, data)) {
        return;
    }
    console.debug(`validateOnOffWidgetSettings`);
    console.info("data.newOn: " + data.newOn);
    if (data.newOn != "") {
        console.info("data.newOn1: " + data.newOn);
        if (timeSwitchDic && timeSwitchDic.on && timeSwitchDic.on[systemLang]) {
            console.info("data.newOn2: " + data.newOn);
            timeSwitchDic.on[systemLang] = data.newOn;
        }
    }
    if (data.newOff != "") {
        if (timeSwitchDic && timeSwitchDic.off && timeSwitchDic.off[systemLang]) {
            timeSwitchDic.off[systemLang] = data.newOff;
        }
    }
    if (data.newAllOn != "") {
        if (timeSwitchDic && timeSwitchDic.allOn && timeSwitchDic.allOn[systemLang]) {
            timeSwitchDic.allOn[systemLang] = data.newAllOn;
        }
    }
    if (data.newAllOff != "") {
        if (timeSwitchDic && timeSwitchDic.allOff && timeSwitchDic.allOff[systemLang]) {
            timeSwitchDic.allOff[systemLang] = data.newAllOff;
        }
    }
    const element = document.createElement("app-on-off-schedules-widget");
    element.setAttribute("widgetid", widgetId);
    element.style.setProperty("--ts-widget-astro-icon-display", data.useAstroIcons ? "inline" : "none");
    element.style.setProperty("--ts-widget-astro-text-display", data.useAstroIcons ? "none" : "inline");
    if (data.widthActionValue != "") {
        element.style.setProperty("--ts-widget-state-action-width", data.widthActionValue);
    }
    if (data.useCSS) {
        element.style.setProperty("--ts-widget-bg-color", data.bgwidget ? data.bgwidget : "#424242");
        element.style.setProperty("--ts-widget-fg-color", data.bgwidgetFont ? data.bgwidgetFont : "white");
        element.style.setProperty("--ts-widget-trigger-bg-color", data.bgTriggerView ? data.bgTriggerView : "#272727");
        element.style.setProperty(
            "--ts-widget-add-trigger-dropdown-bg-color",
            data.bgTrigger ? data.bgTrigger : "#f1f1f1",
        );
        element.style.setProperty("--ts-widget-primary-color", data.bgOn ? data.bgOn : "#337ab7");
        element.style.setProperty("--ts-widget-primary-color-container", data.bgOnCo ? data.bgOnCo : "#2f2f2f");
        element.style.setProperty("--ts-widget-off-color", data.bgOff ? data.bgOff : "#c0c0c0");
        element.style.setProperty("--ts-widget-off-color-container", data.bgOffCo ? data.bgOffCo : "#808080");
        element.style.setProperty(
            "--ts-widget-add-trigger-dropdown-fg-color",
            data.bgTriggerFont ? data.bgTriggerFont : "black",
        );
        element.style.setProperty(
            "--ts-widget-add-trigger-dropdown-hover-bg-color",
            data.bgTriggerHover ? data.bgTriggerHover : "#ddd)",
        );
        element.style.setProperty("--ts-widget-oid-fg-color", data.fcSwitched ? data.fcSwitched : "#a5a5a5");
        element.style.setProperty("--ts-widget-btn-fg-color", data.fcbutton ? data.fcbutton : "white");
        element.style.setProperty(
            "--ts-widget-weekdays-disabled-fg-color",
            data.fcdisweekday ? data.fcdisweekday : "#5D5D5D",
        );
        element.style.setProperty(
            "--ts-widget-weekdays-enabled-fg-color",
            data.fcAcWeekday ? data.fcAcWeekday : "white",
        );
        element.style.setProperty("--ts-widget-name-fg-color", data.fcName ? data.fcName : "");
        element.style.setProperty("--ts-widget-switched-time-fg-color", data.fcTime ? data.fcTime : "white");
        element.style.setProperty("--ts-widget-switched-value-fg-color", data.fcSwitch ? data.fcSwitch : "");
        element.style.setProperty("--ts-widget-astro-time-fg-color", data.fcAstro ? data.fcAstro : "black");
        element.style.setProperty(
            "--ts-widget-astro-shift-fg-color",
            data.fcAstroShift ? data.fcAstroShift : "#5d5d5d",
        );
        element.style.setProperty("--ts-widget-condition-fg-color", data.fcCondition ? data.fcCondition : "white");
        //element.style.setProperty("--ts-widget-font-family", data.fFamily ? data.fFamily : "'Roboto', 'Segoe UI', BlinkMacSystemFont, system-ui, -apple-system");
        element.style.setProperty("--ts-widget-name-font-size", data.fsName ? data.fsName : "2em");
        element.style.setProperty("--ts-widget-oid-font-size", data.fsSwitched ? data.fsSwitched : "15px");
        element.style.setProperty(
            "--ts-widget-edit-name-button-display",
            data.fDisplayEdit ? data.fDisplayEdit : "block",
        );
        element.style.setProperty(
            "-ts-widget-condition-display",
            data.fDisplayCondition ? data.fDisplayCondition : "block",
        );
        element.style.setProperty(
            "--ts-widget-img-btn-filter",
            data.fIconFilter != null ? `invert(${data.fIconFilter})` : "invert(1)",
        );
        element.style.setProperty("--ts-widget-weekdays-font-size", data.fsWeekdays ? data.fsWeekdays : "23px");
        element.style.setProperty(
            "--ts-widget-switched-value-font-size",
            data.fsSwitchedValue ? data.fsSwitchedValue : "2em",
        );
        element.style.setProperty(
            "--ts-widget-switched-time-font-size",
            data.fsSwitchedTime ? data.fsSwitchedTime : "2em",
        );
        element.style.setProperty(
            "--ts-widget-astro-time-font-size",
            data.fsSwitchedAstro ? data.fsSwitchedAstro : "1.5em",
        );
        element.style.setProperty(
            "--ts-widget-astro-shift-font-size",
            data.fsSwitchedAstroShift ? data.fsSwitchedAstroShift : "1em",
        );
        element.style.setProperty("--ts-widget-condition-font-size", data.fsCondition ? data.fsCondition : "1em");
    }
    widgetElement.appendChild(element);
}

function validateOnOffWidgetSettings(widgetElement, data) {
    if (!data["oid-dataId"]) {
        showWarningInWidget(widgetElement, "needToSelectDataId");
        return false;
    }
    if (!(data["oid-dataId"].startsWith("timer-switch.0.onoff") && data["oid-dataId"].endsWith("data"))) {
        showWarningInWidget(widgetElement, "needToSelectValidDataId");
        return false;
    }
    if (!data["oid-stateId1"]) {
        showWarningInWidget(widgetElement, "needToSelectStateId");
        return false;
    }
    if (data.valueType === "number") {
        if (Number.isNaN(Number.parseFloat(data.onValue))) {
            showWarningInWidget(widgetElement, "needToEnterValidNumberOn");
            return false;
        }
        if (Number.isNaN(Number.parseFloat(data.offValue))) {
            showWarningInWidget(widgetElement, "needToEnterValidNumberOff");
            return false;
        }
    } else if (data.valueType === "string") {
        if (data.onValue === undefined || data.offValue === undefined || data.onValue === "" || data.offValue === "") {
            showWarningInWidget(widgetElement, "needToEnterValidStringValue");
            return false;
        }
    }
    return true;
}

function showWarningInWidget(widgetElement, warning) {
    const p = document.createElement("p");
    p.textContent = vis.binds["timer-switch"].translate(warning);
    while (widgetElement.firstChild) {
        widgetElement.removeChild(widgetElement.firstChild);
    }
    widgetElement.appendChild(p);
}

function getConditionStateIdsAndAlias(widgetId) {
    const data = vis.widgets[widgetId].data;
    const count = Number.parseInt(data.conditionStatesCount, 10);
    const ids = [];
    for (let i = 1; i <= count; i++) {
        const id = data[`oid-conditionStateId${i}`];
        if (id !== undefined && id !== "") {
            ids.push({ id: id, alias: data[`conditionStateAlias${i}`] });
        }
    }
    return ids;
}

function addConditionToAction(action, widgetId) {
    if (action.type === "OnOffStateAction") {
        const conditionAction = {
            type: "ConditionAction",
            condition: {
                type: "StringStateAndConstantCondition",
                constant: "true",
                stateId: getConditionStateIdsAndAlias(widgetId)[0].id,
                sign: "==",
            },
            action: action,
        };
        return conditionAction;
    }
    return null;
}

function getElementNameForTriggerType(type) {
    if (type === "TimeTrigger") {
        return "app-time-trigger-timer";
    } else if (type === "AstroTrigger") {
        return "app-astro-trigger-timer";
    } else {
        throw Error("No widget for trigger found");
    }
}

function getElementNameForActionType(type) {
    if (type === "OnOffStateAction") {
        return "app-on-off-state-action-timer";
    } else if (type === "ConditionAction") {
        return "app-condition-action-timer";
    } else {
        throw Error("No widget for action found");
    }
}
