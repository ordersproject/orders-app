'use strict';
import { Dropdown } from 'antd';
import CustomIcon from 'components/icon';
import TokenList from 'components/tokenList';
import TimeRangeTabs from './timeRangeTabs';
import styles from './index.less';
import _ from 'i18n';
import TokenPair from 'components/tokenPair';

export default function chartTitle(props) {
  let { symbol1, symbol2, type, abandoned, genesisID1, genesisID2 } = props;
  symbol1 = symbol1.toUpperCase();
  symbol2 = symbol2.toUpperCase();
  return (
    <div className={styles.chart_heading}>
      <Dropdown
        trigger={['click']}
        overlay={<TokenList size="small" type="pair" />}
        overlayClassName={styles.drop_menu}
        overlayStyle={{ width: 350 }}
        getPopupContainer={() => document.getElementById('J_Page')}
      >
        <span className={styles.chart_title}>
          <span className={styles.icon}>
            <TokenPair
              symbol1={symbol1}
              symbol2={symbol2}
              genesisID1={genesisID1}
              genesisID2={genesisID2}
              size={25}
            />
          </span>
          {symbol2 === 'USDT' ? (
            <>
              <span>
                {symbol1}/{symbol2}
                {abandoned && '(old)'}
              </span>
            </>
          ) : (
            <>
              <span>
                {symbol2}/{symbol1}
                {abandoned && '(old)'}
              </span>
            </>
          )}
          <CustomIcon type="iconDropdown" />
        </span>
      </Dropdown>
    </div>
  );
}
