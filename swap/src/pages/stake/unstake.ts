import { connect } from 'umi';
import { useState } from 'react';
import { Button, message, Spin } from 'antd';
import _ from 'i18n';
import styles from './index.less';
import { SuccessResult } from 'components/result';
import TokenLogo from 'components/tokenicon';
import Loading from 'components/loading';
import { BtnWait } from 'components/btns';
import { formatTok, formatSat } from 'common/utils';
import { userSignTx } from 'common/signTx';
import Rate from 'components/rate';

function Unstake(props) {
  const { stakePairInfo, pairData, accountInfo, isLogin, dispatch } = props;
  if (JSON.stringify(stakePairInfo) === '{}') {
    return (
      <div className={styles.right_content}>
        <Loading />
      </div>
    );
  }
  const { escrowToken } = stakePairInfo;
  const { symbol, tokenID, decimal } = escrowToken;
  const { userBalance } = accountInfo;
  const balance = userBalance[tokenID] || 0;
  //const { lockedTokenAmount = 0 } = pairData;
  // const { userAddress } = accountInfo;
  //const balance = formatSat(lockedTokenAmount, decimal);
  const [amount, setAmount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [submiting, setSubmiting] = useState(false);

  const changeData = (value) => {
    setAmount(value);
  };

  const done = () => {
    setAmount(0);
    setShowResult(false);
  };

  // const unlock2 = async (data, requestIndex) => {
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
  //     type: 'stake/unlock2',
  //     payload: {
  //       requestIndex,
  //       pubKey: publicKey,
  //       sig,
  //     },
  //   });
  //   if (res.code === 99999) {
  //     const raw = await ungzip(Buffer.from(res.data.other));
  //     const newData = JSON.parse(raw.toString());
  //     return unlock2(newData, requestIndex);
  //   }

  //   if (res.code) {
  //     return {
  //       msg: res.msg,
  //     };
  //   }
  //   return res;
  // };

  const handleSubmit = async () => {
    setSubmiting(true);
    const req_data = await dispatch({
      type: 'stake/reqStake',
      payload: {
        op: 2,
      },
    });
    if (req_data.msg) {
      setSubmiting(false);
      return message.error(req_data.msg);
    }

    const token_amount_sat = formatTok(amount, decimal);
    const note = 'mvcswap.com(stake unlock)';
    let tx_res = await dispatch({
      type: 'user/transferAll2',
      payload: {
        reqData: req_data,
        tokenData: escrowToken,
        tokenAmount: token_amount_sat,
        note,
      },
    });
    // console.log(tx_res);

    if (tx_res.msg || tx_res.status == 'canceled') {
      setSubmiting(false);
      return message.error(tx_res.msg || 'canceled');
    }
    const { requestIndex } = req_data;
    let unlock_res = await dispatch({
      type: 'stake/unlock',
      payload: {
        data: tx_res,
        tokenRemoveAmount: token_amount_sat,
        requestIndex,
      },
    });
    // console.log(unlock_res);
    if (unlock_res.msg) {
      setSubmiting(false);
      return message.error(unlock_res.msg);
    }

    setSubmiting(false);
    message.success('success');
    dispatch({
      type: 'stake/getStakeInfo',
    });
    setShowResult(true);
  };

  const renderButton = () => {
    const conditions = [
      { key: 'login', cond: !isLogin },
      {
        cond: !balance || balance === '0',
        txt: _('cant_unlock'),
      },
      {
        key: 'enterAmount',
        cond: parseFloat(amount) <= 0,
      },
      {
        cond: parseFloat(amount) > parseFloat(balance),
        txt: _('lac_token_balance', symbol),
      },
    ];

    return (
      BtnWait(conditions) || (
        <Button
          className={styles.btn}
          type="primary"
          shape="round"
          onClick={handleSubmit}
        >
          {_('unstake')}
        </Button>
      )
    );
  };

  if (showResult) {
    return (
      <div className={styles.right_content}>
        <SuccessResult success_txt={_('unstake_successful')} done={done}>
          <div className={styles.result}>
            <div className={styles.result_title}>{_('unstaked')}</div>
            <div className={styles.result_amount}>
              {amount} {symbol}
            </div>
          </div>
        </SuccessResult>
      </div>
    );
  }

  return (
    <div className={styles.right_content}>
      <Spin spinning={submiting}>
        <Rate
          changeAmount={changeData}
          balance={balance}
          balanceTitle={_('unstake_amount')}
          balanceTxt={_('staked')}
          balancePosTop={true}
          tokenPair={
            <div className={styles.coin}>
              <TokenLogo name={symbol} genesisID={tokenID} size={30} />
              <div className={styles.coin_name}>{symbol}</div>
            </div>
          }
        />
        {renderButton()}
      </Spin>
    </div>
  );
}

const mapStateToProps = ({ stake, user }) => {
  return {
    ...stake,
    ...user,
  };
};

export default connect(mapStateToProps)(Unstake);
