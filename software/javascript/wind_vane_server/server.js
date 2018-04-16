"use strict";
const util = require('util');
const fs = require('fs');
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const open = util.promisify(fs.open);
const close = util.promisify(fs.close);
const write = util.promisify(fs.write);
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const SerialPort = require('serialport');
const timestamp = require('time-stamp');
const moment = require('moment');

// Run parameters
const serialPortName = '/dev/ttyACM0';
const networkPort = 5000;
const logFilePrefix = 'wind_vane_';
const dateTimerInterval = 250;
const portCheckInterval = 1000;
const logDirectory = path.join(process.env.HOME,'wind_vane_data');
const clientDistDir = path.join(__dirname, '../wind_vane_client/dist');
const staticFileDir = path.join(clientDistDir, 'static');

app.use('/static', express.static(staticFileDir))
server.listen(networkPort);

console.log('* log directory: ' + logDirectory);
console.log('* listening on port: ' + networkPort);


// Setup logging
// --------------------------------------------------------------------------------------

let loggingState = {
  enabled: false,
  fileName: null,
  directoryExists: false,
  numberOfSamples: 0
}
let logfd = null;


let createLogDirectory = async function() {
  let dirExists = true;
  try {
    let stats = await stat(logDirectory);
    console.log('* log directory exists')
  } catch(err) {
    try {
      await mkdir(logDirectory);
      console.log('* created log directory');
    } catch (err) {
      console.log('* unable to create log directory');
      dirExists = false;
    }
  }
  return dirExists;
}
loggingState.directoryExists = createLogDirectory()


// Setup Server
// --------------------------------------------------------------------------------------

app.get('/', function (req, res) {
    res.sendFile(path.join(clientDistDir,'index.html'));
});

io.on('connection', function (socket) {

  socket.emit('loggingState', loggingState);

  socket.on('startLogging', async function (data) {
    if (loggingState.enabled) {
      return;
    }
    loggingState.enabled = true;
    loggingState.fileName = logFilePrefix + timestamp('YYYY_MM_DD_HH_mm_ss.txt');
    loggingState.numberOfSamples = 0;
    let logFileFullPath = path.join(logDirectory,loggingState.fileName);
    try {
      logfd = await open(logFileFullPath,'w');
      console.log('* opened log file');
    } catch (err) {
      logfd = null;
      console.log('* unable to open log file');
    }
    io.emit('loggingState', loggingState);
    console.log('* start logging');
  });

  socket.on('stopLogging', async function (data) {
    loggingState.enabled = false;
    io.emit('loggingState', loggingState);
    try { 
      await close(logfd);
      console.log('* closed log file');
    } catch (err) {
      console.log('* error closing log file');
    } finally {
      logfd = null;
    }
    console.log('* stop logging');
  });

});

setInterval( function() {
  let datetime = timestamp('YYYY/MM/DD HH:mm:ss');
  io.emit('datetime', {'datetime': datetime});
}, dateTimerInterval);


// Setup serial port
// --------------------------------------------------------------------------------------

let serialPortOpen = false;
let port = null;

let setupSerialPort = async function() {

  port = new SerialPort(serialPortName, {baudRate: 115200}) 
    
  port.on('open', function () {
      console.log('* USB serial port ' + serialPortName + ' opened'); 
      serialPortOpen = true;
      port.write('b\n'); // Send command to begin data stream
  });

  port.on('close', function() {
    console.log('* USB serial port ' + serialPortName + ' closed');
    serialPortOpen = false;
  });

  port.on('data', async function (data) {
    let angle = Number(data);
    loggingState.numberOfSamples += 1;

    io.emit('data', {
      angle: angle, 
      numberOfSamples: loggingState.numberOfSamples
    });
    if (loggingState.enabled && (logfd !== null)) {
      let unixTime = moment().valueOf()/1000.0;
      let dataLine = unixTime + ' ' + angle;
      await write(logfd,dataLine + '\n');
    }
  });

};

setInterval( function() {
  if (serialPortOpen) {
    return;
  }
  setupSerialPort();
}, portCheckInterval);


// SIGINT handler
// ---------------------------------------------------------------------------------------
process.on('SIGINT', (code) => {
  port.write('e\n');
  console.log();
  console.log('* quiting on ctl-c');
  console.log();
  process.exit(0);
});





