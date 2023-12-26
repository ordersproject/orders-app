'use strict';
import React, { Component } from 'react';
import { history, connect } from 'umi';
import EventBus from 'common/eventBus';
import { Spin } from 'antd';
import _ from 'i18n';
import Search from './search';
import List from './list';
import Pair from './pair';
import styles from './index.less';

@connect(({ pair }) => {
  return {
    ...pair,
  };
})
export default class PairList extends Component {
  constructor(props) {
    super(props);
    // console.log(props.token1Arr, props.token2Arr)
    let pairArr;
    const { allPairs, token1Arr, token2Arr, type } = props;
    if (type === 'pair') {
      pairArr = this.handlePairs(allPairs);
    } else {
      pairArr = type === 'left' ? token1Arr : token2Arr;
    }
    // const pairArr = this.handlePairs(props.allPairs);
    this.state = {
      showList: pairArr,
      allPairs: pairArr,
    };
  }

  handlePairs(pairs) {
    let arr = [];
    Object.keys(pairs).forEach((item) => {
      const { token1, token2 } = pairs[item];
      const _obj = {
        ...pairs[item],
        name: token1.symbol + '-' + token2.symbol,
        id: item,
        tokenIDs: token1.tokenID || token1.symbol + '-' + token2.tokenID,
      };
      arr.push(_obj);
    });
    arr.sort((a, b) => {
      return b.poolAmount - a.poolAmount;
    });
    return arr;
  }

  changeShowList = (list) => {
    this.setState({
      showList: list,
    });
  };

  changePair = async (tokenID) => {
    const { type, dispatch, finish } = this.props;
    let token1ID = type === 'left' && tokenID;
    let token2ID = type === 'right' && tokenID;

    const currentPair = await dispatch({
      type: 'pair/changeCurrentToken',
      payload: {
        token1ID,
        token2ID,
      },
    });

    finish && finish();

    const { hash } = location;
    if (hash.indexOf('swap') > -1) {
      history.push(`/swap/${currentPair}`);
    } else if (hash.indexOf('add') > -1) {
      history.push(`/pool/${currentPair}/add`);
    } else if (hash.indexOf('remove') > -1) {
      history.push(`/pool/${currentPair}/remove`);
    } else if (hash.indexOf('farm') > -1) {
      history.push(`/farm/${currentPair}`);
    }
    EventBus.emit('reloadPair');
  };

  render() {
    const { showList, allPairs } = this.state;
    const {
      size = 'big',
      currentPair,
      loading = false,
      type,
      currentToken1,
      currentToken2,
    } = this.props;

    return (
      <div className={styles[size]}>
        <Search
          changeShowList={this.changeShowList}
          allPairs={allPairs}
          type={type}
        />
        <Spin spinning={loading}>
          {type === 'pair' ? (
            <Pair showList={showList} currentPair={currentPair} />
          ) : (
            <List
              showList={showList}
              currentPair={currentPair}
              currentToken={type === 'left' ? currentToken1 : currentToken2}
              changePair={this.changePair}
            />
          )}
        </Spin>
      </div>
    );
  }
}
