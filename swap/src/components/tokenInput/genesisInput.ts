'use strict';
import React, { Component } from 'react';
import { Input, Form, message } from 'antd';
import { jc } from 'common/utils';
import TokenLogo from 'components/tokenicon';
import styles from './genesis.less';
import _ from 'i18n';

const FormItem = Form.Item;
const MVC = {
  symbol: 'MVC',
  name: 'MVC',
};

export default class GenesisTokenInput extends Component {
  // constructor(props) {
  //     super(props);
  //     this.state = {
  //         token: props.initValue || undefined
  //     }
  // }

  changeValue = async (e, supportMvc) => {
    const { value } = e.target;
    const { dispatch, change } = this.props;
    let token = undefined;
    const isMvc = supportMvc && value.toUpperCase() === 'SPACE';

    if (isMvc) {
      token = MVC;
    } else {
      if (e.target.value.toUpperCase() === 'SPACE') return;

      if (value.length !== 72) return message.error('Illegal SensibleId');

      const res = await dispatch({
        type: 'custom/query',
        payload: {
          genesisHash: value,
        },
      });

      if (res && !res.code) {
        token = res;
      } else {
        message.error(res.msg);
      }
    }
    // console.log(token)
    // this.setState({
    //     token
    // })
    change(token);
  };

  render() {
    // const { token } = this.state;
    const { title, name, supportMvc = false, token, tips } = this.props;
    return (
      <div>
        <div className={styles.title}>{title}</div>
        {tips && <div className={styles.tips}>{tips}</div>}
        <div
          className={
            token
              ? jc(styles.input_wrap, styles.input_result)
              : styles.input_wrap
          }
        >
          <FormItem name={name}>
            <Input.TextArea
              className={styles.input}
              onChange={(e) => this.changeValue(e, supportMvc)}
            />
          </FormItem>

          {token && (
            <div className={styles.token_info}>
              <TokenLogo
                name={token.symbol}
                genesisID={token.symbol === 'MVC' ? 'mvc' : token.genesis}
              />
              <div className={styles.token_name}>
                <div className={styles.symbol}>{token.symbol}</div>
                <div className={styles.full_name}>{token.name}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
