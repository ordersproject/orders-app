'use strict';
import React, { Component } from 'react';
import { history, connect } from 'umi';
import { jc } from 'common/utils';
import { MVCSWAP_POOL_SHOW_OP } from 'common/const';
import Pair from 'components/pair';
import Chart from 'components/chart/poolChart';
import { AppTitle } from 'components/ui';
import Loading from 'components/loading';
import Notice from 'components/notice';
import Header from '../layout/header';
import styles from './index.less';
import _ from 'i18n';
import PairIcon from 'components/pairIcon';
import { AppStartBtn } from 'components/ui';
import Layout from '../layout';

@connect(({ user, pair, loading }) => {
  const { effects } = loading;
  return {
    ...user,
    ...pair,
    loading: effects['pair/getAllPairs'] || effects['pair/getPairData'],
  };
})
export default class Pool extends Component {
  constructor(props) {
    super(props);
    const flag = sessionStorage.getItem(MVCSWAP_POOL_SHOW_OP);
    this.state = {
      app_pannel: flag === 'true',
    };
  }

  showPannel = (type) => {
    const { currentPair } = this.props;
    history.push(`/pool/${currentPair}/${type}`);
    sessionStorage.setItem(MVCSWAP_POOL_SHOW_OP, 'true');
    this.setState({
      app_pannel: true,
    });
  };

  hidePannel = () => {
    sessionStorage.setItem(MVCSWAP_POOL_SHOW_OP, 'false');
    this.setState({
      app_pannel: false,
    });
  };

  renderContent() {
    const {
      currentPair,
      pairData,
      loading,
      allPairs,
      accountInfo,
      token1,
      token2,
    } = this.props;
    if (loading || !currentPair) return <Loading />;
    return (
      <div className={styles.content}>
        <Chart
          symbol1={token1.symbol}
          symbol2={token2.symbol}
          abandoned={allPairs[currentPair].abandoned}
          genesisID1={token1.tokenID}
          genesisID2={token2.tokenID}
        />
        <div className={styles.main_title}>
          <h2>
            <PairIcon keyword="pair" txt="LP(name1/name2)" />
          </h2>
        </div>
        <Pair
          pairData={pairData}
          curPair={allPairs[currentPair]}
          userBalance={accountInfo.userBalance}
        />
      </div>
    );
  }

  renderCreateContent() {
    return (
      <div className={styles.content1}>
        <div className={styles.title}>{_('create_newpair')}</div>
        <dl className={styles.detail}>
          <dt className={styles.sub_title}>{_('newpair_title')}</dt>
          <dd className={styles.desc}>
            <span className={styles.dot}></span> {_('newpair_desc1')}
          </dd>
          <dd className={styles.desc}>
            <span className={styles.dot}></span> {_('newpair_desc2')}
          </dd>
          <dd className={styles.desc}>
            <span className={styles.dot}></span> {_('newpair_desc3')}
          </dd>
          <p className={styles.note}>{_('newpair_note1')}</p>
        </dl>
      </div>
    );
  }

  render() {
    const { app_pannel } = this.state;
    const { pageName } = this.props;

    return (
      <Layout>
        {!app_pannel && <Notice />}
        <section className={styles.container}>
          <section
            className={
              app_pannel ? jc(styles.left, styles.app_hide) : styles.left
            }
          >
            <div className={styles.left_inner}>
              <Header />
              {pageName === 'createPair'
                ? this.renderCreateContent()
                : this.renderContent()}

              <AppStartBtn
                btns={[
                  {
                    txt: _('add_liq'),
                    key: 'add',
                  },
                  {
                    txt: _('remove'),
                    key: 'remove',
                  },
                ]}
                onClick={this.showPannel}
              />
            </div>
          </section>
          <section className={styles.right}>
            <div
              className={
                app_pannel
                  ? styles.sidebar
                  : jc(styles.sidebar, styles.app_hide)
              }
            >
              <AppTitle title={_('pool')} onClick={this.hidePannel} />

              {this.props.children}
            </div>
          </section>
        </section>
      </Layout>
    );
  }
}
