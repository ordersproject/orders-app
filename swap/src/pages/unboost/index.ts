'use strict';
import React, { Component } from 'react';
import { connect } from 'umi';
import { gzip } from 'node-gzip';
import EventBus from 'common/eventBus';
import { Button, message } from 'antd';
import Rate from 'components/rate';
import Loading from 'components/loading';
import { BtnWait } from 'components/btns';
import FormatNumber from 'components/formatNumber';
import FarmPairIcon from 'components/pairIcon/farmIcon';
import { formatAmount, formatSat, LeastFee, formatTok } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';
import { SuccessResult } from 'components/result';
import { userSignTx } from 'common/signTx';
import { Arrow } from 'components/ui';
import { OP_BOOST_WITHDRAW } from '../../common/const';
import TokenLogo from 'components/tokenicon';

@connect(({ user, farm, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...farm,
    loading: effects['farm/getAllPairs'],
  };
})
export default class Unboost extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // removeTokenRate: 0,
      removeToken: 0,
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
      removeToken: 0,
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
      removeToken: value,
    });
  };

  renderForm() {
    const {
      currentFarmPair,
      loading,
      submiting,
      accountInfo,
      lptoken,
      boostToken,
      rewardToken,
      boostTokenAmount,
      userBoostTokenAmount,
      maxBoostRatio,
      boostRewardFactor,
      lockedTokenAmount,
      pairsData,
      allFarmPairs,
    } = this.props;
    if (!currentFarmPair) return null;
    const { tokenID } = boostToken;
    if (loading || !currentFarmPair || !pairsData[lptoken.tokenID]) return <Loading />;
    if (!pairsData[lptoken.tokenID]) return null;
    const balance = formatSat(userBoostTokenAmount || 0, boostToken.decimal);
    let currentBoostRatio = 0;
    let newBoostRatio = 0;
    const { removeToken } = this.state;
    const value = Number(formatTok(removeToken, boostToken.decimal));
    const apr = allFarmPairs[currentFarmPair]._yield
    if (lockedTokenAmount > 0) {
      const maxRatio = maxBoostRatio / 10000;
      currentBoostRatio = userBoostTokenAmount / (lockedTokenAmount * boostRewardFactor);
      if (currentBoostRatio > maxRatio) {
        currentBoostRatio = maxRatio;
      }
      newBoostRatio = (userBoostTokenAmount - value) / (lockedTokenAmount * boostRewardFactor);
      if (newBoostRatio < 0) {
        newBoostRatio = 0;
      }
    }
    let newBoostTokenAmount = userBoostTokenAmount;
    if (userBoostTokenAmount >= value) {
      newBoostTokenAmount = userBoostTokenAmount - value;
    }


    return (
      <div className={styles.content}>
        <Rate
          type="farm"
          changeAmount={this.changeData}
          balance={balance}
          tokenPair={<FarmPairIcon keyword="boost" />}
        />

        <br/>

        <div className={styles.title}>Current</div>
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

        <Arrow />

        <div className={styles.title}>New</div>
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
            <FormatNumber value={formatAmount(apr * (1 + newBoostRatio), 2)} />%{' '}
            {_('apy')}
          </div>
        </div>

        {this.renderButton()}
      </div>
    );
  }

  handleSubmit = async () => {
    const { removeToken } = this.state;
    const { dispatch, currentFarmPair, accountInfo, allFarmPairs, boostToken } = this.props;
    const { userAddress, userBalance, changeAddress } = accountInfo;

    let res = await dispatch({
      type: 'farm/reqSwap',
      payload: {
        symbol: currentFarmPair,
        address: userAddress,
        op: OP_BOOST_WITHDRAW,
      },
    });

    if (res.code) {
      return message.error(res.msg);
    }

    const { requestIndex, mvcToAddress, txFee } = res.data;

    const isLackBalance = LeastFee(txFee, userBalance.MVC);
    if (isLackBalance.code) {
      return message.error(isLackBalance.msg);
    }

    // const _value = BigNumber(removeToken)
    //   .multipliedBy(Math.pow(10, lptoken.decimal))
    //   .toFixed(0);
    const _value = formatTok(removeToken, boostToken.decimal);
    // console.log(_value,formatTok(removeToken, lptoken.decimal) )
    let tx_res = await dispatch({
      type: 'user/transferMvc',
      payload: {
        address: mvcToAddress,
        amount: txFee,
        note: 'mvcswap.com(farm withdraw)',
        changeAddress,
        noBroadcast: true,
      },
    });
    if (tx_res.msg || tx_res.status == 'canceled') {
      return message.error(tx_res.msg || 'canceled');
    }

    if (tx_res.list) {
      tx_res = tx_res.list[0];
    }

    if (!tx_res.txHex) {
      return message.error(_('txs_fail'));
    }

    let data = {
      symbol: currentFarmPair,
      requestIndex,
      tokenRemoveAmount: _value,
      mvcRawTx: tx_res.txHex,
      mvcOutputIndex: 0,
    };
    data = JSON.stringify(data);
    data = await gzip(data);
    const withdraw_res = await dispatch({
      type: 'farm/boostWithdraw',
      payload: {
        data,
      },
    });

    if (withdraw_res.code) {
      return message.error(withdraw_res.msg);
    }
    // const withdraw2_res = await this.withdraw2(withdraw_res.data, requestIndex);
    const withdraw2_res = await userSignTx(
      'farm/boostWithdraw2',
      dispatch,
      withdraw_res.data,
      requestIndex,
      { symbol: currentFarmPair },
    );

    //console.log('withdraw2_res:', withdraw2_res)

    if (withdraw2_res.code !== 0) {
      return message.error(withdraw2_res.msg || 'unknown error');
    }

    if (!withdraw2_res.code && withdraw2_res.data.txid) {
      message.success('success');
      this.updateData();
      this.setState({
        formFinish: true,
        blockTime: withdraw2_res.data.blockTime,
      });
    } else {
      return message.error(withdraw2_res.msg);
    }
  };

  renderButton() {
    const { isLogin, userBoostTokenAmount, boostToken } = this.props;
    const { removeToken } = this.state;

    const removeTokenAmount = formatTok(removeToken, boostToken.decimal);

    const conditions = [
      { key: 'login', cond: !isLogin },
      { key: 'enterAmount', cond: parseFloat(removeToken) <= 0 },
      {
        key: 'lackBalance',
        cond: parseFloat(removeTokenAmount) > (userBoostTokenAmount || 0),
      },
    ];

    return (
      BtnWait(conditions) || (
        <Button
          className={styles.btn}
          type="primary"
          shape="round"
          onClick={this.handleSubmit}
        >
          Confirm
        </Button>
      )
    );
  }

  renderResult() {
    const { removeToken, blockTime } = this.state;
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
                <FormatNumber value={removeToken} />
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
