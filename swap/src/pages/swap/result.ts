import FormatNumber from 'components/formatNumber';
import { SuccessResult } from 'components/result';
import { formatSat } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';

export default function SwapResult(props) {
  const {
    origin_amount,
    txFee,
    dirForward,
    txid,
    realSwapAmount,
    token1,
    token2,
    finish,
  } = props;
  const origin_token = dirForward ? token1 : token2;
  const aim_token = dirForward ? token2 : token1;
  const symbol1 = origin_token.symbol;
  const symbol2 = aim_token.symbol;
  return (
    <div className={styles.content}>
      <SuccessResult success_txt={_('swap_success')} done={finish}>
        <div className={styles.detail}>
          <div className={styles.line}>
            <div className={styles.detail_item}>
              <div className={styles.item_label}>{_('paid')}</div>
              <div className={styles.item_value}>
                <FormatNumber value={origin_amount} suffix={symbol1} />
              </div>
            </div>
            <div className={styles.detail_item} style={{ textAlign: 'right' }}>
              <div className={styles.item_label}>{_('received')}</div>
              <div className={styles.item_value}>
                {realSwapAmount} {symbol2}
              </div>
            </div>
          </div>
          <div className={styles.detail_item}>
            <div className={styles.item_label}>{_('swap_fee')}</div>
            <div className={styles.item_value}>
              <FormatNumber value={formatSat(txFee)} suffix="space" />
            </div>
          </div>
          <div className={styles.detail_item}>
            <div className={styles.item_label}>{_('onchain_tx')}</div>
            <div className={styles.item_value}>{txid}</div>
          </div>
        </div>
      </SuccessResult>
    </div>
  );
}
