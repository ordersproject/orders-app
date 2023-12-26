'use strict';
import BaseAPI from './base';
import { isTestNet } from 'common/utils';

const intervals = {
  '1D': 144,
  '1W': 144 * 7,
  '1M': 144 * 30,
  ALL: 2,
};
class History extends BaseAPI {
  _request(api, params = {}, method = 'GET', url = '', catchError) {
    if (isTestNet()) {
      this.baseUrl = 'https://api.sensiblequery.com/test/';
    } else {
      this.baseUrl = 'https://api.sensiblequery.com/';
    }

    if (url) this.baseUrl = url;

    let api_url = this.baseUrl + api;
    return this.sendRequest(api_url, params, method, catchError);
  }

  // blockInfo() {
  //   return this._request(`blockchain/info`);
  // }

  query(params) {
    const { codeHash, genesisHash, type, timeRange } = params;
    if (type === 'pool') {
      return this._request(
        `contract/swap-aggregate-amount/${codeHash}/${genesisHash}`,
        {
          start: 690000,
          size: 100,
        },
      );
    } else {
      return this._request(
        `contract/swap-aggregate/${codeHash}/${genesisHash}`,
        {
          start: 690000,
          interval: intervals[timeRange.toUpperCase()] || 2,
        },
      );
    }
  }

  genesisInfo(params) {
    const {
      codeHash = '777e4dd291059c9f7a0fd563f7204576dcceb791',
      genesisHash,
    } = params;
    return this._request(`ft/genesis-info/${codeHash}/${genesisHash}`);
  }
}

export default new History();
