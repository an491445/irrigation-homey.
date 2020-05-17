'use strict';

const Homey = require('homey');
const mqtt = require('mqtt');

class RaspberryPiDevice extends Homey.Device {

	onInit() {
		this.log('RaspberryPiDevice inited');

		this.log('Connecting to MQTT...');
		const { host, port } = this.getSettings();

		const client = mqtt.connect(`mqtt://${host}:${port}`);
		this.client = client;

		// incoming data...
		client.on('message', (topic, message) => {
			this.log('Got new message');
			this.log(topic);
			this.log(message.toString());
		});

		client.on('connect', () => {
			this.log('MQTT connection established');
			client.subscribe('AM2320', err => {
				if (err) {
					this.log(err);
					client.end();
					this.setWarning('MQTT failure, device not receiving data');
				} else {
					this.log('Subscribed to AM2320');
				}
			});
		});
	}

	onDeleted() {
		this.log('Disconnecting RaspberryPiDevice...');
		if (this.client) {
			try {
				this.client.end();
			} catch(err) {
				this.log(err);
			}
		}
	}
}

module.exports = RaspberryPiDevice;
