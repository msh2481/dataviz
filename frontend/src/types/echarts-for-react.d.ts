declare module 'echarts-for-react' {
  import type { FC } from 'react';
  import type { EChartsOption } from 'echarts';

  interface ReactEChartsProps {
    option: EChartsOption;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    className?: string;
    style?: React.CSSProperties;
  }

  const ReactECharts: FC<ReactEChartsProps>;
  export default ReactECharts;
}
