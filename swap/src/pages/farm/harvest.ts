'use strict';
import React, { Component } from 'react';
import { Button, message, Modal } from 'antd';
import { gzip, ungzip } from 'node-gzip';
import FormatNumber from 'components/formatNumber';
import CustomIcon from 'components/icon';
import { formatSat } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';
import { userSignTx } from 'common/signTx';
import { OP_HARVEST } from 'common/const';

export default class Harvest extends Component {
  showModal = (amount, txid, symbol, tokenID, blockTime, onOk) => {
    const { iconList } = this.props;
    const timeStr = new Date(blockTime * 1000).toLocaleString('en-GB');
    Modal.info({
      title: '',
      content: (
        <div className={styles.mod_content}>
          <div className={styles.icon}>
            <CustomIcon type="iconicon-success" />
          </div>
          <div className={styles.amount}>
            <span style={{ marginRight: 30 }}>
              <FormatNumber value={amount} />
            </span>
            <img
              alt={symbol}
              src={iconList[tokenID] ? iconList[tokenID].url : ''}
              className={styles.logo}
            />
            <span className={styles.symbol}>{symbol}</span>
          </div>
          <div className={styles.txt}>
            {_('harvest_success')}@{timeStr}
          </div>
          <div className={styles.txid}>{`Txid: ${txid}`}</div>
        </div>
      ),
      className: styles.mod,
      icon: '',
      width: 375,
      getContainer: '#J_Page',
      onOk,
    });
  };

  // harvest2 = async (havest_data, currentFarmPair, requestIndex) => {
  //   const { dispatch, accountInfo } = this.props;
  //   const { txHex, scriptHex, satoshis, inputIndex } = havest_data;

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

  //   const harvest2_res = await dispatch({
  //     type: 'farm/harvest2',
  //     payload: {
  //       symbol: currentFarmPair,
  //       requestIndex,
  //       pubKey: publicKey,
  //       sig,
  //     },
  //   });
  //   const { code, data, msg } = harvest2_res;
  //   if (code === 99999) {
  //     const raw = await ungzip(Buffer.from(data.other));
  //     const newData = JSON.parse(raw.toString());
  //     return this.harvest2(newData, currentFarmPair, requestIndex);
  //   }
  //   return harvest2_res;
  // };

  harvest = async (currentFarmPair, params) => {
    const { dispatch, accountInfo, update } = this.props;
    const { userAddress, changeAddress } = accountInfo;

    let res = await dispatch({
      type: 'farm/reqSwap',
      payload: {
        symbol: currentFarmPair,
        address: userAddress,
        op: OP_HARVEST,
      },
    });

    if (res.code) {
      return message.error(res.msg);
    }

    const { requestIndex, mvcToAddress, txFee } = res.data;
    let tx_res = await dispatch({
      type: 'user/transferMvc',
      payload: {
        address: mvcToAddress,
        amount: txFee,
        changeAddress,
        note: 'mvcswap.com(farm harvest)',
        noBroadcast: true,
      },
    });

    if (tx_res.msg || tx_res.status == 'canceled') {
      return message.error(tx_res.msg || 'canceled');
    }

    if (tx_res.list) {
      tx_res = tx_res.list[0];
    }

    let hav_data = {
      symbol: currentFarmPair,
      requestIndex,
      mvcRawTx: tx_res.txHex,
      mvcOutputIndex: 0,
    };
    hav_data = JSON.stringify(hav_data);
    hav_data = await gzip(hav_data);
    const harvest_res = await dispatch({
      type: 'farm/harvest',
      payload: {
        data: hav_data,
      },
    });

    if (harvest_res.code !== 0) {
      return message.error(harvest_res.msg || 'unknown error');
    }
    // const harvest2_res = await this.harvest2(
    //   harvest_res.data,
    //   currentFarmPair,
    //   requestIndex,
    // );

    const harvest2_res = await userSignTx(
      'farm/harvest2',
      dispatch,
      harvest_res.data,
      requestIndex,
      { symbol: currentFarmPair },
    );
    if (harvest2_res.code !== 0 && harvest2_res.msg) {
      return message.error(harvest2_res.msg);
    }
    const { code, data, msg } = harvest2_res;
    const amount = formatSat(
      data.rewardTokenAmount,
      params.rewardToken.decimal,
    );
    if (!code && data.txid) {
      // message.success('success');
      this.showModal(
        amount,
        data.txid,
        params.rewardToken.symbol,
        params.rewardToken.tokenID,
        harvest2_res.data.blockTime,
        update,
      );
    } else {
      return message.error(msg);
    }
  };

  render() {
    const { id, data, rewardTokenAmount, isLogin } = this.props;
    return (
      <div className={styles.item_detail_line_2}>
        <Button
          className={styles.btn}
          type="primary"
          shape="round"
          disabled={!isLogin || rewardTokenAmount <= 0}
          onClick={() => this.harvest(id, data)}
        >
          {_('harvest')}
        </Button>
      </div>
    );
  }
}
