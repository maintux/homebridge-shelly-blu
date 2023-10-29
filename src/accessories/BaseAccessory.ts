import { PlatformAccessory } from 'homebridge';

export default abstract class BaseAccessory {
  protected _platformAccessory!: PlatformAccessory;

  get platformAccessory(): PlatformAccessory {
    return this._platformAccessory;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract updateStatus(device: any);

}
