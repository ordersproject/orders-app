'use strict';
import React, { Component } from 'react';
import { connect } from 'umi';
import Cookie from 'js-cookie';
import langs from 'i18n/langs';
import styles from './index.less';

// 获取当前页面的域名
const cookieDomain =
  '.' +
  document.domain
    .split('.')
    .slice(document.domain.split('.').length - 2)
    .join('.');

// 语言选择保存在cookie中
/*let currentLang = Cookie.get('lang') || navigator.language;
if (currentLang) currentLang = currentLang.toLowerCase();
// let currentLang = window.localStorage.getItem(LOCAL_NAME.LANG);
let langMatch = false;
for (let item of langs) {
  if (item.name === currentLang) {
    langMatch = true;
    break;
  }
}

// default en
if (!langMatch) {
  currentLang = 'en-us';
}*/
const currentLang = 'en-us'

// 生成语言选择的下拉菜单
let currentLangLabel;
langs.forEach((item) => {
  if (item.name !== currentLang) {
    currentLangLabel = item.label;
  }
});

@connect(({ user }) => {
  return {
    ...user,
  };
})
export default class Lang extends Component {
  changeLang() {
    const key = currentLang === 'zh-cn' ? 'en-us' : 'zh-cn';
    this.props.dispatch({
      type: 'user/save',
      payload: {
        lang: key,
      },
    });
    Cookie.remove('lang');
    Cookie.set('lang', key);
    // window.localStorage.setItem(LOCAL_NAME.LANG, key);
    window.location.reload();
  }

  render() {
    return (
      <div
        style={this.props.style}
        className={styles.lang}
        onClick={this.changeLang.bind(this)}
      >
        {currentLangLabel}
      </div>
    );
  }
}
