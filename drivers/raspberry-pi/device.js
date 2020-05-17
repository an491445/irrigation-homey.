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

		// Save data
		client.on('message', (topic, message) => {
			if (topic === 'AM2320') {
				this.log('Got new value from AM2320');
				Promise.resolve(JSON.parse(message.toString()))
					.then(data => data.temperature)
					.then(temperature => {
						if (temperature) {
							return this.setCapabilityValue('measure_temperature.AM2320', temperature);
						} else {
							this.log("Could not parse value");
						}
					})
					// Something went wrong, for example message not JSON
					.catch(err => this.log(err));
			}
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
