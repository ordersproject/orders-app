'use strict';
import React, { Component } from 'react';
import { gzip } from 'node-gzip';
import { history, connect } from 'umi';
import { Steps, Button, message, Form, Spin, Input } from 'antd';
import TokenLogo from 'components/tokenicon';
import Loading from 'components/loading';
import PoolMenu from 'components/poolMenu';
import { BtnWait } from 'components/btns';
import { SuccessResult } from 'components/result';
import { Plus, CreatePairDocument } from 'components/ui';
import GenesisTokenInput from 'components/tokenInput/genesisInput';
import { isTestNet } from 'common/utils';
import EventBus from 'common/eventBus';
import Pool from '../pool';
import styles from './index.less';
import _ from 'i18n';

const { Step } = Steps;
const FormItem = Form.Item;
const stepData = [_('select_pair'), _('pay_fee'), _('finish')];
const mvctsc = 'mvc-tsc';
const mvctest = 'tmvc-test';

const FEE_TIER1 = 5;
const FEE_TIER2 = 30;
const FEE_TIER3 = 60;
const FEE_TIER4 = 100;

@connect(({ custom, user, pair, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...pair,
    loading: effects['pair/getAllPairs'],
    searching: effects['custom/query'],
    submiting:
      effects['custom/req'] ||
      effects['custom/createSwap'] ||
      effects['user/transferAll'] ||
      false,
  };
})
export default class CreatePair extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: 0,
      selectedFeeTier: FEE_TIER2,
    };
    this.formRef = React.createRef();
  }

  componentDidMount() {
    const { allPairs, dispatch } = this.props;
    if (!allPairs[mvctsc]) {
      dispatch({
        type: 'pair/getAllPairs',
      });
    }
  }

  selectOption(value) {
    this.setState({ selectedFeeTier: value });
  }

  renderSteps() {
    const { step } = this.state;
    return (
      <div className={styles.steps}>
        <Steps current={step} progressDot>
          {stepData.map((item) => (
            <Step title={item} key={item} />
          ))}
        </Steps>
      </div>
    );
  }

  change = (key, value) => {
    let obj = {};
    obj[key] = value;
    this.setState(obj);
  };

  gotoPayStep = () => {
    this.setState({
      step: 1,
    });
  };

  editPair = () => {
    this.setState({
      step: 0,
    });
  };

  finish = () => {
    const { token2 } = this.state;
    history.push(`/pool/space-${token2.symbol.toLowerCase()}/add`);
    EventBus.emit('reloadPair');
  };

  renderContent0() {
    const { token1, token2 } = this.state;
    const { dispatch } = this.props;
    return (
      <div className={styles.create_content}>
        <GenesisTokenInput
          title={`${_('input')}: ${_('enter_tokenid')}`}
          dispatch={dispatch}
          name="genesis2"
          token={token2}
          change={(value) => this.change('token2', value)}
        />

        {this.renderButton()}
        <CreatePairDocument />
      </div>
    );
  }

  renderContent1() {
    let { token1, token2 } = this.state;
    if (!token1) {
      token1 = { symbol: 'SPACE' };
    }
    return (
      <div className={styles.create_content}>
        <div className={styles.title}>{_('confirm_and_pay')}</div>
        <div className={styles.info}>
          <div className={styles.sub_title}>
            {token1.symbol}/{token2.symbol} {_('pair')}
          </div>
          <div className={styles.line}>
            <div className={styles.coin}>
              <TokenLogo
                name={token1.symbol}
                genesisID={token1.genesis || 'mvc'}
                size={25}
              />
              <div className={styles.name}>{token1.symbol}</div>
            </div>
            <div className={styles.op}>
              <span className={styles.edit} onClick={() => this.editPair(1)}>
                {_('edit')}
              </span>
            </div>
          </div>
          <div className={styles.line}>
            <div className={styles.coin}>
              <TokenLogo
                name={token2.symbol}
                genesisID={token2.genesis}
                size={25}
              />
              <div className={styles.name}>{token2.symbol}</div>
            </div>
            <div className={styles.op}>
              <span className={styles.edit} onClick={() => this.editPair(2)}>
                {_('edit')}
              </span>
            </div>
          </div>
        </div>
        {/* Add this block of code for the three options */}
        <div className={styles.title}>{_('choose_fee_tier')}</div>
        <button
          className={`${styles.optionButton} ${
            this.state.selectedFeeTier === FEE_TIER2 ? styles.selected : ''
          }`}
          onClick={() => this.selectOption(FEE_TIER2)}
        >
          0.3%
        </button>
        <button
          className={`${styles.optionButton} ${
            this.state.selectedFeeTier === FEE_TIER3 ? styles.selected : ''
          }`}
          onClick={() => this.selectOption(FEE_TIER3)}
        >
          0.6%
        </button>
        <button
          className={`${styles.optionButton} ${
            this.state.selectedFeeTier === FEE_TIER4 ? styles.selected : ''
          }`}
          onClick={() => this.selectOption(FEE_TIER4)}
        >
          1%
        </button>
        <div className={styles.desc}>{_('confirm_pair_desc')}</div>
        {this.renderButton()}
      </div>
    );
  }

  renderContent2() {
    const { token1 = {}, token2 = {} } = this.state;
    return (
      <div className={styles.create_content}>
        <SuccessResult
          suscces_txt={_('create_success')}
          done={this.finish}
          title={
            <div className={styles.finish_title}>
              {token1.symbol}/{token2.symbol}
            </div>
          }
          noLine={true}
        >
          <div className={styles.info}>
            <div className={styles.line}>
              <div className={styles.label}>{_('pooled', token1.symbol)}</div>
              <div className={styles.no}>0.0</div>
            </div>
            <div className={styles.line}>
              <div className={styles.label}>{_('pooled', token2.symbol)}</div>
              <div className={styles.no}>0.0</div>
            </div>
            <div className={styles.line}>
              <div className={styles.label}>{_('your_share')}</div>
              <div className={styles.no}>0%</div>
            </div>
          </div>
        </SuccessResult>
      </div>
    );
  }

  payFee = async () => {
    const { accountInfo, dispatch, allPairs } = this.props;
    const { userAddress, changeAddress } = accountInfo;
    const res = await dispatch({
      type: 'custom/req',
      payload: {
        address: userAddress,
      },
    });
    // console.log(res);
    if (res.msg) {
      return message.error(res.msg);
    }
    const { requestIndex, mvcToAddress, txFee, op } = res;

    let tx_res = await dispatch({
      type: 'user/transferMvc',
      payload: {
        address: mvcToAddress,
        amount: txFee,
        changeAddress,
        note: 'mvcswap.com(swap)',
        noBroadcast: true,
      },
    });

    console.log(tx_res);
    if (!tx_res) {
      return message.error(_('txs_fail'));
    }
    if (tx_res.msg) {
      return message.error(tx_res.msg);
    }
    // if (!tx_res[0] || !tx_res[0].txid || !tx_res[1] || !tx_res[1].txid) {
    //   return message.error(_('txs_fail'));
    // }

    const { token1, token2 } = this.state;

    const payload = {
      requestIndex,
      mvcRawTx: tx_res.list ? tx_res.list[0].txHex : tx_res.txHex,
      mvcOutputIndex: 0,
      token2ID: token2.genesisTxid,
      feeTier: this.state.selectedFeeTier,
    };
    //console.log('payload:', tx_res, payload);
    let create_data = JSON.stringify(payload);

    create_data = await gzip(create_data);

    const create_res = await dispatch({
      type: 'custom/createSwap',
      payload: {
        data: create_data,
      },
    });

    if (create_res.code && !create_res.data) {
      return message.error(create_res.msg);
    }
    message.success('success');
    this.setState({
      step: 2,
    });
  };

  renderButton = () => {
    const { isLogin } = this.props;
    const { token2, step } = this.state;

    const conditions = [
      { key: 'login', cond: !isLogin },
      { cond: !token2, txt: _('select_token_pair') },
    ];
    const btn = BtnWait(conditions);
    if (btn) {
      return btn;
    }

    if (step === 0) {
      // 数额太小
      return (
        <Button
          className={styles.btn}
          shape="round"
          type="primary"
          onClick={this.gotoPayStep}
        >
          {_('next_step')}
        </Button>
      );
    } else if (step === 1) {
      // 余额不足
      return (
        <Button
          className={styles.btn}
          shape="round"
          type="primary"
          onClick={this.payFee}
        >
          {_('pay_listing_fee')}
        </Button>
      );
    } else if (step === 2) {
      // 余额不足
      return (
        <Button className={styles.btn} shape="round" type="primary">
          {_('done')}
        </Button>
      );
    }
  };

  render() {
    const { loading, submiting } = this.props;
    if (loading) return <Loading />;
    const { step } = this.state;
    return (
      <Pool pageName="createPair">
        <Spin spinning={submiting}>
          <div className={styles.container}>
            <PoolMenu currentMenuIndex={2} />
            {this.renderSteps()}
            <Form ref={this.formRef}>
              {step === 0 && this.renderContent0()}
              {step === 1 && this.renderContent1()}
              {step === 2 && this.renderContent2()}
            </Form>
          </div>
        </Spin>
      </Pool>
    );
  }
}
