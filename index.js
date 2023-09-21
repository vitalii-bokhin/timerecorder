const linuxEvent = require('./linux-events-listener');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const delay = 60000 * 10; // 10 minutes
const startTime = Date.now();

let lastTime = startTime;

rl.prompt();
rl.on('line', commands);

linuxEvent.on('action', () => {
    const actionTime = Date.now();

    if (actionTime > lastTime + delay) {
        logTime({ downtime: actionTime - lastTime - delay });
    }

    lastTime = actionTime;
});

function logTime({ downtime, startTime, endTime, title }, callback) {

    fs.readFile('log.json', (err, data) => {
        if (err) {
            throw err;
        }

        let logData = JSON.parse(data);
        let lastLog = {
            startTime: null,
            title: null,
            downtime: 0,
            endTime: null,
            workingSeconds: 0,
            workingPercents: 0,
        };

        if (startTime) {
            lastLog.startTime = startTime;
        } else {
            if (logData) {
                lastLog = logData.pop();
            }

            if (lastLog.endTime) {
                return;
            }
        }

        if (downtime) {
            lastLog.downtime += downtime;
        }

        if (title) {
            lastLog.title = title;
        }

        if (endTime) {
            lastLog.endTime = endTime;
        }

        logData.push(lastLog);

        saveData(logData);

        if (callback) {
            callback(logData);
        }
    });
}

function saveData(logData) {
    fs.writeFile('log.json', JSON.stringify(logData), (err) => {
        if (err) {
            throw err;
        }
    });
}

function commands(req) {
    if (req.includes('end')) {
        logTime({ endTime: Date.now() }, (logData) => {
            const lastLog = logData.pop();
            const workingSeconds = (lastLog.endTime - lastLog.startTime - lastLog.downtime) / 1000;
            const workingPercents = (workingSeconds / 28800) * 100; // 28800 seconds at 8 hours

            lastLog.workingSeconds = workingSeconds;
            lastLog.workingPercents = workingPercents;

            logData.push(lastLog);
            saveData(logData);

            console.log('Title: ' + lastLog.title);
            console.log('Start: ' + new Date(lastLog.startTime));
            console.log('End: ' + new Date(lastLog.endTime));
            console.log('Downtime: ' + (lastLog.downtime / 1000 / 60 / 60).toFixed(5) + ' hours');
            console.log('Abs. working time: ' + (workingSeconds / 60 / 60).toFixed(5) + ' hours');
            console.log('Abs. working time from 8h: ' + workingPercents.toFixed(5) + ' %');

            rl.prompt();
        });

    } else if (req.includes('new')) {
        let title = null;

        if (req.includes('=')) {
            title = req.split('=')[1];
        }

        logTime({ startTime: Date.now(), title }, (logData) => {
            console.log(logData.slice(-1));

            rl.prompt();
        });

    } else if (req.includes('=')) {
        logTime({ title: req.split('=')[1] }, (logData) => {
            console.log(logData.slice(-1));

            rl.prompt();
        });
    } else {
        console.error('timerecorder: command not found: ' + req);
        rl.prompt();
    }
}