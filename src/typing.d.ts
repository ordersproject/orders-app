declare module 'echarts' {
  const echarts: any
  export default echarts
}

declare module 'echarts/charts' {
  const BarChart: any
  const LineChart: any
  export { BarChart, LineChart }
}

declare module 'lightweight-charts' {
  export { createChart }
}
