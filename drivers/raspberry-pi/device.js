'use strict';

const Homey = require('homey');

class RaspberryPiDevice extends Homey.Device {

	onInit() {
		this.log('RaspberryPiDevice inited');
	}
}

module.exports = RaspberryPiDevice;
