import { useEffect, useState, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { Select, Button, Spin, Switch, InputNumber } from '@douyinfe/semi-ui';
import { dashboard, bitable, DashboardState } from '@lark-base-open/js-sdk';
import { useTranslation } from 'react-i18next';
import { useTheme } from './hooks';
import './App.scss';

interface IHeatmapConfig {
  tableId: string;
  xFieldId: string;
  yFieldId: string;
  valueFieldId: string;
  aggregate: 'count' | 'sum' | 'average';
  colorRange: [string, string];
  axisLabelFontSize: number;
  showLabel: boolean;
  labelFontSize: number;
  valueFormat: 'raw' | 'percent';
  displayValueFieldId?: string;
  displayAggregate?: 'count' | 'sum' | 'average';
  threshold: number;
  colorMode: 'absolute' | 'xProportion';
  // 新增过滤配置
  filterYEnabled: boolean;
  filterYThreshold: number;
  filterXEnabled: boolean;
  filterXThreshold: number;
}

const defaultConfig: IHeatmapConfig = {
  tableId: '',
  xFieldId: '',
  yFieldId: '',
  valueFieldId: '',
  aggregate: 'count',
  colorRange: ['#d6d9ef', '#313695'],
  axisLabelFontSize: 13,
  showLabel: false,
  labelFontSize: 10,
  valueFormat: 'raw',
  displayValueFieldId: undefined,
  displayAggregate: 'sum',
  threshold: 0.8,
  colorMode: 'absolute',
  filterYEnabled: false,
  filterYThreshold: 0,
  filterXEnabled: false,
  filterXThreshold: 0,
};

const Item: React.FC<{ label?: string; children?: React.ReactNode }> = ({ label, children }) => {
  const [labelColor, setLabelColor] = useState('#1F2329');

  useEffect(() => {
    const updateColor = () => {
      const theme = document.body.getAttribute('theme-mode');
      setLabelColor(theme === 'dark' ? '#E8E8E8' : '#1F2329');
    };
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.body, { attributes: true, attributeFilter: ['theme-mode'] });
    return () => observer.disconnect();
  }, []);

  if (!children && !label) return null;
  return (
    <div className="form-item">
      {label ? <div className="label" style={{ color: labelColor }}>{label}</div> : null}
      {children ? <div>{children}</div> : null}
    </div>
  );
};

function HeatmapChart({ options, height }: { options: echarts.EChartsOption; height: number }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  useEffect(() => {
    if (!chartInstance.current) return;
    const observer = new MutationObserver(() => {
      const theme = document.body.getAttribute('theme-mode');
      const bgColor = theme === 'dark' ? '#1A1A1A' : '#ffffff';
      chartInstance.current?.setOption({ backgroundColor: bgColor });
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['theme-mode'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    const resizeObserver = new ResizeObserver(() => chartInstance.current?.resize());
    resizeObserver.observe(chartRef.current);
    return () => {
      chartInstance.current?.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !options) return;
    chartInstance.current.setOption(options, { notMerge: true });
  }, [options]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: `${height}px`,
        minHeight: '400px',
        backgroundColor: '#B2C4D0',
      }}
    />
  );
}

function ConfigPanel({
  config,
  setConfig,
  tableList,
  fieldList,
  onSave,
}: {
  config: IHeatmapConfig;
  setConfig: (cfg: IHeatmapConfig) => void;
  tableList: any[];
  fieldList: any[];
  onSave: () => void;
}) {
  const { t } = useTranslation();

  const fontSizeOptions = [10, 11, 12, 13, 14, 16].map(size => ({
    label: `${size}px`,
    value: size,
  }));

  const labelFontSizeOptions = [8, 9, 10, 11, 12, 14, 16].map(size => ({
    label: `${size}px`,
    value: size,
  }));

  const numberFields = fieldList.filter((f: any) => {
    const nonNumericTypes = [1, 3, 4, 5, 7, 13, 15, 17, 18, 21, 22, 23, 25];
    const actualType = f.proxyType ?? f.type;
    console.log(`字段: ${f.name}, type: ${f.type}, proxyType: ${f.proxyType}`);
    return !nonNumericTypes.includes(actualType);
  });

  return (
    <div className="config-panel">
      <div className="form">
        {/* 原有配置项保持不变 */}
        <Item label="选择表格">
          <Select
            value={config.tableId}
            onChange={(v) => setConfig({ ...config, tableId: v as string, xFieldId: '', yFieldId: '', valueFieldId: '', displayValueFieldId: undefined })}
            optionList={tableList.map((t) => ({ label: t.name, value: t.id }))}
            style={{ width: '100%' }}
          />
        </Item>
        <Item label="行字段 (Y轴)">
          <Select
            value={config.yFieldId}
            onChange={(v) => setConfig({ ...config, yFieldId: v as string })}
            optionList={fieldList.map((f) => ({ label: f.name, value: f.id }))}
            style={{ width: '100%' }}
          />
        </Item>
        <Item label="列字段 (X轴)">
          <Select
            value={config.xFieldId}
            onChange={(v) => setConfig({ ...config, xFieldId: v as string })}
            optionList={fieldList.map((f) => ({ label: f.name, value: f.id }))}
            style={{ width: '100%' }}
          />
        </Item>
        <Item label="数值字段（背景色）">
          <Select
            value={config.valueFieldId}
            onChange={(v) => setConfig({ ...config, valueFieldId: v as string })}
            optionList={numberFields.map((f: any) => ({ label: f.name, value: f.id }))}
            style={{ width: '100%' }}
          />
        </Item>
        <Item label="聚合方式">
          <Select
            value={config.aggregate}
            onChange={(v) => setConfig({ ...config, aggregate: v as IHeatmapConfig['aggregate'] })}
            optionList={[
              { label: '计数', value: 'count' },
              { label: '求和', value: 'sum' },
              { label: '平均值', value: 'average' },
            ]}
            style={{ width: '100%' }}
          />
        </Item>
        <Item label="背景颜色范围">
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="color" value={config.colorRange[0]} onChange={(e) => setConfig({ ...config, colorRange: [e.target.value, config.colorRange[1]] })} />
            <input type="color" value={config.colorRange[1]} onChange={(e) => setConfig({ ...config, colorRange: [config.colorRange[0], e.target.value] })} />
          </div>
        </Item>
        <Item label="背景色模式">
          <Select
            value={config.colorMode}
            onChange={(v) => setConfig({ ...config, colorMode: v as IHeatmapConfig['colorMode'] })}
            optionList={[
              { label: '绝对值', value: 'absolute' },
              { label: '横轴比例', value: 'xProportion' },
            ]}
            style={{ width: '100%' }}
          />
        </Item>
        <Item label="坐标轴字体大小">
          <Select
            value={config.axisLabelFontSize}
            onChange={(v) => setConfig({ ...config, axisLabelFontSize: v as number })}
            optionList={fontSizeOptions}
            style={{ width: '100%' }}
          />
        </Item>

        {/* 新增：过滤配置 */}
        <Item label="过滤行 (Y轴)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Switch checked={config.filterYEnabled} onChange={(v) => setConfig({ ...config, filterYEnabled: v })} />
            <span>启用</span>
          </div>
          {config.filterYEnabled && (
            <div style={{ marginTop: 8 }}>
              <span>阈值（仅显示总值大于此值的行）:</span>
              <InputNumber
                value={config.filterYThreshold}
                onChange={(v) => setConfig({ ...config, filterYThreshold: v as number })}
                min={0}
                step={1}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          )}
        </Item>

        <Item label="过滤列 (X轴)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Switch checked={config.filterXEnabled} onChange={(v) => setConfig({ ...config, filterXEnabled: v })} />
            <span>启用</span>
          </div>
          {config.filterXEnabled && (
            <div style={{ marginTop: 8 }}>
              <span>阈值（仅显示总值大于此值的列）:</span>
              <InputNumber
                value={config.filterXThreshold}
                onChange={(v) => setConfig({ ...config, filterXThreshold: v as number })}
                min={0}
                step={1}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          )}
        </Item>

        {/* 原有标签相关配置 */}
        <Item label="显示数值标签">
          <Switch checked={config.showLabel} onChange={(v) => setConfig({ ...config, showLabel: v })} />
        </Item>

        {config.showLabel && (
          <>
            <Item label="标签字体大小">
              <Select
                value={config.labelFontSize}
                onChange={(v) => setConfig({ ...config, labelFontSize: v as number })}
                optionList={labelFontSizeOptions}
                style={{ width: '100%' }}
              />
            </Item>
            <Item label="数值显示格式">
              <Select
                value={config.valueFormat}
                onChange={(v) => setConfig({ ...config, valueFormat: v as 'raw' | 'percent' })}
                optionList={[
                  { label: '原始值', value: 'raw' },
                  { label: '百分比', value: 'percent' },
                ]}
                style={{ width: '100%' }}
              />
            </Item>
            <Item label="显示数值字段（可选）">
              <Select
                value={config.displayValueFieldId}
                onChange={(v) => setConfig({ ...config, displayValueFieldId: v ? String(v) : undefined })}
                optionList={[
                  { label: '与背景字段相同', value: '' },
                  ...numberFields.map((f) => ({ label: f.name, value: f.id })),
                ]}
                style={{ width: '100%' }}
              />
            </Item>
            {config.displayValueFieldId && (
              <>
                <Item label="显示值聚合方式">
                  <Select
                    value={config.displayAggregate}
                    onChange={(v) => setConfig({ ...config, displayAggregate: v as IHeatmapConfig['displayAggregate'] })}
                    optionList={[
                      { label: '计数', value: 'count' },
                      { label: '求和', value: 'sum' },
                      { label: '平均值', value: 'average' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Item>
                <Item label="阈值 (0-1)">
                  <InputNumber
                    value={config.threshold}
                    onChange={(v) => setConfig({ ...config, threshold: v as number })}
                    min={0}
                    max={1}
                    step={0.05}
                    style={{ width: '100%' }}
                  />
                </Item>
              </>
            )}
          </>
        )}
      </div>
      <Button theme="solid" onClick={onSave}>{t('confirm')}</Button>
    </div>
  );
}

export default function App() {
  const { bgColor } = useTheme();
  const [config, setConfig] = useState<IHeatmapConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [tableList, setTableList] = useState<any[]>([]);
  const [fieldList, setFieldList] = useState<any[]>([]);
  const [chartOptions, setChartOptions] = useState<echarts.EChartsOption>({});
  const [chartHeight, setChartHeight] = useState(400);

  const dashboardState = dashboard.state;
  const isConfig = dashboardState === DashboardState.Config || dashboardState === DashboardState.Create;
  const isView = dashboardState === DashboardState.View || dashboardState === DashboardState.FullScreen;

  useEffect(() => {
    if (dashboardState === DashboardState.Create) return;
    dashboard.getConfig().then((res) => {
      if (res.customConfig) {
        setConfig({ ...defaultConfig, ...res.customConfig });
      }
    }).catch(console.error);
  }, [dashboardState]);

  useEffect(() => {
    const off = dashboard.onConfigChange((res) => {
      if (res.data.customConfig) {
        setConfig({ ...defaultConfig, ...res.data.customConfig });
      }
    });
    return () => off();
  }, []);

  useEffect(() => {
    bitable.base.getTableMetaList().then(setTableList).catch(console.error);
  }, []);

  useEffect(() => {
    if (!config.tableId) return;
    bitable.base.getTableById(config.tableId)
      .then((table) => table.getFieldMetaList())
      .then(setFieldList)
      .catch(console.error);
  }, [config.tableId]);

  const getCellString = (cell: any): string => {
    if (cell == null) return '';
    if (typeof cell === 'string') return cell;
    if (typeof cell === 'number') return String(cell);
    if (Array.isArray(cell)) {
      return cell.map((v: any) => (typeof v === 'object' && v.text ? v.text : String(v))).join(',');
    }
    if (typeof cell === 'object' && cell.text) return cell.text;
    return String(cell);
  };

  const fetchData = useCallback(async () => {
    if (!config.tableId || !config.xFieldId || !config.yFieldId || !config.valueFieldId) return;
    setLoading(true);
    try {
      const table = await bitable.base.getTableById(config.tableId);
      const records = await table.getRecords({ pageSize: 5000 });

      const aggMap: Record<string, Record<string, number>> = {};
      const cntMap: Record<string, Record<string, number>> = {};
      const labelAggMap: Record<string, Record<string, number>> = {};
      const labelCntMap: Record<string, Record<string, number>> = {};
      const hasLabelField = config.showLabel && config.displayValueFieldId;

      for (const rec of records.records) {
        const cells = rec.fields;
        const x = getCellString(cells[config.xFieldId]);
        const y = getCellString(cells[config.yFieldId]);
        const val = cells[config.valueFieldId];

        if (!aggMap[x]) aggMap[x] = {};
        if (!aggMap[x][y]) aggMap[x][y] = 0;
        if (!cntMap[x]) cntMap[x] = {};
        if (!cntMap[x][y]) cntMap[x][y] = 0;

        if (config.aggregate === 'count') {
          aggMap[x][y] += 1;
        } else if (config.aggregate === 'sum') {
          aggMap[x][y] += Number(val) || 0;
        }
        cntMap[x][y] += 1;

        if (hasLabelField) {
          const labelVal = cells[config.displayValueFieldId!];
          if (!labelAggMap[x]) labelAggMap[x] = {};
          if (!labelAggMap[x][y]) labelAggMap[x][y] = 0;
          if (!labelCntMap[x]) labelCntMap[x] = {};
          if (!labelCntMap[x][y]) labelCntMap[x][y] = 0;

          const displayAgg = config.displayAggregate || 'sum';
          if (displayAgg === 'count') {
            labelAggMap[x][y] += 1;
          } else if (displayAgg === 'sum') {
            labelAggMap[x][y] += Number(labelVal) || 0;
          }
          labelCntMap[x][y] += 1;
        }
      }

      // ---- 新增：过滤 Y 轴类别 ----
      const yTotalMap: Record<string, number> = {};
      for (const x in aggMap) {
        for (const y in aggMap[x]) {
          const val = aggMap[x][y];
          const finalVal = config.aggregate === 'average'
            ? val / (cntMap[x][y] || 1)
            : val;
          yTotalMap[y] = (yTotalMap[y] || 0) + finalVal;
        }
      }
      let validYCats = Object.keys(yTotalMap);
      if (config.filterYEnabled) {
        validYCats = validYCats.filter(y => yTotalMap[y] > config.filterYThreshold);
      }

      // ---- 新增：过滤 X 轴类别 ----
      const xTotalMap: Record<string, number> = {};
      for (const x in aggMap) {
        for (const y in aggMap[x]) {
          // 只考虑未被过滤掉的 Y 类别
          if (!validYCats.includes(y)) continue;
          const val = aggMap[x][y];
          const finalVal = config.aggregate === 'average'
            ? val / (cntMap[x][y] || 1)
            : val;
          xTotalMap[x] = (xTotalMap[x] || 0) + finalVal;
        }
      }
      let validXCats = Object.keys(xTotalMap);
      if (config.filterXEnabled) {
        validXCats = validXCats.filter(x => xTotalMap[x] > config.filterXThreshold);
      }

      // 如果没有符合条件的类别，显示空数据提示
      if (validXCats.length === 0 || validYCats.length === 0) {
        setChartOptions({
          title: {
            text: '当前过滤条件下无数据',
            left: 'center',
            top: 'center',
          },
          backgroundColor: document.body.getAttribute('theme-mode') === 'dark' ? '#1A1A1A' : '#ffffff',
        });
        setChartHeight(400);
        return;
      }

      // 基于过滤后的类别构建后续数据（排序、渲染）
      const filteredAggMap: Record<string, Record<string, number>> = {};
      const filteredCntMap: Record<string, Record<string, number>> = {};
      validXCats.forEach(x => {
        filteredAggMap[x] = {};
        filteredCntMap[x] = {};
        validYCats.forEach(y => {
          filteredAggMap[x][y] = aggMap[x]?.[y] || 0;
          filteredCntMap[x][y] = cntMap[x]?.[y] || 0;
        });
      });

      // 计算排序权重（沿用原有逻辑，但使用过滤后的数据）
      const xAggValues: Record<string, number> = {};
      const yAggValues: Record<string, number> = {};
      validXCats.forEach(x => {
        let xTotal = 0;
        validYCats.forEach(y => {
          const val = filteredAggMap[x][y];
          const cnt = filteredCntMap[x][y] || 1;
          xTotal += config.aggregate === 'average' ? val : val;
        });
        xAggValues[x] = config.aggregate === 'average' ? xTotal / (validYCats.length || 1) : xTotal;
      });
      validYCats.forEach(y => {
        let yTotal = 0;
        validXCats.forEach(x => {
          yTotal += filteredAggMap[x][y];
        });
        yAggValues[y] = config.aggregate === 'average' ? yTotal / (validXCats.length || 1) : yTotal;
      });

      const xCats = validXCats.sort((a, b) => xAggValues[b] - xAggValues[a]);
      const yCats = validYCats.sort((a, b) => (yAggValues[a] || 0) - (yAggValues[b] || 0));

      // 后续构建图表数据的逻辑基本不变，只需将原 aggMap/cntMap 替换为 filtered 版本，并更新维度数组为 xCats/yCats
      const rowSums: Record<string, number> = {};
      if (config.colorMode === 'xProportion') {
        yCats.forEach(y => {
          let sum = 0;
          xCats.forEach(x => { sum += filteredAggMap[x]?.[y] || 0; });
          rowSums[y] = sum;
        });
      }

      const bgData: [number, number, number][] = [];
      const labelData: [number, number, number][] = [];
      const bgValues: number[] = [];
      const labelValues: number[] = [];
      const cellInfo: {
        xName: string;
        yName: string;
        rawBgValue: number;
        visualBgValue: number;
        labelValue: number;
      }[][] = xCats.map(() => []);

      xCats.forEach((x, xi) => {
        yCats.forEach((y, yi) => {
          let rawValue = filteredAggMap[x]?.[y] || 0;
          if (config.aggregate === 'average') {
            rawValue = rawValue / (filteredCntMap[x]?.[y] || 1);
          }

          let visualValue: number | null = rawValue;
          if (config.colorMode === 'xProportion') {
            const rowSum = rowSums[y] || 1;
            visualValue = rawValue / rowSum;
          }

          const isZero = Math.abs(rawValue) < 1e-9;
          const finalVisual = isZero ? null : visualValue;

          const idx = bgData.length;
          bgData.push([xi, yi, finalVisual as any]);
          if (!isZero) {
            bgValues.push(visualValue as number);
          }

          let labelVal = 0;
          if (hasLabelField) {
            labelVal = labelAggMap[x]?.[y] || 0;
            const displayAgg = config.displayAggregate || 'sum';
            if (displayAgg === 'average') {
              labelVal = labelVal / (labelCntMap[x]?.[y] || 1);
            }
            labelData.push([xi, yi, labelVal]);
            labelValues.push(labelVal);
          }

          cellInfo[xi][yi] = {
            xName: x,
            yName: y,
            rawBgValue: rawValue,
            visualBgValue: visualValue as number,
            labelValue: labelVal,
          };
        });
      });

      const CELL_HEIGHT = 40;
      const CHART_PADDING = 100;
      const calculatedHeight = yCats.length * CELL_HEIGHT + CHART_PADDING;
      setChartHeight(Math.max(calculatedHeight, 600));

      const bgMin = config.colorMode === 'xProportion' ? 0 : Math.min(...bgValues, 0);
      const bgMax = config.colorMode === 'xProportion' ? 1 : Math.max(...bgValues, 1);
      const labelMax = labelValues.length > 0 ? Math.max(...labelValues, 1) : 1;
      const theme = document.body.getAttribute('theme-mode');
      const chartBgColor = theme === 'dark' ? '#1A1A1A' : '#ffffff';

      setChartOptions({
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const dataIndex = params.dataIndex;
            const xi = Math.floor(dataIndex / yCats.length);
            const yi = dataIndex % yCats.length;
            const info = cellInfo[xi]?.[yi];
            if (!info) return '';

            const modeValue = config.colorMode === 'xProportion' ? info.visualBgValue : info.rawBgValue;
            const modeLabel = config.colorMode === 'xProportion' ? '横轴比例' : '绝对值';

            let html = `<b>${info.xName} - ${info.yName}</b><br/>`;
            if (config.colorMode === 'xProportion') {
              html += `${modeLabel}：${(modeValue * 100).toFixed(2)}%<br/>`;
            } else {
              html += `${modeLabel}：${Math.round(modeValue)}<br/>`;
            }
            html += `提及次数：${Math.round(info.rawBgValue)}<br/>`;
            if (hasLabelField) {
              html += `好评率：${(info.labelValue * 100).toFixed(2)}%<br/>`;
            }
            html += `场景：${info.yName}<br/>`;
            html += `功能：${info.xName}`;
            return html;
          },
        },
        grid: {
          left: '15%',
          right: '5%',
          top: 60,
          bottom: 60,
          containLabel: false,
        },
        xAxis: {
          type: 'category',
          data: xCats,
          splitArea: { show: true },
          axisLabel: {
            rotate: 30,
            fontSize: config.axisLabelFontSize,
            interval: 0,
            overflow: 'break',
          },
        },
        yAxis: {
          type: 'category',
          data: yCats,
          splitArea: { show: true },
          axisLabel: {
            fontSize: config.axisLabelFontSize,
          },
        },
        visualMap: {
          min: bgMin,
          max: bgMax,
          calculable: true,
          inRange: { color: config.colorRange },
        },
        series: [
          {
            type: 'heatmap',
            data: bgData,
            label: {
              show: config.showLabel,
              fontSize: config.labelFontSize,
              formatter: config.showLabel
                ? (params: any) => {
                    const idx = params.dataIndex;
                    const bgVal = bgData[idx][2];
                    if (Math.abs(bgVal) < 1e-9) return '';

                    const labelVal = hasLabelField && labelData[idx] ? labelData[idx][2] : bgVal;
                    let displayValue: string;
                    if (config.valueFormat === 'percent') {
                      displayValue = (labelVal * 100).toFixed(2) + '%';
                    } else {
                      displayValue = labelVal.toFixed(2);
                    }

                    const colorSourceVal = hasLabelField && labelData[idx] ? labelData[idx][2] : bgVal;
                    let styleName = 'defaultStyle';
                    if (hasLabelField) {
                      const thresholdValue = labelMax * config.threshold;
                      styleName = colorSourceVal >= thresholdValue ? 'greenStyle' : 'redStyle';
                    }
                    return `{${styleName}|${displayValue}}`;
                  }
                : undefined,
              rich: {
                defaultStyle: { color: '#1F2329' },
                greenStyle: { color: '#159a4c' },
                redStyle: { color: '#e74c3c' },
              },
            },
            itemStyle: {
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#ffffff',
            },
          },
        ],
        backgroundColor: chartBgColor,
      });
    } catch (e) {
      console.error(e);
      alert('数据获取失败：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (isView) fetchData();
  }, [isView, fetchData]);

  const onSave = () => dashboard.saveConfig({ customConfig: config, dataConditions: [] } as any);

  if (dashboardState === DashboardState.Create) {
    return (
      <ConfigPanel
        config={config}
        setConfig={setConfig}
        tableList={tableList}
        fieldList={fieldList}
        onSave={onSave}
      />
    );
  }

  return (
    <main style={{ backgroundColor: bgColor }} className={isConfig ? 'main-config' : 'main'}>
      {isConfig ? (
        <ConfigPanel
          config={config}
          setConfig={setConfig}
          tableList={tableList}
          fieldList={fieldList}
          onSave={onSave}
        />
      ) : (
        <div className="content" style={{ padding: 20 }}>
          <Spin spinning={loading}>
            <HeatmapChart options={chartOptions} height={chartHeight} />
          </Spin>
        </div>
      )}
    </main>
  );
}