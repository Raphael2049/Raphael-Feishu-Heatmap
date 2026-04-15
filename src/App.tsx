import { useEffect, useState, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { Select, Button, Spin } from '@douyinfe/semi-ui';
import { dashboard, bitable, DashboardState } from '@lark-base-open/js-sdk';
import { useTranslation } from 'react-i18next';
import { useTheme } from './hooks';
import './App.scss';

// ---------- 类型定义 ----------
interface IHeatmapConfig {
  tableId: string;
  xFieldId: string;
  yFieldId: string;
  valueFieldId: string;
  aggregate: 'count' | 'sum' | 'average';
  colorRange: [string, string];
}

const defaultConfig: IHeatmapConfig = {
  tableId: '',
  xFieldId: '',
  yFieldId: '',
  valueFieldId: '',
  aggregate: 'count',
  colorRange: ['#313695', '#a50026'],
};

// ---------- 简易表单 Item ----------
const Item: React.FC<{ label?: string; children?: React.ReactNode }> = ({ label, children }) => {
  if (!children && !label) return null;
  return (
    <div className="form-item">
      {label ? <div className="label">{label}</div> : null}
      {children ? <div>{children}</div> : null}
    </div>
  );
};

// ---------- 热力图图表组件 ----------
function HeatmapChart({ options }: { options: echarts.EChartsOption }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  // 动态计算并设置高度
  useEffect(() => {
    const container = containerRef.current;
    const chartDom = chartRef.current;
    if (!container || !chartDom) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        // 直接设置图表容器的像素高度
        chartDom.style.height = `${height}px`;
        chartInstance.current?.resize();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 初始化 ECharts
  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);

    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  // 更新图表配置
  useEffect(() => {
    if (!chartInstance.current || !options) return;
    chartInstance.current.setOption(options, { notMerge: true });
  }, [options]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        position: 'relative',
      }}
    >
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

// ---------- 配置面板 ----------
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

  return (
    <div className="config-panel">
      <div className="form">
        <Item label="选择表格">
          <Select
            value={config.tableId}
            onChange={(v) => setConfig({ ...config, tableId: v as string, xFieldId: '', yFieldId: '', valueFieldId: '' })}
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
        <Item label="数值字段">
          <Select
            value={config.valueFieldId}
            onChange={(v) => setConfig({ ...config, valueFieldId: v as string })}
            optionList={fieldList
              .filter((f) => f.type === 2) // 数字类型
              .map((f) => ({ label: f.name, value: f.id }))}
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
        <Item label="颜色范围">
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
      </div>
      <Button theme="solid" onClick={onSave}>{t('confirm')}</Button>
    </div>
  );
}

// ---------- 主应用 ----------
export default function App() {
  const { bgColor } = useTheme();
  const [config, setConfig] = useState<IHeatmapConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [tableList, setTableList] = useState<any[]>([]);
  const [fieldList, setFieldList] = useState<any[]>([]);
  const [chartOptions, setChartOptions] = useState<echarts.EChartsOption>({});

  const dashboardState = dashboard.state;
  const isConfig = dashboardState === DashboardState.Config || dashboardState === DashboardState.Create;
  const isView = dashboardState === DashboardState.View || dashboardState === DashboardState.FullScreen;

  // 加载配置
  useEffect(() => {
    if (dashboardState === DashboardState.Create) return;
    dashboard.getConfig().then((res) => {
      if (res.customConfig) {
        setConfig({ ...defaultConfig, ...res.customConfig });
      }
    }).catch(console.error);
  }, [dashboardState]);

  // 监听配置变更
  useEffect(() => {
    const off = dashboard.onConfigChange((res) => {
      if (res.data.customConfig) {
        setConfig({ ...defaultConfig, ...res.data.customConfig });
      }
    });
    return () => off();
  }, []);

  // 获取表格列表
  useEffect(() => {
    bitable.base.getTableMetaList().then(setTableList).catch(console.error);
  }, []);

  // 获取字段列表
  useEffect(() => {
    if (!config.tableId) return;
    bitable.base.getTableById(config.tableId)
      .then((table) => table.getFieldMetaList())
      .then(setFieldList)
      .catch(console.error);
  }, [config.tableId]);

  // 从单元格提取字符串值
  const getCellString = (cell: any): string => {
    if (cell == null) return '';
    if (typeof cell === 'string') return cell;
    if (typeof cell === 'number') return String(cell);
    if (Array.isArray(cell)) {
      return cell.map((v) => (typeof v === 'object' && v.text ? v.text : String(v))).join(',');
    }
    if (typeof cell === 'object' && cell.text) return cell.text;
    return String(cell);
  };

  // 获取并聚合数据
  const fetchData = useCallback(async () => {
    if (!config.tableId || !config.xFieldId || !config.yFieldId || !config.valueFieldId) return;
    setLoading(true);
    try {
      const table = await bitable.base.getTableById(config.tableId);
      const records = await table.getRecords({ pageSize: 5000 });
      const aggMap: Record<string, Record<string, number>> = {};
      const cntMap: Record<string, Record<string, number>> = {};

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
      }

      const xCats = Object.keys(aggMap).sort();
      const ySet = new Set<string>();
      xCats.forEach(x => {
        Object.keys(aggMap[x] || {}).forEach(y => ySet.add(y));
      });
      const yCats = Array.from(ySet).sort();
      const data: [number, number, number][] = [];
      xCats.forEach((x, xi) => {
        yCats.forEach((y, yi) => {
          let v = aggMap[x]?.[y] || 0;
          if (config.aggregate === 'average') {
            v = v / (cntMap[x]?.[y] || 1);
          }
          data.push([xi, yi, v]);
        });
      });

      setChartOptions({
        grid: {
          left: '15%',
          right: '5%',
          bottom: '20%',
          top: '10%',
          containLabel: false,
        },
        xAxis: {
          type: 'category',
          data: xCats,
          splitArea: { show: true },
          axisLabel: {
            rotate: 30,
            fontSize: 11,
            interval: 0,
            overflow: 'break',
          },
        },
        yAxis: {
          type: 'category',
          data: yCats,
          splitArea: { show: true },
          axisLabel: {
            fontSize: 11,
          },
        },
        visualMap: {
          min: 0,
          max: Math.max(...data.map((d) => d[2]), 1),
          calculable: true,
          inRange: { color: config.colorRange },
        },
        series: [
          {
            type: 'heatmap',
            data,
            label: { show: true, fontSize: 10 },
            itemStyle: {
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            },
          },
        ],
        backgroundColor: bgColor,
      });
    } catch (e) {
      console.error(e);
      alert('数据获取失败：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [config, bgColor]);

  // View 状态下拉取数据
  useEffect(() => {
    if (isView) fetchData();
  }, [isView, fetchData]);

  // 保存配置
    const onSave = () => dashboard.saveConfig({ customConfig: config, dataConditions: [] } as any);

  // 如果当前是 Create 状态，直接显示配置面板
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
            <HeatmapChart options={chartOptions} />
          </Spin>
        </div>
      )}
    </main>
  );
}