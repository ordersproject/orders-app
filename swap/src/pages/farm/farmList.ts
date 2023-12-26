'use strict';
import React, { Component } from 'react';
import BN from 'bignumber.js';
import { history } from 'umi';
import { Tooltip } from 'antd';
import TokenPair from 'components/tokenPair';
import FormatNumber from 'components/formatNumber';
import EventBus from 'common/eventBus';
import { jc, formatSat, formatAmount } from 'common/utils';
import Harvest from './harvest';
import styles from './index.less';
import _ from 'i18n';
import { Iconi } from 'components/ui';

const { hash } = window.location;

export default class FarmList extends Component {
  changeCurrentFarm = async (currentFarmPair) => {
    const { allFarmPairs, dispatch } = this.props;

    if (hash.indexOf('farm') > -1) {
      history.push(`/farm/${currentFarmPair}`);
    }
    dispatch({
      type: 'farm/saveFarm',
      payload: {
        currentFarmPair,
        allFarmPairs,
      },
    });
    EventBus.emit('changeFarmPair');
  };

  renderItem(data) {
    const { loading, currentFarmPair, pairsData, isLogin } = this.props;

    const {
      id,
      token,
      abandoned = false,
      lockedTokenAmount,
      rewardAmountPerSecond,
      rewardBeginTime = 0,
      rewardEndTime = 0,
      rewardTokenAmount = 0,
      rewardToken,
      poolTokenAmount,
      maxBoostRatio,
      _total = 0,
      _yield = 0,
    } = data;
    let { tokenID, symbol } = token;
    if (loading || !pairsData[tokenID]) {
      return null;
    }

    let apy = _yield;
    let rewardAmountPerDay = formatSat(rewardAmountPerSecond * 86400, decimal);
    const now = Date.now() / 1000;
    if (now > rewardEndTime) {
      apy = 0
      rewardAmountPerDay = 0
    }
    const maxApy = apy * (1 + maxBoostRatio / 10000)
    const maxRewardPerDay = rewardAmountPerDay * (1 + maxBoostRatio / 10000)

    const {
      swapToken1Amount,
      swapToken2Amount,
      swapLpAmount,
      lptoken,
      token1,
      token2,
    } = pairsData[tokenID];

    const symbol1 = token1.symbol.toUpperCase();
    const symbol2 = token2.symbol.toUpperCase();
    const rewardBeginTimeStr = new Date(rewardBeginTime * 1000).toLocaleString('en-GB'); 
    const rewardEndTimeStr = new Date(rewardEndTime * 1000).toLocaleString('en-GB');

    const { decimal } = rewardToken;

    const _rewardTokenAmount = isLogin
      ? formatSat(rewardTokenAmount, decimal)
      : 0;
    const _lockedTokenAmount = isLogin
      ? formatSat(lockedTokenAmount, token.decimal)
      : 0;


    // count token1 and token2 value
    let rate = 0
    if (isLogin) {
      rate = BN(lockedTokenAmount).div(swapLpAmount);
      if (rate > 1) rate = 1;
    }

    const token1Amount = formatSat(
      BN(swapToken1Amount).multipliedBy(rate),
      token1.decimal,
    );
    const token2Amount = formatSat(
      BN(swapToken2Amount).multipliedBy(rate),
      token2.decimal,
    );

    let cls = styles.item;
    if (abandoned || symbol === 'TSC/FTT') {
      cls = jc(styles.item, styles.warn);
    }

    if (id === currentFarmPair) {
      cls = jc(cls, styles.current);
    }
    return (
      <div className={cls} key={id} onClick={() => this.changeCurrentFarm(id)}>
        <div className={styles.item_header}>
          <div className={styles.item_title}>
            <div className={styles.icon}>
              <TokenPair
                symbol1={symbol2}
                symbol2={symbol1}
                size={20}
                genesisID2={token1.tokenID || 'mvc'}
                genesisID1={token2.tokenID}
              />
            </div>
            <div className={styles.name}>
              {symbol2}/{symbol1} {abandoned && '(old)'}
            </div>
          </div>
          <div className={styles.lp_amount}>
            {abandoned && _('abandoned_deposited_lp')}
            {symbol !== 'TSC/FTT' && !abandoned && _('total_deposited_lp')}:{' '}
            <FormatNumber value={formatSat(poolTokenAmount, token.decimal)} />
          </div>
        </div>

        <div className={styles.item_data}>
          <div>
            <div className={styles.label}>{_('tvl')}</div>
            <div className={styles.value}>
              <div>
                <FormatNumber value={token1Amount} useAbbr={true} /> {token1.symbol.toUpperCase()}
              </div>
              <div>
                <FormatNumber value={token2Amount} useAbbr={true} /> {token2.symbol}
              </div>
            </div>
          </div>
          <div>
            <Tooltip
              title={_('apy_info').replace(/%1/g, rewardToken.symbol)}
              placement="bottom"
            >
              <div className={styles.label}>
                {_('apy')}
                <Iconi />
              </div>
            </Tooltip>
            <div className={styles.value}>
              <FormatNumber value={apy} />% ~ <FormatNumber value={maxApy} />%
            </div>
          </div>
          <div>
            <Tooltip title={_('payout_tips')} placement="bottom">
              <div className={styles.label}>
                {_('payout')}
                <Iconi />
              </div>
            </Tooltip>
            <div className={styles.value}>
              <FormatNumber value={rewardAmountPerDay} /> ~ <FormatNumber value={maxRewardPerDay} />
            </div>
          </div>
          <div className={styles.item_detail_line_2}>
            <div className={styles.label}>
              {_('crop')} ({rewardToken.symbol}):
            </div>
            <Tooltip
              title={`${_('yield_tips', _rewardTokenAmount)} ${
                rewardToken.symbol
              }`}
              placement="bottom"
            >
              <div className={jc(styles.value, styles.blue)}>
                <FormatNumber
                  value={formatAmount(_rewardTokenAmount, rewardToken.decimal)}
                />
              </div>
            </Tooltip>
          </div>
          <Harvest
            id={id}
            data={data}
            {...this.props}
            rewardTokenAmount={rewardTokenAmount}
          />
        </div>

        <div>
          <div className={styles.item_bottom}>
            <div className={styles.label}>{_('start_time')}:  {rewardBeginTimeStr}</div>
            <div className={styles.label}>{_('end_time')}:  {rewardEndTimeStr}</div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { allFarmPairsArr, blockTime } = this.props;
    const localTime = new Date(blockTime * 1000).toLocaleString('en-GB');
    return (
      <div className={styles.content}>
        <div className={styles.farm_intro}>{_('farm_desc')}</div>
        <div className={styles.farm_title}>
          {blockTime && `${_('last_block_time')} ${localTime}`}
        </div>
        <div className={styles.items}>
          {allFarmPairsArr.length > 0 &&
            allFarmPairsArr.map((item) => {
              return this.renderItem(item);
            })}
        </div>
      </div>
    );
  }
}
