import { Alert } from 'antd'
import _ from 'i18n'
import styles from './index.less'

const VOLT_NOTICE_CLOSED = 'VoltNoticeClosed'
const { sessionStorage } = window

const onClose = () => {
  sessionStorage.setItem(VOLT_NOTICE_CLOSED, '1')
}

export default function Notice(props: any) {
  //return null;
  if (sessionStorage.getItem(VOLT_NOTICE_CLOSED)) {
    return null
  }
  return (
    <Alert
      className={styles.notice_warning}
      type="warning"
      banner={true}
      closable
      onClose={onClose}
      icon=" "
      closeIcon="✖"
      message={_('notice2709')}
    />
  )
}
