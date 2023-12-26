// import BigNumber from 'bignumber.js';
import farmApi from '../api/farm';
// import pairApi from '../api/pair';
import { MVCSWAP_CURRENT_FARM_PAIR, MVCSWAP_SOURCE } from 'common/const';
import { formatSat, getCurrentPair } from 'common/utils';
import { handleFarmData, fetchFarmData } from 'common/farmUtils';
import debug from 'debug';
const log = debug('farm');

export default {
  namespace: 'farm',

  state: {
    allFarmPairs: [],
    allFarmPairsArr: [],
    currentFarmPair: '',
    lockedTokenAmount: 0,
    boostTokenAmount: 0,
    maxBoostRatio: 0,
    boostRewardFactor: 0,
    lptoken: {},
    rewardToken: {},
    boostToken: {},
    pairYields: {},
    pairsData: {},
  },

  subscriptions: {
    async setup({ dispatch, history }) {},
  },

  effects: {
    *getAllPairs({ payload }, { call, put, select }) {
      const res = yield farmApi.queryAllPairs.call(farmApi, payload.address);
      console.log('farmApi:', res);
      let { data } = res;

      if (res.code !== 0) {
        console.log(res.msg);
        return res;
      }

      const pairsData = yield fetchFarmData(data);

      let currentFarmPair = getCurrentPair('farm');
      if (
        !currentFarmPair ||
        !data[currentFarmPair] ||
        !pairsData[data[currentFarmPair].token.tokenID]
      ) {
        Object.keys(data).forEach((item) => {
          if (item !== 'blockTime' && pairsData[data[item].token.tokenID]) {
            currentFarmPair = item;
            // console.log('localstorage.set:', item)
            localStorage.setItem(MVCSWAP_CURRENT_FARM_PAIR, item || '');
          }
        });
      }

      const { tokenPrices } = yield select((state) => state.pair);
      // console.log(tokenPrices)
      let { allFarmData, allFarmArr } = handleFarmData(
        data,
        pairsData,
        tokenPrices,
      );
      // console.log(allFarmData, allFarmArr)

      yield put({
        type: 'saveFarm',
        payload: {
          allFarmPairs: allFarmData,
          allFarmPairsArr: allFarmArr,
          currentFarmPair,
          pairsData,
          blockTime: data.blockTime,
        },
      });
      return {
        data,
        currentFarmPair,
      };
    },

    *updatePairData({ payload }, { call, put, select }) {
      // let { currentPair } = payload;
      const { userAddress } = yield select((state) => state.user.accountInfo);
      const res = yield farmApi.queryAllPairs.call(farmApi, userAddress);
      const { code, data } = res;
      if (code !== 0) {
        return res;
      }

      const { tokenPrices } = yield select((state) => state.pair);
      // const { pairsData } = yield select((state) => state.farm);
      const pairsData = yield fetchFarmData(data);
      let { allFarmData, allFarmArr } = handleFarmData(
        data,
        pairsData,
        tokenPrices,
      );
      // console.log(allFarmData)

      yield put({
        type: 'saveFarm',
        payload: {
          allFarmPairs: allFarmData,
          allFarmPairsArr: allFarmArr,
          blockTime: data.blockTime,
        },
      });

      // console.log(data)
      return data;
    },

    *reqSwap({ payload }, { call, put }) {
      payload.source = MVCSWAP_SOURCE;
      const res = yield farmApi.reqSwap.call(farmApi, payload);
      log('reqSwap:', res);
      return res;
    },

    *deposit({ payload }, { call, put }) {
      const res = yield farmApi.deposit.call(farmApi, payload);
      log('deposit:', payload, res);
      return res;
    },

    *withdraw({ payload }, { call, put }) {
      const res = yield farmApi.withdraw.call(farmApi, payload);
      log('withdraw:', payload, res);
      return res;
    },

    *withdraw2({ payload }, { call, put }) {
      const res = yield farmApi.withdraw2.call(farmApi, payload);
      log('withdraw2:', payload, res);
      return res;
    },

    *boostDeposit({ payload }, { call, put }) {
      const res = yield farmApi.boostDeposit.call(farmApi, payload);
      log('boostDeposit:', payload, res);
      return res;
    },

    *boostWithdraw({ payload }, { call, put }) {
      const res = yield farmApi.boostWithdraw.call(farmApi, payload);
      log('boostWithdraw:', payload, res);
      return res;
    },

    *boostWithdraw2({ payload }, { call, put }) {
      const res = yield farmApi.boostWithdraw2.call(farmApi, payload);
      log('boostWithdraw2:', payload, res);
      return res;
    },

    *harvest({ payload }, { call, put }) {
      const res = yield farmApi.harvest.call(farmApi, payload);
      log('harvest:', payload, res);
      return res;
    },

    *harvest2({ payload }, { call, put }) {
      const res = yield farmApi.harvest2.call(farmApi, payload);
      log('harvest2:', payload, res);
      return res;
    },

    *reqCreateFarm({ payload }, { call, put }) {
      const res = yield farmApi.reqcreatefarm.call(farmApi, payload);
      log('reqCreateFarm:', payload, res);
      return res;
    },

    *createFarm({ payload }, { call, put }) {
      const res = yield farmApi.createfarm.call(farmApi, payload);
      log('createFarm:', payload, res);
      return res;
    },
  },

  reducers: {
    save(state, action) {
      return { ...state, ...action.payload };
    },
    saveFarm(state, action) {
      let { allFarmPairs } = action.payload;
      let { currentFarmPair } = action.payload;
      if (!currentFarmPair) currentFarmPair = state.currentFarmPair;
      if (!currentFarmPair) {
        return {
          ...state,
          ...action.payload,
        };
      }
      let token = {},
        lockedTokenAmount = 0,
        rewardToken = {},
        boostTokenAmount = 0,
        maxBoostRatio = 0,
        boostRewardFactor = 0,
        userBoostTokenAmount = 0,
        boostToken = {};
      if (!allFarmPairs) {
        allFarmPairs = state.allFarmPairs;
      }
      const currentPairObj = allFarmPairs[currentFarmPair];
      if (currentPairObj) {
        token = currentPairObj.token;
        lockedTokenAmount = Number(currentPairObj.lockedTokenAmount);
        rewardToken = currentPairObj.rewardToken;
        boostToken = currentPairObj.boostToken;
        boostTokenAmount = Number(currentPairObj.boostTokenAmount);
        maxBoostRatio = currentPairObj.maxBoostRatio;
        boostRewardFactor = currentPairObj.boostRewardFactor;
        userBoostTokenAmount = Number(currentPairObj.userBoostTokenAmount);
      }

      return {
        ...state,
        ...action.payload,
        lptoken: token,
        rewardToken,
        boostToken,
        boostTokenAmount,
        maxBoostRatio,
        boostRewardFactor,
        userBoostTokenAmount,
        lockedTokenAmount,
      };
    },
  },
};
