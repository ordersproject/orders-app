'use strict';
import { Button } from 'antd';
import { jc } from 'common/utils';
import CustomIcon from 'components/icon';
import styles from './index.less';
import _ from 'i18n';

export function SuccessResult(props) {
  const {
    success_txt,
    success_desc,
    done,
    children,
    title,
    noLine = false,
  } = props;
  return (
    <>
      <div className={styles.finish_logo}>
        <CustomIcon type="iconicon-success" />
      </div>
      {title}
      <div
        className={
          noLine ? jc(styles.finish_title, styles.no_line) : styles.finish_title
        }
      >
        {success_txt}
        {success_desc && <div className={styles.desc}>{success_desc}</div>}
      </div>

      {children}

      <Button
        type="primary"
        shape="round"
        className={styles.done_btn}
        onClick={done}
      >
        {_('done')}
      </Button>
    </>
  );
}
