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
}

const defaultConfig: IHeatmapConfig = {
  tableId: '',
  xFieldId: '',
  yFieldId: '',
  valueFieldId: '',
  aggregate: 'count',
  colorRange: ['#ffffff', '#313695'],
  axisLabelFontSize: 13,
  showLabel: false,
  labelFontSize: 10,
  valueFormat: 'raw',
  displayValueFieldId: undefined,
  displayAggregate: 'sum',
  threshold: 0.8,
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

  const numberFields = fieldList.filter((f: any) => f.type === 2);

  return (
    <div className="config-panel">
      <div className="form">
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
            optionList={fieldList.filter((f) => f.type === 2).map((f) => ({ label: f.name, value: f.id }))}
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
            <input
              type="color"
              value={config.colorRange[0]}
              onChange={(e) => setConfig({ ...config, colorRange: [e.target.value, config.colorRange[1]] })}
            />
            <input
              type="color"
              value={config.colorRange[1]}
              onChange={(e) => setConfig({ ...config, colorRange: [config.colorRange[0], e.target.value] })}
            />
          </div>
        </Item>
        <Item label="坐标轴字体大小">
          <Select
            value={config.axisLabelFontSize}
            onChange={(v) => setConfig({ ...config, axisLabelFontSize: v as number })}
            optionList={fontSizeOptions}
            style={{ width: '100%' }}
          />
        </Item>

        <Item label="显示数值标签">
          <Switch
            checked={config.showLabel}
            onChange={(v) => setConfig({ ...config, showLabel: v })}
          />
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
      const hasLabelField = config.showLabel && !!config.displayValueFieldId;

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

      const xCats = Object.keys(aggMap).sort();
      const ySet = new Set<string>();
      xCats.forEach(x => { Object.keys(aggMap[x] || {}).forEach(y => ySet.add(y)); });
      const yCats = Array.from(ySet).sort();

      const bgData: [number, number, number][] = [];
      const labelData: [number, number, number][] = [];
      const bgValues: number[] = [];
      const labelValues: number[] = [];

      xCats.forEach((x, xi) => {
        yCats.forEach((y, yi) => {
          let v = aggMap[x]?.[y] || 0;
          if (config.aggregate === 'average') v = v / (cntMap[x]?.[y] || 1);
          bgData.push([xi, yi, v]);
          bgValues.push(v);

          if (hasLabelField) {
            let lv = labelAggMap[x]?.[y] || 0;
            const displayAgg = config.displayAggregate || 'sum';
            if (displayAgg === 'average') lv = lv / (labelCntMap[x]?.[y] || 1);
            labelData.push([xi, yi, lv]);
            labelValues.push(lv);
          }
        });
      });

      const CELL_HEIGHT = 40;
      const CHART_PADDING = 100;
      const calculatedHeight = yCats.length * CELL_HEIGHT + CHART_PADDING;
      setChartHeight(Math.max(calculatedHeight, 600));

      const bgMin = Math.min(...bgValues, 0);
      const bgMax = Math.max(...bgValues, 1);
      const labelMax = labelValues.length > 0 ? Math.max(...labelValues, 1) : 1;
      const totalSum = labelValues.reduce((a, b) => a + b, 0);

      setChartOptions({
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
                    let displayValue: number;
                    if (hasLabelField && labelData[idx]) {
                      displayValue = labelData[idx][2];
                    } else {
                      displayValue = bgData[idx][2];
                    }

                    let text: string;
                    if (config.valueFormat === 'percent') {
                      const total = hasLabelField
                        ? labelValues.reduce((a, b) => a + b, 0)
                        : bgValues.reduce((a, b) => a + b, 0);
                      if (total === 0) {
                        text = '0.00%';
                      } else {
                        text = ((displayValue / total) * 100).toFixed(2) + '%';
                      }
                    } else {
                      text = displayValue.toFixed(2);
                    }

                    let color = '#1F2329';
                    if (hasLabelField) {
                      const thresholdValue = labelMax * config.threshold;
                      color = displayValue >= thresholdValue ? '#2ecc71' : '#e74c3c';
                    }

                    console.log('hasLabelField:', hasLabelField, 'displayValue:', displayValue, 'labelMax:', labelMax, 'threshold:', config.threshold, 'color:', color);
                    return `<span style="color: ${color};">${text}</span>`;
                  }
                : undefined,
            },
            itemStyle: {
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            },
          },
        ],
        backgroundColor: '#B2C4D0',
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