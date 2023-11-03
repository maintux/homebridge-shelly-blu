/* eslint-disable max-len */
import { PlatformAccessory } from 'homebridge';

import { ShellyBluPlatform } from '../platform';
import { StatusLowBattery, ContactSensorState } from 'hap-nodejs/dist/lib/definitions';
import BaseAccessory from './BaseAccessory';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SBDWAccessory extends BaseAccessory{

  constructor(
    private readonly platform: ShellyBluPlatform,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    device: any,
    platformAccessory?: PlatformAccessory,
  ) {

    super();

    if (!platformAccessory) {

      const uuid = this.platform.api.hap.uuid.generate(device.uniqueId);
      this._platformAccessory = new this.platform.api.platformAccessory(device.code, uuid);
      this._platformAccessory.context.unique_id = device.uniqueId;
      this._platformAccessory.context.code = device.code;

      // set accessory information
      this._platformAccessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Allterco')
        .setCharacteristic(this.platform.Characteristic.Model, 'Shelly BLU Door Window')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, device.uniqueId);

      if(device.payload) {
        this.updateStatus(device);
      }
    } else {
      this._platformAccessory = platformAccessory;
    }

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateStatus(device: any) {
    this.platform.log.debug(`Update device ${device.uniqueId} status`);

    const _device = {
      uniqueId: device.uniqueId,
      code: device.code,
      contactSensorState: device.payload['window:0'].open ? ContactSensorState.CONTACT_NOT_DETECTED : ContactSensorState.CONTACT_DETECTED,
      illuminance: device.payload['illuminance:0'].lux,
      // eslint-disable-next-line max-len
      statusLowBattery: device.payload['devicepower:0'].battery.percent < 10 ? StatusLowBattery.BATTERY_LEVEL_LOW : StatusLowBattery.BATTERY_LEVEL_NORMAL,
    };
    this.platform.log.debug('%j', _device);

    const primaryService = this._platformAccessory.getService(this.platform.Service.ContactSensor) ||
          this._platformAccessory.addService(this.platform.Service.ContactSensor);
    primaryService.getCharacteristic(this.platform.Characteristic.ContactSensorState).setValue(_device.contactSensorState);
    primaryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery).setValue(_device.statusLowBattery);

    const lightSensor = this._platformAccessory.getService(this.platform.Service.LightSensor) ||
      this._platformAccessory.addService(this.platform.Service.LightSensor, `${_device.code} Light Sensor`, `${_device.uniqueId}-light-sensor`);
    lightSensor.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).setValue(_device.illuminance);
    primaryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery).setValue(_device.statusLowBattery);

  }

}
