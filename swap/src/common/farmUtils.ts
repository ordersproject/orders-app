import pairApi from '../api/pair';
import customApi from '../api/custom';
import BigNumber from 'bignumber.js';
import { formatSat, calcYield } from './utils';

export async function fetchFarmData(data) {
  let p = [];
  let pairsData = {};
  let pairs = [];

  Object.keys(data).forEach((item) => {
    if (item !== 'blockTime') {
      if (data[item].token) {
        let { tokenID } = data[item].token;
        pairs.push(tokenID);

        p.push(
          data[item].custom
            ? customApi.querySwapInfo(tokenID)
            : pairApi.querySwapInfo(tokenID),
        );
      }
      
    }
  });
  const datas_res = await Promise.all(p);

  // console.log(pairs, datas_res)
  pairs.forEach((item, index) => {
    if (datas_res[index].code === 0) {
      let d = datas_res[index].data;
      pairsData[item] = d;
      const { token1, token2 } = d;
      pairsData[`${token1.symbol}-${token2.symbol}`.toUpperCase()] = d; //加个交易名索引，用来快速获取奖励token的数据
    }
  });
  return pairsData;
}

function calcLPTotal(swapToken1Amount, token1, swapLpAmount, poolTokenAmount) {
  const token1_amount = formatSat(swapToken1Amount, token1.decimal);
  // console.log('token1_amount:', token1_amount);
  const lp_price = BigNumber(token1_amount * 2).div(swapLpAmount);
  // console.log('lp_price:', lp_price.toString())
  const lp_total = BigNumber(poolTokenAmount).multipliedBy(lp_price);
  return lp_total;
}

export function handleFarmData(data, pairsData, tokenPrices) {
  let allFarmData = {},
    allFarmArr = [];
  // console.log(data)
  Object.keys(data).forEach((id) => {
    if (id === 'blockTime') return;
    let item = {
      ...data[id],
      id,
    };
    const { poolTokenAmount, rewardAmountPerSecond, rewardToken, token } = data[
      id
    ];

    const pairData = pairsData[token.tokenID];

    if (!pairData) {
      return null;
    }

    const { token1, swapToken1Amount, swapLpAmount } = pairData;
    // console.log(pairData.lptoken.symbol)

    const token1_symbol_UpperCase = token1.symbol;
    // console.log(token1_symbol_UpperCase);

    let lpTotal = calcLPTotal(
      swapToken1Amount,
      token1,
      swapLpAmount,
      poolTokenAmount,
    );

    let _total = BigNumber(lpTotal).multipliedBy(
      tokenPrices[token1_symbol_UpperCase],
    );
    // console.log('lpTotal:',lpTotal.toString(),`${token1_symbol_UpperCase}-Price:`,tokenPrices[token1_symbol_UpperCase] , 'lpTotalUsd:', _total.toString())

    const _yield = calcYield(
      rewardAmountPerSecond,
      rewardToken.decimal,
      tokenPrices[rewardToken.symbol],
      _total,
    );

    item._yield = _yield;
    item._total = _total.toString();

    allFarmData[id] = item;
    allFarmArr.push(item);
  });

  allFarmArr.sort((a, b) => {
    return b._total - a._total;
  });

  return { allFarmData, allFarmArr };
}
