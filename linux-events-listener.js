const events = require('events');
const fs = require('fs');

const eventEmiter = new events.EventEmitter;

const bit = (x, d) => (d[0] & 1 << x) > 0;

class DeviceEvent {
    constructor(device, path) {
        this.stream = fs.createReadStream(path);

        if (device == 'mouse') {
            this.stream.on('data', (data) => this.mouseStream(Buffer.from(data)));
        } else {
            this.stream.on('data', (data) => this.keyboardStream(Buffer.from(data)));
        }

        this.stream.on('close', () => eventEmiter.emit('close'));
        this.stream.on('error', (e) => eventEmiter.emit('error', e));
    }

    mouseStream(data) {
        const clickEvent = {
            left: bit(0, data),
            right: bit(1, data),
            middle: bit(2, data),
        };

        if (clickEvent.left || clickEvent.right || clickEvent.middle) {
            eventEmiter.emit('action');
        }
    }

    keyboardStream() {
        eventEmiter.emit('action');
    }
}

new DeviceEvent('keyboard', '/dev/input/by-path/platform-i8042-serio-0-event-kbd');
new DeviceEvent('mouse', '/dev/input/mice');

module.exports = eventEmiter;