'use strict';
import React, { Component } from 'react';
import { Form, Button, Input, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { connect, history } from 'umi';
import QRCode from 'qrcode.react';
import CustomIcon from 'components/icon';
import styles from './index.less';
import _ from 'i18n';
import BigNumber from 'bignumber.js';
import Clipboard from 'components/clipboard';
import debug from 'debug';
const log = debug('webwallet');

const FormItem = Form.Item;

@connect(({ user, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    // connecting: effects['user/loadingUserData'] || effects['user/connectWebWallet'],
  };
})
export default class WebWallet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      amount: 0,
    };
    this.formRef = React.createRef();
  }
  back = () => {
    history.goBack();
  };
  login = async () => {
    const { dispatch } = this.props;
    await dispatch({
      type: 'user/connectWebWallet',
    });
    const res = await dispatch({
      type: 'user/loadingUserData',
      payload: {
        type: 1,
      },
    });
    if (res.msg) {
      return message.error(msg.error);
    }
  };
  handleSubmit = async (values) => {
    log(values);
    let { address, amount } = values;

    amount = BigNumber(amount).multipliedBy(1e8);
    const { dispatch } = this.props;
    const res = await dispatch({
      type: 'user/transferMvc',
      payload: {
        address,
        amount,
        note: 'mvcswap.com(withdraw)',
      },
    });
    //   console.log(ts_res);

    if (res.msg) {
      return message.error(res.msg);
    }
    message.success(_('withdraw_success'));
    dispatch({
      type: 'user/updateUserData',
    });

    this.formRef.current.setFieldsValue({
      amount: '',
      address: '',
    });
  };
  setMaxAmount = () => {
    const { userBalance } = this.props.accountInfo;
    this.formRef.current.setFieldsValue({
      amount: userBalance.MVC,
    });
    this.setState({
      amount: userBalance.MVC,
    });
  };
  render() {
    const { accountInfo, isLogin } = this.props;
    const { userAddress, userBalance } = accountInfo;
    return (
      <div className={styles.container}>
        <div className={styles.page_title}>
          <h1>{_('web_wallet')}</h1>
          <div className={styles.back} onClick={this.back}>
            <ArrowLeftOutlined /> {_('back_to_swap')}
          </div>
        </div>
        <div className={styles.tips}>{_('web_wallet_tips')}</div>
        <div className={styles.content}>
          <div className={styles.deposit}>
            <div className={styles.title}>{_('deposit_title')}</div>
            <div className={styles.qrcode}>
              <QRCode
                value={userAddress}
                style={{ width: '180px', height: '180px' }}
              />
            </div>
            <div className={styles.address}>
              <Clipboard text={userAddress}>
                <CustomIcon type="iconcopy" />
                {userAddress}
              </Clipboard>
            </div>
          </div>
          <div className={styles.withdraw}>
            <div className={styles.title}>
              <div>{_('withdraw_title')} MVC</div>
              <div className={styles.balance}>
                ({_('availabel')}:{' '}
                <span className={styles.blue}>{userBalance.MVC || 0}</span> MVC)
              </div>
            </div>
            <Form onFinish={this.handleSubmit} ref={this.formRef}>
              <FormItem name={'amount'} rules={[{ required: true }]}>
                <Input
                  className={styles.input}
                  addonBefore={`${_('money')}:`}
                  addonAfter={
                    <span
                      onClick={this.setMaxAmount}
                      style={{ cursor: 'pointer' }}
                    >
                      {_('all_balance')}
                    </span>
                  }
                />
              </FormItem>
              <FormItem name={'address'} rules={[{ required: true }]}>
                <Input
                  className={styles.input}
                  addonBefore={`${_('address')}:`}
                />
              </FormItem>
              {isLogin ? (
                <Button
                  className={styles.btn}
                  type="primary"
                  shape="round"
                  htmlType="submit"
                >
                  {_('withdraw')}
                </Button>
              ) : (
                <Button
                  className={styles.btn}
                  type="primary"
                  shape="round"
                  onClick={this.login}
                >
                  {_('connect_wallet')}
                </Button>
              )}
            </Form>
          </div>
        </div>
      </div>
    );
  }
}
