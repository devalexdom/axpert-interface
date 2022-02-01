'use strict';

var child_process = require('child_process');

class AxpertInterface_DeviceData {
  constructor(axpertMonitorQueriedData) {
    this.acInputVoltage = axpertMonitorQueriedData["gridVoltage"];
    this.acInputFrequency = axpertMonitorQueriedData["gridFrequency"];
    this.acOutputVoltage = axpertMonitorQueriedData["outputVoltage"];
    this.acOutputFrequency = axpertMonitorQueriedData["outputFrequency"];
    this.acOutputPowerApparent = axpertMonitorQueriedData["outputPowerApparent"];
    this.acOutputPowerActive = axpertMonitorQueriedData["outputPowerActive"];
    this.acOutputLoadPercent = axpertMonitorQueriedData["outputLoadPercent"];
    this.busVoltage = axpertMonitorQueriedData["busVoltage"];
    this.batteryVoltage = axpertMonitorQueriedData["batteryVoltage"];
    this.batteryVoltageSCC = axpertMonitorQueriedData["batteryVoltageSCC"];
    this.batteryCapacityPercent = axpertMonitorQueriedData["batteryCapacity"];
    this.batteryChargingCurrent = axpertMonitorQueriedData["batteryChargingCurrent"];
    this.batteryDischargeCurrent = axpertMonitorQueriedData["batteryDischargeCurrent"];
    this.batteryCurrent = this.batteryChargingCurrent - this.batteryDischargeCurrent;
    this.photovoltaicVoltage = axpertMonitorQueriedData["pvInputVoltage"];
    this.photovoltaicChargingBatteryCurrent = axpertMonitorQueriedData["pvBatteryCurrent"];
    this.photovoltaicPower = this.batteryVoltageSCC * this.photovoltaicChargingBatteryCurrent;
    this.addSBUPriorityVersion = axpertMonitorQueriedData["status"]["addSBUPriorityVersion"];
    this.configChanged = axpertMonitorQueriedData["status"]["configChanged"];
    this.sccFirmwareUpdates = axpertMonitorQueriedData["status"]["sccFirmwareUpdates"];
    this.loadOn = axpertMonitorQueriedData["status"]["loadOn"];
    this.charging = axpertMonitorQueriedData["status"]["charging"];
    this.photovoltaicCharging = axpertMonitorQueriedData["status"]["chargingSCC"];
    this.acCharging = axpertMonitorQueriedData["status"]["chargingAC"];
    this.deviceTemperature = axpertMonitorQueriedData["temperature"];
    this.dataTimeStamp = new Date().getTime();
  }

}

class AxpertInterface {
  constructor(serialPortDevicePath, {
    deviceStatusQueryInterval = 5,
    autoInitDataStream = true,
    retryFailedCommandOnce = true
  } = {}) {
    this.version = 0.02;
    this.parameters = {
      deviceStatusQueryInterval,
      serialPortDevicePath,
      autoInitDataStream,
      retryFailedCommandOnce
    };
    this.listenersStack = [];
    this.deviceCommands = {
      queryStack: [],
      setStack: []
    };
    this.commandResponsePending = false;
    this.deviceData = null;
    this.dataQueryInterval = null;
    this.init();
  }

  on(event, callback) {
    const listener = (eventEmmited, eventData) => {
      if (event === eventEmmited || event === "all") {
        callback(eventData);
      }
    };

    this.listenersStack.push(listener);
  }

  emitEvent(event, eventData) {
    for (const listener of this.listenersStack) {
      listener(event, Object.assign(Object.assign({}, eventData), {
        eventName: event
      }));
    }
  }

  mapAxpertDeviceData(deviceDataJSON) {
    return new AxpertInterface_DeviceData(JSON.parse(deviceDataJSON));
  }

  init() {
    if (!this.parameters.serialPortDevicePath) {
      this.emitEvent("error", {
        message: "Serial port device path parameter is not valid"
      });
      console.error("Serial port device path parameter is not valid");
      return;
    }

    if (this.parameters.autoInitDataStream) {
      this.initDataStream().then(() => {
        this.emitEvent("auto-init-completed", {
          message: "Axpert Interface auto init completed"
        });
      }).catch(() => {
        this.emitEvent("error", {
          message: "Couldn't init data stream (TIMEOUT)"
        });
      });
    }
  }

  initDataStream() {
    return new Promise((resolve, reject) => {
      const handleResponse = deviceDataJSON => {
        try {
          const firstDeviceData = !this.deviceData;
          this.deviceData = this.mapAxpertDeviceData(deviceDataJSON);

          if (firstDeviceData) {
            this.emitEvent("stream-init", {
              message: "Voltronic/Axpert devices data stream init"
            });
            resolve();
          }
        } catch (error) {
          this.emitEvent("error", {
            message: "Error processing device data",
            dataDump: error
          });
        }
      };

      setTimeout(() => {
        if (!this.deviceData) reject("timeout"); //Rejection by timeout
      }, this.parameters.deviceStatusQueryInterval * 10000);

      if (!this.deviceData) {
        this.queryDevice("QPIGS", handleResponse);
      }

      this.dataQueryInterval = setInterval(() => {
        this.queryDevice("QPIGS", handleResponse);
      }, this.parameters.deviceStatusQueryInterval * 1000);
    });
  }

  queryDevice(commandId = "QPIGS", responseCallback, errorCallback) {
    const queryPromise = () => {
      return new Promise((resolve, reject) => {
        child_process.exec(`axpert-query -c ${commandId} -p ${this.parameters.serialPortDevicePath}`, (error, stdout, stderr) => {
          const errorData = error || stderr;

          if (errorData) {
            if (errorCallback) errorCallback(errorData);
            reject(errorData);
            return;
          }

          const rawConsoleResponse = stdout.split('\n').slice(1).join('');

          if (rawConsoleResponse && rawConsoleResponse.indexOf("NAK") === -1 && rawConsoleResponse.indexOf("missmatch") === -1) {
            resolve(rawConsoleResponse);
            responseCallback(rawConsoleResponse);
          } else {
            if (errorCallback) errorCallback(rawConsoleResponse);
            reject(rawConsoleResponse);
          }
        });
      });
    };

    this.deviceCommands.queryStack.push(queryPromise);
    this.handleCommands();
  }

  setDevice(commandId = "", setValue = "", responseCallback, errorCallback) {
    const setPromise = () => {
      return new Promise((resolve, reject) => {
        const setValueArg = setValue ? ` -v ${setValue}` : "";
        child_process.exec(`axpert-set -c ${commandId}${setValueArg} -p ${this.parameters.serialPortDevicePath}`, (error, stdout, stderr) => {
          const errorData = error || stderr;

          if (errorData) {
            if (errorCallback) errorCallback(errorData);
            reject(errorData);
            return;
          }

          const rawConsoleResponse = stdout.split('\n').slice(1).join('');

          if (rawConsoleResponse && (rawConsoleResponse.indexOf("ACK") !== -1 || rawConsoleResponse.indexOf("NAK") !== -1)) {
            switch (rawConsoleResponse) {
              case "ACK":
                responseCallback(true);
                break;

              case "NAK":
                responseCallback(false);
                break;

              default:
                if (errorCallback) errorCallback(rawConsoleResponse);
                reject(rawConsoleResponse);
                break;
            }

            resolve(true);
          } else {
            if (errorCallback) errorCallback(rawConsoleResponse);
            reject(rawConsoleResponse);
          }
        });
      });
    };

    this.deviceCommands.setStack.push(setPromise);
    this.handleCommands();
  }

  handleCommands() {
    if (!this.commandResponsePending) {
      const commandPromise = this.getNextCommandPromise();

      if (commandPromise) {
        this.commandResponsePending = true;
        commandPromise().then(() => {
          this.commandResponsePending = false;
          this.handleCommands();
        }).catch(errorData => {
          this.emitEvent("error", {
            message: "Error running device command",
            dataDump: errorData
          });

          if (this.parameters.retryFailedCommandOnce) {
            setTimeout(() => {
              this.retryCommand(commandPromise);
            }, 1000);
            return;
          }

          this.commandResponsePending = false;
          this.handleCommands();
        });
      }
    }
  }

  retryCommand(commandPromise) {
    this.emitEvent("command-retry", {
      message: "Retrying a failed command"
    });
    commandPromise().then(() => {
      this.commandResponsePending = false;
      this.handleCommands();
    }).catch(errorData => {
      this.emitEvent("error", {
        message: "Error running device command (retried)",
        dataDump: errorData
      });
      this.commandResponsePending = false;
      this.handleCommands();
    });
  }

  getNextCommandPromise() {
    if (this.deviceCommands.setStack[0]) {
      const setCommand = this.deviceCommands.setStack[0];
      this.deviceCommands.setStack = this.deviceCommands.setStack.slice(1);
      return setCommand;
    } else {
      if (this.deviceCommands.queryStack[0]) {
        const queryCommand = this.deviceCommands.queryStack[0];
        this.deviceCommands.queryStack = this.deviceCommands.queryStack.slice(1);
        return queryCommand;
      }
    }

    return null;
  }

  clean() {
    this.deviceData = null;
  }

  reset() {
    this.destroy();
    this.clean();
    this.init();
  }

  destroy() {
    clearInterval(this.dataQueryInterval);
  }

  getDeviceData() {
    return this.deviceData;
  }

  setACInputAsPowerPriority(response = response => {}, error) {
    this.setDevice("POP", "00", response, error);
  }

  setBatteryAsPowerPriority(response = response => {}, error) {
    this.setDevice("POP", "02", response, error);
  }

  setSolarAsPowerPriority(response = response => {}, error) {
    this.setDevice("POP", "01", response, error);
  }

  allowACInputCharging(response = response => {}, error) {
    this.setDevice("PCP", "02", response, error);
  }

  disallowACInputCharging(response = response => {}, error) {
    this.setDevice("PCP", "03", response, error);
  }

  setACInputMaxChargingCurrent(current, response = response => {}, error) {
    this.setDevice("MUCHGC", `0${current}`, response, error);
  }

}

module.exports = AxpertInterface;
