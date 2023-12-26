'use strict';
import React, { Component } from 'react';
import { connect } from 'umi';
import { gzip } from 'node-gzip';
import BigNumber from 'bignumber.js';
import { Button, Spin, message } from 'antd';
import EventBus from 'common/eventBus';
import { formatSat, formatAmount, LeastFee, formatTok } from 'common/utils';
import Rate from 'components/rate';
// import CustomIcon from 'components/icon';
import FormatNumber from 'components/formatNumber';
import Loading from 'components/loading';
import PoolMenu from 'components/poolMenu';
import PairIcon from 'components/pairIcon';
import Pool from '../pool';
import styles from './index.less';
import _ from 'i18n';
import { BtnWait } from 'components/btns';
import { SuccessResult } from 'components/result';
import { Arrow } from 'components/ui';

let busy = false;
const type = 'pool';

@connect(({ user, pair, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...pair,
    loading: effects['pair/getAllPairs'] || effects['pair/getPairData'],
    spinning: effects['pair/getPairData'] || effects['user/loadingUserData'],
    submiting:
      effects['pair/reqSwap'] ||
      effects['pair/removeLiq'] ||
      effects['user/transferAll'] ||
      false,
  };
})
export default class RemovePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      removeLp: 0,
      page: 'form',
      formFinish: false,
      removeToken1: 0,
      removeToken2: 0,
      price: 0,
    };
  }

  componentDidMount() {
    EventBus.on('reloadPair', () => {
      const { hash } = window.location;
      if (hash.indexOf('remove') > -1) {
        this.fetch();
        this.clear();
      }
    });
    this.fetch();
  }

  async fetch() {
    if (busy) return;
    busy = true;
    const { dispatch } = this.props;
    await dispatch({
      type: 'pair/getAllPairs',
    });

    // if (currentPair) {
    const pairData = await dispatch({
      type: 'pair/getPairData',
      payload: {
        // currentPair,
      },
    });

    // }

    const { currentPair, allPairs } = this.props;
    const { swapToken1Amount, swapToken2Amount } = pairData;
    const { token1, token2 } = allPairs[currentPair];
    const price = BigNumber(formatSat(swapToken2Amount, token2.decimal)).div(
      formatSat(swapToken1Amount, token1.decimal),
    );
    this.setState({
      price: formatAmount(price, token2.decimal),
    });
    EventBus.emit('reloadChart', type);
    busy = false;
    // }
    // console.log(pairData);
  }

  updateData() {
    const { dispatch, currentPair } = this.props;
    dispatch({
      type: 'pair/getPairData',
      payload: {
        // currentPair,
      },
    });
    EventBus.emit('reloadChart', type);
    dispatch({
      type: 'user/loadingUserData',
      payload: {},
    });
  }

  changeData = (value) => {
    this.setState({
      removeLP: value,
    });
  };

  calc = () => {
    const {
      currentPair,
      pairData,
      lptoken = {},
      allPairs,
      accountInfo,
      loading,
    } = this.props;
    let LP = accountInfo.userBalance[lptoken.tokenID];
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

    // LP = BigNumber(LP).multipliedBy(Math.pow(10, lptoken.decimal));
    const { swapToken1Amount, swapToken2Amount, swapLpAmount } = pairData;
    // const rate = BigNumber(removeLP)
    //   .multipliedBy(Math.pow(10, lptoken.decimal))
    //   .div(swapLpAmount);
    let rate = BigNumber(formatTok(removeLP, lptoken.decimal)).div(
      swapLpAmount,
    );
    if (rate > 1) rate = 1;
    // console.log(rate.toString(), rate1.toString())
    const { token1, token2 } = allPairs[currentPair];
    const removeToken1 = formatSat(
      BigNumber(swapToken1Amount).multipliedBy(rate),
      token1.decimal,
    );
    const removeToken2 = formatSat(
      BigNumber(swapToken2Amount).multipliedBy(rate),
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
      currentPair,
      loading,
      submiting,
      accountInfo,
      // pairData,
      allPairs,
    } = this.props;
    if (loading || !currentPair) return <Loading />;
    const { lptoken = {}, token1, token2 } = allPairs[currentPair];
    const LP = accountInfo.userBalance[lptoken.tokenID] || 0;
    const { removeToken1, removeToken2 } = this.calc();
    return (
      <div className={styles.remove_content}>
        <Spin spinning={submiting}>
          <Rate
            type="farm"
            changeAmount={this.changeData}
            balance={LP}
            tokenPair={<PairIcon keyword="pair" txt="name1/name2-LP" />}
            token1={token1}
            token2={token2}
          />
          <Arrow noLine />
          <div className={styles.values}>
            <div className={styles.values_left}>
              <div className={styles.v_item}>
                <div className={styles.label}>
                  <PairIcon keyword="token1" size={20} />
                </div>
              </div>
              <div className={styles.v_item}>
                <div className={styles.label}>
                  <PairIcon keyword="token2" size={20} />
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
        </Spin>
      </div>
    );
  }

  handleSubmit = async () => {
    const { removeLP } = this.state;
    const {
      dispatch,
      currentPair,
      token1,
      token2,
      lptoken,
      rabinApis,
      accountInfo,
    } = this.props;
    const { userBalance, userAddress, changeAddress } = accountInfo;
    const LP = userBalance[lptoken.tokenID];

    let res = await dispatch({
      type: 'pair/reqSwap',
      payload: {
        symbol: currentPair,
        address: userAddress,
        op: 2,
      },
    });

    if (res.code) {
      return message.error(tx_res.msg || 'canceled');
    }

    const { tokenToAddress, requestIndex, mvcToAddress, txFee } = res.data;

    const isLackBalance = LeastFee(txFee, userBalance.MVC);
    if (isLackBalance.code) {
      return message.error(isLackBalance.msg);
    }

    // const _removeLP = BigNumber(removeLP)
    //   .multipliedBy(Math.pow(10, lptoken.decimal))
    //   .toFixed(0);
    const _removeLP = formatTok(removeLP, lptoken.decimal);
    // console.log(_removeLP, formatTok(removeLP, lptoken.decimal));
    let tx_res = await dispatch({
      type: 'user/transferAll',
      payload: {
        datas: [
          {
            type: 'mvc',
            address: mvcToAddress,
            amount: txFee,
            changeAddress,
            note: 'mvcswap.com(remove liquidity)',
          },
          {
            type: 'sensibleFt',
            address: tokenToAddress,
            amount: _removeLP,
            changeAddress,
            codehash: lptoken.codeHash,
            genesis: lptoken.tokenID,
            rabinApis,
            note: 'mvcswap.com(remove liquidity)',
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

    let liq_data = {
      symbol: currentPair,
      requestIndex: requestIndex,
      mvcRawTx: tx_res[0].txHex,
      mvcOutputIndex: 0,
      lpTokenRawTx: tx_res[1].txHex,
      lpTokenOutputIndex: 0,
      amountCheckRawTx: tx_res[1].routeCheckTxHex,
    };
    liq_data = JSON.stringify(liq_data);
    liq_data = await gzip(liq_data);
    const removeliq_res = await dispatch({
      type: 'pair/removeLiq',
      payload: {
        data: liq_data,
      },
    });

    if (removeliq_res.code && removeliq_res.msg) {
      return message.error(removeliq_res.msg);
    }
    message.success('success');
    this.updateData();
    this.setState({
      formFinish: true,
      final_lp: removeLP.toString(),
      receive_token1: formatSat(
        removeliq_res.data.token1Amount,
        token1.decimal,
      ),
      receive_token2: formatSat(
        removeliq_res.data.token2Amount,
        token2.decimal,
      ),
    });
  };

  renderButton() {
    const { removeLP = 0 } = this.state;
    const { isLogin, accountInfo, lptoken } = this.props;
    const LP = accountInfo.userBalance[lptoken.tokenID];

    const conditions = [
      { key: 'login', cond: !isLogin },
      {
        cond: !LP || LP === '0',
        txt: _('cant_remove'),
      },
      {
        key: 'enterAmount',
        cond: parseFloat(removeLP) <= 0,
      },
      {
        cond: parseFloat(removeLP) > parseFloat(LP),
        txt: _('insufficient_balance'),
      },
    ];

    return (
      BtnWait(conditions) || (
        <Button
          className={styles.btn}
          type="primary"
          // shape="round"
          onClick={this.handleSubmit}
        >
          {_('remove')}
        </Button>
      )
    );
  }

  renderResult() {
    // const LP = userBalance[lptoken.tokenID];
    const { final_lp, receive_token1, receive_token2 } = this.state;
    return (
      <div className={styles.remove_content}>
        <SuccessResult success_txt={_('liq_removed')} done={this.clear}>
          <div className={styles.f_box}>
            <div className={styles.f_title}>{_('your_pos')}</div>
            <div className={styles.f_item}>
              <div className={styles.f_label}>
                <PairIcon keyword="pair" size={20} />
              </div>
              <div className={styles.f_value}>
                <FormatNumber value={final_lp} />
              </div>
            </div>
          </div>

          <Arrow noLine={true} />

          <div className={styles.f_box}>
            <div className={styles.f_title}>{_('your_re_liq')}</div>
            <div className={styles.f_item}>
              <div className={styles.f_label}>
                <PairIcon keyword="token1" size={20}>
                  <FormatNumber value={receive_token1} />
                </PairIcon>
              </div>
              <div className={styles.f_value}>
                <PairIcon keyword="token2" size={20}>
                  <FormatNumber value={receive_token2} />
                </PairIcon>
              </div>
            </div>
          </div>
        </SuccessResult>
      </div>
    );
  }

  clear = () => {
    this.setState({
      formFinish: false,
      removeLP: 0,
      removeToken1: 0,
      removeToken2: 0,
    });
  };

  render() {
    const { page, formFinish } = this.state;
    const { currentPair } = this.props;
    return (
      <Pool>
        <div
          className={styles.container}
          style={{ display: page === 'form' ? 'block' : 'none' }}
        >
          <PoolMenu currentMenuIndex={1} currentPair={currentPair} />
          {formFinish ? this.renderResult() : this.renderForm()}
        </div>
      </Pool>
    );
  }
}
