import { Dropdown, Space } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import _ from 'i18n';
import { history } from 'umi';
import styles from './index.less';
import { useEffect, useState } from 'react';

const submenu = [
  {
    label: _('stake'),
    key: 'stake',
    path: 'stake',
  },
  {
    label: _('vote'),
    key: 'vote',
    path: 'vote',
  },
];

function StakeSubmenu() {
  const [currentMenu, setCurrentMenu] = useState(submenu[0].key);

  const getHash = () => {
    return window.location.hash.substr(2);
  };

  useEffect(() => {
    const hash = getHash();
    let _currentMenu = currentMenu;
    submenu.forEach((item) => {
      if (hash.indexOf(item.key) > -1) {
        _currentMenu = item.key;
      }
    });
    setCurrentMenu(_currentMenu);
  }, [window.location]);

  const gotoPage = (anchor) => {
    history.push(`/${anchor}`);
    // this.scrollto(anchor)
  };

  const menu = (
    <div className={styles.submenu}>
      {submenu.map((item, index) => {
        return (
          <div
            key={item.key}
            className={
              item.key === currentMenu && getHash() === item.key
                ? `${styles.submenu_item} ${styles.submenu_item_selected}`
                : styles.submenu_item
            }
            onClick={() => gotoPage(item.path)}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
  return (
    <Dropdown menu={menu}>
      <span>
        {submenu.find((v) => v.key === currentMenu).label}
        <DownOutlined />
      </span>
    </Dropdown>
  );
}

export default StakeSubmenu;
