'use strict';
import { connect } from 'umi';
import React, { Component } from 'react';
import CustomIcon from 'components/icon';
import { MVCSWAP_DARKMODE } from 'common/const';
import styles from './index.less';

@connect(({ user }) => {
  return {
    ...user,
  };
})
export default class DarkMode extends Component {
  changeMode() {
    const key = this.props.darkMode === 'moon' ? 'sun' : 'moon';
    // console.log(this.props.darkMode, key);
    this.props.dispatch({
      type: 'user/save',
      payload: {
        darkMode: key,
      },
    });
    window.localStorage.setItem(MVCSWAP_DARKMODE, key);
    // window.location.reload();
  }

  render() {
    return (
      <div
        style={this.props.style}
        className={styles.mode}
        onClick={this.changeMode.bind(this)}
      >
        <CustomIcon
          type={this.props.darkMode === 'moon' ? 'iconsun' : 'iconmoon'}
        />
      </div>
    );
  }
}
