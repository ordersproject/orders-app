'use strict';
import React, { Component } from 'react';
import { history, connect } from 'umi';
import BigNumber from 'bignumber.js';
import { gzip } from 'node-gzip';
import { Button, Form, Input, Spin, message, Modal } from 'antd';
import EventBus from 'common/eventBus';
import { formatAmount, formatSat, formatTok } from 'common/utils';
import { countLpAddAmount, countLpAddAmountWithToken2 } from 'common/swap';
import CustomIcon from 'components/icon';
import FormatNumber from 'components/formatNumber';
import Loading from 'components/loading';
import PoolMenu from 'components/poolMenu';
import { MINAMOUNT } from 'common/config';
import SelectToken from '../selectToken';
import Pool from '../pool';
import styles from './index.less';
import _ from 'i18n';
import PairIcon from 'components/pairIcon';
import { BtnWait } from 'components/btns';
import { SuccessResult } from 'components/result';
import { Plus } from 'components/ui';

let busy = false;
const type = 'pool';
// let _poolTimer = 0;
const FormItem = Form.Item;

@connect(({ user, pair, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...pair,
    loading: effects['pair/getAllPairs'] || effects['pair/getPairData'],
    spinning: effects['pair/getPairData'] || effects['user/loadingUserData'],
    submiting:
      effects['pair/reqSwap'] ||
      effects['pair/addLiq'] ||
      effects['user/transferAll'] ||
      false,
  };
})
export default class Liquidity extends Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 'form',
      lastMod: '',
      formFinish: false,
      showDetail: false,
      origin_amount: 0,
      aim_amount: 0,
      lp: 0,
      price_dir: true,
    };
    this.formRef = React.createRef();
  }

  componentDidMount() {
    EventBus.on('reloadPair', () => {
      const { hash } = window.location;
      if (hash.indexOf('add') > -1) {
        this.fetch();
        this.setState({ page: 'form' });
      }
    });
    this.fetch();
  }

  fetch = async () => {
    // const { dispatch } = this.props;
    // await dispatch({
    //   type: 'pair/getAllPairs',
    // });

    // let { currentPair } = this.props;
    // if (currentPair) {
    //   await dispatch({
    //     type: 'pair/getPairData',
    //     payload: {
    //       // currentPair,
    //     },
    //   });
    // }
    if (busy) return;
    busy = true;
    const { dispatch } = this.props;
    await dispatch({
      type: 'pair/getAllPairs',
    });

    // if (currentPair) {
    await dispatch({
      type: 'pair/getPairData',
      payload: {
        // currentPair,
      },
    });

    // }
    EventBus.emit('reloadChart', type);
    busy = false;
  };

  changeOriginAmount = (e) => {
    let value = e.target.value;
    const { pairData, token1, token2 } = this.props;
    const { swapToken1Amount, swapToken2Amount, swapLpAmount } = pairData;
    value = formatAmount(value, token1.decimal);

    if (swapToken1Amount === '0' && swapToken2Amount === '0') {
      //第一次添加流动性
      this.setState({
        origin_amount: value || 0,
        lastMod: 'origin',
      });
      return;
    }

    // const origin_amount = BigNumber(value || 0)
    //   .multipliedBy(Math.pow(10, token1.decimal))
    //   .toString();
    const origin_amount = formatTok(value, token1.decimal);

    // console.log(origin_amount, formatTok(value, token1.decimal))
    const [lpMinted, token2AddAmount] = countLpAddAmount(
      origin_amount,
      swapToken1Amount,
      swapToken2Amount,
      swapLpAmount,
    );
    // console.log(lpMinted, token2AddAmount);

    const user_aim_amount = formatSat(token2AddAmount, token2.decimal);
    this.formRef.current.setFieldsValue({
      origin_amount: value,
      aim_amount: user_aim_amount,
    });
    this.setState({
      origin_amount: value || 0,
      aim_amount: user_aim_amount,
      lp: lpMinted,
      lastMod: 'origin',
    });
  };

  changeAimAmount = (e) => {
    let value = e.target.value;
    const { pairData, token2, token1 } = this.props;
    const { swapToken1Amount, swapToken2Amount, swapLpAmount } = pairData;
    value = formatAmount(value, token2.decimal);

    if (swapToken1Amount === '0' && swapToken2Amount === '0') {
      //第一次添加流动性
      this.setState({
        aim_amount: value || 0,
        lastMod: 'aim',
      });
      return;
    }
    // const aim_amount = BigNumber(value || 0)
    //   .multipliedBy(Math.pow(10, token2.decimal))
    //   .toString();
    const aim_amount = formatTok(value, token2.decimal);
    // console.log(aim_amount, formatSatToToken(value, token2.decimal))

    const [lpMinted, token1AddAmount] = countLpAddAmountWithToken2(
      aim_amount,
      swapToken1Amount,
      swapToken2Amount,
      swapLpAmount,
    );
    const user_origin_amount = formatSat(token1AddAmount, token1.decimal);

    this.formRef.current.setFieldsValue({
      origin_amount: user_origin_amount,
      aim_amount: value,
    });
    this.setState({
      aim_amount: value || 0,
      origin_amount: user_origin_amount,
      lp: lpMinted,
      lastMod: 'aim',
    });
  };

  setOriginBalance = () => {
    const { accountInfo, pairData, token1, token2 } = this.props;
    const { userBalance } = accountInfo;
    const { swapLpAmount, swapToken1Amount, swapToken2Amount } = pairData;
    const origin_amount =
      (token1.isMvc ? userBalance.MVC : userBalance[token1.tokenID]) || 0;

    if (swapToken1Amount === '0' && swapToken2Amount === '0') {
      //第一次添加流动性
      this.setState({
        origin_amount,
        lastMod: 'origin',
      });
      this.formRef.current.setFieldsValue({
        origin_amount,
      });
      return;
    }

    // const token1AddAmount = BigNumber(origin_amount)
    //   .multipliedBy(Math.pow(10, token1.decimal))
    //   .toString();
    const token1AddAmount = formatTok(origin_amount, token1.decimal);
    // console.log(token1AddAmount, formatSatToToken(origin_amount, token1.decimal))
    const [lpMinted, token2AddAmount] = countLpAddAmount(
      token1AddAmount,
      swapToken1Amount,
      swapToken2Amount,
      swapLpAmount,
    );
    const aim_amount = formatSat(token2AddAmount, token2.decimal);

    this.formRef.current.setFieldsValue({
      origin_amount,
      aim_amount,
    });
    this.setState({
      origin_amount,
      aim_amount,
      lp: lpMinted,
      lastMod: 'origin',
    });
  };

  setAimBalance = () => {
    const { accountInfo, token1, token2, pairData } = this.props;
    const { swapLpAmount, swapToken1Amount, swapToken2Amount } = pairData;
    const aim_amount = accountInfo.userBalance[token2.tokenID] || 0;

    if (swapToken1Amount === '0' && swapToken2Amount === '0') {
      //第一次添加流动性
      this.setState({
        aim_amount,
        lastMod: 'aim',
      });
      this.formRef.current.setFieldsValue({
        aim_amount,
      });
      return;
    }
    // const token2AddAmount = BigNumber(aim_amount)
    //   .multipliedBy(Math.pow(10, token2.decimal))
    //   .toString();
    const token2AddAmount = formatTok(aim_amount, token2.decimal);
    // console.log(token2AddAmount, formatSatToToken(aim_amount, token2.decimal))
    const [lpMinted, token1AddAmount] = countLpAddAmountWithToken2(
      token2AddAmount,
      swapToken1Amount,
      swapToken2Amount,
      swapLpAmount,
    );
    const origin_amount = formatSat(token1AddAmount, token1.decimal);

    this.formRef.current.setFieldsValue({
      origin_amount,
      aim_amount,
    });
    this.setState({
      origin_amount,
      aim_amount,
      lp: lpMinted,
      lastMod: 'aim',
    });
  };

  showUI = (name, type) => {
    this.setState({
      page: name,
      selectedTokenType: type,
    });
  };

  switchPriceDir = () => {
    this.setState({
      price_dir: !this.state.price_dir,
    });
  };

  renderInfo(total_origin_amount, total_aim_amount, share) {
    const { price_dir } = this.state;
    const { token1, token2 } = this.props;
    const price1 = formatAmount(
      total_aim_amount / total_origin_amount,
      token2.decimal,
    );
    const price2 = formatAmount(
      total_origin_amount / total_aim_amount,
      token1.decimal,
    );
    return (
      <div className={styles.my_pair_info}>
        <div className={styles.info_item}>
          <div className={styles.info_label}>{_('price')}</div>
          <div
            className={styles.info_value}
            onClick={this.switchPriceDir}
            style={{ cursor: 'pointer' }}
          >
            1 {price_dir ? token1.symbol : token2.symbol} ={' '}
            <FormatNumber
              value={price_dir ? price1 : price2}
              suffix={price_dir ? token2.symbol : token1.symbol}
            />{' '}
            <CustomIcon type="iconSwitch" />
          </div>
        </div>
      </div>
    );
  }

  renderFormInfo() {
    const { token1, token2, pairData, accountInfo, lptoken } = this.props;
    const { userBalance } = accountInfo;
    const { swapToken1Amount, swapToken2Amount, swapLpAmount } = pairData;
    const { origin_amount = 0, aim_amount = 0 } = this.state;

    const LP = userBalance[lptoken.tokenID] || 0;
    let rate = LP / formatSat(swapLpAmount, lptoken.decimal) || 0;

    let total_origin_amount = origin_amount,
      total_aim_amount = aim_amount;

    total_origin_amount = formatAmount(
      BigNumber(origin_amount).plus(
        BigNumber(swapToken1Amount).div(Math.pow(10, token1.decimal)),
      ),
      token1.decimal,
    ).toString();
    total_aim_amount = formatAmount(
      BigNumber(aim_amount).plus(
        BigNumber(swapToken2Amount).div(Math.pow(10, token2.decimal)),
      ),
      token2.decimal,
    ).toString();
    const share =
      origin_amount > 0
        ? formatAmount(
            BigNumber(origin_amount)
              .plus(
                BigNumber(swapToken1Amount)
                  .div(Math.pow(10, token1.decimal))
                  .multipliedBy(rate),
              )
              .div(total_origin_amount)
              .multipliedBy(100),
            4,
          )
        : 0;
    return this.renderInfo(total_origin_amount, total_aim_amount, share);
  }

  renderForm() {
    const { token1, token2, submiting, accountInfo } = this.props;
    const { userBalance } = accountInfo;
    return (
      <div className={styles.add_content}>
        <Spin spinning={submiting}>
          <Form onSubmit={this.preHandleSubmit} ref={this.formRef}>
            <div className={styles.title}>
              <h3>{_('input')}</h3>
              <div className={styles.balance} onClick={this.setOriginBalance}>
                {_('your_balance')}:{' '}
                <span>
                  <FormatNumber
                    value={
                      (token1.isMvc
                        ? userBalance.MVC
                        : userBalance[token1.tokenID]) || 0
                    }
                  />
                </span>
              </div>
            </div>
            <div className={styles.box}>
              <div
                className={styles.coin}
                onClick={() => this.showUI('selectToken', 'left')}
              >
                <PairIcon keyword="token1" size={40} />
                <div className={styles.arrow}>
                  <CustomIcon type="iconDropdown" />
                </div>
              </div>
              <FormItem name={'origin_amount'}>
                <Input
                  className={styles.input}
                  onChange={this.changeOriginAmount}
                  min="0"
                />
              </FormItem>
            </div>

            <Plus />

            <div className={styles.title}>
              <h3>{_('input')}</h3>
              <div className={styles.balance} onClick={this.setAimBalance}>
                {_('balance')}:{' '}
                <span>
                  <FormatNumber value={userBalance[token2.tokenID] || 0} />
                </span>
              </div>
            </div>

            <div className={styles.box}>
              <div
                className={styles.coin}
                onClick={() => this.showUI('selectToken', 'right')}
              >
                <PairIcon keyword="token2" size={40} />
                <div className={styles.arrow}>
                  <CustomIcon type="iconDropdown" />
                </div>
              </div>
              <FormItem name={'aim_amount'}>
                <Input
                  className={styles.input}
                  onChange={this.changeAimAmount}
                  min="0"
                  // formatter={(value) => parseFloat(value || 0)}
                />
              </FormItem>
            </div>
            {this.renderButton()}
          </Form>
        </Spin>
      </div>
    );
  }

  renderButton = () => {
    const { isLogin, token1, token2, accountInfo } = this.props;
    const { userBalance } = accountInfo;
    const { origin_amount, aim_amount } = this.state;

    const conditions = [
      { key: 'login', cond: !isLogin },
      {
        key: 'enterAmount',
        cond: parseFloat(origin_amount) <= 0 || parseFloat(aim_amount) <= 0,
      },
      {
        key: 'lowerAmount',
        cond: token1.isMvc && parseFloat(origin_amount) <= formatSat(MINAMOUNT),
      },
      {
        key: 'lackBalance',
        cond:
          parseFloat(origin_amount) >
          parseFloat(
            (token1.isMvc ? userBalance.MVC : userBalance[token1.tokenID]) || 0,
          ),
        txtParam: token1.symbol,
      },
      {
        key: 'lackBalance',
        cond:
          parseFloat(aim_amount) > parseFloat(userBalance[token2.tokenID] || 0),
        txtParam: token2.symbol,
      },
    ];

    const btn = BtnWait(conditions) || (
      <Button
        className={styles.btn}
        type="primary"
        shape="round"
        onClick={this.preHandleSubmit}
      >
        {_('supply_liq')}
      </Button>
    );

    return (
      <div>
        {this.renderFormInfo()}
        <div className={styles.warning}>
          {parseFloat(origin_amount) > 0 &&
          parseFloat(origin_amount) + 0.0012 > parseFloat(userBalance.MVC || 0)
            ? _('addliq_warning')
            : ''}
        </div>
        {btn}
      </div>
    );
  };

  showModal = ({
    origin_amount,
    aim_amount,
    new_aim_amount,
    new_origin_amount,
  }) => {
    const { token1, token2 } = this.props;
    Modal.confirm({
      title: _('liq_price_change_title'),
      icon: '',
      onOk: this.handleOk,
      content: _('liq_price_change_contnet')
        .replace(
          '%1',
          `${origin_amount}${token1.symbol} + ${aim_amount}${token2.symbol}`,
        )
        .replace(
          '%2',
          `${new_origin_amount}${token1.symbol} + ${new_aim_amount}${token2.symbol}`,
        ),
      okText: _('continue_add_liq'),
      cancelText: _('cancel'),
    });
  };
  handleOk = () => {
    this.setState({
      modalVisible: false,
    });
    this.handleSubmit();
  };
  handleCancel = () => {
    this.setState({
      modalVisible: false,
    });
  };

  preHandleSubmit = async () => {
    const { dispatch, currentPair, token1, token2, accountInfo } = this.props;
    const { userAddress, userBalance } = accountInfo;

    let res = await dispatch({
      type: 'pair/reqSwap',
      payload: {
        symbol: currentPair,
        address: userAddress,
        op: 1,
      },
    });

    const { code, data, msg } = res;
    if (code) {
      return message.error(msg);
    }

    this.setState({
      reqSwapData: data,
    });
    const { swapToken1Amount, swapToken2Amount, swapLpAmount, txFee } = data;

    let { origin_amount, aim_amount, lastMod } = this.state;
    let _origin_amount, _aim_amount;

    if (
      token1.isMvc &&
      BigNumber(origin_amount)
        .plus(BigNumber(txFee + 100000).div(Math.pow(10, token1.decimal)))
        .isGreaterThan(userBalance.MVC || 0)
    ) {
      //余额不足支付矿工费，在金额中扣除矿工费
      origin_amount = BigNumber(origin_amount).minus(
        BigNumber(txFee + 100000).div(Math.pow(10, token1.decimal)),
      );
      if (origin_amount.toNumber() <= 0) {
        return message.error(_('lac_token_balance', 'MVC'));
      }
      // origin_amount =.toString();
      lastMod = 'origin';
    }

    if (lastMod === 'origin') {
      // let token1AddAmount = BigNumber(origin_amount)
      //   .multipliedBy(Math.pow(10, token1.decimal))
      //   .toString();
      let token1AddAmount = formatTok(origin_amount, token1.decimal);
      // console.log(token1AddAmount, formatTok(origin_amount, token1.decimal))

      let token2AddAmount;
      if (swapToken1Amount === '0' && swapToken2Amount === '0') {
        // token2AddAmount = BigNumber(aim_amount)
        //   .multipliedBy(Math.pow(10, token2.decimal))
        //   .toString();
        token2AddAmount = formatTok(aim_amount, token2.decimal);
        // console.log(token2AddAmount, formatTok(aim_amount, token2.decimal))
      } else {
        token2AddAmount = countLpAddAmount(
          token1AddAmount,
          swapToken1Amount,
          swapToken2Amount,
          swapLpAmount,
        )[1];
      }

      // const new_aim_amount = formatSat(token2AddAmount, token2.decimal);

      _origin_amount = token1AddAmount;
      _aim_amount = token2AddAmount;

      // if (new_aim_amount !== aim_amount) {
      //   this.setState({
      //     _origin_amount,
      //     _aim_amount,
      //   });
      // return this.showModal({
      //   origin_amount,
      //   aim_amount,
      //   new_origin_amount: origin_amount,
      //   new_aim_amount,
      // });
      // }
    } else if (lastMod === 'aim') {
      // const token2AddAmount = BigNumber(aim_amount)
      //   .multipliedBy(Math.pow(10, token2.decimal))
      //   .toString();
      const token2AddAmount = formatTok(aim_amount, token2.decimal);
      // console.log(token2AddAmount, formatTok(aim_amount, token2.decimal))
      let token1AddAmount;

      if (swapToken1Amount === '0' && swapToken2Amount === '0') {
        // token1AddAmount = BigNumber(origin_amount)
        //   .multipliedBy(Math.pow(10, token1.decimal))
        //   .toString();
        token1AddAmount = formatTok(origin_amount, token1.decimal);
        // console.log(token1AddAmount, formatTok(origin_amount, token1.decimal))
      } else {
        token1AddAmount = countLpAddAmountWithToken2(
          token2AddAmount,
          swapToken1Amount,
          swapToken2Amount,
          swapLpAmount,
        )[1];
      }

      // const new_origin_amount = formatSat(token1AddAmount, token1.decimal);

      _origin_amount = token1AddAmount;
      _aim_amount = token2AddAmount;
      // if (new_origin_amount !== origin_amount) {
      // return this.showModal({
      //   origin_amount,
      //   aim_amount,
      //   new_origin_amount,
      //   new_aim_amount: aim_amount,
      // });
      // }
    }

    this.setState({
      _origin_amount: _origin_amount.toString(),
      _aim_amount: _aim_amount.toString(),
    });
    this.handleSubmit(data, _origin_amount, _aim_amount);
  };
  handleSubmit = async (data, _origin_amount, _aim_amount) => {
    if (!_origin_amount) _origin_amount = this.state._origin_amount;
    if (!_aim_amount) _aim_amount = this.state._aim_amount;
    const { token1, token2, currentPair, dispatch, rabinApis, accountInfo } =
      this.props;
    const { changeAddress } = accountInfo;
    const { reqSwapData } = this.state;
    const { mvcToAddress, tokenToAddress, requestIndex, txFee } =
      reqSwapData || data;

    console.log('handleSubmit:', reqSwapData, data);
    let liq_data;
    if (token1.isMvc) {
      let tx_res = await dispatch({
        type: 'user/transferAll',
        payload: {
          datas: [
            {
              type: 'mvc',
              address: mvcToAddress,
              amount: (BigInt(_origin_amount) + BigInt(txFee)).toString(),
              changeAddress,
              note: 'mvcswap.com(add liquidity)',
            },
            {
              type: 'sensibleFt',
              address: tokenToAddress,
              amount: _aim_amount.toString(),
              changeAddress,
              codehash: token2.codeHash,
              genesis: token2.tokenID,
              rabinApis,
              note: 'mvcswap.com(add liquidity)',
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

      liq_data = {
        symbol: currentPair,
        requestIndex: requestIndex,
        mvcRawTx: tx_res[0].txHex,
        mvcOutputIndex: 0,
        token2RawTx: tx_res[1].txHex,
        token2OutputIndex: 0,
        token1AddAmount: _origin_amount.toString(),
        amountCheckRawTx: tx_res[1].routeCheckTxHex,
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
              note: 'mvcswap.com(add liquidity)',
            },
            {
              type: 'sensibleFt',
              address: tokenToAddress,
              amount: _origin_amount.toString(),
              changeAddress,
              codehash: token1.codeHash,
              genesis: token1.tokenID,
              rabinApis,
              note: 'mvcswap.com(add liquidity)',
            },
            {
              type: 'sensibleFt',
              address: tokenToAddress,
              amount: _aim_amount.toString(),
              changeAddress,
              codehash: token2.codeHash,
              genesis: token2.tokenID,
              rabinApis,
              note: 'mvcswap.com(add liquidity)',
            },
          ],
          noBroadcast: true,
        },
      });

      if (tx_res.msg) {
        return message.error(tx_res.msg);
      }
      if (tx_res.list) {
        tx_res = tx_res.list;
      }
      if (!tx_res[0] || !tx_res[0].txHex || !tx_res[1] || !tx_res[1].txHex) {
        return message.error(_('txs_fail'));
      }

      liq_data = {
        symbol: currentPair,
        requestIndex: requestIndex,
        mvcRawTx: tx_res[0].txHex,
        mvcOutputIndex: 0,
        token1AddAmount: _origin_amount.toString(),
        token1RawTx: tx_res[1].txHex,
        token1OutputIndex: 0,
        amountCheck1RawTx: tx_res[1].routeCheckTxHex,
        token2RawTx: tx_res[2].txHex,
        token2OutputIndex: 0,
        amountCheck2RawTx: tx_res[2].routeCheckTxHex,
      };
    }

    liq_data = JSON.stringify(liq_data);
    liq_data = await gzip(liq_data);
    const addliq_res = await dispatch({
      type: 'pair/addLiq',
      payload: {
        data: liq_data,
      },
    });
    // console.log(addliq_res);
    if (addliq_res.code && addliq_res.msg) {
      return message.error(addliq_res.msg);
    }
    message.success('success');
    await this.updateData();
    this.setState({
      formFinish: true,
      lpAddAmount: addliq_res.data.lpAddAmount,
    });
  };

  updateData() {
    const { dispatch, currentPair } = this.props;

    dispatch({
      type: 'pair/getPairData',
      payload: {
        // currentPair,
      },
    });
    EventBus.emit('reloadChart', 'pool');
    dispatch({
      type: 'user/loadingUserData',
      payload: {},
    });
  }

  renderResult() {
    const { token1, token2, allPairs, currentPair } = this.props;
    const { _origin_amount, _aim_amount, lpAddAmount } = this.state;
    const { lptoken = {} } = allPairs[currentPair];
    return (
      <div className={styles.add_content}>
        <SuccessResult
          success_txt={_('add_success')}
          done={() => {
            history.push('/swap');
          }}
        >
          <div className={styles.result_data1}>
            {_('added')} {formatSat(_origin_amount, token1.decimal)}{' '}
            {token1.symbol} + {formatSat(_aim_amount, token2.decimal)}{' '}
            {token2.symbol}
          </div>
          <div className={styles.result_data2}>
            {_('received')} {formatSat(lpAddAmount, lptoken.decimal)}
            <PairIcon keyword="pair" size={20} />{' '}
          </div>
        </SuccessResult>
      </div>
    );
  }

  renderSwap() {
    const { currentPair } = this.props;
    if (!currentPair) return 'No pair';
    const { formFinish, page } = this.state;

    return (
      <div
        className={styles.container}
        style={{ display: page === 'form' ? 'block' : 'none' }}
      >
        <PoolMenu currentMenuIndex={0} currentPair={currentPair} />
        {formFinish ? this.renderResult() : this.renderForm()}
      </div>
    );
  }

  selectedToken = async (currentPair) => {
    this.showUI('form');

    if (!currentPair) return;
    this.setState({
      origin_amount: 0,
      aim_amount: 0,
      lastMod: '',
    });

    this.formRef.current &&
      this.formRef.current.setFieldsValue({ origin_amount: 0, aim_amount: 0 });
  };

  render() {
    const { loading } = this.props;
    if (loading) return <Loading />;
    const { page, selectedTokenType } = this.state;
    return (
      <Pool>
        <div style={{ position: 'relative' }}>
          {this.renderSwap()}
          {page === 'selectToken' && (
            <div className={styles.selectToken_wrap}>
              <SelectToken
                finish={(id) => this.selectedToken(id, page)}
                type={selectedTokenType}
              />
            </div>
          )}
        </div>
      </Pool>
    );
  }
}
