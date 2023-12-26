import { useState } from 'react';
import { connect, useDispatch } from 'umi';
import { Spin, message } from 'antd';
import styles from './index.less';
import Loading from 'components/loading';
import CustomIcon from 'components/icon';
import EventBus from 'common/eventBus';
import Token from './token';
import _ from 'i18n';
import { userSignTx } from 'common/signTx';
import FormatNumber from 'components/formatNumber';
import { formatSat } from 'common/utils';

function Detail(props) {
  const dispatch = useDispatch();
  const [submiting, setSubmiting] = useState(false);
  const {
    voteInfoArr,
    currentVoteIndex,
    pairData,
    isLogin,
    loading,
    stakePairInfo,
  } = props;
  if (voteInfoArr.length < 1 && loading) {
    return (
      <div className={styles.right_content}>
        <Loading />
      </div>
    );
  }
  if (voteInfoArr.length < 1) {
    return (
      <div className={styles.right_content}>
        <div></div>
      </div>
    );
  }
  const {
    desc,
    options,
    voteSumRate,
    finished,
    unstated,
    total,
    minVoteAmount,
    id,
  } = voteInfoArr[currentVoteIndex];
  const { symbol, decimal } = stakePairInfo.token;
  const { voteOption } = pairData.voteInfo ? pairData.voteInfo[id] : {};
  const { lockedTokenAmount } = pairData;

  const vote = async (index) => {
    if (finished) {
      return;
      // message.error('finished!');
    }
    if (unstated) {
      return;
      // message.error('pending!');
    }

    if (!isLogin) {
      return EventBus.emit('login');
    }

    if (!parseInt(lockedTokenAmount)) {
      return message.error(_('no_stake'));
    }
    setSubmiting(true);

    let req_data = await dispatch({
      type: 'stake/reqStake',
      payload: {
        op: 6,
      },
    });

    if (req_data.msg) {
      setSubmiting(false);
      return message.error(req_data.msg);
    }

    const note = 'mvcswap.com(vote)';
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
    let vote_res = await dispatch({
      type: 'stake/vote',
      payload: {
        data: tx_res,
        requestIndex,
        voteOption: index,
      },
    });
    // console.log(unlock_res);
    if (vote_res.msg) {
      setSubmiting(false);
      return message.error(vote_res.msg);
    }
    const vote2_res = await userSignTx(
      'stake/vote2',
      dispatch,
      vote_res,
      requestIndex,
    );

    setSubmiting(false);
    if (vote2_res.msg) {
      setSubmiting(false);
      return message.error(vote2_res.msg);
    }
    // console.log(vote2_res)
    if (vote2_res.txid) {
      message.success('success');
      dispatch({
        type: 'stake/getStakeInfo',
      });
      dispatch({
        type: 'stake/getVoteInfo',
      });
    }
  };
  return (
    <div className={styles.right_content}>
      <Spin spinning={submiting}>
        <div>
          <div className={styles.desc}>
            {desc} <br />
            <span className={styles.red}>{_('change_vote')}</span>
          </div>
          <div className={`${styles.info} ${styles.purple}`}>
            {_('total_votes')}
            <FormatNumber value={formatSat(total, decimal)} /> {symbol}
          </div>
          <div className={`${styles.info} ${styles.purple}`}>
            {_('min_vote_amount')}
            <FormatNumber value={formatSat(minVoteAmount, decimal)} /> {symbol}
          </div>
          <div className={styles.options}>
            {options.map((item, index) => {
              const names = item.split('/');
              let btnCls =
                typeof voteOption === 'undefined'
                  ? styles.item
                  : voteOption === index
                  ? styles.item
                  : `${styles.item} ${styles.unselected}`;
              if (finished || unstated) {
                btnCls = `${btnCls} ${styles.disabled}`;
              }
              let showHand = voteOption === index || finished || unstated;
              return (
                <div className={btnCls} key={item} onClick={() => vote(index)}>
                  <div className={styles.token_pair}>
                    <Token symbol={names[0]} />
                    <div style={{ marginLeft: -4 }}>
                      <Token symbol={names[1]} />
                    </div>
                  </div>
                  <div className={styles.name}>{item}</div>
                  {showHand && (
                    <CustomIcon type="iconagree" style={{ fontSize: 18 }} />
                  )}
                  <div className={styles.rate}>{voteSumRate[index]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Spin>
    </div>
  );
}

const mapStateToProps = ({ stake, user, loading }) => {
  const effects = loading.effects;
  return {
    ...stake,
    ...user,
    loading: effects['stake/getVoteInfo'] || effects['stake/getStakeInfo'],
  };
};

export default connect(mapStateToProps)(Detail);
