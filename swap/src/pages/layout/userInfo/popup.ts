'use strict';
import React, { Component } from 'react';
// import { history } from 'umi';
import QRCode from 'qrcode.react';
import { DollarOutlined } from '@ant-design/icons';
import { AppTitle } from 'components/ui';
import { MVCSWAP_WALLET_URL } from 'common/const';
import CustomIcon from 'components/icon';
import Clipboard from 'components/clipboard';
import FormatNumber from 'components/formatNumber';
import Lang from '../lang';
import styles from './index.less';
import _ from 'i18n';
import DarkMode from '../darkmode';

export default class Popup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      qr_code_visible: false,
    };
  }

  toggleQrCode = (new_visibility) => {
    this.setState({
      qr_code_visible: new_visibility,
    });
  };

  closePop = () => {
    this.toggleQrCode(false);
    this.props.close(false);
  };

  render() {
    const {
      walletType,
      accountInfo,
      chooseLoginWallet,
      disConnect,
    } = this.props;
    const { userAddress, userAddressShort, userBalance } = accountInfo;
    const { qr_code_visible } = this.state;

    return (
      <div className={styles.user_pop}>
        <AppTitle
          title={_('wallet_connected')}
          left={
            <div style={{ display: 'flex' }}>
              <Lang />
            </div>
          }
          onClick={this.closePop}
          bottomLine={true}
        />

        <div className={styles.user_pop_content}>
          {qr_code_visible && (
            <div className={styles.qr_code}>
              <div className={styles.qr_code_title}>
                <div
                  className={styles.back}
                  onClick={() => this.toggleQrCode(false)}
                >
                  <CustomIcon type="iconback" />
                </div>
                {_('qr_code')}
              </div>
              <div className={styles.qr_code_content}>
                <QRCode
                  value={userAddress}
                  style={{ width: 200, height: 200 }}
                />
              </div>
            </div>
          )}
          <div className={styles.hd}>
            <div className={styles.hd_title}>{_('your_balance')}</div>
            <div className={styles.balance}>
              <FormatNumber value={userBalance.MVC} /> SPACE
            </div>
          </div>
          <div className={styles.line} onClick={() => this.toggleQrCode(true)}>
            <CustomIcon type="iconqr-code" />
            <span className={styles.name}>{_('show_qr_code')}</span>
          </div>
          <Clipboard text={userAddress} className={styles.line}>
            <CustomIcon type="iconcopy" />
            {_('copy_account')}
          </Clipboard>
          {/*<div className={styles.line} onClick={chooseLoginWallet}>
            <CustomIcon type="iconswitch-account" />
            <span className={styles.name}>{_('switch_wallet')}</span>
          </div>*/}
          {walletType === 1 && (
            <div className={styles.line}>
              <DollarOutlined />
              <a
                target="_blank"
                href={MVCSWAP_WALLET_URL}
                className={styles.name}
              >
                {_('withdraw')}
              </a>
            </div>
          )}
          <div className={styles.line} onClick={disConnect}>
            <CustomIcon type="icondisconnect" />
            {_('disconnect_account')}
          </div>
          <div className={styles.ft}>
            {_('connected_account')}: {userAddressShort}
          </div>
        </div>
      </div>
    );
  }
}
