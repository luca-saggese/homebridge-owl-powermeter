var dgram = require('dgram');
var xml = require('xml2json');

var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-owl-powermeter", "OwlPowerMeter", OwlPowerMeter);
}

function OwlPowerMeter(log, config) {
    this.log = log;

    // Info
    this.name = config["name"];
    this.manufacturer = config["manufacturer"] || "Owl";
    this.model = config["model"] || "Intuition-C";
    this.serial = config["serial"] || "Non-defined serial";
    var that=this;
    

    // Cached Energy Data
    this.currentPower = 10;
    this.currentEnergy = 10;

    // Control Socket
    this.owlIP = undefined;
    this.owlPort = 5100;
    this.udpkey = config["key"];
    this.owlsocket = dgram.createSocket('udp4');

    // Monitor Energy
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

    /*
    {
  "electricity": {
    "-id": "12345678912C",
    "timestamp": "1499337272",
    "signal": {
      "-rssi": "-42",
      "-lqi": "0"
    },
    "battery": { "-level": "100%" },
    "chan": [
      {
        "-id": "0",
        "curr": {
          "-units": "w",
          "#text": "402.00"
        },
        "day": {
          "-units": "wh",
          "#text": "4688.50"
        }
      },
      {
        "-id": "1",
        "curr": {
          "-units": "w",
          "#text": "0.00"
        },
        "day": {
          "-units": "wh",
          "#text": "0.00"
        }
      },
      {
        "-id": "2",
        "curr": {
          "-units": "w",
          "#text": "0.00"
        },
        "day": {
          "-units": "wh",
          "#text": "0.00"
        }
      }
    ]
  }
}
    
    */
    
    
    this.multicastsocket.on("message", function(msg, rinfo) {
        if(rinfo.address != this.owlIP) {
            this.owlIP = rinfo.address;

            this.log("Device IP Address", this.owlIP);
        }

        var json = xml.toJson(msg);
        var data = JSON.parse(json);

        if (data.electricity) {
            var chan = data.electricity.chan[0];

            var oldPower = this.currentPower;
            var oldEnergy = this.currentEnergy;

            this.currentPower = parseFloat(chan.curr);
            this.currentEnergy = parseFloat(chan.day);

            if (this.currentPower != oldPower || this.currentEnergy != oldEnergy) {
                this.log(zone);

                this.log("New Power: %s -> %s", this.oldPower, this.currentPower);
            }
        }
    }.bind(this));
}

OwlPowerMeter.prototype = {

    getCurrentEnergy: function(callback) {
        this.log("Requested Current Energy: %s", this.currentEnergy);
        callback(null, this.currentEnergy);
    },

    getCurrentPower: function(callback) {
        this.log("Requested Current Power: %s", this.currentPower);
        callback(null, this.currentPower);
    },

    getServices: function() {
        var EnergyCharacteristics = require('./lib/customCharacteristics').EnergyCharacteristics(Characteristic);
        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        this.deviceGroup = 'EnergyMeter';
        var thisCharacteristic;

        this.energyService = new Service(this.name);

        // Required Characteristics
        thisCharacteristic=this.energyService
            .addCharacteristic(EnergyCharacteristics.TotalConsumption1);
        thisCharacteristic.on('get', this.getCurrentEnergy.bind(this));
        that.platform.addAttributeUsage("energy", this.deviceid, thisCharacteristic);

        thisCharacteristic=this.energyService
            .addCharacteristic(EnergyCharacteristics.CurrentConsumption1);
        thisCharacteristic.on('get', this.getCurrentPower.bind(this));
        that.platform.addAttributeUsage("power", this.deviceid, thisCharacteristic);
            
        return [this.informationService, this.energyService];
    }
};
