'use strict';
import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import styles from './index.less';

export default function PageLoading() {
  return (
    <div className={styles.loading_container}>
      <Spin
        size="large"
        indicator={
          <LoadingOutlined type="loading" style={{ fontSize: 40 }} spin />
        }
      />
    </div>
  );
}
