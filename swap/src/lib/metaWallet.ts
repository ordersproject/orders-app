import { formatSat, strAbbreviation } from 'common/utils';
import _ from 'i18n';
// import 'common/vconsole';

function checkExtension() {
  if (!window.metaidwallet) {
    if (confirm(_('download_metalet'))) {
      window.open('https://metalet.space/');
    }
    return false;
  }
  return true;
}

const getMvcBalance = async () => {
  try {
    const isConnected = await window.metaidwallet.isConnected();
    console.log('isConnected:', isConnected);
    const res = await window.metaidwallet.getBalance();
    console.log('getBalance:', res.total);
    return formatSat(res.total);
    //return formatSat(0);
  } catch (err) {
    return formatSat(0);
  }
};

const getTokenBalance = async () => {
  const res = await window.metaidwallet.token.getBalance();
  // console.log('getTokenBalance:', res);
  const userBalance = {};
  res.forEach((item) => {
    const balance =
      BigInt(item.confirmedString) + BigInt(item.unconfirmedString);
    userBalance[item.genesis] = formatSat(balance, item.decimal);
  });
  return userBalance;
};

export default {
  info: async () => {
    if (checkExtension()) {
      let accountInfo = {};
      const mvcBalance = await getMvcBalance();
      console.log('mvc', mvcBalance);
      const userAddress = await window.metaidwallet.getAddress();
      console.log('uadress', userAddress);
      const network = await window.metaidwallet.getNetwork();
      //const network = 'mainnet';

      console.log('net', network);
      const tokenBalance = await getTokenBalance();
      console.log('tokenBB', tokenBalance);
      const userBalance = {
        MVC: mvcBalance,
        ...tokenBalance,
      };
      accountInfo = {
        ...accountInfo,
        userBalance,
        userAddress,
        userAddressShort: strAbbreviation(userAddress, [7, 7]),
        network: network.network || 'mainnet',
      };
      //   console.log('accountInfo:', accountInfo);
      return accountInfo;
    }
  },

  connectAccount: () => {
    if (checkExtension()) {
      return window.metaidwallet.connect();
    }
  },

  exitAccount: () => {
    return window.metaidwallet.disconnect();
  },

  transferMvc: async (params) => {
    if (checkExtension()) {
      const { address, amount, noBroadcast } = params;

      const res = await window.metaidwallet.transfer({
        broadcast: !noBroadcast,
        tasks: [
          {
            type: 'space',
            receivers: [{ address, amount }],
          },
        ],
      });
      console.log('transferMVC:', res);
      res.list = res.res;
      return res;
    }
  },

  transferAll: async (params) => {
    if (checkExtension()) {
      let data = [];
      const { datas, noBroadcast } = params;
      datas.forEach((item) => {
        const { address, amount, codehash, genesis } = item;
        if (item.type === 'mvc') {
          data.push({
            type: 'space',
            receivers: [{ address, amount }],
          });
        } else if (item.type === 'sensibleFt') {
          data.push({
            type: 'token',
            codehash,
            genesis,
            receivers: [{ address, amount }],
          });
        }
      });

      const res = await window.metaidwallet.transfer({
        broadcast: !noBroadcast,
        tasks: data,
      });
      //console.log('transferAll:', res)
      res.list = res.res;
      return res;
    }
  },

  signTx: async (params) => {
    const res = await window.metaidwallet.signTransaction({ transaction: params });
    //console.log(res); //debugger
    return res.signature;
  },
};
