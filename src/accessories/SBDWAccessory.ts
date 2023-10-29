/* eslint-disable max-len */
import { Service, Categories } from 'homebridge';

import { ShellyBluPlatform } from '../platform';
import { PositionState, StatusLowBattery } from 'hap-nodejs/dist/lib/definitions';
import BaseAccessory from './BaseAccessory';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SBDWAccessory extends BaseAccessory{
  private service: Service;

  constructor(
    private readonly platform: ShellyBluPlatform,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    device: any,
  ) {

    super();

    // TODO: Get sensor type from config
    // this.platform.config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sensorType: any = Categories.DOOR;

    const uuid = this.platform.api.hap.uuid.generate(device.uniqueId);
    this._platformAccessory = new this.platform.api.platformAccessory(device.code, uuid, sensorType);

    // set accessory information
    this._platformAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Allterco')
      .setCharacteristic(this.platform.Characteristic.Model, 'Shelly BLU Door Window')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.uniqueId);

    // get the Door service if it exists, otherwise create a new Door service
    // you can create multiple services for each accessory
    switch (sensorType) {
      case Categories.DOOR:
        this.service = this._platformAccessory.getService(this.platform.Service.Door) || this._platformAccessory.addService(this.platform.Service.Door);
        break;
      case Categories.WINDOW:
        this.service = this._platformAccessory.getService(this.platform.Service.Window) || this._platformAccessory.addService(this.platform.Service.Window);
        break;
      default:
        throw new Error(`Invalid sensor type ${sensorType}`);
    }

    if(device.payload) {
      this.updateStatus(device);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateStatus(device: any) {
    this.platform.log.debug(`Update device ${device.uniqueId} status`);

    this._platformAccessory.context.device = {
      uniqueId: device.uniqueId,
      code: device.code,
      currentPosition: device.payload['window:0'].open ? 100 : 0,
      positionState: PositionState.STOPPED,
      targetPosition: 0,
      illuminance: device.payload['illuminance:0'].lux,
      // eslint-disable-next-line max-len
      statusLowBattery: device.payload['devicepower:0'].battery.percent < 10 ? StatusLowBattery.BATTERY_LEVEL_LOW : StatusLowBattery.BATTERY_LEVEL_NORMAL,
      batteryLevel: device.payload['devicepower:0'].battery.percent,
    };
    this.platform.log.debug('%j', this._platformAccessory.context.device);

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).on('set', (value, callback) => {
      this.platform.log.debug('SET TargetPosition', value);
      callback(null);
    });

    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this._platformAccessory.context.device.currentPosition);
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, this._platformAccessory.context.device.positionState);
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this._platformAccessory.context.device.targetPosition);

    const battery = this._platformAccessory.getService(this.platform.Service.Battery) ||
      this._platformAccessory.addService(this.platform.Service.Battery, 'Battery', `${this._platformAccessory.context.device.uniqueId}-battery`);
    battery.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this._platformAccessory.context.device.statusLowBattery);
    battery.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this._platformAccessory.context.device.batteryLevel);

    const lightSensor = this._platformAccessory.getService(this.platform.Service.LightSensor) ||
      this._platformAccessory.addService(this.platform.Service.LightSensor, 'Light Sensor', `${this._platformAccessory.context.device.uniqueId}-light-sensor`);
    lightSensor.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).on('set', (value, callback) => {
      this.platform.log.debug('SET CurrentAmbientLightLevel', value);
      callback(null);
    });
    lightSensor.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, this._platformAccessory.context.device.illuminance);

  }

}
