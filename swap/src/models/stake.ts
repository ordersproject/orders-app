import stakeApi from '../api/stake';
import { LeastFee, formatSat, formatRate } from 'common/utils';
import { gzip } from 'node-gzip';
import { calcYield } from 'common/utils';
import BN from 'bignumber.js';

export default {
  namespace: 'stake',

  state: {
    allStakePairs: [],
    stakePairInfo: {},
    currentStakePair: '',
    pairData: {},
    voteInfoArr: [],
    currentVoteIndex: 0,
    blockTime: 0,
  },

  subscriptions: {
    async setup({ dispatch, history }) {},
  },

  effects: {
    *getAllPairs({ payload }, { call, put, select }) {
      const allpairs_res = yield stakeApi.queryAllPairs.call(
        stakeApi,
        payload.address,
      );
      // console.log(res);
      let allPairs = [];
      if (allpairs_res.code === 0) {
        const { data } = allpairs_res;
        const { blockTime } = data;
        // console.log('blockTime', blockTime)
        Object.keys(data).forEach((item) => {
          if (item !== 'blockTime') {
            allPairs.push({ ...data[item], name: item });
          }
        });
        let _stakePairInfo = allPairs[0];
        let currrentPair = _stakePairInfo.name;
        // console.log(allPairs, currrentPair);

        yield put({
          type: 'save',
          payload: {
            allStakePairs: allPairs,
            currentStakePair: currrentPair,
            stakePairInfo: _stakePairInfo,
            blockTime: parseInt(blockTime),
          },
        });
      } else {
        yield put({
          type: 'save',
          payload: {
            stakePairInfo: { msg: allpairs_res.message },
          },
        });
      }
    },
    *getStakeInfo({ payload }, { call, put, select }) {
      const { currentStakePair, stakePairInfo, blockTime } = yield select(
        (state) => state.stake,
      );
      const { accountInfo } = yield select((state) => state.user);
      // console.log(currentStakePair, accountInfo);
      if (!currentStakePair) return;
      let res = accountInfo.userAddress
        ? yield stakeApi.queryUserInfo.call(
            stakeApi,
            currentStakePair,
            accountInfo.userAddress,
          )
        : yield stakeApi.queryStakeInfo.call(stakeApi, currentStakePair);
      // console.log('queryUserInfo:', res);
      let _userPairData = {};
      if (res.code === 0) {
        //"unlockingTokens": [{"expired":737212,"amount":"100000"}]
        const { unlockingTokens } = res.data;
        const { decimal } = stakePairInfo.token;
        let arr = [];
        if (unlockingTokens && unlockingTokens.length > 0) {
          unlockingTokens.forEach((item) => {
            const { expired, amount } = item;
            const _amount = formatSat(amount, decimal);
            let left = parseInt(expired) - parseInt(blockTime);
            if (left <= 0) left = 0;
            const freeIndex = arr.findIndex((v) => v.left === left);
            if (freeIndex > -1) {
              arr[freeIndex]._amount =
                parseFloat(arr[freeIndex]._amount) + parseFloat(_amount);
            } else {
              arr.push({
                left,
                expired,
                amount,
                _amount,
              });
            }
          });
        }

        res.data.unlockingTokens_user = arr;

        const { poolTokenAmount = 0, rewardAmountPerSecond } = res.data;
        if (!poolTokenAmount) {
          res.data._yield = 0;
        } else {
          const { tokenPrices } = yield select((state) => state.pair);

          const { rewardToken, token } = stakePairInfo;

          const _total = BN(poolTokenAmount)
            .div(Math.pow(10, token.decimal))
            .multipliedBy(tokenPrices[token.symbol]);

          res.data._yield = calcYield(
            rewardAmountPerSecond,
            rewardToken.decimal,
            tokenPrices[rewardToken.symbol],
            _total,
          );
        }

        // console.log(arr)
        _userPairData = res.data;
      }
      yield put({
        type: 'save',
        payload: {
          // userPairData: _userPairData,
          pairData: _userPairData,
        },
      });
    },
    *getVoteInfo({ payload }, { call, put, select }) {
      // TODO: hide vote info
      return
      const { currentStakePair, blockTime, currentVoteIndex } = yield select(
        (state) => state.stake,
      );
      if (!currentStakePair) return;
      const res = yield stakeApi.voteinfo.call(stakeApi, {
        symbol: currentStakePair,
      });
      // console.log('voteinfo:', res);

      if (res.code === 0) {
        const { data } = res;
        const dataArr = [];
        Object.keys(data).forEach((item) => {
          let total = 0,
            rate = [];
          // , passItemIndex = -1;
          const {
            voteSumData,
            beginBlockTime,
            endBlockTime,
            // minVoteAmount,
          } = data[item];
          voteSumData.forEach((v) => {
            total += parseInt(v);
          });
          data[item].voteSumRate = voteSumData.forEach((v, i) => {
            rate.push(formatRate(v / total, 2));
            // if (v > minVoteAmount) {
            //   passItemIndex = i;
            // }
          });
          // console.log(rate)
          data[item].total = total;
          data[item].voteSumRate = rate;
          data[item].unStated = beginBlockTime > parseInt(blockTime);
          data[item].finished = endBlockTime < parseInt(blockTime);
          dataArr.push({
            ...data[item],
            id: item,
            total,
            voteSumRate: rate,
            unStated: beginBlockTime > parseInt(blockTime),
            finished: endBlockTime < parseInt(blockTime),
          });
        });

        dataArr.sort((a, b) => b.beginBlockTime - a.beginBlockTime);

        yield put({
          type: 'save',
          payload: {
            voteInfoArr: dataArr,
            currentVoteIndex,
          },
        });
      }
    },
    *reqStake({ payload }, { call, put, select }) {
      const { op } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      const { accountInfo } = yield select((state) => state.user);
      const { userAddress, userBalance } = accountInfo;
      // console.log(currentStakePair, accountInfo);
      const req = yield stakeApi.reqStake.call(stakeApi, {
        symbol: currentStakePair,
        address: userAddress,
        op,
        source: 'mvcswap.com',
      });
      // console.log(req);

      if (req.code) {
        return {
          msg: req.msg,
        };
      }

      // const { tokenToAddress, requestIndex, mvcToAddress, txFee } = req.data;

      const isLackBalance = LeastFee(req.data.txFee, userBalance.MVC);
      if (isLackBalance.code) {
        return {
          msg: isLackBalance.msg,
        };
      }
      return req.data;
    },
    *deposit({ payload }, { call, put, select }) {
      const { requestIndex, data } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let liq_data = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        mvcRawTx: data[0].txHex,
        mvcOutputIndex: 0,
        tokenRawTx: data[1].txHex,
        tokenOutputIndex: 0,
        amountCheckRawTx: data[1].routeCheckTxHex,
      };
      liq_data = JSON.stringify(liq_data);
      liq_data = yield gzip(liq_data);
      const res = yield stakeApi.deposit.call(stakeApi, { data: liq_data });
      // console.log(res);
      if (res.code) {
        return {
          msg: res.msg,
        };
      }
      return res.data;
    },
    *unlock({ payload }, { call, put, select }) {
      const { requestIndex, data } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let liq_data = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        mvcRawTx: data[0].txHex,
        mvcOutputIndex: 0,
        tokenRawTx: data[1].txHex,
        tokenOutputIndex: 0,
        amountCheckRawTx: data[1].routeCheckTxHex,
      };
      liq_data = JSON.stringify(liq_data);
      liq_data = yield gzip(liq_data);
      const res = yield stakeApi.unlock.call(stakeApi, { data: liq_data });
      // console.log(res);
      if (res.code) {
        return {
          msg: res.msg,
        };
      }
      return res.data;
    },
    *withdraw({ payload }, { call, put, select }) {
      const { requestIndex, data } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let liq_data = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        mvcRawTx: data[0].txHex,
        mvcOutputIndex: 0,
      };
      liq_data = JSON.stringify(liq_data);
      liq_data = yield gzip(liq_data);
      const res = yield stakeApi.withdraw.call(stakeApi, { data: liq_data });
      // console.log(res);
      if (res.code) {
        return {
          msg: res.msg,
        };
      }
      return res.data;
    },
    *withdraw2({ payload }, { call, put, select }) {
      const { requestIndex, pubKey, sig } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let params = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        pubKey,
        sig,
      };
      const res = yield stakeApi.withdraw2.call(stakeApi, params);
      // console.log(res);
      // if (res.code) {
      //     return {
      //         msg: res.msg
      //     };
      // }
      return res.data;
    },
    *harvest({ payload }, { call, put, select }) {
      const { requestIndex, data } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let liq_data = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        mvcRawTx: data[0].txHex,
        mvcOutputIndex: 0,
      };
      liq_data = JSON.stringify(liq_data);
      liq_data = yield gzip(liq_data);
      const res = yield stakeApi.harvest.call(stakeApi, { data: liq_data });
      // console.log(res);
      if (res.code) {
        return {
          msg: res.msg,
        };
      }
      return res.data;
    },
    *harvest2({ payload }, { call, put, select }) {
      const { requestIndex, pubKey, sig } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let params = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        pubKey,
        sig,
      };
      const res = yield stakeApi.harvest2.call(stakeApi, params);
      // console.log(res);
      // if (res.code) {
      //     return {
      //         msg: res.msg
      //     };
      // }
      return res.data;
    },
    *vote({ payload }, { call, put, select }) {
      const { requestIndex, data, voteOption } = payload;
      const { currentVoteIndex, voteInfoArr, currentStakePair } = yield select(
        (state) => state.stake,
      );
      let liq_data = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        mvcRawTx: data[0].txHex,
        mvcOutputIndex: 0,
        voteID: voteInfoArr[currentVoteIndex].id,
        voteOption,
        confirmVote: true,
      };
      liq_data = JSON.stringify(liq_data);
      liq_data = yield gzip(liq_data);
      const res = yield stakeApi.vote.call(stakeApi, { data: liq_data });
      // console.log(res);
      if (res.code) {
        return {
          msg: res.msg,
        };
      }
      return res.data;
    },
    *vote2({ payload }, { call, put, select }) {
      const { requestIndex, pubKey, sig } = payload;
      const { currentStakePair } = yield select((state) => state.stake);
      let params = {
        symbol: currentStakePair,
        requestIndex: requestIndex,
        pubKey,
        sig,
      };
      const res = yield stakeApi.vote2.call(stakeApi, params);
      // console.log(res);
      // if (res.code) {
      //     return {
      //         msg: res.msg
      //     };
      // }
      return res.data;
    },
  },
  reducers: {
    save(state, action) {
      return { ...state, ...action.payload };
    },
  },
};
