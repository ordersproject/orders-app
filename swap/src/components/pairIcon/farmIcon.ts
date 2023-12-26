import React from 'react';
import { connect } from 'umi';
import TokenLogo from 'components/tokenicon';
import TokenPair from 'components/tokenPair';

@connect(({ pair, farm }) => {
  return {
    ...pair,
    ...farm,
  };
})
export default class FarmPairIcon extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      pairsData,
      keyword,
      size = 25,
      currentFarmPair,
      allFarmPairs,
      children,
      boostToken,
    } = this.props;
    // console.log(lptoken)
    if (!allFarmPairs[currentFarmPair]) return null;
    const lptoken = allFarmPairs[currentFarmPair].token;
    if (!pairsData[lptoken.tokenID]) return null;
    const { token1, token2 } = pairsData[lptoken.tokenID];
    const symbol1 = token1.symbol.toUpperCase();
    const symbol2 = token2.symbol.toUpperCase();

    const token1Logo = (
      <TokenLogo
        name={token1.symbol}
        genesisID={token1.tokenID || 'mvc'}
        size={size}
      />
    );
    const token2Logo = (
      <TokenLogo
        name={token2.symbol}
        genesisID={token2.tokenID || 'mvc'}
        size={size}
      />
    );

    if (keyword === 'pair') {
      return (
        <>
          <div className="pair-icon">
            <TokenPair
              symbol1={symbol1}
              symbol2={symbol2}
              size={size}
              genesisID2={token2.tokenID}
              genesisID1={token1.tokenID}
            />
          </div>
          <div className="pair-name">
            {symbol1}/{symbol2}-LP
          </div>
        </>
      );
    }
    if (keyword === 'token1') {
      return (
        <>
          <div className="pair-icon">{token1Logo}</div>
          <div className="pair-name">
            {children} {symbol1}
          </div>
        </>
      );
    }
    if (keyword === 'token2') {
      return (
        <>
          <div className="pair-icon">{token2Logo}</div>
          <div className="pair-name">
            {children} {symbol2}
          </div>
        </>
      );
    }
    if (keyword === 'boost') {
      const boostTokenLogo = (
        <TokenLogo
          name={boostToken.symbol}
          genesisID={boostToken.tokenID || 'mvc'}
          size={size}
        />
      );

      return (
        <>
          <div className="pair-icon">{boostTokenLogo}</div>
          <div className="pair-name">
            {children} {boostToken.symbol}
          </div>
        </>
      );
    }
    // if (keyword === 'pair2') {
    //   return (
    //     <>
    //       <div className="pair-icon">
    //         <TokenPair
    //           symbol1={symbol2}
    //           symbol2={symbol1}
    //           size={size}
    //           genesisID2={token1.tokenID}
    //           genesisID1={token2.tokenID}
    //         />
    //       </div>
    //       <div className="pair-name">
    //         {symbol2}/{symbol1}-LP
    //       </div>
    //     </>
    //   );
    // }

    return null;
  }
}
