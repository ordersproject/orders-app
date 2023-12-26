import { connect } from 'umi';
import { useState } from 'react';
import { Button, message, Spin } from 'antd';
import _ from 'i18n';
import styles from './index.less';
import { SuccessResult } from 'components/result';
import TokenLogo from 'components/tokenicon';
import Loading from 'components/loading';
import { BtnWait } from 'components/btns';
import { formatTok } from 'common/utils';
import Rate from 'components/rate';

function Stake(props) {
  const { stakePairInfo, accountInfo, isLogin, dispatch } = props;
  if (JSON.stringify(stakePairInfo) === '{}') {
    return (
      <div className={styles.right_content}>
        <Loading />
      </div>
    );
  }
  const { token } = stakePairInfo;
  if (!token) {
    return <div className={styles.right_content}>Server Error</div>;
  }
  const { symbol, tokenID, decimal } = token;
  const { userBalance } = accountInfo;
  const balance = userBalance[tokenID] || 0;
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

  const handleSubmit = async () => {
    setSubmiting(true);
    const req_data = await dispatch({
      type: 'stake/reqStake',
      payload: {
        op: 1,
      },
    });
    if (req_data.msg) {
      setSubmiting(false);
      return message.error(req_data.msg);
    }

    const token_amount_sat = formatTok(amount, decimal);
    const note = 'mvcswap.com(stake deposit)';
    let tx_res = await dispatch({
      type: 'user/transferAll2',
      payload: {
        reqData: req_data,
        tokenData: token,
        tokenAmount: token_amount_sat,
        note,
      },
    });
    // console.log(tx_res);

    if (tx_res.msg || tx_res.status == 'canceled') {
      setSubmiting(false);
      return message.error(tx_res.msg || 'canceled');
    }
    let stake_res = await dispatch({
      type: 'stake/deposit',
      payload: {
        data: tx_res,
        requestIndex: req_data.requestIndex,
      },
    });
    // console.log(stake_res);
    if (stake_res.msg) {
      setSubmiting(false);
      return message.error(stake_res.msg);
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
        txt: _('lac_token_balance', symbol),
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
          {_('stake')}
        </Button>
      )
    );
  };

  if (showResult) {
    return (
      <div className={styles.right_content}>
        <SuccessResult success_txt={_('stake_successful')} done={done}>
          <div className={styles.result}>
            <div className={styles.result_title}>{_('staked')}</div>
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
          balanceTitle={_('stake_amount')}
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

export default connect(mapStateToProps)(Stake);
