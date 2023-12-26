'use strict';
import React, { Component } from 'react';
import { Select } from 'antd';
import EventBus from 'common/eventBus';
import { connect } from 'umi';
import styles from './index.less';
import _ from 'i18n';

const { Option } = Select;

const timeRangeOptions = [
  // { label: '4H', value: '4h' },
  { label: 'D', value: '1d' },
  { label: 'W', value: '1w' },
  { label: 'M', value: '1m' },
  { label: 'ALL', value: 'all' },
];

@connect(({ records }) => {
  return {
    ...records,
  };
})
export default class TimeRangeTabs extends Component {
  changeTimeRange = async (timeRange) => {
    const { dispatch, type } = this.props;
    await dispatch({
      type: 'records/save',
      payload: {
        timeRange,
      },
    });
    EventBus.emit('reloadChart', type);
  };

  render() {
    const { timeRange } = this.props;

    return (
      <div className={styles.time_range_picker}>
        <Select
          defaultValue={timeRange}
          onChange={this.changeTimeRange}
          getPopupContainer={() => document.getElementById('J_Page')}
          style={{ width: 85, borderWidth: 0, borderRadius: 100, height: 35 }}
        >
          {timeRangeOptions.map(({ label, value }) => (
            <Option key={value} value={value}>
              {label}
            </Option>
          ))}
        </Select>
        {/*timeRangeOptions.map(({ label, value }) => (
          <div
            key={value}
            className={timeRange === value ? styles.active : ''}
            onClick={() => this.changeTimeRange(value)}
          >
            {label}
          </div>
        ))*/}
      </div>
    );
  }
}
