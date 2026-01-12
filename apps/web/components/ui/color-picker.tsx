import { useEffect, useRef, useState } from 'react';

import { Palette, Pipette, Trash2 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

import { cn } from '@/lib/utils';

import { Button } from './button';
import { Slider } from './slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  showAlpha?: boolean;
}

export function ColorPicker({ value, onChange, colors, showAlpha = false }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState('');
  const [activeTab, setActiveTab] = useState('palette');
  const [alpha, setAlpha] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);

  // 默认颜色选项 - 更现代化的调色板
  const defaultColors = colors || [
    // 基础色
    '#000000',
    '#FFFFFF',
    '#F5F5F5',
    '#D1D5DB',
    '#6B7280',
    '#374151',
    // 红色系
    '#FECACA',
    '#FCA5A5',
    '#F87171',
    '#EF4444',
    '#DC2626',
    '#B91C1C',
    // 橙色系
    '#FED7AA',
    '#FDBA74',
    '#FB923C',
    '#F97316',
    '#EA580C',
    '#C2410C',
    // 黄色系
    '#FEF08A',
    '#FDE047',
    '#FACC15',
    '#EAB308',
    '#CA8A04',
    '#A16207',
    // 绿色系
    '#BBF7D0',
    '#86EFAC',
    '#4ADE80',
    '#22C55E',
    '#16A34A',
    '#15803D',
    // 蓝色系
    '#BFDBFE',
    '#93C5FD',
    '#60A5FA',
    '#3B82F6',
    '#2563EB',
    '#1D4ED8',
    // 紫色系
    '#E9D5FF',
    '#D8B4FE',
    '#C084FC',
    '#A855F7',
    '#9333EA',
    '#7E22CE',
    // 粉色系
    '#FBCFE8',
    '#F9A8D4',
    '#F472B6',
    '#EC4899',
    '#DB2777',
    '#BE185D',
  ];

  // 当值变化时更新自定义颜色输入框和透明度
  useEffect(() => {
    if (value) {
      // 处理可能的rgba值
      if (value.startsWith('rgba')) {
        const matches = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (matches && matches.length === 5) {
          const r = Number.parseInt(matches[1]);
          const g = Number.parseInt(matches[2]);
          const b = Number.parseInt(matches[3]);
          const a = Number.parseFloat(matches[4]);

          setCustomColor(rgbToHex(r, g, b));
          setAlpha(Math.round(a * 100));
        } else {
          setCustomColor(value);
          setAlpha(100);
        }
      } else {
        setCustomColor(value);
        setAlpha(100);
      }
    } else {
      setCustomColor('');
      setAlpha(100);
    }
  }, [value]);

  // RGB转HEX
  const rgbToHex = (r: number, g: number, b: number) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  };

  // HEX转RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null;
  };

  // 处理颜色选择
  const handleColorSelect = (color: string) => {
    if (!color) {
      onChange('');
      return;
    }

    if (showAlpha && alpha < 100) {
      const rgb = hexToRgb(color);
      if (rgb) {
        onChange(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha / 100})`);
      } else {
        onChange(color);
      }
    } else {
      onChange(color);
    }
  };

  // 处理自定义颜色输入变化
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  // 处理键盘按下事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyCustomColor();
    }
  };

  // 应用自定义颜色
  const applyCustomColor = () => {
    if (customColor) {
      handleColorSelect(customColor);
    }
  };

  // 处理透明度变化
  const handleAlphaChange = (newAlpha: number[]) => {
    setAlpha(newAlpha[0]);

    if (customColor) {
      const rgb = hexToRgb(customColor);
      if (rgb) {
        onChange(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${newAlpha[0] / 100})`);
      }
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="palette" className="text-xs">
            <Palette className="mr-1.5 size-3.5" />
            调色板
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            <Pipette className="mr-1.5 size-3.5" />
            自定义
          </TabsTrigger>
        </TabsList>

        <TabsContent value="palette" className="pt-2">
          <div className="grid grid-cols-8 gap-1.5">
            {defaultColors.map((color) => (
              <button
                key={color}
                className={cn(
                  'w-full aspect-square rounded-md border transition-all',
                  color === customColor
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'hover:ring-1 hover:ring-muted-foreground',
                  color === '#FFFFFF'
                    ? "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYlWNgYGCQwoKxgqGgcJA5h3yFAAs8BRWVSwooAAAAAElFTkSuQmCC')] bg-repeat"
                    : '',
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setCustomColor(color);
                  handleColorSelect(color);
                }}
                title={color}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-3 pt-2">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border px-2 py-1 text-sm"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <HexColorPicker
                color={customColor || '#000000'}
                onChange={setCustomColor}
                style={{ width: '100%', height: '140px' }}
              />
            </div>
          </div>

          {showAlpha && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>透明度</span>
                <span>{alpha}%</span>
              </div>
              <Slider value={[alpha]} min={0} max={100} step={1} onValueChange={handleAlphaChange} className="w-full" />
            </div>
          )}

          <div className="flex justify-between pt-1">
            <Button variant="outline" size="sm" onClick={() => handleColorSelect('')} className="h-8 text-xs">
              <Trash2 className="mr-1.5 size-3.5" />
              清除
            </Button>
            <Button size="sm" onClick={applyCustomColor} className="h-8 text-xs">
              应用
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
