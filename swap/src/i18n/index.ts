'use strict';
import Cookie from 'js-cookie';
import querystring from 'querystringify';
const zh_cn = require('./locales/zh-ch');
const en_us = require('./locales/en-us');

/*const query = querystring.parse(window.location.search);
let _lang = query.lang;
if (_lang) _lang = _lang.toLowerCase();

if (_lang !== 'en-us' && _lang !== 'zh-cn') {
  _lang = Cookie.get('lang') || navigator.language;
}*/

//export const lang = _lang;
export const lang = 'en-us';

const langData = {
  'en-us': en_us,
  'zh-cn': zh_cn,
};
let locale = langData[lang.toLowerCase()];

if (!locale) {
  Cookie.set('lang', 'en-us', {
    domain:
      '.' +
      document.domain
        .split('.')
        .slice(document.domain.split('.').length - 2)
        .join('.'),
  });
  locale = en_us;
}

export default function (key, params) {
  const args = arguments;
  if (!key) {
    return locale;
  }
  const val = locale[key];
  if (!val) {
    return '';
  }
  if (typeof val !== 'string') {
    return val;
  }
  let index = 1;
  if (typeof params === 'object') {
    return val.replace(/\$\{([\w]+)\}/g, (_, name) => {
      return params[name];
    });
  }
  return val.replace(/%s/g, () => {
    return args[index++];
  });
}
