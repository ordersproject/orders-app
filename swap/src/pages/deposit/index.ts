'use strict';
import React, { Component } from 'react';
import { connect } from 'umi';
import { gzip } from 'node-gzip';
import EventBus from 'common/eventBus';
import { Button, message } from 'antd';
import Rate from 'components/rate';
import Loading from 'components/loading';
import { BtnWait } from 'components/btns';
import TokenLogo from 'components/tokenicon';
import FormatNumber from 'components/formatNumber';
import FarmPairIcon from 'components/pairIcon/farmIcon';
import { formatAmount, formatSat, LeastFee, formatTok } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';
import { SuccessResult } from 'components/result';
import { Arrow } from 'components/ui';
import { OP_DEPOSIT } from '../../common/const';

@connect(({ user, farm, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...farm,
    loading: effects['farm/getAllPairs'],
  };
})
export default class Deposit extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // addLPRate: 0,
      addLP: 0,
      formFinish: false,
      blockTime: 0,
    };
  }

  componentDidMount() {
    EventBus.on('changeFarmPair', () => {
      this.changeData(0);
      this.clear();
    });
  }

  clear = () => {
    this.setState({
      formFinish: false,
      addLP: 0,
    });
  };

  updateData() {
    const { dispatch, accountInfo } = this.props;
    const { userAddress } = accountInfo;
    dispatch({
      type: 'farm/getAllPairs',
      payload: {
        address: userAddress,
      },
    });
    dispatch({
      type: 'user/loadingUserData',
      payload: {},
    });
  }

  changeData = (value) => {
    this.setState({
      addLP: value,
    });
  };

  renderForm() {
    const {
      currentFarmPair,
      loading,
      submiting,
      accountInfo,
      lptoken,
      rewardToken,
      pairsData,
      allFarmPairs,
      lockedTokenAmount,
      userBoostTokenAmount,
      maxBoostRatio,
      boostRewardFactor,
    } = this.props;
    if (!currentFarmPair) return null;
    const { tokenID } = lptoken;
    if (loading || !currentFarmPair || !pairsData[tokenID]) return <Loading />;
    if (!pairsData[tokenID]) return null;
    const balance = accountInfo.userBalance[tokenID] || 0;
    const currentPairData = pairsData[tokenID] || {};
    const {
      swapToken1Amount,
      swapToken2Amount,
      token1,
      token2,
    } = currentPairData;
    const mvc_amount = formatSat(swapToken1Amount, token1.decimal);
    const token_amount = formatSat(swapToken2Amount, token2.decimal);
    const price = formatAmount(token_amount / mvc_amount, token2.decimal);

    let currentBoostRatio = 0;
    if (lockedTokenAmount > 0) {
      const maxRatio = maxBoostRatio / 10000;
      currentBoostRatio = userBoostTokenAmount / (lockedTokenAmount * boostRewardFactor);
      if (currentBoostRatio > maxRatio) {
        currentBoostRatio = maxRatio;
      }
    }
    const apr = allFarmPairs[currentFarmPair]._yield;
    return (
      <div className={styles.content}>
        <Rate
          type="farm"
          changeAmount={this.changeData}
          balance={balance}
          tokenPair={<FarmPairIcon keyword="pair" />}
        />
        <Arrow />

        <div className={styles.title}>{_('earn')}</div>
        <div
          className={styles.pair_box}
          style={{ paddingLeft: 15, paddingRight: 17 }}
        >
          <div className={styles.pair_left}>
            <div className={styles.icon} style={{ marginRight: 10 }}>
              <TokenLogo
                name={rewardToken.symbol}
                genesisID={rewardToken.tokenID}
                size={25}
              />
            </div>
            <div className={styles.name} style={{ fontSize: 22 }}>
              {rewardToken.symbol}
            </div>
          </div>
          <div className={styles.pair_right}>
            <FormatNumber value={formatAmount(apr * (1 + currentBoostRatio), 2)} />%{' '}
            {_('apy')}
          </div>
        </div>

        <div className={styles.price}>
          1 {token1.symbol.toUpperCase()} = {price}{' '}
          {token2.symbol.toUpperCase()}
        </div>

        {this.renderButton()}
      </div>
    );
  }

  handleSubmit = async () => {
    const { addLP } = this.state;
    const { dispatch, currentFarmPair, lptoken, accountInfo } = this.props;
    const { userAddress, userBalance, changeAddress } = accountInfo;

    let res = await dispatch({
      type: 'farm/reqSwap',
      payload: {
        symbol: currentFarmPair,
        address: userAddress,
        op: OP_DEPOSIT,
      },
    });

    if (res.code !== 0) {
      return message.error(res.msg || 'unknown error');
    }

    const { tokenToAddress, requestIndex, mvcToAddress, txFee } = res.data;

    const isLackBalance = LeastFee(txFee, userBalance.MVC);
    if (isLackBalance.code) {
      return message.error(isLackBalance.msg);
    }

    const _value = formatTok(addLP, lptoken.decimal);
    // console.log(_value, formatTok(addLP, lptoken.decimal))
    let tx_res = await dispatch({
      type: 'user/transferAll',
      payload: {
        datas: [
          {
            type: 'mvc',
            address: mvcToAddress,
            amount: txFee,
            changeAddress,
            note: 'mvcswap.com(farm deposit)',
          },
          {
            type: 'sensibleFt',
            address: tokenToAddress,
            amount: _value,
            changeAddress,
            codehash: lptoken.codeHash,
            genesis: lptoken.tokenID,
            rabinApis: lptoken.rabinApis,
            note: 'mvcswap.com(farm deposit)',
          },
        ],
        noBroadcast: true,
      },
    });
    if (tx_res.msg || tx_res.status == 'canceled') {
      return message.error(tx_res.msg || 'canceled');
    }

    if (tx_res.list) {
      tx_res = tx_res.list;
    }
    if (!tx_res[0] || !tx_res[0].txHex || !tx_res[1] || !tx_res[1].txHex) {
      return message.error(_('txs_fail'));
    }

    let data = {
      symbol: currentFarmPair,
      requestIndex: requestIndex,
      mvcRawTx: tx_res[0].txHex,
      mvcOutputIndex: 0,
      tokenRawTx: tx_res[1].txHex,
      tokenOutputIndex: 0,
      amountCheckRawTx: tx_res[1].routeCheckTxHex,
    };
    data = JSON.stringify(data);
    data = await gzip(data);
    const deposit_res = await dispatch({
      type: 'farm/deposit',
      payload: {
        data,
      },
    });
    if (!deposit_res.code && deposit_res.data.txid) {
      message.success('success');
      this.updateData();
      this.setState({
        formFinish: true,
        blockTime: deposit_res.data.blockTime,
      });
    } else {
      return message.error(deposit_res.msg);
    }
  };

  renderButton() {
    const {
      isLogin,
      accountInfo,
      lptoken,
      allFarmPairs,
      currentFarmPair,
    } = this.props;

    const { addLP } = this.state;
    const LP = accountInfo.userBalance[lptoken.tokenID] || 0;

    const conditions = [
      { key: 'login', cond: !isLogin },
      { key: 'enterAmount', cond: parseFloat(addLP) <= 0 },
      {
        key: 'lackBalance',
        cond: parseFloat(addLP) > parseFloat(LP),
      },
    ];

    if (allFarmPairs[currentFarmPair].abandoned) {
      return (
        <Button
          className={styles.btn}
          type="primary"
          shape="round"
          disabled={true}
        >
          {_('deposit_earn')}
        </Button>
      );
    }

    return (
      BtnWait(conditions) || (
        <Button
          className={styles.btn}
          type="primary"
          shape="round"
          onClick={this.handleSubmit}
        >
          {_('deposit_earn')}
        </Button>
      )
    );
  }

  renderResult() {
    const { addLP, blockTime } = this.state;
    const timeStr = new Date(blockTime * 1000).toLocaleString('en-GB');
    return (
      <div className={styles.content}>
        <SuccessResult
          success_txt={`${_('deposit_success')}@${timeStr}`}
          done={this.clear}
        >
          <>
            <div className={styles.small_title}>{_('deposited')}</div>

            <div className={styles.pair_data}>
              <div className={styles.pair_left}>
                <FormatNumber value={addLP} />
              </div>
              <div className={styles.pair_right}>
                <FarmPairIcon keyword="pair" size={20} />
              </div>
            </div>
          </>
        </SuccessResult>
      </div>
    );
  }

  render() {
    const { formFinish } = this.state;
    if (formFinish) {
      return this.renderResult();
    }
    return this.renderForm();
  }
}
