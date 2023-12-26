'use strict';
import BaseAPI from './base';

class Token extends BaseAPI {
  queryAllPairs() {
    return this._request('allpairs');
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

export default new Token();
