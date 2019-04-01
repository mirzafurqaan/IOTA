const SerialPort = require('serialport');
const moment = require('moment');
const IOTA = require('iota.lib.js');
const Mam = require('./lib/mam.client.js');
const iota = new IOTA({ provider: 'https://testnet140.tangle.works:443' });
const MODE = 'restricted'; // public, private or restricted
const SIDEKEY = 'mysecret'; // Enter only ASCII characters. Used only in restricted mode
const SECURITYLEVEL = 3; // 1, 2 or 3
const PORTNAME = 'COM5';
const port = new SerialPort(PORTNAME, {
    baudRate: 9600,
    autoOpen: true
});
const Readline = SerialPort.parsers.Readline;
const parser = port.pipe(new Readline({ delimiter: '\r\n' }));
// Initialise MAM State
let mamState = Mam.init(iota, undefined, SECURITYLEVEL);
// Set channel mode
if (MODE == 'restricted') {
    const key = iota.utils.toTrytes(SIDEKEY);
    mamState = Mam.changeMode(mamState, MODE, key);
} else {
    mamState = Mam.changeMode(mamState, MODE);
}
// Publish to tangle
const publish = async function(packet) {
    // Create MAM Payload
    const trytes = iota.utils.toTrytes(JSON.stringify(packet));
    const message = Mam.create(mamState, trytes);
    // Save new mamState
    mamState = message.state;
    console.log('Root: ', message.root);
    console.log('Address: ', message.address);
    // Attach the payload.
    await Mam.attach(message.payload, message.address);
    return message.root;
}
// Serial port library events
port.on('open', showPortOpen);
parser.on('data', readSerialData);
port.on('close', showPortClose);
port.on('error', showError);
// Callback functions
function showPortOpen() {
    console.log('Serial port open. Data rate: ' + port.baudRate);
}
async function readSerialData(data){
    console.log("Serial port open. Read serial data.");
    // Create JSON object:
    // Convert Arduino received data:  temp: 26.00C, humidity: 21.00%
    // to
    // json = { dateTime: '15/07/2018 10:57:35', data: { temp: '26.00C', humidity: '21.00%' } }
    //
    let json = {};
    const dateTime = moment().utc().format('DD/MM/YYYY hh:mm:ss');
    json['dateTime'] = dateTime;
	json['data'] = `{${data}}`;
    console.log('json = ',json);
    const root = await publish(json);
}
function showPortClose() {
    console.log('Serial port closed.');
}
function showError(error) {
   console.log('Serial port error: ' + error);
}