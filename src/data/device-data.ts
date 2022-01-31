export class AxpertInterface_DeviceData {
    acInputVoltage: number;
    acInputFrequency: number;
    acOutputVoltage: number;
    acOutputFrequency: number;
    acOutputPowerApparent: number;
    acOutputPowerActive: number;
    acOutputLoadPercent: number;
    busVoltage: number;
    batteryVoltage: number;
    batteryVoltageSCC: number;
    batteryCapacityPercent: number;
    batteryCurrent: number;
    batteryChargingCurrent: number;
    batteryDischargeCurrent: number;
    photovoltaicVoltage: number;
    photovoltaicPower: number;
    photovoltaicChargingBatteryCurrent: number;
    deviceTemperature: number;
    addSBUPriorityVersion: boolean;
    configChanged: boolean;
    sccFirmwareUpdates: boolean;
    loadOn: boolean;
    batteryVoltToSteady: boolean;
    charging: boolean;
    photovoltaicCharging: boolean;
    acCharging: boolean;
    dataTimeStamp: number;

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