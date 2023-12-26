import { Form, Input } from 'antd';
import CustomIcon from 'components/icon';
import PairIcon from 'components/pairIcon';
import styles from './index.less';

const FormItem = Form.Item;

export function TokenInput(props) {
  const {
    pairData,
    tokenKey,
    showUI,
    changeAmount,
    formItemName,
    isLackBalance,
  } = props;
  const { swapToken1Amount, swapToken2Amount } = pairData;
  return (
    <div className={styles.box}>
      <div className={styles.coin} onClick={() => showUI('selectToken')}>
        <PairIcon keyword={tokenKey} size={40} />
        <div className={styles.arrow}>
          <CustomIcon type="iconDropdown" />
        </div>
      </div>
      <FormItem name={formItemName}>
        <Input
          className={isLackBalance ? styles.input_error : styles.input}
          onChange={changeAmount}
          disabled={swapToken1Amount === '0' || swapToken2Amount === '0'}
        />
      </FormItem>
    </div>
  );
}
