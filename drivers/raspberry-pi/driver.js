'use strict';

const Homey = require('homey');

class RaspberryPiDriver extends Homey.Driver {

	onInit() {
		this.log('RaspberryPiDriver has been inited');
	}

}

module.exports = RaspberryPiDriver;
