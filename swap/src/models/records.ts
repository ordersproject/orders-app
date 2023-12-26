import recordsApi from '../api/sensiblequery';
import { StableToken } from 'common/const';
import {
  formatTime,
  formatAmount,
  getCurrentPair,
  getTimeAgo,
} from 'common/utils';
import debug from 'debug';
const log = debug('records');

export default {
  namespace: 'records',

  state: {
    timeRange: '1d', // '4h' | '1d' | '1w' | '1m' | 'all'
  },

  subscriptions: {
    async setup({ dispatch, history }) {},
  },

  effects: {
    *query({ payload }, { call, put, select }) {
      return [];
      /*const allPairs = yield select((state) => state.pair.allPairs);

      let currentPair = getCurrentPair();

      if (!currentPair) {
        return [];
      }
      const timeRange = yield select((state) => state.records.timeRange);
      const { swapCodeHash, swapID, token2, token1 } =
        allPairs[currentPair] || {};

      const currentPairSymbol = `${token1.symbol.toUpperCase()}-${token2.symbol.toUpperCase()}`;

      const { type } = payload;
      if (!swapCodeHash || !swapID) return [];
      const res = yield recordsApi.query.call(recordsApi, {
        codeHash: swapCodeHash,
        genesisHash: swapID,
        // currentPair,
        type,
        timeRange,
      });

      if (!res || res.code) {
        console.log(res.msg);
        return [];
      }
      if (res.data && res.data.length < 1) {
        return [];
      }
      // log('chart data: ', res);
      const newData = [...res.data].reverse();

      const dataTimeline = [];

      if (newData.length > 0) {
        const startTimestamp = getTimeAgo(timeRange);

        if (type === 'pool') {
          newData.forEach((item, i) => {
            const { closeAmount, timestamp } = item;
            if (i > 0 && (!startTimestamp || timestamp > startTimestamp)) {
              dataTimeline.push({
                timestamp: timestamp * 1000,
                formattedTime: formatTime(timestamp * 1000),
                amount: formatAmount(
                  (closeAmount / Math.pow(10, token1.decimal)) * 2,
                  token1.decimal,
                ),
              });
            }
          });
        } else {
          newData.forEach((item, i) => {
            const { minPrice, maxPrice, token1Volume, timestamp } = item;
            // if (i > 0 && (!startTimestamp || timestamp > startTimestamp)) {
            const _timestamp = formatTime(timestamp * 1000);
            const stepData = {
              timestamp: timestamp * 1000,
              formattedTime:
                timeRange === 'all' ? _timestamp : _timestamp.substr(0, 10),
              volumn: formatAmount(
                (token1Volume / Math.pow(10, token1.decimal)) * 2,
                token1.decimal,
              ),
            };

            let _price =
              (minPrice + maxPrice) /
              2 /
              Math.pow(10, token1.decimal - token2.decimal);
            if (StableToken.indexOf(token2.symbol.toUpperCase()) > -1) {
              _price = 1 / _price;
              stepData.price = formatAmount(_price, 6);
            } else {
              stepData.price = formatAmount(_price, token1.decimal);
            }

            dataTimeline.push(stepData);
            // }
          });
        }
      }

      // console.log(dataTimeline)
      return dataTimeline;*/
    },
  },

  reducers: {
    save(state, action) {
      return { ...state, ...action.payload };
    },
  },
};
