import React from 'react';
import { connect } from 'umi';
import TokenLogo from 'components/tokenicon';
import TokenPair from 'components/tokenPair';

@connect(({ pair, loading }) => {
  const { effects } = loading;
  return {
    ...pair,
    loading: effects['pair/getAllPairs'],
  };
})
export default class PairIcon extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.loading) return null;
    const {
      keyword,
      showPairIcon,
      size = 30,
      txt,
      children,
      currentToken1,
      currentToken2,
      token1Arr = [],
      token2Arr = [],
    } = this.props;

    const token1 = token1Arr.find(
      (item) =>
        item.tokenID === currentToken1 ||
        (currentToken1 &&
          item.symbol.toUpperCase() === currentToken1.toUpperCase()),
    );
    const token2 = token2Arr.find(
      (item) =>
        item.tokenID === currentToken2 ||
        (currentToken2 &&
          item.symbol.toUpperCase() === currentToken2.toUpperCase()),
    );

    const token1Name = token1 ? token1.symbol.toUpperCase() : '';
    const token2Name = token2 ? token2.symbol.toUpperCase() : '';

    // console.log(token1, token2)
    const token1Logo = token1 ? (
      <TokenLogo
        name={token1.symbol}
        genesisID={token1.tokenID || 'mvc'}
        size={size}
      />
    ) : null;
    const token2Logo = token2 ? (
      <TokenLogo
        name={token2.symbol}
        genesisID={token2.tokenID || 'mvc'}
        size={size}
      />
    ) : null;

    const pairIcon =
      token1 && token2 ? (
        <TokenPair
          symbol1={token1Name}
          symbol2={token2Name}
          genesisID1={token1.tokenID}
          genesisID2={token2.tokenID}
          size={size}
        />
      ) : null;

    if (keyword === 'token1') {
      return (
        <>
          <div className="pair-icon">{token1Logo}</div>
          <div className="pair-name">
            {children} {token1Name}
          </div>
        </>
      );
    }
    if (keyword === 'token2') {
      return (
        <>
          <div className="pair-icon">{token2Logo}</div>
          <div className="pair-name">
            {children} {token2Name}
          </div>
        </>
      );
    }
    if (keyword === 'pair') {
      let str = `${token1Name}/${token2Name}`;
      if (txt) {
        str = txt.replace(/name1/g, token1Name);
        str = str.replace(/name2/g, token2Name);
      }
      return (
        <>
          {showPairIcon && <div className="pair-icon">{pairIcon}</div>}
          <div className="pair-name">{str}</div>
        </>
      );
    }
    return null;
  }
}
