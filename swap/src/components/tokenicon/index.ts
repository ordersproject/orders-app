'use strict';
import React from 'react';
import { connect } from 'umi';
import CustomIcon from 'components/icon';
// import { icons } from 'common/config';
import styles from './index.less';

@connect(({ pair }) => {
  return {
    ...pair,
  };
})
export default class TokenIcon extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const { icon, url, size = 40, style } = this.props;

    if (icon) {
      return <CustomIcon type={icon} style={{ fontSize: size, ...style }} />;
    }

    if (url) {
      return (
        <img src={url} style={{ height: size, ...style, borderRadius: 20 }} />
      );
    }

    let { name, genesisID, iconList } = this.props;
    // if (!iconList) {
    //   iconList = icons;
    // }
    const icons_name = iconList ? iconList[genesisID] : '';
    if (icons_name) {
      if (icons_name.type) {
        return (
          <CustomIcon
            type={icons_name.type}
            style={{
              fontSize: size,
              ...style,
              backgroundColor: '#fff',
              borderRadius: '50%',
            }}
          />
        );
      } else if (icons_name.url) {
        return (
          <img
            src={icons_name.url}
            style={{ height: size, ...style, borderRadius: 20 }}
          />
        );
      }
    }

    if (!name) {
      return null;
    }
    if (name) name = name.toLowerCase();
    const letter = name.substr(0, 1).toUpperCase();
    return (
      <div
        className={styles.logo}
        style={{
          fontSize: size * 0.84,
          width: size,
          height: size,
          lineHeight: `${size}px`,
          ...style,
        }}
      >
        {letter}
      </div>
    );
  }
}
