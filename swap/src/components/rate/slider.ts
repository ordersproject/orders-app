'use strict';
import { Slider } from 'antd';
import { formatAmount } from 'common/utils';
import styles from './index.less';
import _ from 'i18n';

const RateDatas = [
  {
    label: '25%',
    value: 25,
  },
  {
    label: '50%',
    value: 50,
  },
  {
    label: '75%',
    value: 75,
  },
  {
    label: _('max'),
    value: 100,
  },
];

export default function CustomSlider(props) {
  const { percent, changeRate } = props;
  return (
    <>
      <div className={styles.data}>{formatAmount(percent, 2)}%</div>
      <Slider value={percent} onChange={changeRate} />

      <div className={styles.datas}>
        {RateDatas.map((item) => (
          <div
            className={styles.d}
            onClick={() => changeRate(item.value)}
            key={item.value}
          >
            <span className={item.value === percent && styles.rate_active}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
