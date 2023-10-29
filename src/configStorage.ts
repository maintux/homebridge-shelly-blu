import fs from 'fs';
import { API, Logger } from 'homebridge';

export interface TConfig extends Record<string, unknown> {
  auth_code: string;
  access_token?: string;
}

class ConfigStorage {
  private _config: TConfig;
  private _configFileName: string;

  constructor(
    public readonly log: Logger,
    public readonly api: API,
    public readonly authCode: string,
  ) {
    this._configFileName = `${api.user.storagePath()}/shelly_config`;
    try {
      this._config = JSON.parse(fs.readFileSync(this._configFileName, 'utf8'));
    } catch (err) {
      this._config = {
        auth_code: authCode,
      };
    }
  }

  get config(): TConfig {
    return this._config;
  }

  set config(config: TConfig) {
    this._config = config;
    fs.writeFileSync(this._configFileName, JSON.stringify(this._config));
  }

}

export default ConfigStorage;
