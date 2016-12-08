# homebridge-owl-thermostat

Supports Owl Intuition-C Thermostat.

Currently monitoring of temperature only, no other features.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-http-temperature (not published yet)
3. Update your configuration file. See sample-config.json in this repository for a sample.

# Configuration


Configuration sample file:

 ```
 "accessories": [
     {
         "accessory": "OwlThermostat",
         "name": "Hallway Thermostat"
     }
 ]

```
