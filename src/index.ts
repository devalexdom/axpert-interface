import { exec } from "child_process";
import { AxpertInterface_DeviceStatusData } from "./data/device-data";


interface AxpertInterface_Parameters {
  serialPortDevicesId: Array<string>;
  deviceStatusQueryInterval?: number;
}

interface AxpertInterface_EventData {
  message?: string,
  dataDump?: any,
  eventName?: string
}


export default class AxpertInterface {
  version: number;
  parameters: AxpertInterface_Parameters;
  listenersStack: Array<Function>;
  devicesData: { [key: string]: Object }
  constructor({ serialPortDevicesId = [], deviceStatusQueryInterval = 1 } = {}) {
    this.version = 0.01;
    this.parameters = {
      serialPortDevicesId,
      deviceStatusQueryInterval
    };
    this.listenersStack = [];
    this.devicesData = {};
    this.init();
  }

  on(event: string, callback: Function): void {
    const listener = (eventEmmited: string, eventData?: AxpertInterface_EventData) => {
      if (event === eventEmmited || event === "all") {
        callback(eventData);
      }
    }
    this.listenersStack.push(listener);
  }

  emitEvent(event: string, eventData?: AxpertInterface_EventData) {
    for (const listener of this.listenersStack) {
      listener(event, { ...eventData, ...{ eventName: event } });
    }
  }

  mapAxpertDeviceData(devicesData: { [key: string]: Object }): { [key: string]: AxpertInterface_DeviceStatusData } {
    const devicesDataMapped = {};
    for (const deviceSN in devicesData) {
      const deviceData = devicesData[deviceSN];
      devicesDataMapped[deviceSN] = new AxpertInterface_DeviceStatusData(deviceData);
    }
    return devicesDataMapped;
  }

  init() {
    this.initVEDirectDataStreamFromAllDevices().then(() => {
      this.emitEvent("stream-init", {
        message: "Voltronic/Axpert devices data stream init"
      });
    }).catch(() => {
      this.emitEvent("error", {
        message: "Failed to get data from VE.Direct devices"
      });
    });
  }

  clean() {
    this.devicesData = {};
  }

  reset() {
    this.destroy(() => {
      this.clean();
      this.init();
    });
  }



  destroy(callback?: Function) {
    throw "notImplementedException";
  }

  getDevicesData() {
    return this.mapVictronDeviceData(this.devicesVEDirectData);
  }

  updateVEDirectDataDeviceData(VEDirectRawData) {
    const serialNumber = this.getVictronDeviceSN(VEDirectRawData);
    if (!serialNumber) {
      this.emitEvent("error", {
        message: "Device does not have a valid serial number.",
        dataDump: VEDirectRawData
      });
      return;
    }
    this.devicesVEDirectData = {
      ...this.devicesVEDirectData,
      [serialNumber]: {
        ...VEDirectRawData, ...{ dataTimeStamp: new Date().getTime() }
      }
    };
  }

  getVEDirectDevicesAvailable() {
    return new Promise<Array<string>>((resolve, reject) => {
      exec(`ls ${this.parameters.VEDirectDevicesPath}`, (error, stdout, stderr) => {
        const errorData = error || stderr;
        if (errorData) {
          this.emitEvent("error", {
            message: "Failed to get available VE.Direct devices, try with customVEDirectDevicesPaths option.",
            dataDump: errorData
          });
          reject([]);
          return;
        }
        const rawConsoleResponse = stdout.split('\n');
        const validVEDirectInterfaces = rawConsoleResponse.filter((deviceId) => deviceId.indexOf("VE_Direct") !== -1);
        const absoluteDevicesPath = validVEDirectInterfaces.map((device) => {
          const absoluteDevicePath = this.parameters.VEDirectDevicesPath + device;
          this.emitEvent("interface-found", {
            message: "Found VE.Direct serial port interface",
            dataDump: absoluteDevicePath
          });
          return absoluteDevicePath;
        });
        resolve(absoluteDevicesPath);
      });
    });
  }

  initVEDirectDataStreamFromAllDevices() {
    return new Promise<void>((resolve, reject) => {
      if (this.parameters.customVEDirectDevicesPaths && this.parameters.customVEDirectDevicesPaths.length > 0) {
        const devicesPromises = this.parameters.customVEDirectDevicesPaths.map(devicePath => this.initDataStreamFromVEDirect(devicePath));
        Promise.all(devicesPromises).then(() => {
          resolve();
        }).catch(() => {
          reject();
        });
      }
      else {
        this.getVEDirectDevicesAvailable().then((devicesPathsFound) => {
          const devicesPromises = devicesPathsFound.map(devicePath => this.initDataStreamFromVEDirect(devicePath));
          Promise.all(devicesPromises).then(() => {
            resolve();
          });
        }).catch(() => {
          reject();
        });
      }
    });
  }

  initDataStreamFromVEDirect(devicePath) {
    return new Promise<void>((resolve, reject) => {
      const port = new SerialPort(devicePath, {
        baudRate: 19200,
        dataBits: 8,
        parity: 'none'
      }, (err) => {
        if (err) {
          this.emitEvent("error", {
            message: `Device ${devicePath} serial port error`,
            dataDump: err
          });
          this.devicesVEDirectData = {};
          reject();
        }
      });

      port.on("open", () => {
        this.emitEvent("device-connection-open", {
          message: "VE.Direct device connected through serial port",
          dataDump: devicePath
        });
      });

      port.on('error', (err) => {
        this.emitEvent("device-connection-error", {
          message: "VE.Direct device connection error through serial port",
          dataDump: {
            devicePath: devicePath,
            errorDataDump: err
          }
        });
      })

      this.serialPorts.push(port);

      const delimiter = new SerialPort.parsers.Delimiter({
        delimiter: Buffer.from([0x0d, 0x0a], 'hex'),
        includeDelimiter: false
      });

      const VEDParser = new VEDirectParser();
      port.pipe(delimiter).pipe(VEDParser);

      VEDParser.on("data", (VEDirectRawData) => {
        if (!this.devicesVEDirectData[this.getVictronDeviceSN(VEDirectRawData)]) {
          resolve();
        }
        this.updateVEDirectDataDeviceData(VEDirectRawData);
      });
    });
  }
}



