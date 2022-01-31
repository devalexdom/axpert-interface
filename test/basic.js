const AxpertInterface = require("../dist/index");
const axpertInterface = new AxpertInterface("/dev/serial/by-id/...");

const readData = () => {
    setInterval(() => {
        console.log(axpertInterface.getDeviceData());
    }, 4000);
}
axpertInterface.on("all", (eventData) => {
    console.log(eventData);
});

axpertInterface.on("stream-init", () => {
    readData();
});

axpertInterface.on("error", (error) => {
    console.error(error);
    /*
      {
        message: string;
        dataDump: any;
      }
    */
})

setTimeout(() => {
    console.log("Setting AC input as power priority...");
    axpertInterface.setACInputAsPowerPriority((response)=> {
        const responseTxt = response? "OK" : "NOPE";
        console.log(`Device responds: ${responseTxt}`);
    });
}, 15000);

setTimeout(() => {
    console.log("Setting battery as power priority...");
    axpertInterface.setBatteryAsPowerPriority((response)=> {
        const responseTxt = response? "OK" : "NOPE";
        console.log(`Device responds: ${responseTxt}`);
    });
}, 22000);