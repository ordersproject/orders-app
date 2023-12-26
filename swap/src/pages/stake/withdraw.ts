import { connect } from 'umi';
// import { ungzip } from 'node-gzip';
import { Button, Spin, message, Modal } from 'antd';
import _ from 'i18n';
import { useState } from 'react';
import styles from './index.less';
import { formatSat } from 'common/utils';
import FormatNumber from 'components/formatNumber';
import { userSignTx } from 'common/signTx';
import CustomIcon from 'components/icon';

function Withdraw(props) {
  const { accountInfo, dispatch, stakePairInfo, left, amount } = props;
  const [submiting, setSubmiting] = useState(false);
  // const { userAddress } = accountInfo;
  const { token } = stakePairInfo;
  const { symbol, decimal } = token;

  const showModal = (txid, blockTime) => {
    const _amount = formatSat(amount, decimal);
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
              <FormatNumber value={_amount} />
            </span>
            <div className={styles.coin}>
              <div className={styles.coin_name}>{symbol}</div>
            </div>
          </div>
          <div className={styles.txt}>
            {_('withdraw_success')}@{timeStr}
          </div>
          <div className={styles.txid}>{`Txid: ${txid}`}</div>
        </div>
      ),
      className: styles.mod,
      icon: '',
      width: 375,
      getContainer: '#J_Page',
    });
  };

  // const withdraw2 = async (data, requestIndex) => {
  //   const { txHex, scriptHex, satoshis, inputIndex } = data;

  //   let sign_res = await dispatch({
  //     type: 'user/signTx',
  //     payload: {
  //       datas: {
  //         txHex,
  //         scriptHex,
  //         satoshis,
  //         inputIndex,
  //         address: userAddress,
  //       },
  //     },
  //   });

  //   if (sign_res.msg && !sign_res.sig) {
  //     return {
  //       msg: sign_res,
  //     };
  //   }

  //   const { publicKey, sig } = sign_res;

  //   const res = await dispatch({
  //     type: 'stake/withdraw2',
  //     payload: {
  //       requestIndex,
  //       pubKey: publicKey,
  //       sig,
  //     },
  //   });
  //   if (res.code === 99999) {
  //     const raw = await ungzip(Buffer.from(res.data.other));
  //     const newData = JSON.parse(raw.toString());
  //     return withdraw2(newData, requestIndex);
  //   }

  //   if (res.code) {
  //     return {
  //       msg: res.msg,
  //     };
  //   }
  //   return res;
  // };

  const handleWithdraw = async () => {
    setSubmiting(true);

    let req_data = await dispatch({
      type: 'stake/reqStake',
      payload: {
        op: 3,
      },
    });

    if (req_data.msg) {
      setSubmiting(false);
      return message.error(req_data.msg);
    }

    const note = 'mvcswap.com(stake withdraw)';
    let tx_res = await dispatch({
      type: 'user/transferAll2',
      payload: {
        reqData: req_data,
        note,
      },
    });
    if (tx_res.msg || tx_res.status == 'canceled') {
      setSubmiting(false);
      return message.error(tx_res.msg || 'canceled');
    }
    const { requestIndex } = req_data;
    let withdraw_res = await dispatch({
      type: 'stake/withdraw',
      payload: {
        data: tx_res,
        requestIndex,
      },
    });
    // console.log(withdraw_res);
    if (withdraw_res.msg || withdraw_res.status == 'canceled') {
      setSubmiting(false);
      return message.error(withdraw_res.msg || 'canceled');
    }
    // const withdraw2_res = await withdraw2(withdraw_res, requestIndex);
    const withdraw2_res = await userSignTx(
      'stake/withdraw2',
      dispatch,
      withdraw_res,
      requestIndex,
    );

    setSubmiting(false);
    if (withdraw2_res.msg) {
      setSubmiting(false);
      return message.error(withdraw2_res.msg);
    }
    // console.log(withdraw2_res)
    if (withdraw2_res.txid) {
      message.success('success');
      showModal(withdraw2_res.txid, withdraw2_res.blockTime);
      dispatch({
        type: 'stake/getStakeInfo',
      });
    }
  };
  return (
    <Spin spinning={submiting}>
      <Button
        type="primary"
        shape="round"
        className={styles.btn}
        disabled={left || !amount}
        onClick={handleWithdraw}
      >
        {_('withdraw')}
      </Button>
    </Spin>
  );
}

const mapStateToProps = ({ stake, user }) => {
  return {
    ...stake,
    ...user,
  };
};

export default connect(mapStateToProps)(Withdraw);
