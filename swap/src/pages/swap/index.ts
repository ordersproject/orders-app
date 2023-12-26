'use strict';
import React, { Component } from 'react';
import { connect } from 'umi';
import debug from 'debug';
import { gzip } from 'node-gzip';
import BigNumber from 'bignumber.js';
import { Form, Input, message, Spin } from 'antd';
import EventBus from 'common/eventBus';
import { slippage_data, MINAMOUNT } from 'common/config';
import { formatAmount, formatSat, jc, formatTok } from 'common/utils';
import { calcAmount } from 'common/pairUtils';
import { StableToken } from 'common/const';
import FormatNumber from 'components/formatNumber';
import Loading from 'components/loading';
import { Arrow2 } from 'components/ui';
import { TokenInput } from 'components/tokenInput';
import SelectToken from '../selectToken';
import SwapResult from './result';
import Btn from './btn';
import styles from './index.less';
import _ from 'i18n';

const log = debug('swap');
const { slippage_tolerance_value, defaultSlipValue } = slippage_data;

@connect(({ user, pair, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...pair,
    loading: effects['pair/getAllPairs'] || effects['pair/getPairData'],
    submiting:
      effects['pair/reqSwap'] ||
      effects['pair/token1toToken2'] ||
      effects['pair/token2toToken1'] ||
      effects['user/transferMvc'] ||
      effects['user/transferAll'] ||
      false,
  };
})
export default class Swap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 'form',
      formFinish: false,
      origin_amount: 0,
      aim_amount: 0,
      slip: 0,
      slip1: 0,
      fee: 0,
      txFee: 0,
      lastMod: '',
      dirForward: true, //交易对方向，true正向 false反向
      modalVisible: false,
      tol:
        window.localStorage.getItem(slippage_tolerance_value) ||
        defaultSlipValue,
    };
    this.formRef = React.createRef();
  }

  switch = async () => {
    const { current } = this.formRef;
    this.setState(
      {
        dirForward: !this.state.dirForward,
      },
      () => {
        const { origin_amount, aim_amount } = current.getFieldsValue([
          'origin_amount',
          'aim_amount',
        ]);
        const { lastMod, dirForward } = this.state;
        const { token1, token2, pairData } = this.props;
        const decimal = dirForward ? token1.decimal : token2.decimal;
        let newOriginAddAmount, newAimAddAmount, fee, slip, slip1;
        if (lastMod === 'origin') {
          const obj = calcAmount({
            token1,
            token2,
            dirForward,
            originAddAmount: 0,
            aimAddAmount: origin_amount,
            pairData,
          });
          newAimAddAmount = origin_amount;
          newOriginAddAmount = obj.newOriginAddAmount;
          fee = formatAmount(
            BigNumber(newOriginAddAmount)
              .multipliedBy(pairData.swapFeeRate)
              .div(10000),
            decimal,
          );
          slip = obj.slip;
          slip1 = obj.slip1;
        } else if (lastMod === 'aim') {
          fee = formatAmount(
            BigNumber(aim_amount).multipliedBy(pairData.swapFeeRate).div(10000),
            decimal,
          );
          const obj = calcAmount({
            token1,
            token2,
            dirForward,
            originAddAmount: aim_amount,
            aimAddAmount: 0,
            pairData,
          });
          newOriginAddAmount = aim_amount;
          newAimAddAmount = obj.newAimAddAmount;
          slip = obj.slip;
          slip1 = obj.slip1;
        }
        current.setFieldsValue({
          origin_amount: newOriginAddAmount,
          aim_amount: newAimAddAmount,
        });
        this.setState({
          lastMod: lastMod === 'origin' ? 'aim' : 'origin',
          aim_amount: newAimAddAmount,
          origin_amount: newOriginAddAmount,
          fee,
          slip,
          slip1,
        });
      },
    );
  };

  showUI = (name, type) => {
    this.setState({
      page: name,
      selectedTokenType: type,
    });
  };

  changeOriginAmount = (e) => {
    let value = e.target.value;
    const { token1, token2, pairData } = this.props;
    const { dirForward } = this.state;
    const decimal = dirForward ? token1.decimal : token2.decimal;
    let newOriginAddAmount = value,
      newAimAddAmount,
      fee,
      slip,
      slip1;
    if (value > 0) {
      value = formatAmount(value, token1.decimal);
      fee = formatAmount(
        BigNumber(value).multipliedBy(pairData.swapFeeRate).div(10000),
        decimal,
      );
      const obj = calcAmount({
        token1,
        token2,
        dirForward,
        originAddAmount: value,
        aimAddAmount: 0,
        pairData,
      });
      newAimAddAmount = obj.newAimAddAmount;
      slip = obj.slip;
      slip1 = obj.slip1;
    } else {
      newAimAddAmount = 0;
      fee = 0;
      slip = 0;
      slip1 = 0;
    }

    this.formRef.current.setFieldsValue({
      origin_amount: newOriginAddAmount,
      aim_amount: newAimAddAmount,
    });
    this.setState({
      origin_amount: newOriginAddAmount,
      aim_amount: newAimAddAmount,
      fee,
      slip,
      slip1,
      lastMod: 'origin',
    });
  };

  changeAimAmount = (e) => {
    let value = e.target.value;
    const { token1, token2, pairData } = this.props;
    const { decimal } = token2;
    const { dirForward } = this.state;
    let newOriginAddAmount,
      newAimAddAmount = value,
      fee,
      slip,
      slip1;
    if (value > 0) {
      value = formatAmount(value, decimal);
      const obj = calcAmount({
        token1,
        token2,
        dirForward,
        originAddAmount: 0,
        aimAddAmount: value,
        pairData,
      });
      newOriginAddAmount = obj.newOriginAddAmount;
      fee = obj.fee;
      slip = obj.slip;
      slip1 = obj.slip1;
    } else {
      newOriginAddAmount = 0;
      fee = 0;
      slip = 0;
      slip1 = 0;
    }

    this.formRef.current.setFieldsValue({
      origin_amount: newOriginAddAmount,
      aim_amount: newAimAddAmount,
    });
    this.setState({
      origin_amount: newOriginAddAmount,
      aim_amount: newAimAddAmount,
      fee,
      slip,
      slip1,
      lastMod: 'aim',
    });
  };

  setOriginBalance = () => {
    const { accountInfo, token1, token2, pairData } = this.props;
    const { userBalance } = accountInfo;
    const { swapToken1Amount, swapToken2Amount } = pairData;
    const { dirForward } = this.state;
    const decimal = dirForward ? token1.decimal : token2.decimal;
    if (swapToken1Amount === '0' || swapToken2Amount === '0') {
      return;
    }

    let origin_amount = this.state.dirForward
      ? token1.isMvc
        ? userBalance.MVC * 0.98 || 0
        : userBalance[token1.tokenID]
      : userBalance[token2.tokenID] || 0;
    origin_amount = formatAmount(origin_amount, decimal);
    const { newAimAddAmount, slip, slip1 } = calcAmount({
      token1,
      token2,
      dirForward,
      originAddAmount: origin_amount,
      aimAddAmount: 0,
      pairData,
    });
    this.formRef.current.setFieldsValue({
      origin_amount,
      aim_amount: newAimAddAmount,
    });
    this.setState({
      origin_amount,
      aim_amount: newAimAddAmount,
      slip,
      slip1,
    });
    if (origin_amount > 0) {
      this.setState({
        lastMod: 'origin',
        fee: formatAmount(
          BigNumber(origin_amount)
            .multipliedBy(pairData.swapFeeRate)
            .div(10000),
          decimal,
        ),
      });
    } else {
      this.setState({
        lastMod: '',
      });
    }
  };

  renderForm = () => {
    const { token1, token2, pairData, accountInfo, submiting } = this.props;
    const { userBalance } = accountInfo;
    const { swapToken1Amount, swapToken2Amount } = pairData;
    const {
      dirForward,
      tol,
      slip,
      slip1,
      fee,
      lastMod,
      origin_amount,
      aim_amount,
    } = this.state;
    const origin_token = dirForward ? token1 : token2;
    const aim_token = dirForward ? token2 : token1;
    const symbol1 = origin_token.symbol.toUpperCase();
    const symbol2 = aim_token.symbol.toUpperCase();
    const _swapToken1Amount = formatSat(swapToken1Amount, token1.decimal);
    const _swapToken2Amount = formatSat(swapToken2Amount, token2.decimal);
    const price = dirForward
      ? formatAmount(_swapToken2Amount / _swapToken1Amount, token2.decimal)
      : formatAmount(_swapToken1Amount / _swapToken2Amount, token1.decimal);

    const price1 = formatAmount(
      _swapToken2Amount / _swapToken1Amount,
      token2.decimal,
    );
    const price2 = formatAmount(
      _swapToken1Amount / _swapToken2Amount,
      token1.decimal,
    );
    const price1_ui = `1 ${token1.symbol.toUpperCase()} = ${price1} ${token2.symbol.toUpperCase()}`;
    const price2_ui = `1 ${token2.symbol.toUpperCase()} = ${price2} ${token1.symbol.toUpperCase()}`;
    let price_ui = dirForward ? price1_ui : price2_ui;
    if (StableToken.indexOf(token1.symbol) > -1) {
      price_ui = price2_ui;
    }

    const beyond = Math.abs(parseFloat(slip)) > parseFloat(tol);

    const balance = userBalance[origin_token.tokenID || 'MVC'];
    const isLackBalance = parseFloat(origin_amount) > parseFloat(balance || 0);

    return (
      <div className={styles.content}>
        <Spin spinning={submiting}>
          <Form onSubmit={this.handleSubmit} ref={this.formRef}>
            <div className={styles.title}>
              <h3>{_('you_pay')}</h3>
              <div
                className={jc(styles.balance, styles.can_click)}
                onClick={this.setOriginBalance}
              >
                {_('your_balance')}:{' '}
                <span>
                  <FormatNumber
                    value={userBalance[origin_token.tokenID || 'MVC'] || 0}
                  />
                </span>
              </div>
            </div>
            {
              <TokenInput
                pairData={pairData}
                tokenKey={dirForward ? 'token1' : 'token2'}
                showUI={() =>
                  this.showUI('selectToken', dirForward ? 'left' : 'right')
                }
                changeAmount={this.changeOriginAmount}
                formItemName="origin_amount"
                isLackBalance={isLackBalance}
              />
            }

            <Arrow2 onClick={this.switch} />

            <div className={styles.title}>
              <h3>{_('you_receive')} </h3>
              <div className={styles.balance} style={{ cursor: 'default' }}>
                {_('your_balance')}:{' '}
                <span>
                  <FormatNumber
                    value={userBalance[aim_token.tokenID || 'MVC'] || 0}
                  />
                </span>
              </div>
            </div>

            {
              <TokenInput
                pairData={pairData}
                tokenKey={dirForward ? 'token2' : 'token1'}
                showUI={() =>
                  this.showUI('selectToken', dirForward ? 'right' : 'left')
                }
                changeAmount={this.changeAimAmount}
                formItemName="aim_amount"
                isLackBalance={isLackBalance}
              />
            }

            <div className={styles.my_pair_info}>
              <div className={styles.key_value}>
                <div className={styles.key}>{_('price')}</div>
                <div className={styles.value}>
                  {/* 1 {symbol1} = {price} {symbol2}*/}
                  {price_ui}
                </div>
              </div>
              <div className={styles.key_value}>
                <div className={styles.key}>{_('slippage_tolerance')}</div>
                <div className={styles.value}>
                  <Input
                    value={tol}
                    suffix="%"
                    className={styles.tol}
                    onChange={this.changeTol}
                  />
                </div>
              </div>
              <div className={styles.key_value}>
                <div className={styles.key}>{_('price_impact')}</div>
                <div
                  className={styles.value}
                  style={beyond || isLackBalance ? { color: 'red' } : {}}
                >
                  {symbol1} {slip || '0%'}, {symbol2} {slip1 || '0%'}
                </div>
              </div>
              <div className={styles.key_value}>
                <div className={styles.key}>{_('fee')}</div>
                <div className={styles.value}>
                  <FormatNumber value={fee} suffix={symbol1} />
                </div>
              </div>
            </div>

            <Btn
              {...this.props}
              // slip={slip}
              beyond={beyond}
              lastMod={lastMod}
              origin_amount={origin_amount}
              aim_amount={aim_amount}
              dirForward={dirForward}
              // tol={tol}
              handleSubmit={this.handleSubmit}
            />
          </Form>
        </Spin>
      </div>
    );
  };

  changeTol = (e) => {
    const value = e.target.value;
    this.setState({
      tol: value,
    });
    localStorage.setItem(slippage_tolerance_value, value);
  };

  handleSubmit = async () => {
    const { dirForward, origin_amount } = this.state;
    const { dispatch, currentPair, token1, token2, rabinApis, accountInfo } =
      this.props;
    const { userBalance, changeAddress, userAddress } = accountInfo;

    const res = await dispatch({
      type: 'pair/reqSwap',
      payload: {
        symbol: currentPair,
        address: userAddress,
        op: dirForward ? 3 : 4,
      },
    });
    const { code, data, msg } = res;
    if (code) {
      return message.error(msg);
    }

    const { mvcToAddress, tokenToAddress, txFee, requestIndex } = data;
    let payload = {
      symbol: currentPair,
      requestIndex: requestIndex,
      op: dirForward ? 3 : 4,
    };
    if (dirForward) {
      let amount = formatTok(origin_amount, token1.decimal);

      if (token1.isMvc) {
        const userTotal = BigNumber(userBalance.MVC).multipliedBy(1e8);
        let total = BigInt(amount) + BigInt(txFee);
        const _allBalance = total > BigInt(userTotal);
        if (_allBalance) {
          total = userTotal;
          amount = BigInt(userTotal) - BigInt(txFee);
        }
        if (amount < MINAMOUNT) {
          return message.error(_('lower_amount', MINAMOUNT));
        }
        const ts_res = await dispatch({
          type: 'user/transferMvc',
          payload: {
            address: mvcToAddress,
            amount: total.toString(),
            changeAddress,
            note: 'mvcswap.com(swap)',
            noBroadcast: true,
          },
        });

        if (ts_res.msg || ts_res.status == 'canceled') {
          return message.error(ts_res.msg || 'canceled');
        }
        if (_allBalance) {
          amount = amount - BigInt(ts_res.fee || 0);
        }

        payload = {
          ...payload,
          // token1TxID: ts_res.txid,
          mvcOutputIndex: 0,
          mvcRawTx: ts_res.list ? ts_res.list[0].txHex : ts_res.txHex,
          token1AddAmount: amount.toString(),
        };
      } else {
        let tx_res = await dispatch({
          type: 'user/transferAll',
          payload: {
            datas: [
              {
                type: 'mvc',
                address: mvcToAddress,
                amount: txFee,
                changeAddress,
                note: 'mvcswap.com(swap)',
              },
              {
                type: 'sensibleFt',
                address: tokenToAddress,
                amount,
                changeAddress,
                codehash: token1.codeHash,
                genesis: token1.tokenID,
                rabinApis,
                note: 'mvcswap.com(swap)',
              },
            ],
            noBroadcast: true,
          },
        });
        if (!tx_res) {
          return message.error(_('txs_fail'));
        }
        if (tx_res.msg || tx_res.status == 'canceled') {
          return message.error(tx_res.msg || 'canceled');
        }
        if (tx_res.list) {
          tx_res = tx_res.list;
        }
        if (!tx_res[0] || !tx_res[0].txHex || !tx_res[1] || !tx_res[1].txHex) {
          return message.error(_('txs_fail'));
        }

        payload = {
          ...payload,
          mvcRawTx: tx_res[0].txHex,
          mvcOutputIndex: 0,
          token1RawTx: tx_res[1].txHex,
          token1OutputIndex: 0,
          amountCheckRawTx: tx_res[1].routeCheckTxHex,
        };
      }
    } else {
      const amount = formatTok(origin_amount, token2.decimal);
      let tx_res = await dispatch({
        type: 'user/transferAll',
        payload: {
          datas: [
            {
              type: 'mvc',
              address: mvcToAddress,
              amount: txFee,
              changeAddress,
              note: 'mvcswap.com(swap)',
            },
            {
              type: 'sensibleFt',
              address: tokenToAddress,
              amount,
              changeAddress,
              codehash: token2.codeHash,
              genesis: token2.tokenID,
              rabinApis,
              note: 'mvcswap.com(swap)',
            },
          ],
          noBroadcast: true,
        },
      });
      if (!tx_res) {
        return message.error(_('txs_fail'));
      }
      if (tx_res.msg) {
        return message.error(tx_res.msg);
      }
      if (tx_res.list) {
        tx_res = tx_res.list;
      }
      if (!tx_res[0] || !tx_res[0].txHex || !tx_res[1] || !tx_res[1].txHex) {
        return message.error(_('txs_fail'));
      }

      payload = {
        ...payload,
        mvcRawTx: tx_res[0].txHex,
        mvcOutputIndex: 0,
        token2RawTx: tx_res[1].txHex,
        token2OutputIndex: 0,
        amountCheckRawTx: tx_res[1].routeCheckTxHex,
      };
    }
    let swap_data = JSON.stringify(payload);

    swap_data = await gzip(swap_data);

    const swap_res = await dispatch({
      type: dirForward ? 'pair/token1toToken2' : 'pair/token2toToken1',
      payload: {
        data: swap_data,
      },
    });

    if (swap_res.code && !swap_res.data) {
      return message.error(swap_res.msg);
    }
    message.success('success');
    this.updateData();
    this.setState({
      formFinish: true,
      txid: swap_res.data.txid,
      txFee: txFee,
      realSwapAmount: dirForward
        ? formatSat(swap_res.data.token2Amount, token2.decimal)
        : formatSat(swap_res.data.token1Amount, token1.decimal),
    });
  };

  async updateData() {
    const { dispatch } = this.props;

    await dispatch({
      type: 'pair/getPairData',
      payload: {
        // currentPair,
      },
    });
    setTimeout(() => {
      dispatch({
        type: 'user/loadingUserData',
        payload: {},
      });
    }, 3000);
    EventBus.emit('reloadChart', 'swap');
  }

  componentDidMount() {
    EventBus.on('reloadPair', () => {
      const { hash } = window.location;
      if (hash.indexOf('swap') > -1) {
        this.setState({ page: 'form' });
      }
    });
  }

  finish = () => {
    this.setState({
      formFinish: false,
      origin_amount: 0,
      aim_amount: 0,
      lastMod: '',
      fee: 0,
      slip: 0,
    });
  };

  renderSwap() {
    const {
      formFinish,
      origin_amount,
      txFee,
      dirForward,
      txid,
      realSwapAmount,
    } = this.state;
    const { token1, token2 } = this.props;

    return (
      <div className={styles.container}>
        {formFinish ? (
          <SwapResult
            origin_amount={origin_amount}
            txFee={txFee}
            dirForward={dirForward}
            txid={txid}
            realSwapAmount={realSwapAmount}
            token1={token1}
            token2={token2}
            finish={this.finish}
          />
        ) : (
          this.renderForm()
        )}
      </div>
    );
  }

  selectedToken = () => {
    this.setState({
      origin_amount: 0,
      aim_amount: 0,
      slip: 0,
      slip1: 0,
    });

    this.showUI('form');
  };

  render() {
    const { currentPair, loading } = this.props;
    if (loading) return <Loading />;
    if (!currentPair) return 'No pair';
    const { page, selectedTokenType } = this.state;
    return (
      <div style={{ position: 'relative' }}>
        {this.renderSwap()}

        {page === 'selectToken' && (
          <div className={styles.selectToken_wrap}>
            <SelectToken
              finish={() => this.selectedToken()}
              type={selectedTokenType}
            />
          </div>
        )}
      </div>
    );
  }
}
