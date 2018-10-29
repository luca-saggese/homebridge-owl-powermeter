# homebridge-owl-powermeter

Supports Owl Intuition-C Power Meter.

Currently monitoring of power and energy.

Based on ZoneMR's work
https://github.com/ZoneMR/homebridge-owl-thermostat

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-owl-powermeter (not published yet)
3. Update your configuration file. See sample-config.json in this repository for a sample.

# Configuration


Configuration sample file:

 ```
 "accessories": [
     {
         "accessory": "OwlPowerMeter",
         "name": "Hallway PowerMeter"
     }
 ]

```
