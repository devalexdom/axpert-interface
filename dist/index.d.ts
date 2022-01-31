/// <reference types="node" />
import { AxpertInterface_DeviceData } from "./data/device-data";
interface AxpertInterface_Parameters {
    serialPortDevicePath: string;
    deviceStatusQueryInterval?: number;
    devicesByIdPath?: string;
    autoInitDataStream?: boolean;
}
interface AxpertInterface_EventData {
    message?: string;
    dataDump?: any;
    eventName?: string;
}
interface AxpertInterface_DeviceCommands {
    queryStack: Array<Function>;
    setStack: Array<Function>;
}
export default class AxpertInterface {
    version: number;
    parameters: AxpertInterface_Parameters;
    listenersStack: Array<Function>;
    deviceCommands: AxpertInterface_DeviceCommands;
    deviceData: AxpertInterface_DeviceData;
    dataQueryInterval: NodeJS.Timeout;
    commandResponsePending: boolean;
    constructor({ serialPortDevicePath, deviceStatusQueryInterval, devicesByIdPath, autoInitDataStream }?: {
        serialPortDevicePath?: string;
        deviceStatusQueryInterval?: number;
        devicesByIdPath?: string;
        autoInitDataStream?: boolean;
    });
    on(event: string, callback: Function): void;
    emitEvent(event: string, eventData?: AxpertInterface_EventData): void;
    mapAxpertDeviceData(deviceDataJSON: string): AxpertInterface_DeviceData;
    init(): void;
    initDataStream(): Promise<void>;
    queryDevice(commandId: string, responseCallback: Function, errorCallback?: Function): void;
    setDevice(commandId: string, setValue: string, responseCallback: Function, errorCallback?: Function): void;
    handleCommands(): void;
    getNextCommandPromise(): Function;
    clean(): void;
    reset(): void;
    destroy(): void;
    getDeviceData(): AxpertInterface_DeviceData;
    setACInputAsPowerPriority(response?: (response: boolean) => void, error?: Function): void;
    setBatteryAsPowerPriority(response?: (response: boolean) => void, error?: Function): void;
    setSolarAsPowerPriority(response?: (response: boolean) => void, error?: Function): void;
    allowACInputCharging(response?: (response: boolean) => void, error?: Function): void;
    disallowACInputCharging(response?: (response: boolean) => void, error?: Function): void;
    setACInputMaxChargingCurrent(current: number, response?: (response: boolean) => void, error?: Function): void;
}
export {};
