'use strict';
import React, { Component } from 'react';
import Clipboard from 'react-clipboard.js';
import { message } from 'antd';
import _ from 'i18n';
import styles from './index.less';

export default class CustomClipboard extends Component {
  onCopySuccess() {
    message.success(_('copied'));
  }

  render() {
    const { children, className, style } = this.props;
    return (
      <Clipboard
        component="span"
        onSuccess={::this.onCopySuccess}
        data-clipboard-text={this.props.text}
        className={
          className ? [styles.clipboard, className].join(' ') : styles.clipboard
        }
        style={style}
      >
        {children}
      </Clipboard>
    );
  }
}
