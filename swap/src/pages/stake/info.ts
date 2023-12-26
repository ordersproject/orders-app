import { connect } from 'umi';
import { message } from 'antd';
import { formatSat } from 'common/utils';
import Loading from 'components/loading';
import TokenLogo from 'components/tokenicon';
import FormatNumber from 'components/formatNumber';
import styles from './index.less';
import _ from 'i18n';
import HarvestBtn from './harvest';
import WithdrawBtn from './withdraw';
import { useEffect } from 'react';

function Content(props) {
  const { blockTime, pairData, stakePairInfo, dispatch } = props;
  useEffect(() => {
    dispatch({
      type: 'pair/getUSDPrice',
    });
  }, []);

  if (stakePairInfo.msg) {
    message.error(stakePairInfo.msg);
    return <div className={styles.left_content}>Server Error</div>;
  } else if (
    JSON.stringify(stakePairInfo) === '{}' ||
    JSON.stringify(pairData) === '{}'
  ) {
    return (
      <div className={styles.left_content}>
        <Loading />
      </div>
    );
  } else if (!stakePairInfo.token) {
    return <div className={styles.left_content}>Server Error</div>;
  }

  const { escrowToken, token } = stakePairInfo;
  const { symbol, tokenID, decimal } = token;
  const {
    symbol: escrowTokenSymbol,
    decimal: escrowTokenDecimal,
  } = escrowToken;
  const {
    escrowTokenAmount = 0,
    unlockingTokens_user,
    rewardAmountPerSecond,
    escrowPerShare,
    rewardAmountFactor,
    _yield,
  } = pairData;
  const escrowRate = Number(escrowPerShare) / Number(rewardAmountFactor);
  const showYield = false
  const localTime = new Date(blockTime * 1000).toLocaleString('en-GB');
  return (
    <div className={styles.left_content}>
      <div className={styles.time_title}>
        {blockTime && `${_('last_block_time')} ${localTime}`}
      </div>
      <div className={styles.coin}>
        <TokenLogo name={symbol} genesisID={tokenID} />
        <div className={styles.coin_name}>{symbol}</div>
      </div>
      <div className={styles.time_title}>
        {_('stake_desc', symbol).replace('%1', escrowToken.symbol)}
      </div>
      <div className={styles.box}>
        <div className={styles.line}>
          <div className={styles.item}>
            <div className={styles.label}>
              Total {escrowTokenSymbol}
            </div>
            <div className={styles.value}>
              <FormatNumber value={formatSat(escrowTokenAmount, decimal)} />
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}> Value of 1 {escrowTokenSymbol} </div>
            <div className={styles.value}>
              <FormatNumber value={escrowRate} /> {symbol}
            </div>
          </div>
        </div>
      </div>

      { showYield && 
        (<div className={styles.box}>
          <div className={styles.line1}>
            <div className={styles.left}>
              <div className={styles.item}>
                <div className={styles.label}>{_('payout_per_block')}</div>
                <div className={styles.value}>
                  {rewardAmountPerSecond > 0 ? (
                    <FormatNumber
                      value={formatSat(rewardAmountPerSecond, escrowTokenDecimal)}
                      suffix={escrowTokenSymbol}
                    />
                  ) : (
                    0
                  )}
                </div>
              </div>
              <div className={styles.item}>
                <div className={styles.label}>{_('staking_yield')}</div>
                <div className={styles.value}>
                  {escrowTokenAmount > 0 ? (
                    <FormatNumber
                      value={formatSat(escrowTokenAmount, escrowTokenDecimal)}
                      suffix={escrowTokenSymbol}
                    />
                  ) : (
                    0
                  )}
                </div>
              </div>
              <div className={styles.item}>
                <div className={styles.label}>{_('apy')}</div>
                <div className={styles.value}>{_yield}%</div>
              </div>
            </div>
            <div className={styles.action}>
              <HarvestBtn />
            </div>
          </div>
        </div>)
      }

      {unlockingTokens_user && unlockingTokens_user.length > 0 && (
        <div className={styles.box}>
          {unlockingTokens_user.map(({ expired, left, amount, _amount }, index) => (
            <div className={styles.line1} key={index}>
              <div className={styles.item}>
                <div className={styles.label}>{_('unstaked')}</div>
                <div className={styles.value}>
                  <FormatNumber value={_amount} suffix={symbol} />
                </div>
              </div>
              <div className={styles.action}>
                <div className={styles.time}>
                  {!!left &&
                    `${_('vesting_term')}: ${new Date(expired * 1000).toLocaleString('en-GB')} `}
                </div>
                <WithdrawBtn left={left} amount={amount} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const mapStateToProps = ({ stake, user, pair }) => {
  return {
    ...stake,
  };
};

export default connect(mapStateToProps)(Content);
