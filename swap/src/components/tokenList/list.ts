import React from 'react';
import { history } from 'umi';
import EventBus from 'common/eventBus';
import { CheckCircleOutlined } from '@ant-design/icons';
// import TokenPair from 'components/tokenPair';
import TokenIcon from 'components/tokenicon';
import { isLocalEnv, strAbbreviation } from 'common/utils';
import styles from './index.less';

const { location } = window;

export default class TokenPairList extends React.Component {
  // changeCurrentTokenPair = (currentPair) => {
  //   const { hash } = location;
  //   if (hash.indexOf('swap') > -1) {
  //     history.push(`/swap/${currentPair}`);
  //   } else if (hash.indexOf('add') > -1) {
  //     history.push(`/pool/${currentPair}/add`);
  //   } else if (hash.indexOf('remove') > -1) {
  //     history.push(`/pool/${currentPair}/remove`);
  //   } else if (hash.indexOf('farm') > -1) {
  //     history.push(`/farm/${currentPair}`);
  //   }
  //   EventBus.emit('reloadPair');
  // };

  renderItem = (item, props) => {
    const { currentPair, currentToken, changePair } = props;
    // const { token1, token2, id, name, tokenIDs } = item;
    const { symbol, tokenID } = item;
    // console.log(item)
    return (
      <div
        className={styles.item}
        key={tokenID}
        // onClick={() => this.changeCurrentTokenPair(tokenID)}
        onClick={() => changePair(tokenID || 'mvc')}
      >
        <div className={styles.icon_name}>
          <div className={styles.icon}>
            <TokenIcon
              name={symbol}
              genesisID={tokenID || 'mvc'}
              size={40}
              style={{ zIndex: 1 }}
            />
            {/*<TokenPair
              symbol1={token1.symbol}
              symbol2={token2.symbol}
              genesisID1={token1.tokenID}
              genesisID2={token2.tokenID}
              size={25}
            />*/}
          </div>
          <div className={styles.name}>{symbol.toUpperCase()}</div>
        </div>

        <div className={styles.genesis_id}>{strAbbreviation(tokenID)}</div>

        <div className={styles.selected}>
          {(currentToken.toUpperCase() === symbol.toUpperCase() ||
            currentToken === tokenID) && (
            <CheckCircleOutlined
              theme="filled"
              style={{ color: '#1E2BFF', fontSize: 30 }}
            />
          )}
        </div>
      </div>
    );
  };

  render() {
    const { showList = [] } = this.props;
    return (
      <div className={styles.token_list}>
        {showList.map((item) => {
          if ((item.test && isLocalEnv) || !item.test) {
            return this.renderItem(item, this.props);
          }
        })}
      </div>
    );
  }
}
