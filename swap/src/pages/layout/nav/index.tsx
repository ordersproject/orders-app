'use strict'
import React, { Component } from 'react'
import { jc } from '../../../common/utils'
import styles from './index.less'
import _ from 'i18n'
import { Link } from 'react-router-dom'

const menu = [
  {
    key: 'swap',
    label: _('swap'),
    path: 'swap',
  },
  {
    key: 'pool',
    label: _('pool'),
    path: 'pool/add',
  },
  //{
  //  key: ['stake', 'vote'],
  //  children: <StakeSubmenu />,
  //},
  {
    key: 'stake',
    label: _('stake'),
    path: 'stake',
  },
  {
    key: 'farm',
    label: _('farm'),
    path: 'farm',
  },
  // {
  //     key: 'explore',
  //     label: _('explore')
  // },
]
export default class Head extends Component {
  constructor(props) {
    super(props)
    let hash = window.location.hash.substr(2)
    if (hash.indexOf('/') > -1) {
      hash = hash.split('/')[0]
    }

    let currentMenu = ''
    menu.forEach((item) => {
      if (item.key.indexOf(hash) > -1) {
        currentMenu = hash
      }
    })
    this.state = {
      currentMenu,
    }
  }

  gotoPage = (anchor) => {
    // history.push(`/${anchor}`)
  }

  render() {
    const { currentMenu } = this.state
    return (
      <div className={styles.nav_container}>
        <Link to="/" className={styles.logo}>
          <img
            src={'https://icons.mvcswap.com/resources/ms-black.png'}
            style={{ height: 50 }}
          />
        </Link>
        <div className={styles.menu}>
          {menu.map((item) => {
            let cls = jc(styles.menu_item, styles[`menu_item_${item.key}`])
            if (currentMenu && item.key.indexOf(currentMenu) > -1) {
              cls = jc(
                styles.menu_item,
                styles.menu_item_selected,
                styles[`menu_item_${item.key}`]
              )
            }
            if (item.children) {
              return (
                <span
                  className={cls}
                  key={item.key}
                  onClick={() => this.gotoPage(item.path)}
                >
                  {item.children}
                </span>
              )
            }
            return (
              <span
                className={cls}
                onClick={() => this.gotoPage(item.path)}
                key={item.key}
              >
                {item.label}
              </span>
            )
          })}
        </div>
      </div>
    )
  }
}
