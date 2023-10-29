import ConfigStorage from './configStorage';
import JWT from 'jsonwebtoken';
import { is_shelly_access_token_t as is_shelly_access_token, is_shelly_auth_code_token, shelly_generic_response_t } from './shellyTypes';
import fetch, { RequestInit, BodyInit } from 'node-fetch';
import { API, Logger, PlatformConfig } from 'homebridge';
import { createHash } from 'node:crypto';

export { BodyInit } from 'node-fetch';

export interface TOauthParams {
  auth_code: string;
  client_id: string;
  access_token: string;
  access_token_exp: number;
  user_api_url_pref: string;
  user_api_url: URL;
}

export default class ShellyCloudApi {
  private LOGIN_URL = 'https://api.shelly.cloud/oauth/login';
  private CLIENT_ID = 'shelly-diy';
  private _api: API;
  private _log: Logger;
  private _config: PlatformConfig;
  private _params: TOauthParams | undefined;
  private _authCode: string | undefined;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this._api = api;
    this._log = log;
    this._config = config;
  }

  private _getAuthCode = async (): Promise<void> => {
    if(!this._authCode) {
      const params = new URLSearchParams();
      const hash = createHash('sha1');
      hash.update(this._config.password);
      params.append('email', this._config.email);
      params.append('password', hash.digest('hex'));
      params.append('client_id', this.CLIENT_ID);

      const response = await fetch(this.LOGIN_URL, {method: 'POST', body: params, redirect: 'manual', follow: 0});
      const body = await response.json();
      if (!body.isok) {
        throw new Error('Get Auth Code failed. Errors: %j' + body.errors);
      }
      this._authCode = body.data.code;
    }
  };

  private _getOauthParams = async (): Promise<void> => {
    if (this._params && this._params.access_token_exp > Date.now() + 10000) {
      this._log.debug('reusing access token...');
      return Promise.resolve();
    }

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {

      await this._getAuthCode();
      const configStorage = new ConfigStorage(this._log, this._api, this._authCode as string);

      if (!this._params) {
        const cfg = configStorage.config;
        const decoded = JWT.decode(cfg.auth_code);
        if (!is_shelly_auth_code_token(decoded)) {
          reject(new Error('auth code does not seem right! auth_code:' + cfg.auth_code));
          return;
        }
        this._params = {
          user_api_url_pref: decoded.user_api_url,
          user_api_url: new URL(decoded.user_api_url),
          access_token: '',
          client_id: encodeURIComponent(decoded.sub),
          access_token_exp: 0,
          auth_code: cfg.auth_code,
        };
        if (cfg.access_token !== undefined) {
          const decoded = JWT.decode(cfg.access_token);
          if (is_shelly_access_token(decoded) && (decoded.exp * 1000 > Date.now() + 10000)) {
            this._params.access_token = cfg.access_token;
            this._params.access_token_exp = decoded.exp * 1000;
            this._log.debug('restored access token...');
            return resolve();
          }
        }
      }

      try {
        this._log.debug('refreshing access token...');
        // eslint-disable-next-line max-len
        const req = await fetch(this._params.user_api_url_pref + '/oauth/auth?client_id=' + this._params.client_id + '&grant_type=code&code=' + encodeURIComponent(this._params.auth_code));
        if (req.status !== 200) {
          return reject(new Error('/oauth/auth failed code:' + req.status));
        }
        const resp = await req.json();
        if (resp && typeof (resp) === 'object' && typeof resp.access_token === 'string') {
          const decoded = JWT.decode(resp.access_token);
          if (!is_shelly_access_token(decoded)) {
            return reject(new Error('/oauth/auth returned invalid token:' + resp.access_token));
          }
          this._params.access_token = resp.access_token;
          this._params.access_token_exp = decoded.exp * 1000;
          if (this._params.access_token_exp < Date.now() + 10000) {
            return reject(new Error('/oauth/auth returned invalid (already expired) token:' + resp.access_token));
          }
          const cfg = configStorage.config;
          cfg.access_token = this._params.access_token;
          configStorage.config = cfg;
          return resolve();
        } else {
          return reject(new Error('/oauth/auth invalid payload:' + JSON.stringify(resp)));
        }
      } catch (err) {
        if (!(err instanceof Error)) {
          // eslint-disable-next-line no-ex-assign
          err = new Error(String(err));
        }
        return reject(err);
      }
    });

  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call = async (suffix: string, method = 'GET', body?: BodyInit, content_type?: string): Promise<shelly_generic_response_t> => {
    await this._getOauthParams();
    if (this._params) {
      const init: RequestInit = {};
      init.method = method;
      init.headers = <Record<string, string>>{};
      init.headers['Authorization'] = 'Bearer ' + this._params.access_token;
      if (content_type !== undefined) {
        init.headers['Content-type'] = content_type;
      }

      if (body) {
        init.body = body;
      }

      const response = await fetch(this._params.user_api_url_pref + suffix, init);
      return await response.json();
    } else {
      throw new Error('Shelly Cloud - invalid OAuth params');
    }
  };

  getWSEndpoint = async (): Promise<string> => {
    await this._getOauthParams();
    if (this._params) {
      return `wss://${this._params.user_api_url.host}:6113/shelly/wss/hk_sock?t=${this._params.access_token}`;
    } else {
      throw new Error('Shelly Cloud - invalid OAuth params');
    }
  };

}
