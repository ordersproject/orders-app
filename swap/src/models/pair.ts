import 'whatwg-fetch';
import BigNumber from 'bignumber.js';
import pairApi from '../api/pair';
import customApi from '../api/custom';
import { MVCSWAP_CURRENT_PAIR } from 'common/const';
import debug from 'debug';
import { getCurrentPair } from 'common/utils';
import { filterTokens } from 'common/pairUtils';

const log = debug('pair');
//TODO:
const iconBaseUrl = 'https://icons.mvcswap.com/resources';

const { localStorage } = window;

export default {
  namespace: 'pair',

  state: {
    allPairs: {},
    pairList: {},
    currentPair: '',
    customPair: false,
    pairData: {},
    token1: {},
    token2: {},
    LP: 100000,
    iconList: '',
    tokenPrices: {},
    currentToken1: 'SPACE',
    currentToken2: '',
  },

  subscriptions: {
    async setup({ dispatch, history }) {
      const iconUrl = `${iconBaseUrl}/icons.json`;
      fetch(iconUrl)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          let icons;
          // console.log(data);
          if (data.success && data.data) {
            icons = {};
            data.data.forEach((item) => {
              icons[item.genesis.toString()] = {
                url: `${iconBaseUrl}/${item.logo}`,
              };
              icons[item.symbol] = {
                url: `${iconBaseUrl}/${item.logo}`,
              };
            });
            icons.mvc = icons.SPACE;
            icons.MVC = icons.SPACE;
          }
          dispatch({
            type: 'save',
            payload: {
              iconList: icons,
            },
          });
        });
    },
  },

  effects: {
    *getAllPairs({ payload }, { call, put, select }) {
      let currentPair;
      if (payload) {
        currentPair = payload.currentPair;
      }

      let res = yield pairApi.queryAllPairs.call(pairApi);
      log('allPairs:', res);

      const { data } = res;

      if (res.code !== 0) {
        console.log(res.msg);
        return res;
      }
      let allPairs = { ...data };

      // console.log('urlPair:', urlPair)

      let customPair;
      if (!currentPair) {
        currentPair = getCurrentPair();
        if (!allPairs[currentPair]) {
          currentPair = Object.keys(allPairs)[0];
        }
      }
      // console.log(currentPair);

      const currentPairArr = currentPair.split('-');
      let [currentToken1, currentToken2] = currentPairArr;
      if (currentPairArr.length === 1) {
        currentToken1 = 'mvc';
        currentToken2 = currentPairArr[0];
      }
      // const pairData = yield select((state) => state.pair);
      const { token1Arr, token2Arr } = filterTokens({
        allPairs,
        token1ID: currentToken1,
        token2ID: currentToken2,
      });
      // console.log('localStorage:',localStorage.getItem(MVCSWAP_CURRENT_PAIR))

      if (data[currentPair]) {
        customPair = false;
      } else {
        const res1 = yield customApi.pairInfo.call(customApi, {
          symbol: currentPair,
        });
        // console.log(res1);
        if (!res1.code) {
          if (res1.data && res1.data.length > 0) {
            allPairs[currentPair] = res1.data[0];
            // res1.data.forEach((item) => {

            // });
            customPair = true;
          }
        } else {
          customPair = false;
          currentPair = '';
        }
      }

      // console.log('105-currentPair:',currentPair, 'payload:',payload)
      if (!currentPair || !allPairs[currentPair]) {
        Object.keys(data).forEach((item) => {
          if (item.indexOf('mvc-') > -1 || item.indexOf('-mvc') > -1) {
            currentPair = item;
            customPair = false;
          }
        });
      }

      // console.log('localstorage.set:', currentPair);
      localStorage.setItem(MVCSWAP_CURRENT_PAIR, currentPair || '');

      yield put({
        type: 'savePair',
        payload: {
          allPairs,
          currentPair,
          pairList: { ...data },
          customPair,
          token1Arr,
          token2Arr,
          currentToken1,
          currentToken2,
          // mode: 'init',
        },
      });
      return allPairs;
    },

    *getPairData({ payload }, { call, put, select }) {
      let { currentPair } = payload;
      const pairData = yield select((state) => state.pair);
      if (!currentPair) {
        currentPair = pairData.currentPair;
      }

      const { customPair, allPairs } = pairData;
      const api = customPair ? customApi : pairApi;
      const res = yield api.querySwapInfo.call(
        api,
        allPairs[currentPair].lptoken.tokenID,
      );
      log('init-pairData:', currentPair, res);
      const { code, msg, data } = res;
      if (code !== 0) {
        console.log(msg);
        return res;
      }
      if (currentPair) {
        yield put({
          type: 'savePair',
          payload: {
            pairData: data,
            currentPair,
            mode: 'force',
          },
        });
      }

      // console.log(data)
      return data;
    },

    *updatePairData({ payload }, { call, put, select }) {
      // let { currentPair } = payload;
      const pairData = yield select((state) => state.pair);
      const { customPair, allPairs, currentPair } = pairData;
      if (!currentPair) return;
      const api = customPair ? customApi : pairApi;
      const res = yield api.querySwapInfo.call(
        api,
        allPairs[currentPair].lptoken.tokenID,
      );
      const { code, msg, data } = res;
      if (code !== 0) {
        return res;
      }
      yield put({
        type: 'save',
        payload: {
          pairData: data,
        },
      });

      // console.log(data)
      return data;
    },

    *getUSDPrice({ payload }, { call, put, select }) {
      let res
      try {
        res = yield pairApi.queryAllPairs.call(pairApi);
      } catch (error) {
        console.log(error)
        return
      }
      if (!res || res.code !== 0) return;
      // console.log('allPairs:', res);
      let tokenPrices = {};
      const USDTDecimal = 6;
      Object.keys(res.data).forEach((key) => {
        const item = res.data[key];
        const { poolAmount, token1Amount, token2Amount, token1, token2 } = item;
        const token1SymbolUpper = token1.symbol;
        const token2SymbolUpper = token2.symbol;
        if (!tokenPrices[token1SymbolUpper]) {
          tokenPrices[token1SymbolUpper] =
            parseFloat(poolAmount) > 0
              ? BigNumber(poolAmount)
                  .div(token1Amount)
                  .multipliedBy(Math.pow(10, token1.decimal - USDTDecimal))
                  .toString()
              : '0';
        }
        if (!tokenPrices[token2SymbolUpper]) {
          tokenPrices[token2SymbolUpper] =
            parseFloat(poolAmount) > 0
              ? BigNumber(poolAmount)
                  .div(token2Amount)
                  .multipliedBy(Math.pow(10, token2.decimal - USDTDecimal))
                  .toString()
              : '0';
        }
      });
      // const oldTokenPrices = yield select((state) => state.pair.tokenPrices);
      // console.log(tokenPrices);

      yield put({
        type: 'save',
        payload: {
          tokenPrices,
        },
      });
    },

    *changeCurrentToken({ payload }, { call, put, select }) {
      const { token1ID = 'MVC', token2ID } = payload;

      const pairData = yield select((state) => state.pair);
      const { allPairs } = pairData;
      let currentToken1 = token1ID || pairData.currentToken1;
      let currentToken2 = token2ID || pairData.currentToken2;

      const { token1Arr, token2Arr } = filterTokens({
        allPairs,
        token1ID: currentToken1,
      });
      if (!currentToken2) currentToken2 = token2Arr[0].tokenID;

      let currentPair;
      Object.keys(allPairs).forEach((item) => {
        if (
          (allPairs[item].token1.symbol.toUpperCase() ===
            currentToken1.toUpperCase() ||
            allPairs[item].token1.tokenID === currentToken1) &&
          (allPairs[item].token2.symbol.toUpperCase() ===
            currentToken2.toUpperCase() ||
            allPairs[item].token2.tokenID === currentToken2)
        ) {
          currentPair = item;
        }
      });
      if (!currentPair) {
        currentToken2 = token2Arr[0].tokenID;
        Object.keys(allPairs).forEach((item) => {
          if (
            (allPairs[item].token1.symbol.toUpperCase() ===
              currentToken1.toUpperCase() ||
              allPairs[item].token1.tokenID === currentToken1) &&
            (allPairs[item].token2.symbol.toUpperCase() ===
              currentToken2.toUpperCase() ||
              allPairs[item].token2.tokenID === currentToken2)
          ) {
            currentPair = item;
          }
        });
      }
      yield put({
        type: 'save',
        payload: {
          currentToken1,
          currentToken2,
          token1Arr,
          token2Arr,
          currentPair,
        },
      });
      return currentPair;
    },

    *reqSwap({ payload }, { call, put, select }) {
      payload.source = 'mvcswap.com';
      const customPair = yield select((state) => state.pair.customPair);
      const api = customPair ? customApi : pairApi;
      const res = yield api.reqSwap.call(api, payload);
      log('reqSwap:', res);
      return res;
    },

    *swap({ payload }, { call, put, select }) {
      const customPair = yield select((state) => state.pair.customPair);
      const api = customPair ? customApi : pairApi;
      const res = yield api.swap.call(api, payload);
      log('swap:', payload, res);
      return res;
    },

    *token1toToken2({ payload }, { call, put, select }) {
      const customPair = yield select((state) => state.pair.customPair);
      const api = customPair ? customApi : pairApi;
      const res = yield api.token1toToken2.call(api, payload);
      log('swap:', payload, res);
      return res;
    },

    *token2toToken1({ payload }, { call, put, select }) {
      const customPair = yield select((state) => state.pair.customPair);
      const api = customPair ? customApi : pairApi;
      const res = yield api.token2toToken1.call(api, payload);
      log('swap:', payload, res);
      return res;
    },

    *addLiq({ payload }, { call, put, select }) {
      const customPair = yield select((state) => state.pair.customPair);
      const api = customPair ? customApi : pairApi;
      const res = yield api.addLiq.call(api, payload);
      log('addLiq:', payload, res);
      return res;
    },

    *removeLiq({ payload }, { call, put, select }) {
      const customPair = yield select((state) => state.pair.customPair);
      const api = customPair ? customApi : pairApi;
      const res = yield api.removeLiq.call(api, payload);
      log('removeLiq:', payload, res);
      return res;
    },
  },

  reducers: {
    save(state, action) {
      return { ...state, ...action.payload };
    },
    savePair(state, action) {
      let { allPairs, currentPair, mode } = action.payload;
      if (!allPairs) allPairs = state.allPairs;
      if (!currentPair || !allPairs[currentPair]) {
        log('no currentPair');
        return { ...state, allPairs, currentPair };
      }

      if (mode === 'init' && state.currentPair && allPairs[state.currentPair]) {
        currentPair = state.currentPair;
      }

      const { token1, token2, lptoken, rabinApis } = allPairs[currentPair];
      const symbol1 = token1.symbol;
      const symbol2 = token2.symbol;

      return {
        ...state,
        ...action.payload,
        currentPair,
        token1: { ...token1, symbol: symbol1, isMvc: symbol1 === 'space' },
        token2: { ...token2, symbol: symbol2 },
        lptoken,
        rabinApis,
      };
    },
  },
};
