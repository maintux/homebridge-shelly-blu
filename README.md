<a href="https://github.com/mainthx/homebridge-shelly-blu"><img src="homebridge-shelly-blu.png" height="120"></a>

# homebridge-shelly-blu
[![npm-version](https://badgen.net/npm/v/homebridge-shelly-blu)](https://www.npmjs.com/package/homebridge-shelly-blu)
<!-- [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) -->

[Homebridge](https://homebridge.io) plugin for [Shelly](https://shelly.cloud),
enabling HomeKit support for the Shelly BLU devices using cloud API.

## Supported devices

* [Shelly BLU Door Window Sensor](https://kb.shelly.cloud/knowledge-base/shellyblu-door-window)

## Installation

Either install this plugin through [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x)
or manually by following these instructions:

1. Install Homebridge by [following the instructions](https://github.com/homebridge/homebridge/wiki).
2. Install this plugin by running `npm install -g homebridge-shelly-blu`.
3. Add this plugin to the Homebridge config.json:
  ```
  "platforms": [
    {
      "name": "homebridge-shelly-blu",
      "platform": "ShellyBlu",
      "email": "<your_shelly_cloud_username>",
      "password": "<your_shelly_cloud_password>"
    }
  ]
  ```

By default, devices will be discovered from your registered devices in the cloud and
WebSockets will then be used to communicate with them.
