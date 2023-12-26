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

function Harvest(props) {
  const { pairData, accountInfo, dispatch, stakePairInfo } = props;
  const { rewardTokenAmount = 0 } = pairData;
  const [submiting, setSubmiting] = useState(false);
  // const { userAddress } = accountInfo;
  const { token: rewardToken } = stakePairInfo;
  const { symbol, decimal } = rewardToken;

  const showModal = (amount, txid, blockTime) => {
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
            {_('harvest_success')}@{timeStr}
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

  // const harvest2 = async (data, requestIndex) => {
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
  //     type: 'stake/harvest2',
  //     payload: {
  //       requestIndex,
  //       pubKey: publicKey,
  //       sig,
  //     },
  //   });
  //   if (res.code === 99999) {
  //     const raw = await ungzip(Buffer.from(res.data.other));
  //     const newData = JSON.parse(raw.toString());
  //     return harvest2(newData, requestIndex);
  //   }

  //   if (res.code) {
  //     return {
  //       msg: res.msg,
  //     };
  //   }
  //   return res;
  // };

  const handleHarvest = async () => {
    setSubmiting(true);

    let req_data = await dispatch({
      type: 'stake/reqStake',
      payload: {
        op: 4,
      },
    });

    if (req_data.msg) {
      setSubmiting(false);
      return message.error(req_data.msg);
    }

    const note = 'mvcswap.com(stake harvest)';
    let tx_res = await dispatch({
      type: 'user/transferAll2',
      payload: {
        reqData: req_data,
        note,
      },
    });
    if (tx_res.msg) {
      setSubmiting(false);
      return message.error(tx_res.msg);
    }
    const { requestIndex } = req_data;
    let harvest_res = await dispatch({
      type: 'stake/harvest',
      payload: {
        data: tx_res,
        requestIndex,
      },
    });
    // console.log(harvest_res);
    if (harvest_res.msg) {
      setSubmiting(false);
      return message.error(harvest_res.msg);
    }
    // const harvest2_res = await harvest2(harvest_res, requestIndex);
    const harvest2_res = await userSignTx(
      'stake/harvest2',
      dispatch,
      harvest_res,
      requestIndex,
    );

    setSubmiting(false);
    if (harvest2_res.msg) {
      setSubmiting(false);
      return message.error(harvest2_res.msg);
    }
    // console.log(harvest2_res)
    if (harvest2_res.txid) {
      message.success('success');
      showModal(
        harvest2_res.rewardTokenAmount,
        harvest2_res.txid,
        harvest2_res.blockTime,
      );
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
        disabled={!rewardTokenAmount || parseInt(rewardTokenAmount) <= 0}
        onClick={handleHarvest}
      >
        {_('harvest')}
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

export default connect(mapStateToProps)(Harvest);
