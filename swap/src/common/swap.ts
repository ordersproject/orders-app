let swapAlgo = module.exports;

swapAlgo.FEE_FACTOR = 10000;
swapAlgo.MIN_TOKEN1_FEE = BigInt(600);

swapAlgo.countLpAddAmount = function (
  token1AddAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapLpTokenAmount,
) {
  token1AddAmount = BigInt(token1AddAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);
  swapLpTokenAmount = BigInt(swapLpTokenAmount);
  let lpMinted = BigInt(0);
  let token2AddAmount = BigInt(0);
  if (swapLpTokenAmount > BigInt(0)) {
    lpMinted = (token1AddAmount * swapLpTokenAmount) / swapToken1Amount;
    token2AddAmount = (token1AddAmount * swapToken2Amount) / swapToken1Amount;
  } else {
    lpMinted = token1AddAmount;
  }
  return [lpMinted, token2AddAmount];
};

// 增加流动性时使用token2计算token1以及lp token的增加数量
swapAlgo.countLpAddAmountWithToken2 = function (
  token2AddAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapLpTokenAmount,
) {
  token2AddAmount = BigInt(token2AddAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);
  swapLpTokenAmount = BigInt(swapLpTokenAmount);
  let lpMinted = BigInt(0);
  let token1AddAmount = BigInt(0);
  if (swapLpTokenAmount > BigInt(0)) {
    token1AddAmount = (token2AddAmount * swapToken1Amount) / swapToken2Amount;
    lpMinted = (token1AddAmount * swapLpTokenAmount) / swapToken1Amount;
  } else {
    lpMinted = 0;
  }
  return [lpMinted, token1AddAmount];
};

// 提取流动性时使用提取的lp token数量来计算可获得的token1和token2数量
swapAlgo.countLpRemoveAmount = function (
  lpTokenRemoveAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapLpTokenAmount,
) {
  lpTokenRemoveAmount = BigInt(lpTokenRemoveAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);
  swapLpTokenAmount = BigInt(swapLpTokenAmount);
  const token1RemoveAmount =
    (lpTokenRemoveAmount * swapToken1Amount) / swapLpTokenAmount;
  const token2RemoveAmount =
    (lpTokenRemoveAmount * swapToken2Amount) / swapLpTokenAmount;
  return [token1RemoveAmount, token2RemoveAmount];
};

// 交换token1到token2时可获取的token2数量
swapAlgo.swapToken1ToToken2 = function (
  token1AddAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapFeeRate,
  projFeeRate,
) {
  token1AddAmount = BigInt(token1AddAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);

  const token2RemoveAmount =
    (token1AddAmount *
      BigInt(swapAlgo.FEE_FACTOR - swapFeeRate) *
      swapToken2Amount) /
    ((swapToken1Amount + token1AddAmount) * BigInt(swapAlgo.FEE_FACTOR));

  return token2RemoveAmount;
};

// 交换token1到token2时，通过token2的数量计算token1的数量
swapAlgo.swapToken1ToToken2ByToken2 = function (
  token2RemoveAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapFeeRate,
  projFeeRate,
) {
  token2RemoveAmount = BigInt(token2RemoveAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);

  const token1AddAmount =
    (token2RemoveAmount * BigInt(swapAlgo.FEE_FACTOR) * swapToken1Amount) /
    (BigInt(swapAlgo.FEE_FACTOR - swapFeeRate) * swapToken2Amount -
      token2RemoveAmount * BigInt(swapAlgo.FEE_FACTOR));

  return token1AddAmount;
};

// 交换token2到token1时可获取的token2数量
swapAlgo.swapToken2ToToken1 = function (
  token2AddAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapFeeRate,
  projFeeRate,
) {
  token2AddAmount = BigInt(token2AddAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);
  const token1RemoveAmount =
    (token2AddAmount *
      BigInt(swapAlgo.FEE_FACTOR - swapFeeRate) *
      swapToken1Amount) /
    ((swapToken2Amount + token2AddAmount) * BigInt(swapAlgo.FEE_FACTOR));

  return token1RemoveAmount;
};

// 交换token2到token1时, 通过token1的数量计算token2的数量
swapAlgo.swapToken2ToToken1ByToken1 = function (
  token1RemoveAmount,
  swapToken1Amount,
  swapToken2Amount,
  swapFeeRate,
  projFeeRate,
) {
  token1RemoveAmount = BigInt(token1RemoveAmount);
  swapToken1Amount = BigInt(swapToken1Amount);
  swapToken2Amount = BigInt(swapToken2Amount);

  const token2AddAmount =
    (token1RemoveAmount * BigInt(swapAlgo.FEE_FACTOR) * swapToken2Amount) /
    (BigInt(swapAlgo.FEE_FACTOR - swapFeeRate) * swapToken1Amount -
      token1RemoveAmount * BigInt(swapAlgo.FEE_FACTOR));

  return token2AddAmount;
};
