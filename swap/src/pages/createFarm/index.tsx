'use strict';
import React, { Component } from 'react';
import BN from 'bignumber.js';
import { connect } from 'umi';
import { Steps, Form, InputNumber, Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import GenesisTokenInput from 'components/tokenInput/genesisInput';
import { BtnWait } from 'components/btns';
import { AppTitle } from 'components/ui';
import styles from './index.less';
import _ from 'i18n';
import Content1 from './content1';
import Content2 from './content2';

const { Step } = Steps;
const FormItem = Form.Item;
const stepData = [_('enter_details'), _('deposit_rewards')];

@connect(({ pair, user, farm, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...farm,
    mvcPrice: pair.mvcPrice,
    submiting:
      effects['farm/reqCreateFarm'] ||
      effects['user/transferAll'] ||
      effects['farm/createFarm'] ||
      false,
  };
})
export default class CreateFarm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: 0,
      result: {},
    };
    this.formRef = React.createRef();
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

  renderButton = () => {
    const { token1, token2 } = this.state;

    const conditions = [
      { key: 'login', cond: !this.props.isLogin },
      { cond: !token1 || !token2, txt: _('select_token_pair') },
    ];

    return (
      BtnWait(conditions) || (
        <Button
          className={styles.btn}
          shape="round"
          type="primary"
          htmlType="submit"
        >
          {_('next_step')}
        </Button>
      )
    );
  };

  totalReward(rewardAmountPerSecond, rewardDays) {
    return BN(86400)
      .multipliedBy(rewardDays)
      .multipliedBy(rewardAmountPerSecond)
      .toString();
  }

  onFinish = (values) => {
    this.setState({
      step: 1,
      values: {
        ...values,
        total: this.totalReward(values.rewardAmountPerSecond, values.rewardDays),
      },
    });
  };

  renderContent0() {
    const { dispatch } = this.props;
    const { token1, token2, values } = this.state;
    return (
      <Form
        ref={this.formRef}
        onFinish={this.onFinish}
        className={styles.content0}
        initialValues={values}
      >
        <GenesisTokenInput
          title={_('lptoken_genesis_id')}
          dispatch={dispatch}
          name="genesis1"
          token={token1}
          change={(value) => this.change('token1', value)}
        />

        <GenesisTokenInput
          title={_('reward_genesis_id')}
          dispatch={dispatch}
          name="genesis2"
          token={token2}
          change={(value) => this.change('token2', value)}
        />

        <div className={styles.row}>
          <div className={styles.col}>
            <div className={styles.title}>{_('reward_per_second')}</div>
            <div className={styles.desc}>{_('avg_per_block')}</div>
            <FormItem name="rewardAmountPerSecond" rules={[{ required: true }]}>
              <InputNumber min={0} />
            </FormItem>
          </div>
          <div className={styles.col}>
            <div className={styles.title}>{_('duration_in_days')}</div>
            <div className={styles.desc}>{_('minimum_days', 360)}</div>
            <FormItem name="rewardDays" rules={[{ required: true }]}>
              <InputNumber max={900} min={360} />
            </FormItem>
          </div>
        </div>
        <div className={styles.tips}>{_('create_farm_tips')}</div>
        {this.renderButton()}
      </Form>
    );
  }

  renderBack() {
    return (
      <div className={styles.back}>
        <ArrowLeftOutlined
          onClick={() => {
            this.setState({
              step: 0,
            });
          }}
        />
      </div>
    );
  }

  payFinish = (data) => {
    this.setState({
      step: 2,
      result: data,
    });
  };

  render() {
    const { submiting, close, mvcPrice } = this.props;
    const { step, values, token1, token2 } = this.state;
    return (
      <>
        <AppTitle
          title={_('create_farm_pair')}
          appTitle={false}
          bottomLine={true}
          onClick={close}
          left={step === 1 ? this.renderBack() : null}
        />
        <div className={styles.container}>
          <Spin spinning={submiting}>
            {step !== 2 && this.renderSteps()}
            {step === 0 && this.renderContent0()}
            {step === 1 && (
              <Content1
                values={values}
                token1={token1}
                token2={token2}
                {...this.props}
                payFinish={this.payFinish}
              />
            )}
            {step === 2 && (
              <Content2 {...this.state} mvcPrice={mvcPrice} close={close} />
            )}
          </Spin>
        </div>
      </>
    );
  }
}
