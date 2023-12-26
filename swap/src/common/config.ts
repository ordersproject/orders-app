'use strict';
import qs from 'querystringify';
import _ from 'i18n';
import spaceLogo from '../../public/assets/space.png';

const location = window.location;
const { search } = location;

export const query = qs.parse(search);

export function agentVersion() {
  var userAgentInfo = window.navigator.userAgent;
  var Agents = [
    'Android',
    'iPhone',
    'SymbianOS',
    'Windows Phone',
    'iPad',
    'iPod',
  ];
  var flag = true;
  for (var v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false;
      return Agents[v];
      // break;
    }
  }
  return 'PC';
}

export const slippage_data = {
  slippage_tolerance_value: 'VoltMVCSwapSlipTolValue',
  defaultSlipValue: 1,
};

// export const feeRate = 0.0025;
export const FEE_FACTOR = 10000;

export const MINAMOUNT = 1000;

export const icons = {
  mvc: {
    url: spaceLogo,
  },
  test: {
    type: spaceLogo,
  },
  tmvc: {
    url: spaceLogo,
  },
};
