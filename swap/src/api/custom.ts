'use strict';
import BaseAPI from './base';
import { isTestNet } from 'common/utils';

class Custom extends BaseAPI {
  _request(api, params = {}, method = 'GET', url = '', catchError) {
    if (isTestNet()) {
      this.baseUrl = 'https://api.mvcswap.com/swap/test/';
    } else {
      this.baseUrl = 'https://api.mvcswap.com/swap/';
    }

    if (url) this.baseUrl = url;

    let api_url = this.baseUrl + api;
    return this.sendRequest(api_url, params, method, catchError);
  }

  allPairs() {
    return this._request('allpairs');
  }

  req(params) {
    return this._request('reqcreateswap', params, 'POST');
  }

  createswap(params) {
    return this._request('createswap', params, 'POST');
  }

  pairInfo(params) {
    return this._request('pairinfo', params);
  }

  getTokenInfo(sensibleId) {
    return this._request('tokeninfo', { sensibleId });
  }

  querySwapInfo(symbol) {
    return this._request('swapinfo', { symbol });
  }

  reqSwap(params) {
    return this._request('reqswapargs', params, 'POST');
  }

  swap(params) {
    const apiName = params.op === 3 ? 'token1toToken2' : 'token2toToken1';

    return this._request(apiName, params, 'POST');
  }
  token1toToken2(params) {
    return this._request('token1totoken2', params, 'POST');
  }

  token2toToken1(params) {
    return this._request('token2totoken1', params, 'POST');
  }

  addLiq(params) {
    return this._request('addliq', params, 'POST');
  }

  removeLiq(params) {
    return this._request('removeliq', params, 'POST');
  }
}

export default new Custom();
