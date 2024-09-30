(async () => {
    class OnOffScheduleWidget extends HTMLElement {
        constructor() {
            super();
            this.sr = this.createShadowRoot();
            this.settings = null;
            this.currentTriggers = [];
            this.connected = false;
        }

        static get observedAttributes() {
            return ["widgetid"];
        }

        connectedCallback() {
            console.log("connectedCallback: " + this.connected);
            if (this.connected) {
                return;
            }
            this.sr.querySelector("#btn-add-trigger-dropdown").addEventListener("click", (e) => {
                const dropdown = this.sr.querySelector("#add-trigger-dropdown");
                dropdown.classList.add("show");
                e.stopImmediatePropagation();
                window.addEventListener(
                    "click",
                    () => {
                        dropdown.classList.remove("show");
                    },
                    { once: true },
                );
            });
            this.sr.querySelector("#add-time-trigger").addEventListener("click", () => this.addTrigger("TimeTrigger"));
            this.sr
                .querySelector("#add-one-time-trigger")
                .addEventListener("click", () => this.addTrigger("OneTimeTrigger"));
            this.sr
                .querySelector("#add-astro-trigger")
                .addEventListener("click", () => this.addTrigger("AstroTrigger"));
            this.sr.querySelector(".button.edit").addEventListener("click", this.onEditNameClick.bind(this));
            this.sr.querySelector(".button.save").addEventListener("click", this.onSaveNameClick.bind(this));
            this.sr.querySelector("button#manual-off").addEventListener("click", this.onManualClick.bind(this));
            this.sr.querySelector("button#manual-on").addEventListener("click", this.onManualClick.bind(this));
            this.sr.querySelector("#enabled").addEventListener("click", () => {
                this.enabled = !this.enabled;
                vis.binds["timer-switch"].sendMessage(this.enabled ? "enable-schedule" : "disable-schedule", {
                    dataId: this.settings["oid-dataId"],
                });
            });
            this.sr.querySelector("#manual").addEventListener("click", () => {
                const toggle = this.sr.querySelector("#manual");
                toggle.classList.toggle("checked");
                this.onManualClick({
                    target: { id: toggle.classList.contains("checked") ? "manual-on" : "manual-off" },
                });
            });
            this.connected = true;
        }

        attributeChangedCallback(attr) {
            console.log("attributeChangedCallback widgetid: " + attr);
            if (attr === "widgetid") {
                this.onWidgetIdChange();
            }
        }

        get widgetId() {
            return this.getAttribute("widgetid");
        }

        set name(val) {
            this.sr.querySelector(".heading .view h1").textContent = val;
            this.sr.querySelector(".heading .edit input").value = val;
        }

        get enabled() {
            return this.sr.querySelector("#enabled").classList.contains("checked");
        }

        set enabled(val) {
            const toggle = this.sr.querySelector("#enabled");
            if (val) {
                toggle.classList.add("checked");
            } else {
                toggle.classList.remove("checked");
            }
        }

        set manualToggle(val) {
            const toggle = this.sr.querySelector("#manual");
            if (val) {
                toggle.classList.add("checked");
            } else {
                toggle.classList.remove("checked");
            }
        }

        set triggers(triggers) {
            this.currentTriggers = triggers;
            const oldTriggers = this.sr.querySelector(".triggers");
            const oneTimeTriggersInCreation = [];
            while (oldTriggers.firstChild) {
                const t = oldTriggers.removeChild(oldTriggers.firstChild);
                if (t.nodeName === "APP-ONE-TIME-TRIGGER-TIMER" && t.getAttribute("edit")) {
                    oneTimeTriggersInCreation.push(t);
                }
            }
            oneTimeTriggersInCreation.forEach((t) => {
                this.sr.querySelector(`.triggers`).appendChild(t);
            });
            triggers.forEach((t) => {
                const element = document.createElement(
                    t.type === "OneTimeTrigger" ? "app-one-time-trigger-timer" : "app-trigger-with-action-timer",
                );
                element.setAttribute("widgetid", this.widgetId);
                element.setAttribute("action", JSON.stringify(t.action));
                delete t.action;
                element.setAttribute("trigger", JSON.stringify(t));
                element.setAttribute("id", t.id);
                element.addEventListener("delete", (e) => this.onTriggerDelete(e.detail.id));
                element.addEventListener("update", (e) => this.onTriggerUpdate(e.detail.trigger));
                this.sr.querySelector(`.triggers`).appendChild(element);
            });
        }

        set nameEditMode(isEdit) {
            if (isEdit) {
                this.sr.querySelector(".heading div.edit").style.display = null;
                this.sr.querySelector(".heading div.view").style.display = "none";
            } else {
                this.sr.querySelector(".heading div.edit").style.display = "none";
                this.sr.querySelector(".heading div.view").style.display = null;
            }
        }

        onWidgetIdChange() {
            console.log("widget id change");
            const newSettings = vis.widgets[this.widgetId].data;
            this.settings = newSettings;
            console.log("newSettings.showId: " + newSettings.showId);
            console.log("newSettings.statesCount: " + newSettings.statesCount);
            if (newSettings.showId && newSettings.statesCount === "1") {
                this.sr.querySelector("#switched-oid").textContent = newSettings["oid-stateId1"];
            }
            const oldSettings = vis.binds["timer-switch"].onOffScheduleWidgets[this.widgetId];
            console.log("old settings: " + JSON.stringify(oldSettings));
            console.log("newSettings: " + JSON.stringify(newSettings));
            this.detectSettingsChanges(oldSettings, newSettings);
            this.updateStoredSettings(newSettings);
            console.log("this.settings.dataId: " + this.settings["oid-dataId"]);
            console.log("STATE: " + vis.states.attr(`${this.settings["oid-dataId"]}.val`));
            console.log("STATE: " + JSON.stringify(vis.states.attr()));
            if (vis.states.attr(`${this.settings["oid-dataId"]}.val`)) {
                this.onScheduleDataChange(JSON.parse(vis.states.attr(`${this.settings["oid-dataId"]}.val`)));
            }
            this.enabled = vis.states.attr(`${this.settings["oid-enabled"]}.val`);
            console.log("this.enabled1: " + JSON.stringify(vis.states.attr()));
            console.log("this.enabled: " + this.enabled);
            vis.states.bind(`${newSettings["oid-dataId"]}.val`, (e, newVal) => {
                const scheduleData = JSON.parse(newVal);
                this.onScheduleDataChange(scheduleData);
            });
            vis.states.bind(`${this.settings["oid-enabled"]}.val`, (e, newVal) => (this.enabled = newVal));
            if (this.settings.showManualSwitch) {
                const stateIds = this.getStateIdsFromSettings(this.settings);
                if (stateIds.length === 1) {
                    this.manualToggle = this.convertToBooleanForManual(vis.states.attr(`${stateIds[0]}.val`));
                    this.sr.querySelector(".manual-container.single").style.display = null;
                    vis.states.bind(`${stateIds[0]}.val`, (_, v) => {
                        this.manualToggle = this.convertToBooleanForManual(v);
                    });
                } else {
                    this.sr.querySelector(".manual-container.multiple").style.display = null;
                }
            }
        }

        onScheduleDataChange(newData) {
            console.log("onScheduleDataChange");
            if (newData == null) return;
            this.name = newData.name;
            this.triggers = newData.triggers;
        }

        onEditNameClick() {
            console.log("onEditNameClick");
            this.nameEditMode = true;
        }

        onSaveNameClick() {
            console.log("onSaveNameClick");
            const newName = this.sr.querySelector(".heading .edit input").value;
            vis.binds["timer-switch"].sendMessage("change-name", {
                dataId: this.settings["oid-dataId"],
                name: newName,
            });
            this.nameEditMode = false;
        }

        onManualClick(e) {
            console.log("onManualClick");
            const stateIds = this.getStateIdsFromSettings(this.settings);
            const valueType = this.settings.valueType;
            const isOnClick = e.target.id === "manual-on";
            let val = isOnClick ? this.settings.onValue : this.settings.offValue;
            if (valueType === "number") {
                val = Number.parseFloat(val);
            } else if (valueType === "boolean") {
                val = isOnClick;
            }
            stateIds.forEach((i) => vis.conn.setState(i, val));
        }

        onTriggerDelete(triggerId) {
            console.log("onTriggerDelete");
            vis.binds["timer-switch"].sendMessage("delete-trigger", {
                dataId: this.settings["oid-dataId"],
                triggerId: triggerId,
            });
        }

        onTriggerUpdate(trigger) {
            console.log("onTriggerUpdate");
            vis.binds["timer-switch"].sendMessage("update-trigger", {
                dataId: this.settings["oid-dataId"],
                trigger: trigger,
            });
        }

        addTrigger(type) {
            if (type === "OneTimeTrigger") {
                this.createOneTimeTrigger();
            } else {
                vis.binds["timer-switch"].sendMessage("add-trigger", {
                    dataId: this.settings["oid-dataId"],
                    triggerType: type,
                    actionType: "OnOffStateAction",
                });
            }
        }

        updateStoredSettings(newSettings) {
            console.log("updateStoredSettings");
            vis.binds["timer-switch"].onOffScheduleWidgets[this.widgetId] = {
                onValue: newSettings.onValue,
                offValue: newSettings.offValue,
                stateIds: this.getStateIdsFromSettings(newSettings),
                valueType: newSettings.valueType,
            };
        }

        detectSettingsChanges(oldSettings, newSettings) {
            console.log("detectSettingsChanges");
            console.log("new settings");
            console.log(newSettings);
            const newStateIds = this.getStateIdsFromSettings(newSettings);
            if (
                !oldSettings ||
                newStateIds.length !== oldSettings.stateIds.length ||
                newStateIds.some((value, index) => value !== oldSettings.stateIds[index])
            ) {
                console.log("sending change switched oids");
                vis.binds["timer-switch"].sendMessage("change-switched-ids", {
                    dataId: newSettings["oid-dataId"],
                    stateIds: newStateIds,
                });
            }
            if (
                !oldSettings ||
                oldSettings.onValue !== newSettings.onValue ||
                oldSettings.offValue !== newSettings.offValue ||
                oldSettings.valueType !== newSettings.valueType
            ) {
                console.log("sending change switched values");
                vis.binds["timer-switch"].sendMessage("change-switched-values", {
                    dataId: newSettings["oid-dataId"],
                    valueType: newSettings.valueType,
                    onValue:
                        newSettings.valueType === "number"
                            ? Number.parseFloat(newSettings.onValue)
                            : newSettings.onValue,
                    offValue:
                        newSettings.valueType === "number"
                            ? Number.parseFloat(newSettings.offValue)
                            : newSettings.offValue,
                });
            }
        }

        getStateIdsFromSettings(settings) {
            console.log("getStateIdsFromSettings");
            const count = Number.parseInt(settings.statesCount, 10);
            const ids = [];
            for (let i = 1; i <= count; i++) {
                const id = settings["oid-stateId" + i];
                if (id !== undefined && id !== "") {
                    ids.push(id);
                }
            }
            return ids;
        }

        convertToBooleanForManual(val) {
            if (this.settings.valueType !== "boolean") {
                val = val.toString() === this.settings.onValue.toString();
            }
            return val;
        }

        createOneTimeTrigger() {
            const trigger = document.createElement("app-one-time-trigger-timer");
            trigger.setAttribute("edit", true);
            trigger.setAttribute("widgetid", this.getAttribute("widgetid"));
            trigger.setAttribute(
                "action",
                JSON.stringify({
                    type: "OnOffStateAction",
                    name: "On",
                }),
            );
            trigger.addEventListener("delete", (e) => this.onTriggerDelete(e.detail.id));
            trigger.addEventListener("cancel-one-time-trigger-creation", (e) => {
                const triggers = this.sr.querySelector(`.triggers`);
                if (Array.from(triggers.children).find((element) => element === e.target)) {
                    triggers.removeChild(e.target);
                }
            });
            trigger.addEventListener("create", (e) => {
                console.log("got create, sending message");
                vis.binds["timer-switch"].sendMessage("add-one-time-trigger", {
                    dataId: this.settings["oid-dataId"],
                    trigger: JSON.stringify(e.detail.trigger),
                });
            });
            this.sr.querySelector(`.triggers`).appendChild(trigger);
        }

        createShadowRoot() {
            console.log("createShadowRoot");
            const shadowRoot = this.attachShadow({ mode: "open" });
            shadowRoot.innerHTML = `
				<link rel="stylesheet" href="widgets/timer-switch/css/material-toggle-switch.css" />
				<link rel="stylesheet" href="widgets/timer-switch/css/material-button.css" />
				<link rel="stylesheet" href="widgets/timer-switch/css/OnOffScheduleWidget.css" />
				<div class="widget">
					<div class="heading">
						<div class="view">
							<h1></h1>
							<img class="button edit" src="widgets/timer-switch/img/edit-24px.svg" width="28px" 
								height="28px" title="${vis.binds["timer-switch"].translate("editName")}"/>
						</div>
						<div class="edit" style="display: none;">
							<input type="text">
							<img class="button save" src="widgets/timer-switch/img/save-24px.svg" width="28px"
								height="28px"title="${vis.binds["timer-switch"].translate("saveName")}"/>
						</div>
					</div>
					<div id="switched-oid"></div>
					
					<div id="enabled" class="md-switch-container">
						<div class="md-switch-track"></div>
						<div class="md-switch-handle"></div>
						<div class="md-switch-label">${vis.binds["timer-switch"].translate("automaticSwitchingEnabled")}</div>
					</div>
					<div class="manual-container multiple" style="display: none;">
						<p>${vis.binds["timer-switch"].translate("manualSwitching")}</p>
						<button class="material-button" id="manual-on">${vis.binds["timer-switch"].translate("allOn")}</button>
						<button class="material-button" id="manual-off">${vis.binds["timer-switch"].translate("allOff")}</button>
					</div>
					<div class="manual-container single" style="display: none;">
						<div id="manual" class="md-switch-container">
							<div class="md-switch-track"></div>
							<div class="md-switch-handle"></div>
							<div class="md-switch-label">${vis.binds["timer-switch"].translate("currentValue")}</div>
						</div>
					</div>
					<div id="add">
						<div class="dropdown">
						  <img class="button" id="btn-add-trigger-dropdown" src="widgets/timer-switch/img/add-24px.svg" width="28px"
							height="28px" title="${vis.binds["timer-switch"].translate("addTrigger")}"/>
						  <div id="add-trigger-dropdown" class="dropdown-content">
							<div class="dropdown-btn" id="add-time-trigger">${vis.binds["timer-switch"].translate("addTimeTrigger")}</div>
							<div class="dropdown-btn" id="add-astro-trigger">${vis.binds["timer-switch"].translate("addAstroTrigger")}</div>
                            <div class="dropdown-btn" id="add-one-time-trigger">${vis.binds["timer-switch"].translate("addOneTimeTrigger")}</div>
						  </div>
						</div>
					</div>
					<div class="triggers">
				</div>
			`;
            return shadowRoot;
        }
    }
    customElements.define("app-on-off-schedules-widget", OnOffScheduleWidget);
})();
