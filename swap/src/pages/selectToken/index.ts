'use strict';
import { ArrowLeftOutlined } from '@ant-design/icons';
import TokenList from 'components/tokenList';
import styles from './index.less';
import _ from 'i18n';

export default function SelectToken(props) {
  const { finish, type = 'left' } = props;
  return (
    <div className={styles.container}>
      <div className={styles.head}>
        <div className={styles.back}>
          <ArrowLeftOutlined
            onClick={() => finish()}
            style={{ fontSize: 16, color: '#1E2BFF', fontWeight: 700 }}
          />
        </div>
        <div className={styles.title}>{_('select_token')}</div>
        <div className={styles.done}></div>
      </div>
      <TokenList finish={finish} type={type} />
    </div>
  );
}
