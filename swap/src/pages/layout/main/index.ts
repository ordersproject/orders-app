import Layout from '../index';
import Header from '../header';
import Notice from 'components/notice';
import { AppStartBtn, AppTitle } from 'components/ui';
import styles from './index.less';
import { useState } from 'react';
import _ from 'i18n';

function StakePage(props) {
  const { leftContent, rightContent, btns, appTitle, children } = props;
  const [appPannel, setAppPannel] = useState(-1);

  return (
    <Layout>
      {appPannel < 0 && <Notice />}
      <section className={styles.container}>
        <section
          className={
            appPannel > -1 ? `${styles.left} ${styles.app_hide}` : styles.left
          }
        >
          <div className={styles.left_inner}>
            <Header />
            {children}
            {leftContent}
            <AppStartBtn
              btns={btns}
              onClick={(key) => setAppPannel(key)}
              size="big"
            />
          </div>
        </section>
        <section className={styles.right}>
          <div
            className={
              appPannel > -1
                ? styles.sidebar
                : `${styles.sidebar} ${styles.app_hide}`
            }
          >
            <AppTitle title={_(appTitle)} onClick={() => setAppPannel(-1)} />
            <div className={styles.right_box}>
              {rightContent(appPannel > -1 ? appPannel : 0)}
            </div>
          </div>
        </section>
      </section>
    </Layout>
  );
}

export default StakePage;
