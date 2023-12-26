'use strict';
import React, { Component } from 'react';
import BN from 'bignumber.js';
import { connect } from 'umi';
import { gzip, ungzip } from 'node-gzip';
import { Button, message } from 'antd';
import EventBus from 'common/eventBus';
import { LeastFee, formatTok, formatSat, formatAmount } from 'common/utils';
import FormatNumber from 'components/formatNumber';
import Loading from 'components/loading';
import Rate from 'components/rate';
import styles from '../deposit/index.less';
import _ from 'i18n';

import FarmPairIcon from 'components/pairIcon/farmIcon';
import { BtnWait } from 'components/btns';
import { SuccessResult } from 'components/result';
import { Arrow } from 'components/ui';
import { userSignTx } from 'common/signTx';
import { OP_WITHDRAW } from '../../common/const';

@connect(({ user, farm, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...farm,
    loading: effects['farm/getAllPairs'],
  };
})
export default class Withdraw extends Component {
  constructor(props) {
    super(props);
    this.state = {
      removeLP: 0,
      formFinish: false,
      price: 0,
      blockTime: 0,
    };
  }

  componentDidMount() {
    EventBus.on('changeFarmPair', () => {
      this.changeData(0);
      this.clear();
    });
  }

  updateData() {
    const { dispatch, accountInfo } = this.props;
    dispatch({
      type: 'farm/getAllPairs',
      payload: {
        address: accountInfo.userAddress,
      },
    });
    dispatch({
      type: 'user/loadingUserData',
      payload: {},
    });
  }

  changeData = (value) => {
    // console.log(value);
    this.setState({
      removeLP: value,
    });
  };

  calc = () => {
    const { currentFarmPair, allFarmPairs, pairsData, loading } = this.props;
    if (loading) {
      return {
        removeToken1: 0,
        removeToken2: 0,
        removeLP: 0,
      };
    }
    const { removeLP } = this.state;
    if (!removeLP) {
      return {
        removeToken1: 0,
        removeToken2: 0,
      };
    }
    const currentPair = allFarmPairs[currentFarmPair];
    const {
      swapToken1Amount,
      swapToken2Amount,
      swapLpAmount,
      lptoken,
      token1,
      token2,
    } = pairsData[currentPair.token.tokenID];

    let rate = BN(formatTok(removeLP, lptoken.decimal)).div(swapLpAmount);
    if (rate > 1) rate = 1;
    // console.log(rate.toString(), rate1.toString())
    const removeToken1 = formatSat(
      BN(swapToken1Amount).multipliedBy(rate),
      token1.decimal,
    );
    const removeToken2 = formatSat(
      BN(swapToken2Amount).multipliedBy(rate),
      token2.decimal,
    );
    return {
      removeToken1: formatAmount(removeToken1, token1.decimal),
      removeToken2: formatAmount(removeToken2, token2.decimal),
      removeLP: formatSat(removeLP, lptoken.decimal),
    };
  };

  renderForm() {
    const {
      currentFarmPair,
      loading,
      lockedTokenAmount,
      lptoken,
      // submiting,
    } = this.props;
    if (loading || !currentFarmPair) return <Loading />;
    const { removeToken1, removeToken2 } = this.calc();
    return (
      <div className={styles.content}>
        <Rate
          type="farm"
          changeAmount={(value) => this.changeData(value)}
          balance={formatSat(lockedTokenAmount, lptoken.decimal)}
          tokenPair={<FarmPairIcon keyword="pair" />}
        />

        <Arrow />

        <div className={styles.values}>
          <div className={styles.values_left}>
            <div className={styles.v_item}>
              <div className={styles.label}>
                <FarmPairIcon keyword="token1" size={20} />
              </div>
            </div>
            <div className={styles.v_item}>
              <div className={styles.label}>
                <FarmPairIcon keyword="token2" size={20} />
              </div>
            </div>
          </div>
          <div className={styles.values_right}>
            <div className={styles.v_item}>
              <div className={styles.value}>
                <FormatNumber value={removeToken1} />
              </div>
            </div>
            <div className={styles.v_item}>
              <div className={styles.value}>
                <FormatNumber value={removeToken2} />
              </div>
            </div>
          </div>
        </div>
        {this.renderButton()}
      </div>
    );
  }

  // withdraw2 = async (withdraw_data, requestIndex) => {
  //   const { txHex, scriptHex, satoshis, inputIndex } = withdraw_data;
  //   const { dispatch, currentFarmPair, accountInfo } = this.props;

  //   let sign_res = await dispatch({
  //     type: 'user/signTx',
  //     payload: {
  //       datas: {
  //         txHex,
  //         scriptHex,
  //         satoshis,
  //         inputIndex,
  //         address: accountInfo.userAddress,
  //       },
  //     },
  //   });

  //   if (sign_res.msg && !sign_res.sig) {
  //     return message.error(sign_res);
  //   }
  //   if (sign_res[0]) {
  //     sign_res = sign_res[0];
  //   }

  //   const { publicKey, sig } = sign_res;

  //   const withdraw2_res = await dispatch({
  //     type: 'farm/withdraw2',
  //     payload: {
  //       symbol: currentFarmPair,
  //       requestIndex,
  //       pubKey: publicKey,
  //       sig,
  //     },
  //   });
  //   const { code, data, msg } = withdraw2_res;
  //   if (code === 99999) {
  //     const raw = await ungzip(Buffer.from(data.other));
  //     const newData = JSON.parse(raw.toString());
  //     return this.withdraw2(newData, requestIndex);
  //   }

  //   return withdraw2_res;
  // };

  handleSubmit = async () => {
    const { removeLP } = this.state;
    const { dispatch, currentFarmPair, accountInfo, allFarmPairs } = this.props;
    const { userAddress, userBalance, changeAddress } = accountInfo;
    const lptoken = allFarmPairs[currentFarmPair].token;

    let res = await dispatch({
      type: 'farm/reqSwap',
      payload: {
        symbol: currentFarmPair,
        address: userAddress,
        op: OP_WITHDRAW,
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

    // const _value = BigNumber(removeLP)
    //   .multipliedBy(Math.pow(10, lptoken.decimal))
    //   .toFixed(0);
    const _value = formatTok(removeLP, lptoken.decimal);
    // console.log(_value,formatTok(removeLP, lptoken.decimal) )
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
      type: 'farm/withdraw',
      payload: {
        data,
      },
    });

    if (withdraw_res.code) {
      return message.error(withdraw_res.msg);
    }
    // const withdraw2_res = await this.withdraw2(withdraw_res.data, requestIndex);
    const withdraw2_res = await userSignTx(
      'farm/withdraw2',
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
    const { isLogin, lockedTokenAmount, lptoken } = this.props;
    const { removeLP } = this.state;

    const removeTokenAmount = formatTok(removeLP, lptoken.decimal);

    const conditions = [
      { key: 'login', cond: !isLogin },
      { key: 'enterAmount', cond: parseFloat(removeLP) <= 0 },
      {
        key: 'lackBalance',
        cond: parseFloat(removeTokenAmount) > parseFloat(lockedTokenAmount),
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
          {_('withdraw')}
        </Button>
      )
    );
  }

  clear = () => {
    this.setState({
      formFinish: false,
      removeLP: 0,
    });
  };

  renderResult() {
    const { removeLP, blockTime } = this.state;
    const timeStr = new Date(blockTime * 1000).toLocaleString('en-GB');
    return (
      <div className={styles.content}>
        <SuccessResult
          success_txt={`${_('withdraw_success')}@${timeStr}`}
          done={this.clear}
        >
          <>
            <div className={styles.small_title}>{_('withdrew')}</div>

            <div className={styles.pair_data}>
              <div className={styles.pair_left}>
                <FormatNumber value={removeLP} />
              </div>
              <div className={styles.pair_right}>
                <FarmPairIcon keyword="pair" />
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
