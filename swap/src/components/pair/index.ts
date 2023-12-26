import React from 'react';
// import CustomIcon from 'components/icon';
// import { QuestionCircleOutlined } from '@ant-design/icons';
import FormatNumber from 'components/formatNumber';
import { formatSat, formatAmount } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';
// import BigNumber from 'bignumber.js';

export default function Pair(props) {
  const { pairData, curPair, userBalance } = props;
  const { swapToken1Amount, swapToken2Amount, swapLpAmount, totalLpFee24h, totalVolume24h } = pairData;
  const totalFee = Math.floor(Number(totalLpFee24h) / 0.6)
  const lpAPR = totalLpFee24h * 365 * 100 / (swapToken1Amount * 2).toFixed(4)
  const lpApy = ((1 + totalLpFee24h / (swapToken1Amount * 2)) ** 365 - 1).toFixed(4) * 100
  const { lptoken = {}, token1, token2 } = curPair;
  const LP = userBalance[lptoken.tokenID] || 0;
  const rate = LP / formatSat(swapLpAmount, lptoken.decimal) || 0;
  const _token1 = formatAmount(
    formatSat(swapToken1Amount, token1.decimal),
    token1.decimal,
  );
  const _token2 = formatAmount(
    formatSat(swapToken2Amount, token2.decimal),
    token2.decimal,
  );
  const _rate = (rate * 100).toFixed(4);
  const symbol1 = token1.symbol.toUpperCase();
  const symbol2 = token2.symbol.toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <div className={styles.title} style={{ display: 'flex' }}>
          <div className={styles.name}>{_('pool_share')}</div>
        </div>
        <div className={styles.info_item}>
          <div className={styles.info_label}>{_('pooled', symbol1)}</div>
          <div className={styles.info_value}>
            <FormatNumber value={_token1} />
          </div>
        </div>
        <div className={styles.info_item}>
          <div className={styles.info_label}>{_('pooled', symbol2)}</div>
          <div className={styles.info_value}>
            <FormatNumber value={_token2} />
          </div>
        </div>
        <div className={styles.info_item}>
          <div className={styles.info_label}>
            {_('volume_24h')}
          </div>
          <div className={styles.info_value}>
            <FormatNumber value={formatSat(totalVolume24h)} />
          </div>
        </div>
        <div className={styles.info_item}>
          <div className={styles.info_label}>
            {_('fee_24h')}
          </div>
          <div className={styles.info_value}>
            <FormatNumber value={formatSat(totalLpFee24h)} />
          </div>
        </div>
        <div className={styles.info_item}>
          <div className={styles.info_label}>
            APY(based on 24h fees)
          </div>
          <div className={styles.info_value}>
            <FormatNumber value={lpApy} />%
          </div>
        </div>
        <div className={styles.info_item}>
          <div className={styles.info_label}>{_('your_share')}</div>
          <div className={styles.info_value}>
            <FormatNumber value={_rate} />%
          </div>
        </div>
      </div>
    </div>
  );
}
