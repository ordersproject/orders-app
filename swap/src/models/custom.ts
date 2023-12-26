import customApi from '../api/custom';
import { MVCSWAP_SOURCE } from 'common/const';
import debug from 'debug';
const log = debug('createPair');

export default {
  namespace: 'custom',

  state: {},

  subscriptions: {
    async setup({ dispatch, history }) {},
  },

  effects: {
    *query({ payload }, { call, put, select }) {
      const { genesisHash } = payload;
      // console.log(payload)
      const res = yield customApi.getTokenInfo.call(customApi, genesisHash);

      if (res.code) {
        // console.log(res.msg);
        return res;
      }

      return res.data;
    },

    *req({ payload }, { call, put, select }) {
      const { address } = payload;
      const res = yield customApi.req.call(customApi, {
        address,
        source: MVCSWAP_SOURCE,
      });

      if (res.code) {
        return res;
      }

      return res.data;
    },

    *createSwap({ payload }, { call, put, select }) {
      const { data } = payload;
      const res = yield customApi.createswap.call(customApi, {
        data,
      });
      // console.log(res);
      if (res.code) {
        return res;
      }

      return res.data;
    },

    *pairInfo({ payload }, { call, put, select }) {
      const { symbol } = payload;
      const res = yield customApi.pairInfo.call(customApi, {
        symbol,
      });
      // console.log(res);
      if (res.code) {
        return res;
      }
      res.data.forEach((item) => {
        item.name = `${item.token1.symbol}-${item.token2.symbol}`;
      });
      return res.data;
    },
    *allPairs({ payload }, { call, put, select }) {
      const res = yield customApi.allPairs.call(customApi);
      log(res);
      if (res.code) {
        return [];
      }
      yield put({
        type: 'save',
        payload: {
          customAllPairs: res.data,
        },
      });
      return res.data;
    },
  },

  reducers: {
    save(state, action) {
      return { ...state, ...action.payload };
    },
  },
};
