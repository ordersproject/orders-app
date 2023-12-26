'use strict'
import React from 'react'
import './iconfont.js'
import styles from './index.less'

export default function Icon(props) {
  return (
    <svg className="iconfont" aria-hidden="true" style={props.style}>
      <use xlinkHref={`#${props.type}`}></use>
    </svg>
  )
}
