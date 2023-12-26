'use strict';
import BaseAPI from './base';
import { isTestNet } from 'common/utils';

class Stake extends BaseAPI {
  _request(api, params = {}, method = 'GET', url = '', catchError) {
    if (isTestNet()) {
      this.baseUrl = 'https://api.mvcswap.com/escrow/test/';
    } else {
      this.baseUrl = 'https://api.mvcswap.com/escrow/';
    }

    if (url) this.baseUrl = url;

    let api_url = this.baseUrl + api;
    return this.sendRequest(api_url, params, method, catchError);
  }

  queryAllPairs(address) {
    if (address) {
      return this._request('allpairs', { address });
    }
    return this._request('allpairs');
  }

  queryStakeInfo(symbol) {
    return this._request('escrowinfo', { symbol });
  }

  queryUserInfo(symbol, address) {
    return this._request('userinfo', { symbol, address });
  }

  reqStake(params) {
    return this._request('reqescrowargs', params, 'POST');
  }

  deposit(params) {
    return this._request('deposit', params, 'POST');
  }

  unlock(params) {
    return this._request('unlock', params, 'POST');
  }

  withdraw(params) {
    return this._request('withdraw', params, 'POST');
  }

  withdraw2(params) {
    return this._request('withdraw2', params, 'POST');
  }

  harvest(params) {
    return this._request('harvest', params, 'POST');
  }

  harvest2(params) {
    return this._request('harvest2', params, 'POST');
  }

  voteinfo(params) {
    return this._request('voteinfo', params);
  }

  vote(params) {
    return this._request('vote', params, 'POST');
  }

  vote2(params) {
    return this._request('vote2', params, 'POST');
  }
}

export default new Stake();
