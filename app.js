'use strict';

const Homey = require('homey');

class IrrigationApp extends Homey.App {

	onInit() {
		this.log('IrrigationApp is running...');
	}

}

module.exports = IrrigationApp;
