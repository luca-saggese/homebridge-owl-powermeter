var dgram = require('dgram');
var xml = require('xml2json');

var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-owl-thermostat", "OwlThermostat", OwlThermostat);
}

function OwlThermostat(log, config) {
    this.log = log;

    // Info
    this.name = config["name"];
    this.manufacturer = config["manufacturer"] || "Owl";
    this.model = config["model"] || "Intuition-C";
    this.serial = config["serial"] || "Non-defined serial";

    // Cached Thermostat Data
    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
    this.currentTemperature = 10;
    this.targetTemperature = 10;
    this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;

    // Control Socket
    this.owlIP = undefined;
    this.owlPort = 5100;
    this.udpkey = config["key"];
    this.owlsocket = dgram.createSocket('udp4');

    // Monitor Thermostat
    var LOCAL_BROADCAST_HOST = '224.192.32.19';
    var LOCAL_BROADCAST_PORT = 22600;

    this.multicastsocket = dgram.createSocket('udp4');
    this.multicastsocket.bind(LOCAL_BROADCAST_PORT, function() {
        this.log('Opened Port');
        this.multicastsocket.addMembership(LOCAL_BROADCAST_HOST);
    }.bind(this));

    this.multicastsocket.on("listening", function() {
        this.log("Listening")
    }.bind(this));

    this.multicastsocket.on("message", function(msg, rinfo) {
        if(rinfo.address != this.owlIP) {
            this.owlIP = rinfo.address;

            this.log("Device IP Address", this.owlIP);
        }

        var json = xml.toJson(msg);
        var data = JSON.parse(json);

        if (data.heating) {
            var zone = data.heating.zones.zone;

            var oldCurrent = this.currentTemperature;
            var oldTarget = this.targetTemperature;

            this.currentTemperature = parseFloat(zone.temperature.current);
            this.targetTemperature = parseFloat(zone.temperature.required);

            if (this.currentTemperature != oldCurrent || this.targetTemperature != oldTarget) {
                this.log(zone);

                this.log("New Temperatures: %s -> %s", this.currentTemperature, this.targetTemperature);
            }

            switch (parseInt(zone.temperature.state)) {
                case 1: //Comfort (Running)
                case 7: //Standby (Running)
                    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
                    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
                    break;

                default:
                    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
                    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
                    break;
            }

            this.thermostatService
                .setCharacteristic(Characteristic.CurrentTemperature, this.currentTemperature)
                .setCharacteristic(Characteristic.TargetTemperature, this.targetTemperature)
                .setCharacteristic(Characteristic.CurrentHeatingCoolingState, this.currentHeatingCoolingState)
                .setCharacteristic(Characteristic.TargetHeatingCoolingState, this.targetHeatingCoolingState);
        }
    }.bind(this));
}

OwlThermostat.prototype = {
    getCurrentHeatingCoolingState: function(callback) {
        this.log("Requested Current Heating/Cooling State: %s", this.currentHeatingCoolingState);
        callback(null, this.currentHeatingCoolingState);
    },

    getTargetHeatingCoolingState: function(callback) {
        this.log("Requested Target Heating/Cooling State: %s", this.targetHeatingCoolingState);
        callback(null, this.targetHeatingCoolingState);
    },

    setTargetHeatingCoolingState: function(value, callback) {
        if (this.targetHeatingCoolingState != value) {
            this.log("Set Target Heating/Cooling State: %s", value);

            this.targetHeatingCoolingState = value;
        }

        callback(null);
    },

    getCurrentTemperature: function(callback) {
        this.log("Requested Current Temperature: %s", this.currentTemperature);
        callback(null, this.currentTemperature);
    },

    getTargetTemperature: function(callback) {
        this.log("Requested Target Temperature: %s", this.targetTemperature);
        callback(null, this.targetTemperature);
    },

    setTargetTemperature: function(value, callback) {
        if (this.targetTemperature != value) {
            this.log("Set Target Temperature: %s", value);

            this.targetTemperature = value;
        }

        callback(null);
    },

    getTemperatureDisplayUnits: function(callback) {
        this.log("Requested Temperature Display Units: %s", this.temperatureDisplayUnits);
        callback(null, this.temperatureDisplayUnits);
    },

    getServices: function() {
        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);

        this.thermostatService = new Service.Thermostat(this.name);

        // Required Characteristics
        this.thermostatService
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .on('get', this.getCurrentHeatingCoolingState.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('get', this.getTargetHeatingCoolingState.bind(this))
            .on('set', this.setTargetHeatingCoolingState.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.TargetTemperature)
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on('get', this.getTemperatureDisplayUnits.bind(this));

        return [this.informationService, this.thermostatService];
    }
};
