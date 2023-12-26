// import mvc from 'common/walletFun';
import {
  MVCSWAP_NETWORK,
  MVCSWAP_DARKMODE,
  DEFAULT_NET,
  MVCSWAP_LAST_WALLET_TYPE,
} from 'common/const';
import Wallet from '../lib/main';
import debug from 'debug';
const log = debug('user');
const { localStorage } = window;
const darkMode = localStorage.getItem(MVCSWAP_DARKMODE);

export default {
  namespace: 'user',

  state: {
    isLogin: false,
    accountInfo: {
      userBalance: {},
    },
    walletType: 1,
    darkMode: darkMode || 'sun',
  },

  subscriptions: {},

  effects: {
    *loadingUserData({ payload }, { call, put, select }) {
      console.log('runing........');
      let { type } = payload;
      if (!type) {
        type = yield select((state) => state.user.walletType) || 1;
      }
      try {
        console.log('type', type);
        const _wallet = Wallet({ type });
        console.log('_wallet', _wallet);
        const accountInfo = yield _wallet.info();
        console.log('accountInfo', accountInfo);
        localStorage.setItem(
          MVCSWAP_NETWORK,
          accountInfo.network || DEFAULT_NET,
        );

        log('userData:', accountInfo);

        yield put({
          type: 'save',
          payload: {
            accountInfo,
            walletType: type || 1,
            isLogin: true,
          },
        });
      } catch (error) {
        console.log(error.toString());
        console.log(error.stack);
        return { msg: error.toString() };
      }

      return {};
    },

    *updateUserData({ payload }, { call, put, select }) {
      const type = yield select((state) => state.user.walletType);
      try {
        const _wallet = Wallet({ type });
        const accountInfo = yield _wallet.info();
        localStorage.setItem(
          MVCSWAP_NETWORK,
          accountInfo.network || DEFAULT_NET,
        );

        yield put({
          type: 'save',
          payload: {
            accountInfo,
            // isLogin: true,
          },
        });
      } catch (error) {
        console.log(error.toString());
        return { msg: error.toString() };
      }

      return {};
    },

    *disconnectWebWallet({ payload }, { call, put, select }) {
      const type = yield select((state) => state.user.walletType);
      try {
        const _wallet = Wallet({ type });
        yield _wallet.exitAccount();
      } catch (error) {
        console.log(error);
        // return { msg: error.message || error.toString() };
      }

      yield put({
        type: 'save',
        payload: {
          accountInfo: {
            userBalance: {},
          },
          isLogin: false,
        },
      });
    },

    *connectWebWallet({ payload }, { call, put }) {
      const { type, network } = payload;
      let res;
      try {
        const _wallet = Wallet({ type });
        res = yield _wallet.connectAccount(network);
        console.log('connect:', res);
      } catch (error) {
        console.log(error);
        return { msg: error.message || error.toString() };
      }
      localStorage.setItem(MVCSWAP_LAST_WALLET_TYPE, type);
      return {};
    },

    *transferMvc({ payload }, { call, put, select }) {
      // const { address, amount, note, changeAddress, noBroadcast } = payload;
      const type = yield select((state) => state.user.walletType);

      log('transferMvc:', payload);
      try {
        const _wallet = Wallet({ type });
        const res = yield _wallet.transferMvc(payload);
        log(res);
        return res;
      } catch (error) {
        // console.log(error.toString())
        return { msg: error.message || error.toString(), txid: '' };
      }
    },

    *transferAll({ payload }, { call, put, select }) {
      // const { datas } = payload;
      const type = yield select((state) => state.user.walletType);
      // console.log(payload);
      try {
        const _wallet = Wallet({ type });
        const res = yield _wallet.transferAll(payload);
        console.log(res);
        if (res.list) return res.list;
        return res;
      } catch (error) {
        console.log(error)
        console.log(error.stack)
        return { msg: error.message || error.toString() };
      }
    },
    *transferAll2({ payload }, { call, put, select }) {
      const { reqData, tokenData, tokenAmount, note } = payload;
      const { tokenToAddress, mvcToAddress, txFee } = reqData;
      const type = yield select((state) => state.user.walletType);
      const { accountInfo } = yield select((state) => state.user);
      const { changeAddress } = accountInfo;
      // console.log(payload);
      try {
        const _wallet = Wallet({ type });
        let params = {
          datas: [
            {
              type: 'mvc',
              address: mvcToAddress,
              amount: txFee,
              changeAddress,
              note,
            },
          ],
          noBroadcast: true,
        };
        if (tokenData) {
          const { tokenID, codeHash } = tokenData;
          params.datas.push({
            type: 'sensibleFt',
            address: tokenToAddress,
            amount: tokenAmount,
            changeAddress,
            codehash: codeHash,
            genesis: tokenID,
            // rabinApis,
            note,
          });
        }
        // console.log(params);
        const res = yield _wallet.transferAll(params);
        // const res = yield mvc.transferAll(type, datas);
        // console.log(res);
        log(res);
        if (res.code) {
          return {
            msg: res.msg,
          };
        }
        if (res.list) return res.list;
        return res;
      } catch (error) {
        return { msg: error.message || error.toString() };
      }
    },

    *signTx({ payload }, { call, put, select }) {
      const type = yield select((state) => state.user.walletType);
      const { accountInfo } = yield select((state) => state.user);
      const { userAddress } = accountInfo;
      try {
        const _wallet = Wallet({ type });
        const res = yield _wallet.signTx({
          ...payload.datas,
          address: userAddress,
        });
        // const res = yield mvc.signTx(type, payload.datas);
        log(res);
        if (res[0]) return res[0];
        return res;
      } catch (error) {
        return { msg: error.message || error.toString() };
      }
    },
  },

  reducers: {
    save(state, action) {
      return { ...state, ...action.payload };
    },
  },
};
