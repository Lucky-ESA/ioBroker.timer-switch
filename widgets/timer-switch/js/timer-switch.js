/*
	ioBroker.vis timer-switch Widget-Set

	version: "2.2.2"

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
        timeSwitchDic = JSON.parse(translation);
        $.extend(systemDictionary, iobSystemDic);
        $.extend(systemDictionary, timeSwitchDic);
    } catch (e) {
        console.log(`Translate: ${e}`);
    }
});

// export vis binds for widget
vis.binds["timer-switch"] = {
    version: "2.2.2",
    showVersion: showVersion,
    createOnOffWidget: createOnOffWidget,
    onOffScheduleWidgets: {},
    onDataIdChange: onDataIdChange,
    onStateIdChange: onStateIdChange,
    onConditionStateIdChange: onConditionStateIdChange,
    getConditionStateIdsAndAlias: getConditionStateIdsAndAlias,
    sendMessage: sendMessage,
    translate: translate,
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
    const element = document.createElement("app-on-off-schedules-widget");
    element.setAttribute("widgetid", widgetId);
    element.style.setProperty("--ts-widget-astro-icon-display", data.useAstroIcons ? "inline" : "none");
    element.style.setProperty("--ts-widget-astro-text-display", data.useAstroIcons ? "none" : "inline");
    widgetElement.appendChild(element);
}

function validateOnOffWidgetSettings(widgetElement, data) {
    if (!data.dataId) {
        showWarningInWidget(widgetElement, "needToSelectDataId");
        return false;
    }
    if (!(data.dataId.startsWith("timer-switch.0.onoff") && data.dataId.endsWith("data"))) {
        showWarningInWidget(widgetElement, "needToSelectValidDataId");
        return false;
    }
    if (!data.stateId1) {
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

/**
 * Gets triggered by vis editor when dataId value changes.
 */
function onDataIdChange(widgetId, view, newId, attr, isCss, oldId) {
    console.log("onDataIdChange");
    console.log("widgetId: " + widgetId);
    console.log("view: " + view);
    if (newId) console.log("newId: " + newId);
    if (attr) console.log("attr: " + attr);
    if (isCss) console.log("isCss: " + isCss);
    if (oldId) console.log("oldId: " + oldId);
    if (!vis.views[view].widgets[widgetId].data.bindings) {
        vis.views[view].widgets[widgetId].data.oid6 = newId;
        if (newId) {
            vis.views[view].widgets[widgetId].data.oid8 = newId.replace("data", "enabled");
        }
    }
}

/**
 * Gets triggered by vis editor when stateId value changes.
 */
function onStateIdChange(widgetId, view, newId, attr, isCss, oldId) {
    console.log("onStateIdChange");
    console.log("widgetId: " + widgetId);
    console.log("view: " + view);
    if (newId) console.log("newId: " + newId);
    if (attr) console.log("attr: " + attr);
    if (isCss) console.log("isCss: " + isCss);
    if (oldId) console.log("oldId: " + oldId);
    if (!vis.views[view].widgets[widgetId].data.bindings) {
        vis.views[view].widgets[widgetId].data.oid7 = newId;
    }
}

function onConditionStateIdChange(widgetId, view, newId, attr, isCss, oldId) {
    if (newId) console.log("newId: " + newId);
    if (attr) console.log("attr: " + attr);
    if (isCss) console.log("isCss: " + isCss);
    if (oldId) console.log("oldId: " + oldId);
    if (!vis.views[view].widgets[widgetId].data.bindings) {
        const conditionStateIds = getConditionStateIdsAndAlias(widgetId, view).map((i) => i.id);
        for (let i = 0; i < conditionStateIds.length; i++) {
            vis.views[view].widgets[widgetId].data[`oid${i}`] = conditionStateIds[i];
        }
    }
}

function getConditionStateIdsAndAlias(widgetId) {
    const data = vis.widgets[widgetId].data;
    const count = Number.parseInt(data.conditionStatesCount, 10);
    const ids = [];
    for (let i = 1; i <= count; i++) {
        const id = data[`conditionStateId${i}`];
        if (id !== undefined && id !== "") {
            ids.push({ id: id, alias: data[`conditionStateAlias${i}`] });
        }
    }
    return ids;
}
