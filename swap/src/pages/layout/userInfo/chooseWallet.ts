import { Modal } from 'antd';
import querystring from 'querystringify';
import metaletIcon from '../../../../public/assets/metalet.png';
import mswalletIcon from '../../../../public/assets/ms-black2.png';
import styles from './index.less';
import _ from 'i18n';

const query = querystring.parse(window.location.search);
const network = query.network == 'testnet' ? 'testnet' : 'mainnet';

export default function ChooseWallet(props) {
  const { closeChooseDialog, connectWebWallet } = props;
  return (
    <Modal
      title=""
      visible={true}
      footer={null}
      getContainer="#J_Page"
      className={styles.chooseLogin_dialog}
      width="400px"
      onCancel={closeChooseDialog}
      closable={false}
    >
      <div className={styles.title}>{_('connect_wallet')}</div>
      <ul>
        {
          <>
            <li onClick={() => connectWebWallet(4, 'mainnet')}>
              <div className={styles.sens_icon}>
                <img src={metaletIcon} style={{ height: 30 }} />
              </div>
              <div className={styles.label}>Metalet</div>
            </li>
          </>
        }
        {
          <>
            <li onClick={() => connectWebWallet(1)} style={{ fontSize: 15 }}>
              <div className={styles.ts_icon}>
                <img src={mswalletIcon} style={{ height: 30 }} />
              </div>
              <div className={styles.label}>
                Web {_('wallet')}
                <div className={styles.sub}>{_('test_only')}</div>
              </div>
            </li>
          </>
        }
      </ul>
    </Modal>
  );
}
