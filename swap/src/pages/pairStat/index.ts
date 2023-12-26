'use strict';
import React from 'react';
import FormatNumber from 'components/formatNumber';
import PairIcon from 'components/pairIcon';
import { formatSat } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';

export default function PairStat(props) {
  const { swapToken1Amount, swapToken2Amount, token1, token2 } =
    props.pairData || {};

  const amount1 = formatSat(swapToken1Amount, token1.decimal);
  const amount2 = formatSat(swapToken2Amount, token2.decimal);
  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <div className={styles.label}>{_('pooled_tokens')}</div>

        <div className={styles.value2} key={token1.tokenid}>
          <PairIcon keyword="token1">
            <FormatNumber value={amount1} />{' '}
          </PairIcon>
        </div>
        <div className={styles.value2} key={token2.tokenid}>
          <PairIcon keyword="token2">
            <FormatNumber value={amount2} />{' '}
          </PairIcon>
        </div>
      </div>
    </div>
  );
}
