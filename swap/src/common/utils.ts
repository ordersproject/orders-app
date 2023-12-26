// 通用函数
'use strict';
import bytes from 'bytes';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import format from 'format-number';
import querystring from 'querystringify';
import {
  MVCSWAP_NETWORK,
  DEFAULT_NET,
  MVCSWAP_CURRENT_FARM_PAIR,
  MVCSWAP_CURRENT_PAIR,
  DEFAULT_PAIR,
} from 'common/const';
import debug from 'debug';
import _ from 'i18n';
const log = debug('utils');
const { location } = window;

// 格式化日期
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) {
    return date;
  }
  if (typeof date === 'string') {
    if (/^\d+$/.test(date)) {
      date = parseInt(date, 10);
    }
    // date = new Date(date.date());
  }
  return moment(date).format(format);
}

export function getTimeAgo(timeAgo) {
  const timeRangeMap = {
    '4h': 60 * 60 * 4,
    '1d': 60 * 60 * 24,
    '1w': 60 * 60 * 24 * 7,
    '1m': 60 * 60 * 24 * 30,
  };

  return new Date().getTime() / 1000 - timeRangeMap[timeAgo];
}

// 将时间戳转换成日期格式
export function formatTime(time, fmt = 'yyyy-MM-dd hh:mm:ss') {
  if (!time) return '';
  let date = time;
  if (typeof time === 'number') {
    date = new Date(time);
  } else if (typeof time === 'string') {
    date = new Date(+time);
  }
  var o = {
    'y+': date.getFullYear(),
    'M+': date.getMonth() + 1, //月份
    'd+': date.getDate(), //日
    'h+': date.getHours(), //小时
    'm+': date.getMinutes(), //分
    's+': date.getSeconds(), //秒
    'q+': Math.floor((date.getMonth() + 3) / 3), //季度
    'S+': date.getMilliseconds(), //毫秒
  };
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      if (k === 'y+') {
        fmt = fmt.replace(RegExp.$1, ('' + o[k]).substr(4 - RegExp.$1.length));
      } else if (k === 'S+') {
        var lens = RegExp.$1.length;
        lens = lens === 1 ? 3 : lens;
        fmt = fmt.replace(
          RegExp.$1,
          ('00' + o[k]).substr(('' + o[k]).length - 1, lens),
        );
      } else {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1
            ? o[k]
            : ('00' + o[k]).substr(('' + o[k]).length),
        );
      }
    }
  }
  return fmt;
}

// class 操作
export function hasClass(elements, cName) {
  return !!elements.className.match(new RegExp('(\\s|^)' + cName + '(\\s|$)'));
}

export function addClass(elements, cName) {
  if (!hasClass(elements, cName)) {
    elements.className += ' ' + cName;
  }
}

export function removeClass(elements, cName) {
  if (hasClass(elements, cName)) {
    elements.className = elements.className.replace(
      new RegExp('(\\s|^)' + cName + '(\\s|$)'),
      ' ',
    );
  }
}

// 格式校验

const regMap = {
  // 中国
  86: /^[1][0-9]{10}$/,
  84: /^[0-9]{9,11}$/,
  91: /^[0-9]{9,12}$/,
  1: /^[0-9]{9,12}$/,
  default: /^[0-9]{5,30}$/,
};

export function validatePhone(zone, phoneNumber) {
  if (!(zone && phoneNumber)) {
    return false;
  }
  const reg = regMap[zone];
  if (!reg) {
    return regMap.default.test(phoneNumber);
    // return true;
  }
  return reg.test(phoneNumber);
}

export function isValidPhone(phoneNumber) {
  for (let key in regMap) {
    if (regMap[key].test(phoneNumber)) {
      return true;
    }
  }
  return false;
}

const mailReg = /^(\w-*\.*)+@(\w-?)+(\.\w{2,})+$/;
export function validateEmail(email) {
  if (!email) {
    return false;
  }
  return mailReg.test(email);
}

// 加密手机号
export function encodePhone(phone) {
  if (!phone) return;
  return phone.toString().replace(/(\d{3})\d{5}(.*)/, '$1*****$2');
}

/**
 * 从url里获取参数
 * @param {String} name key
 * @param {String} url ?key=1
 */
export function getParameterFromUrl(name) {
  let url = location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// 给大数加上千分号
export function toThousands(num) {
  if (!num) {
    return num;
  }

  if (!parseFloat(num)) {
    return 0;
  }

  let result = '',
    counter = 0;
  num = (num || 0).toString();
  const t = num.split('.');
  const intpart = t[0];
  for (let i = intpart.length - 1; i >= 0; i--) {
    counter++;
    result = intpart.charAt(i) + result;
    if (!(counter % 3) && i != 0) {
      result = ',' + result;
    }
  }

  if (t.length === 1) {
    return result;
  }
  return result + '.' + t[1];
}

// 格式化大小容量
export const formatSize = (value) => {
  return bytes(parseInt(value, 10));
};

// join ClassName
export function jc() {
  return [...arguments].join(' ');
}

export const formatSat = (value, dec = 8) => {
  if (!value) return 0;

  const v = BigNumber(value).div(Math.pow(10, dec));
  const arr = v.toString().split('.');
  if (v.toString().indexOf('e') > -1 || (arr[1] && arr[1].length > dec)) {
    return BigNumber(v).toFixed(dec);
  }
  return v.toString();
};

export const formatTok = (value, dec = 8, str = true) => {
  if (!value) return 0;
  const v = BigNumber(value).multipliedBy(Math.pow(10, dec));
  return str ? v.toFixed(0) : v;
};

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const formatAmount = (value, n = 4) => {
  if (!value) return 0;

  const arr = value.toString().split('.');
  if (value.toString().indexOf('e') > -1 || (arr[1] && arr[1].length > n)) {
    return BigNumber(value).toFixed(n);
  }
  if (typeof value === 'object') return value.toFixed(n);
  return value;
};

function roundNumber({ value, round }) {
  if (!value) {
    return 0;
  }
  const roundTimes = Math.pow(10, round);
  return Math.round(value * roundTimes) / roundTimes;
}

function roundCoinPrice({ value, round = 2 }) {
  if (!value) {
    return 0;
  }
  if (value < 1) {
    round = 4;
  }
  if (value < 0.001) {
    round = 6;
  }
  if (value < 0.00001) {
    round = 8;
  }
  return roundNumber({ value, round });
}

export const formatNumberForDisplay = ({
  value,
  prefix,
  suffix,
  round = 2,
  padRight,
  useAbbr,
}) => {
  if (!value) {
    return 0;
  }

  const numberValue = Number(value);

  if (numberValue < 0.00001) {
    return value;
  }

  const valueOption = { value: numberValue };

  if (useAbbr) {
    if (value > Math.pow(10, 3)) {
      valueOption.value = value / Math.pow(10, 3);
      valueOption.valueSuffix = 'k';
    }
    if (value > Math.pow(10, 6)) {
      valueOption.value = value / Math.pow(10, 6);
      valueOption.valueSuffix = 'm';
    }
    if (value > Math.pow(10, 9)) {
      valueOption.value = value / Math.pow(10, 9);
      valueOption.valueSuffix = 'bn';
    }
    if (value > Math.pow(10, 12)) {
      valueOption.value = value / Math.pow(10, 12);
      valueOption.valueSuffix = 'tn';
    }
  }

  const suffixes = [
    valueOption.valueSuffix,
    suffix ? ` ${suffix}` : undefined,
  ].filter(Boolean);

  const formatter = format({
    prefix,
    suffix: suffixes.length ? suffixes.join('') : undefined,
    truncate: 20,
    padRight,
  });

  return valueOption.value <= Math.pow(10, 18)
    ? formatter(roundCoinPrice({ value: valueOption.value, round }))
    : '∞';
};

export function strAbbreviation(str, arr = [7, 5]) {
  if (!str) return;
  if (str.length < arr[0] + arr[1]) return str;
  const pre = str.substr(0, arr[0]);
  const aft = str.substr(-arr[1], arr[1]);
  return pre + '……' + aft;
}

export function isTestNet() {
  const query = querystring.parse(window.location.search);
  //console.log('isTestNet: query.network', query.network)

  if (typeof query.network === 'undefined') {
    const net = window.localStorage.getItem(MVCSWAP_NETWORK) || DEFAULT_NET;
    return net === 'testnet';
  } else {
    return query.network === 'testnet';
  }
}

export function tokenPre() {
  return isTestNet() ? 'tmvc-' : 'mvc-';
}

//获取url中当前交易对名称或id
export function parseUrl(hash) {
  if (!hash) hash = location.hash;
  let [, hash1, hash2, hash3] = hash.split('/');
  // if (hash2) hash2 = hash2.toLocaleLowerCase();
  // if (hash3) hash3 = hash3.toLocaleLowerCase();
  let currentPair;
  if (
    ['swap', 'pool', 'farm'].indexOf(hash1) > -1 &&
    hash.indexOf('pool/add') < 0 &&
    hash.indexOf('pool/remove') < 0 &&
    hash.indexOf('pool/create') < 0
  ) {
    currentPair = hash2 ? decodeURI(hash2) : undefined;
  }

  let type = 'pair';
  if ('farm'.indexOf(hash1) > -1) {
    type = 'farm';
  }

  if (currentPair) {
    window.localStorage.setItem(type === 'farm' ? MVCSWAP_CURRENT_FARM_PAIR : MVCSWAP_CURRENT_PAIR, currentPair);
  }
  
  return currentPair;
}

//获取当前交易对
export function getCurrentPair(type = 'pair') {
  const urlPair = parseUrl();
  let currentPair =
    urlPair ||
    window.localStorage.getItem(
      type === 'farm' ? MVCSWAP_CURRENT_FARM_PAIR : MVCSWAP_CURRENT_PAIR,
    ) ||
    DEFAULT_PAIR;
  return currentPair;
}

//手续费多预留100000的余额判断
export function LeastFee(txFee, balance) {
  let needLeastAmount = BigNumber(txFee).plus(100000).div(Math.pow(10, 8));
  log(
    'txFee:',
    txFee,
    BigNumber(txFee).plus(100000).div(Math.pow(10, 8)).toString(),
    'balance:',
    balance,
  );
  if (needLeastAmount.isGreaterThan(balance)) {
    return {
      code: 1,
      msg: `${_('need_token')} ${needLeastAmount.toString()}MVC, ${_(
        'you_have',
      )} ${balance}`,
    };
  }
  return {
    code: 0,
  };
}

//是否是本地环境，url中包含参数env=local
function isLocalEnvFun() {
  const query = querystring.parse(location.search);
  return query.env === 'local';
}
export const isLocalEnv = isLocalEnvFun();

//展示剩余时间
export function leftTime(time) {
  // 现在时间
  // var now= new Date();
  //截止时间
  // var until= new Date(endTime);
  // 计算时会发生隐式转换，调用valueOf()方法，转化成时间戳的形式
  // var days = (until- now)/1000/3600/24;
  const days = time / 1000 / 3600 / 24;
  // 下面都是简单的数学计算
  const day = Math.floor(days);
  const hours = (days - day) * 24;
  const hour = Math.floor(hours);
  const minutes = (hours - hour) * 60;
  const minute = Math.floor(minutes);
  const seconds = (minutes - minute) * 60;
  const second = Math.floor(seconds);
  // var back = '剩余时间：'+day+'天'+hour+'小时'+minute+'分钟'+second+'秒';
  let leftTimeArr = [];
  if (day > 0) {
    leftTimeArr.push(`${day} ${day > 1 ? _('days') : _('day')}`);
  }
  if (hour > 0) {
    leftTimeArr.push(`${hour} ${hour > 1 ? _('hours') : _('hour')}`);
  }
  if (minute > 0) {
    leftTimeArr.push(`${minute} ${minute > 1 ? _('minutes') : _('minute')}`);
  }
  if (second > 0) {
    leftTimeArr.push(`${second} ${second > 1 ? _('seconds') : _('second')}`);
  }
  if (leftTimeArr.length > 2) {
    leftTimeArr.length = 2;
  }
  console.log(leftTimeArr);
  return leftTimeArr.join(' ');
}

export const formatRate = (data, dec = 2) => {
  if (!data) return 0;
  return (data * 100).toFixed(dec) + '%';
};

export function calcYield(rewardAmountPerSecond, decimal, token_price, _total) {
  const reword_amount = formatSat(rewardAmountPerSecond, decimal);

  // console.log('token_price:', token_price)
  let _yield = BigNumber(reword_amount)
    .multipliedBy(86400)
    .multipliedBy(365)
    .multipliedBy(token_price)
    .div(_total)
    .multipliedBy(100);

  return formatAmount(_yield, 2);
}
