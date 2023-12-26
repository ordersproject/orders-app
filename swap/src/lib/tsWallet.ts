import webWallet from 'mvc-web-wallet';
import { formatSat, strAbbreviation } from 'common/utils';
import { MVCSWAP_WALLET_URL } from 'common/const';
const { Mvc } = webWallet;

const mvc = new Mvc({
  pageUrl: MVCSWAP_WALLET_URL,
});

const getMvcBalance = async () => {
  const res = await mvc.getMvcBalance();
  return formatSat(res.balance);
};

const getSensibleFtBalance = async () => {
  const res = await mvc.getSensibleFtBalance();
  const userBalance = {};
  res.forEach((item) => {
    userBalance[item.genesis] = formatSat(item.balance, item.tokenDecimal);
  });
  return userBalance;
};

export default {
  info: async () => {
    let accountInfo = await mvc.getAccount();
    const mvcBalance = await getMvcBalance();
    const userAddress = await mvc.getAddress();
    const tokenBalance = await getSensibleFtBalance();

    const userBalance = {
      MVC: mvcBalance,
      ...tokenBalance,
    };
    accountInfo = {
      ...accountInfo,
      userBalance,
      userAddress,
      userAddressShort: strAbbreviation(userAddress, [7, 7]),
    };
    // console.log('accountInfo:',accountInfo);

    return accountInfo;
  },

  connectAccount: () => {
    return mvc.requestAccount();
  },

  exitAccount: () => {
    return mvc.exitAccount();
  },

  transferMvc: (params) => {
    const { address, amount, noBroadcast } = params;
    return mvc.transferMvc({
      noBroadcast,
      receivers: [
        {
          address,
          amount,
        },
      ],
    });
  },

  transferAll: (params) => {
    const { datas, noBroadcast } = params;
    let data = [];
    datas.forEach((item) => {
      let { type, address, amount } = item;
      console.log('transferAll:', item);
      if (type === 'mvc') {
        data.push({
          receivers: [
            {
              address,
              amount,
            },
          ],
          noBroadcast,
        });
      } else if (item.type === 'sensibleFt') {
        let { address, amount, codehash, genesis, rabinApis } = item;
        data.push({
          receivers: [
            {
              address,
              amount,
            },
          ],
          codehash,
          genesis,
          rabinApis,
          noBroadcast,
        });
      }
    });
    const res = mvc.transferAll(data);
    return res;
  },

  signTx: (params) => {
    return mvc.signTx(params);
  },
};
