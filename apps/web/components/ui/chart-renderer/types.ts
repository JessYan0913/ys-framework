import type { ChartOptions } from 'chart.js';

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'polarArea' | 'radar' | 'bubble' | 'scatter';

// 数据集配置，增加了chartType字段
export interface DatasetConfig {
  // 数据集标签
  label: string;

  // 用于数据值的字段名
  valueField: string;

  // 可选：用于分组的字段名
  groupField?: string;

  // 可选：该数据集的图表类型，用于组合图表
  // 如果不指定，则使用主图表类型
  chartType?: ChartType;

  // 可选：指定使用哪个Y轴（用于组合图表）
  // 'y'表示主Y轴，'y2'表示第二Y轴
  yAxisID?: string;

  // 样式配置
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth?: number;

  // 其他图表特定的配置
  [key: string]: any;
}

// 字段映射配置
export interface FieldMapping {
  // 用于标签的字段名
  labelField: string;

  // 数据集配置
  datasets: DatasetConfig[];
}

export interface ChartDSL {
  // 主图表类型
  type: ChartType;

  title?: string;
  description?: string;

  // 只支持对象数组作为数据源
  data: any[];

  // 字段映射配置
  fieldMapping: FieldMapping;

  // 是否是组合图表
  isCombinationChart?: boolean;

  options?: ChartOptions<ChartType>;
}
