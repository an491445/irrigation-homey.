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
			const topics = ['pi/sensors/#', 'pi/events'];
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
			const settings = this.getSettings();
			const duration = settings[`duration-${pin}`];
			const requestId = this.generateRequestId();
			const message = {
				action: "run",
				payload: {
					device: "MCP23017",
					pin,
					duration,
				},
				requestId,
			}
			this.client.publish("pi/requests", JSON.stringify(message));
			return Promise.resolve();
		});

		this.registerCapabilityListener('button.refresh_readings', (value, opts) => {
			const requestId = this.generateRequestId();
			const message = {
				action: "read",
				payload: {},
				requestId,
			}
			this.client.publish("pi/requests", JSON.stringify(message));
			return Promise.resolve();
		});

		this.registerCapabilityListener('button.cancel', (value, opts) => {
			const requestId = this.generateRequestId();
			const message = { requestId }
			this.client.publish("pi/abort", JSON.stringify(message));
			return Promise.resolve();
		});
	}

	handleMessage(topic, message) {
		this.log(`Got new message on topic ${topic}`);
		return Promise.resolve(JSON.parse(message.toString()))
			.then(msg => {
				this.log('message:', msg);
				switch (topic) {
					case 'pi/sensors/AM2320/humidity':
						return this.setCapabilityValue('measure_humidity.AM2320', msg.data);
					case 'pi/sensors/AM2320/temperature':
						return this.setCapabilityValue('measure_temperature.AM2320', msg.data);
					case 'pi/sensors/BMP280/pressure':
						return this.setCapabilityValue('measure_pressure.BMP280', msg.data);
					case 'pi/sensors/BMP280/temperature':
						return this.setCapabilityValue('measure_temperature.BMP280', msg.data);
					case 'pi/sensors/MCP3008/temperature':
						return this.setCapabilityValue('measure_temperature.analog', msg.data);
					case 'pi/sensors/HCSR04/range':
						return this.setCapabilityValue('meter_water.HCSR04', msg.data);
					case 'pi/sensors/MCP23017/watertank_empty':
						return this.setCapabilityValue('alarm_water.watertank_empty', msg.data === 1);
					case 'pi/sensors/TSL2561/light':
						return this.setCapabilityValue('measure_luminance.TSL2561', msg.data);
					case 'pi/sensors/MCP3008/soil_moisture_1':
						return this.setCapabilityValue('measure_soil_moisture.soil_moisture_1', msg.data);
					case 'pi/sensors/MCP3008/soil_moisture_2':
						return this.setCapabilityValue('measure_soil_moisture.soil_moisture_2', msg.data);
					case 'pi/sensors/MCP3008/soil_moisture_3':
						return this.setCapabilityValue('measure_soil_moisture.soil_moisture_3', msg.data);
					case 'pi/sensors/MCP3008/soil_moisture_4':
						return this.setCapabilityValue('measure_soil_moisture.soil_moisture_4', msg.data);
					case 'pi/sensors/MCP23017/pump1':
						return this.setCapabilityValue('onoff.pump1', msg.data === 1);
					case 'pi/sensors/MCP23017/pump2':
						return this.setCapabilityValue('onoff.pump2', msg.data === 1);
					case 'pi/sensors/MCP23017/pump3':
						return this.setCapabilityValue('onoff.pump3', msg.data === 1);
					case 'pi/sensors/MCP23017/pump4':
						return this.setCapabilityValue('onoff.pump4', msg.data === 1);
					case 'pi/events':
						return this.handleEvent(msg);
				}
			// Something went wrong, for example message not JSON
			}).catch(err => this.log(err));
	}

	handleEvent({ status, message, action, payload }) {
		// If an error event is published (regardless of origin), display error to user
		switch (status) {
			case 'queued':
			case 'initiated':
			case 'completed':
				// Ignoring...
				break;
			case 'rejected':
			case 'canceled':
			case 'failed':
				const { pin, device } = payload;
				const name = `${device}${pin ? ":" + pin : ""}`;
				this.setWarning(`${name}:${action} - ${message}`).catch(err => this.log(err));
				setTimeout(() => this.unsetWarning(), 10000);
				break;
		}
	}

	generateRequestId() {
		return `homey-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
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
