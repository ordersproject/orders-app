import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { jc } from 'common/utils';
import CustomIcon from 'components/icon';
import styles from './index.less';
import _ from 'i18n';

export function Arrow(props) {
  const { noLine = false } = props;
  return (
    <div className={styles.arrow_icon}>
      <div className={styles.icon}>
        <CustomIcon type="iconArrow2" />
      </div>
      {!noLine && <div className={styles.line}></div>}
    </div>
  );
}

export function Arrow2(props) {
  return (
    <div className={styles.switch_icon}>
      <div className={styles.icon} onClick={props.onClick}>
        <CustomIcon type="iconswitch" style={{ fontSize: 20 }} />
      </div>
      {/* <div className={styles.line}></div> */}
    </div>
  );
}

export function Plus() {
  return (
    <div className={styles.plus_icon}>
      <PlusOutlined style={{ fontSize: 18 }} />
    </div>
  );
}

export function Iconi() {
  return (
    <div className={styles.i_icon}>
      <CustomIcon type="iconi" />
    </div>
  );
}

export function IconTick() {
  return <CustomIcon type="iconcross-red" />;
}

export function IconX() {
  return <CustomIcon type="icontick-green" />;
}

export function AppTitle(props) {
  const { left, title, onClick, bottomLine = false, appTitle = true } = props;
  let cls = appTitle ? jc(styles.title, styles.app_title) : styles.title;
  cls = bottomLine ? jc(cls, styles.bottom_line) : cls;
  return (
    <div className={cls}>
      {left || <span className={styles.blank}></span>}
      {title}
      <div className={styles.close} onClick={onClick}>
        <CloseOutlined />
      </div>
    </div>
  );
}

export function AppStartBtn(props) {
  const { btns, onClick, size = 'small' } = props;
  return (
    <div className={styles.app_start_btn_wrap}>
      {btns.map((item) => (
        <Button
          type="primary"
          shape="round"
          className={styles[`${size}_btn`]}
          onClick={() => onClick(item.key)}
          key={item.key}
        >
          {item.txt}
        </Button>
      ))}
    </div>
  );
}

export function FoundGenesisIDs() {
  return (
    <div className={styles.found_desc}>
      {_('find_tokenid')}{' '}
      <a href="https://mvcscan.com/" target="_blank">
        MVCScan
      </a>
    </div>
  );
}

export function CreatePairDocument() {
  return (
    <div className={styles.found_desc}>
      <a
        href="https://docs.mvcswap.com/mvcswap/create-token-pair"
        target="_blank"
      >
        {_('check_create_doc')}
      </a>{' '}
    </div>
  );
}
