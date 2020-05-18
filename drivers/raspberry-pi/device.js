'use strict';

const Homey = require('homey');
const mqtt = require('mqtt');

class RaspberryPiDevice extends Homey.Device {

	onInit() {
		this.log('RaspberryPiDevice inited');

		this.log('Connecting to MQTT...');
		const { host, port } = this.getSettings();

		this.client = mqtt.connect(`mqtt://${host}:${port}`);

		// Process incomming messages
		this.client.on('message', (topic, message) => this.handleMessage(topic, message));

		this.client.on('connect', () => {
			this.log('MQTT connection established');
			const topics = ['AM2320', 'BMP280', 'HCSR04', 'TSL2561'];
			this.client.subscribe(topics, err => {
				if (err) {
					this.log(err);
					this.client.end();
					this.setWarning('MQTT failure, device not receiving data');
				} else {
					this.log(`Subscribed to ${topics}`);
				}
			});
		});
	}

	handleMessage(topic, message) {
		this.log(`Got new message on topic ${topic}`);
		try {
			const msg = message.toString();
			this.log(msg);
			const data = JSON.parse(msg);

			switch (topic) {
				case 'AM2320':
					this.setCapabilityValue('measure_humidity.AM2320', data.humidity);
					this.setCapabilityValue('measure_temperature.AM2320', data.temperature);
					break;
				case 'BMP280':
					this.setCapabilityValue('measure_pressure.BMP280', data.pressure);
					this.setCapabilityValue('measure_temperature.BMP280', data.temperature);
					break;
				case 'HCSR04':
					this.setCapabilityValue('meter_water.HCSR04', data.range);
					break;
				case 'TSL2561':
					this.setCapabilityValue('measure_luminance.TSL2561', data.light);
					break;
			}
		} catch (err) {
			// Something went wrong, for example message not JSON
			this.log(err);
		}
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
