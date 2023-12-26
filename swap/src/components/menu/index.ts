import { useState } from 'react';
import styles from './index.less';
import _ from 'i18n';

function Menu(props) {
  const { menus, contents, currentMenuIndex } = props;
  const [currentIndex, setCurrentIndex] = useState(currentMenuIndex || 0);
  return (
    <div>
      <div className={styles.head}>
        <div className={styles.menu}>
          {menus.map((item, index) => (
            <span
              className={
                index === currentIndex
                  ? `${styles.menu_item} ${styles.menu_item_selected}`
                  : styles.menu_item
              }
              key={item}
              onClick={() => setCurrentIndex(index)}
            >
              {_(item)}
            </span>
          ))}
        </div>
      </div>
      {menus.map((item, index) => {
        return (
          currentIndex === index && <div key={item}>{contents[index]}</div>
        );
      })}
    </div>
  );
}

export default Menu;
