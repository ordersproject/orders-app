import { SuccessResult } from 'components/result';
import TokenLogo from 'components/tokenicon';
import CustomIcon from 'components/icon';
import { formatAmount, strAbbreviation } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';
import BN from 'bignumber.js';

export default function Content2(props) {
  const {
    token1 = {},
    token2 = {},
    values = {},
    result,
    mvcPrice,
    close,
  } = props;
  const { rewardAmountPerSecond, rewardDays, total } = values;
  const fee = formatAmount(BN(result.fee).multipliedBy(mvcPrice), 4);

  return (
    <div className={styles.content2}>
      <SuccessResult
        success_txt={_('create_farm_success')}
        success_desc={_('create_farm_success_desc')}
        noLine={true}
        done={close}
      >
        <div className={styles.logo}>
          <TokenLogo name={token1.symbol} genesisID={token1.genesis} />
          <div className={styles.name}>{token1.symbol}</div>
        </div>
        <div className={styles.info}>
          <div className={styles.line}>
            <div className={styles.label}>{_('deposited')}</div>
            <div className={styles.value}>
              {total} {token2.symbol}
            </div>
          </div>
          <div className={styles.line}>
            <div className={styles.label}>{_('reward')}</div>
            <div className={styles.value}>
              {rewardAmountPerSecond} {token2.symbol} per MVC block
            </div>
          </div>
          <div className={styles.line}>
            <div className={styles.label}>{_('duration')}</div>
            <div className={styles.value}>{rewardDays} days</div>
          </div>
          <div className={styles.line}>
            <div className={styles.label}>TX ID</div>
            <div className={styles.value}>
              {strAbbreviation(result.farmTxId, [14, 13])}{' '}
              <a
                href={`https://blockcheck.info/tx/${result.farmTxId}`}
                target="_blank"
              >
                <CustomIcon type="iconicon-link" />
              </a>
            </div>
          </div>
          <div className={styles.line}>
            <div className={styles.label}>{_('network_fee')}</div>
            <div className={styles.value}>
              -{result.fee} MVC | -${fee} USD
            </div>
          </div>
        </div>
      </SuccessResult>
    </div>
  );
}
