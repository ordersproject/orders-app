'use strict';
import React, { Component } from 'react';
import { connect } from 'umi';
import EventBus from 'common/eventBus';
import { jc } from 'common/utils';
import Loading from 'components/loading';
import Notice from 'components/notice';
import Chart from 'components/chart/swapChart';
import Layout from '../layout';
import Header from '../layout/header';
import Swap from '../swap';
import PairStat from '../pairStat';
import styles from './index.less';
import _ from 'i18n';
import { AppStartBtn, AppTitle } from 'components/ui';

let busy = false;
@connect(({ pair, loading }) => {
  const { effects } = loading;
  return {
    ...pair,
    loading: effects['pair/getAllPairs'] || effects['pair/getPairData'],
  };
})
export default class SwapPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      app_pannel: false,
    };
    this.swapPolling = true;
  }

  showPannel = () => {
    this.setState({
      app_pannel: true,
    });
  };

  hidePannel = () => {
    this.setState({
      app_pannel: false,
    });
  };

  componentDidMount() {
    EventBus.on('reloadPair', () => {
      const { hash } = window.location;
      if (hash.indexOf('swap') > -1) {
        this.fetch();
      }
    });
    this.fetch();
  }

  fetch = async () => {
    if (busy) return;
    busy = true;
    const { dispatch } = this.props;
    await dispatch({
      type: 'pair/getAllPairs',
    });

    // if (currentPair) {
    await dispatch({
      type: 'pair/getPairData',
      payload: {
        // currentPair,
      },
    });

    // }
    EventBus.emit('reloadChart', 'swap');
    busy = false;
  };

  renderContent() {
    const { loading, token1, token2, pairData, allPairs, currentPair } =
      this.props;
    if (loading || !token1.symbol) return <Loading />;

    return (
      <div className={styles.content}>
        <Chart
          symbol1={token1.symbol}
          symbol2={token2.symbol}
          genesisID1={token1.tokenID}
          genesisID2={token2.tokenID}
          abandoned={allPairs[currentPair].abandoned}
        />

        <h3 className={styles.title}>{_('pair_stat')}</h3>
        <PairStat pairData={{ ...pairData, token1, token2 }} />
      </div>
    );
  }

  render() {
    const { app_pannel } = this.state;
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
              {this.renderContent()}
              <AppStartBtn
                btns={[
                  {
                    txt: _('start_swapping'),
                    key: 0,
                  },
                ]}
                onClick={this.showPannel}
                size="big"
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
              <AppTitle title={_('swap')} onClick={this.hidePannel} />
              <Swap />
            </div>
          </section>
        </section>
      </Layout>
    );
  }
}
