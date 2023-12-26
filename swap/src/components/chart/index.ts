'use strict';
import React, { Component } from 'react';
import 'whatwg-fetch';
import * as echarts from 'echarts';
import BigNumber from 'bignumber.js';
import { connect } from 'umi';
import { Spin } from 'antd';
import { formatNumberForDisplay, formatAmount } from 'common/utils';
import EventBus from 'common/eventBus';
import { StableToken, COLOR1, COLOR2 } from 'common/const';
import TimeRangeTabs from './timeRangeTabs';
import styles from './index.less';
import _ from 'i18n';

const dateInterval = {
  '1m': 3600 * 24 * 1000 * 30,
  '1w': 3600 * 24 * 1000 * 7,
  '1d': 3600 * 24 * 1000,
  all: 2,
};

@connect(({ pair, records, farm, loading }) => {
  const { effects } = loading;
  return {
    ...pair,
    ...records,
    ...farm,
    loading: effects['pair/getAllPairs'] || effects['records/query'],
  };
})
export default class Chart extends Component {
  constructor(props) {
    super(props);
    const { currentPair, tokenPrices, allPairs } = props;
    this.state = {
      chart_index: 0,
      cur_price: '',
      cur_amount: '',
      chartData: [],
    };
    this.option = {
      grid: {
        top: 10,
        bottom: 30,
        left: 0,
        right: 0,
      },
      xAxis: {
        type: 'time',
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        // axisLabel: {
        //   formatter: function(value, index) {
        //     return value.substr(8, 2)
        //   }
        // }
      },
      yAxis: [
        {
          type: 'value',
          show: false,
          min: (v) => v.min * 0.5,
          max: (v) => v.max * 1.5,
        },
        {
          type: 'value',
          show: false,
          max: (v) => v.max * 2,
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          start: 0,
          end: 100,
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'none',
        },
        className: styles.tooltip,
        renderMode: 'html',
        formatter: function (params) {
          // console.log('params',params)
          const lines = [{ label: _('date'), value: params[0].value[0] }];

          const token1 = allPairs[currentPair].token1.symbol.toUpperCase();
          const token2 = allPairs[currentPair].token2.symbol.toUpperCase();
          const currentPairSymbol = `${token1}-${token2}`;
          if (props.type === 'pool') {
            lines.push({
              label: 'TVL',
              value: formatNumberForDisplay({
                value: params[0].value[1],
                suffix: token1,
              }),
            });
          } else {
            lines.push({
              label: _('volume'),
              value: formatNumberForDisplay({
                value: params[1].value[1],
                suffix: token1,
              }),
            });
            lines.push({
              label: _('price'),
              value: formatNumberForDisplay({
                value: params[0].value[1],
                suffix:
                  StableToken.indexOf(token2) > -1
                    ? token2
                    : `${token1} ${
                        token1 === 'MVC'
                          ? `($${formatAmount(
                              BigNumber(params[0].value[1]).multipliedBy(
                                tokenPrices.MVC,
                              ),
                              4,
                            )})`
                          : ''
                      }`,
              }),
            });
          }
          return lines
            .map((line) => `<span>${line.label}</span> ${line.value}`)
            .join('<br />');
        },
      },
      series: [
        {
          data: [],
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: COLOR1,
            width: 2,
          },
          itemStyle: {
            color: COLOR1,
          },
          emphasis: {
            lineStyle: {
              color: COLOR1,
              width: 2,
            },
          },
          yAxisIndex: 0,
        },
        {
          data: [],
          type: props.type === 'pool' ? 'line' : 'bar',
          showSymbol: false,
          lineStyle: {
            color: COLOR2,
            width: props.type === 'pool' ? 2 : 1,
          },
          itemStyle: {
            color: COLOR2,
          },
          emphasis: {
            lineStyle: {
              color: COLOR2,
              width: props.type === 'pool' ? 2 : 1,
            },
          },
          yAxisIndex: 1,
        },
      ],
    };
    this.polling = true;
  }

  componentDidMount() {
    this._isMounted = true;
    this.init();
  }

  async init() {
    const chartDom = document.getElementById('J_Chart');
    this.myChart = echarts.init(chartDom);
    EventBus.on('reloadChart', (type) => this.handleData(type));
  }

  handleData = async (type) => {
    if (type !== this.props.type || !this._isMounted) return;
    const chartData = await this.getChartData(type);
    // console.log('chartData:', chartData)
    if (chartData.length > 0) {
      if (type === 'pool') {
        this.option.series[0].data = chartData.map((d) => ({
          name: d.timestamp,
          value: [d.formattedTime, d.amount],
        }));
      } else {
        // console.log(chartData.map((d) => (
        //   d.formattedTime
        // )))
        this.option.xAxis.data = chartData.map((d) => d.formattedTime);
        this.option.series[0].data = chartData.map((d) => ({
          name: d.timestamp,
          value: [d.formattedTime, d.price],
        }));
        // console.log(this.props.timeRange, dateInterval[this.props.timeRange]);
        this.option.xAxis.minInterval = dateInterval['1m'];
        this.option.series[1].data = chartData.map((d) => ({
          name: d.timestamp,
          value: [d.formattedTime, d.volumn],
        }));
        // console.log('this.option.series[1].data:', this.option.series[1].data);
      }
    } else {
      this.option.series[0].data = [];
    }

    // this.myChart.clear();
    // this.myChart.setOption(this.option);
    // console.log(this.option)
    setTimeout(() => {
      this.myChart.setOption(this.option);
      this.setState({
        chartData,
      });
    }, 500);
  };

  async getChartData(type) {
    const { dispatch } = this.props;
    const res = await dispatch({
      type: 'records/query',
      payload: {
        type,
      },
    });

    if (res.msg) {
      message.error(res.msg);
      return [];
    }
    return res;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.myChart.dispose();
  }

  render() {
    const { loading, type } = this.props;
    const { chartData } = this.state;
    return (
      <Spin spinning={chartData.length < 1 && loading}>
        <div id="J_Chart" className={styles.chart}></div>

        <div className={styles.time_picker_bottom}>
          <TimeRangeTabs type={type} />
        </div>
      </Spin>
    );
  }
}
