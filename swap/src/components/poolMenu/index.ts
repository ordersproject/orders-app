'use strict';
import { history } from 'umi';
import styles from './index.less';
import { jc } from 'common/utils';
import _ from 'i18n';

const menuData = [
  {
    path: 'add',
    text: _('add_liq_short'),
    key: 'add_liq',
  },
  {
    path: 'remove',
    text: _('remove_liq_short'),
    key: 'remove_liq',
  },
  {
    path: 'create',
    text: _('create_new_pair'),
    key: 'create_pair',
  },
];

export default function PoolMenu(props) {
  const { currentMenuIndex, currentPair } = props;
  return (
    <div className={styles.head}>
      <div className={styles.menu}>
        {menuData.map((item, index) => (
          <span
            className={
              index === currentMenuIndex
                ? jc(styles.menu_item, styles.menu_item_selected)
                : styles.menu_item
            }
            key={item.key}
            onClick={() => {
              history.push(
                index === 2 || !currentPair
                  ? `/pool/${item.path}`
                  : `/pool/${currentPair}/${item.path}`,
              );
            }}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
