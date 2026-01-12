'use client';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  type ChartData,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { ChartDSL, DatasetConfig } from './types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
);

interface ChartRendererProps {
  dsl: ChartDSL;
  className?: string;
}

type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'polarArea' | 'radar' | 'bubble' | 'scatter';

export function ChartRenderer({ dsl, className }: ChartRendererProps) {
  const { type, title, description, options, data, fieldMapping, isCombinationChart } = dsl;

  // 处理数组格式的数据
  const processData = (): ChartData => {
    // 提取标签
    const labels = [...new Set(data.map((item: any) => item[fieldMapping.labelField]))];

    // 处理数据集
    const datasets = fieldMapping.datasets.map((datasetConfig: any) => {
      // 基础数据集属性
      const baseDataset: any = {
        label: datasetConfig.label,
        backgroundColor: datasetConfig.backgroundColor,
        borderColor: datasetConfig.borderColor,
        borderWidth: datasetConfig.borderWidth || 1,
      };

      // 为组合图表添加特定属性
      if (isCombinationChart) {
        // 设置数据集的图表类型
        baseDataset.type = datasetConfig.chartType || type;

        // 设置Y轴ID（如果指定）
        if (datasetConfig.yAxisID) {
          baseDataset.yAxisID = datasetConfig.yAxisID;
        }
      }

      // 如果有分组字段，则按分组处理数据
      if (datasetConfig.groupField) {
        // 获取该分组的所有数据
        const groupData = data.filter((item: any) => item[datasetConfig.groupField as string] === datasetConfig.label);

        // 确保按照labels的顺序排列数据
        baseDataset.data = labels.map((label) => {
          const matchingItem = groupData.find((item: any) => item[fieldMapping.labelField] === label);
          return matchingItem ? matchingItem[datasetConfig.valueField] : 0;
        });
      }
      // 否则直接使用valueField
      else {
        baseDataset.data = data.map((item: any) => item[datasetConfig.valueField]);
      }

      // 添加图表类型特定的属性
      // 对于组合图表，使用数据集自己的图表类型；否则使用主图表类型
      const chartTypeToUse = isCombinationChart ? datasetConfig.chartType || type : type;
      return addTypeSpecificProperties(baseDataset, chartTypeToUse, datasetConfig);
    });

    return {
      labels,
      datasets,
    };
  };

  // 添加图表类型特定的属性
  const addTypeSpecificProperties = (baseDataset: any, chartType: ChartType, config: DatasetConfig) => {
    switch (chartType) {
      case 'line':
        return {
          ...baseDataset,
          tension: config.tension || 0.4,
          fill: config.fill || false,
          pointBackgroundColor: config.pointBackgroundColor || config.borderColor,
          pointBorderColor: config.pointBorderColor || '#fff',
          pointRadius: config.pointRadius || 4,
        };
      case 'bar':
        return {
          ...baseDataset,
          borderRadius: config.borderRadius || 4,
          hoverBackgroundColor: config.hoverBackgroundColor || config.backgroundColor,
        };
      case 'pie':
      case 'doughnut':
      case 'polarArea':
        return {
          ...baseDataset,
          hoverOffset: config.hoverOffset || 4,
        };
      case 'radar':
        return {
          ...baseDataset,
          pointBackgroundColor: config.pointBackgroundColor || config.borderColor,
          pointBorderColor: config.pointBorderColor || '#fff',
          pointRadius: config.pointRadius || 3,
        };
      case 'bubble':
        return {
          ...baseDataset,
          // Bubble chart requires r value in data
        };
      case 'scatter':
        return {
          ...baseDataset,
          pointBackgroundColor: config.pointBackgroundColor || config.backgroundColor,
          pointBorderColor: config.pointBorderColor || config.borderColor,
          pointRadius: config.pointRadius || 4,
        };
      default:
        return baseDataset;
    }
  };

  // 获取处理后的数据
  const processedData = processData();

  // 默认的响应式图表选项
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        titleFont: {
          size: 13,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        padding: 10,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
      },
    },
    layout: {
      padding: 5,
    },
  };

  // 合并用户提供的选项和默认选项
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  // 渲染图表
  const renderChart = () => {
    // 对于组合图表，我们使用通用的Chart组件
    if (isCombinationChart) {
      return <Chart type={type} data={processedData} options={mergedOptions} />;
    }

    // 对于非组合图表，我们使用特定的图表组件
    // 但由于我们已经注册了所有必要的组件，我们也可以使用通用的Chart组件
    return <Chart type={type} data={processedData} options={mergedOptions} />;
  };

  return (
    <Card className={cn('w-full h-full overflow-hidden', className)}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="flex h-[calc(100%-60px)] w-full items-center justify-center p-4">
        <div className="relative flex size-full items-center justify-center">{renderChart()}</div>
      </CardContent>
    </Card>
  );
}
