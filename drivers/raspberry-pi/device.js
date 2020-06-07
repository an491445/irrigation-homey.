'use strict';

const Homey = require('homey');
const mqtt = require('mqtt');

class RaspberryPiDevice extends Homey.Device {

	onInit() {
		this.log('RaspberryPiDevice inited');

		this.log('Connecting to MQTT...');
		const { host, port } = this.getSettings();

		this.client = mqtt.connect(`mqtt://${host}:${port}`);

		// Process incoming messages
		this.client.on('message', (topic, message) => this.handleMessage(topic, message));

		this.client.on('connect', () => {
			this.log('MQTT connection established');
			const topics = ['pi/sensors/#'];
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

		const pumpCapabilities = ["onoff.pump1", "onoff.pump2", "onoff.pump3", "onoff.pump4"]
		this.registerMultipleCapabilityListener(pumpCapabilities, valueObj => {
			const capability = Object.keys(valueObj)[0];
			const pin = capability.split('.')[1];
			const requestId = `homey-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
			const message = {
				action: "run",
				payload: {
					device: "MCP23017",
					pin,
					duration: 5,
				},
				requestId,
			}
			this.setCapabilityValue(capability, true);
			this.client.publish("pi/requests", JSON.stringify(message));
			setTimeout(() => this.setCapabilityValue(capability, false), 5000);
			return Promise.resolve();
		});
	}

	handleMessage(topic, message) {
		this.log(`Got new message on topic ${topic}`);
		try {
			const msg = message.toString();
			this.log(msg);
			const { data } = JSON.parse(msg);

			switch (topic) {
				case 'pi/sensors/AM2320/humidity':
					this.setCapabilityValue('measure_humidity.AM2320', data);
					break;
				case 'pi/sensors/AM2320/temperature':
					this.setCapabilityValue('measure_temperature.AM2320', data);
					break;
				case 'pi/sensors/BMP280/pressure':
					this.setCapabilityValue('measure_pressure.BMP280', data);
					break;
				case 'pi/sensors/BMP280/temperature':
					this.setCapabilityValue('measure_temperature.BMP280', data);
					break;
				case 'pi/sensors/HCSR04/range':
					this.setCapabilityValue('meter_water.HCSR04', data);
					break;
				case 'pi/sensors/TSL2561/light':
					this.setCapabilityValue('measure_luminance.TSL2561', data);
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
