'use strict';
import { connect } from 'umi';
import React, { Component } from 'react';
import styles from './index.less';

@connect(({ user }) => {
  return {
    ...user,
  };
})
export default class Home extends Component {
  render() {
    return (
      <div className={styles.root}>
        <div
          className={this.props.darkMode === 'moon' ? styles.darkMode : null}
          id="J_Page"
        >
          {this.props.children}
        </div>
      </div>
    );
  }
}
