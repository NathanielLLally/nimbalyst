import { useEffect, useRef, useState } from 'react';

export type ChartType =
  | 'LineChart'
  | 'AreaChart'
  | 'BarChart'
  | 'ColumnChart'
  | 'ComboChart'
  | 'PieChart'
  | 'ScatterChart'
  | 'BubbleChart';

export interface GoogleChartProps {
  chartType: ChartType;
  // Static title/subtitle — takes priority over dynamic cell values
  title?: string;
  subtitle?: string;
  // Cell references (e.g. "A1", "B3") read from the same sheet at render time
  titleCell?: string;
  subtitleCell?: string;
  options?: Record<string, any>;
  spreadsheetId?: string;
  sheetId?: string | number;
  // sheetName is an alternative to sheetId — uses sheet=Name in the gviz URL
  sheetName?: string;
  query?: string;
  data?: Array<Array<string | number | boolean>>;
  columns?: Array<{
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'datetime';
    role?: string;
  }>;
  containerId?: string;
  height?: number | string;
  width?: number | string;
  onReady?: () => void;
  onError?: (error: string) => void;
}

const GoogleChart = ({
  chartType,
  spreadsheetId,
  sheetId,
  sheetName,
  query,
  data,
  columns,
  title,
  subtitle,
  titleCell,
  subtitleCell,
  options = {},
  containerId = 'google-chart-container',
  height = 400,
  width = '100%',
  onReady,
  onError,
}: GoogleChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [dynamicSubtitle, setDynamicSubtitle] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.async = true;

    script.onload = () => {
      const google = (window as any).google;
      google.charts.load('current', { packages: ['corechart', 'table'] });
      google.charts.setOnLoadCallback(drawChart);
    };

    script.onerror = () => {
      const msg = 'Failed to load Google Charts library';
      setError(msg);
      onError?.(msg);
      setIsLoading(false);
    };

    document.head.appendChild(script);
  }, [onError]);

  const sheetParam = (): string => {
    if (sheetName) return `&sheet=${encodeURIComponent(sheetName)}`;
    if (sheetId !== undefined) return `&gid=${sheetId}`;
    return '';
  };

  const fetchMetadataCell = (cellRange: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const google = (window as any).google;
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?range=${encodeURIComponent(cellRange)}&headers=0${sheetParam()}`;
      const q = new google.visualization.Query(url);
      q.send((response: any) => {
        if (response.isError()) {
          resolve(null);
          return;
        }
        const table = response.getDataTable();
        if (table && table.getNumberOfRows() > 0 && table.getNumberOfColumns() > 0) {
          const value = table.getValue(0, 0);
          resolve(value !== null && value !== undefined ? String(value) : null);
        } else {
          resolve(null);
        }
      });
    });
  };

  const drawChart = async () => {
    try {
      if (!containerRef.current) throw new Error('Container element not found');

      const google = (window as any).google;

      const [dataTable, fetchedTitle, fetchedSubtitle] = await Promise.all([
        spreadsheetId ? loadFromGoogleSheets() : Promise.resolve(createDataTable()),
        spreadsheetId && titleCell ? fetchMetadataCell(titleCell) : Promise.resolve(null),
        spreadsheetId && subtitleCell ? fetchMetadataCell(subtitleCell) : Promise.resolve(null),
      ]);

      if (fetchedTitle) setDynamicTitle(fetchedTitle);
      if (fetchedSubtitle) setDynamicSubtitle(fetchedSubtitle);

      const ChartClass = google.visualization[chartType];
      if (!ChartClass) throw new Error(`Chart type ${chartType} not found`);

      // Title is rendered as HTML above the chart; don't pass it to chart options
      const chartOptions: Record<string, any> = { height, width, ...options };

      chartRef.current = new ChartClass(containerRef.current);
      chartRef.current.draw(dataTable, chartOptions);

      const resizeListener = () => {
        if (chartRef.current && dataTable) {
          chartRef.current.draw(dataTable, chartOptions);
        }
      };
      window.addEventListener('resize', resizeListener);
      setIsLoading(false);
      setError(null);
      onReady?.();

      return () => window.removeEventListener('resize', resizeListener);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      onError?.(msg);
      setIsLoading(false);
    }
  };

  const loadFromGoogleSheets = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      const queryObj = new google.visualization.Query(buildDataSourceUrl());
      queryObj.send((response: any) => {
        if (response.isError()) {
          reject(new Error(`Google Sheets error: ${response.getMessage()}`));
        } else {
          resolve(response.getDataTable());
        }
      });
    });
  };

  const buildDataSourceUrl = (): string => {
    if (!spreadsheetId) throw new Error('spreadsheetId is required');
    const tq = encodeURIComponent(query ?? 'select *');
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?headers=1${sheetParam()}&tq=${tq}`;
  };

  const createDataTable = (): any => {
    const google = (window as any).google;
    const dataTable = new google.visualization.DataTable();
    columns?.forEach((col) => {
      dataTable.addColumn({ type: col.type, label: col.label, ...(col.role ? { role: col.role } : {}) });
    });
    if (data && data.length > 0) dataTable.addRows(data);
    return dataTable;
  };

  const displayTitle = title ?? dynamicTitle;
  const displaySubtitle = subtitle ?? dynamicSubtitle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {isLoading && <p>Loading chart...</p>}
      {error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {displayTitle && (
        <h2 style={{ margin: '0 0 4px 0', textAlign: 'center', fontSize: '1.3em', fontWeight: 600 }}>
          {displayTitle}
        </h2>
      )}
      {displaySubtitle && (
        <p style={{ margin: '0 0 8px 0', textAlign: 'center', color: '#666', fontSize: '0.875em' }}>
          {displaySubtitle}
        </p>
      )}
      <div
        ref={containerRef}
        id={containerId}
        style={{
          width: typeof width === 'string' ? width : `${width}px`,
          height: typeof height === 'string' ? height : `${height}px`,
          minHeight: '300px',
        }}
      />
    </div>
  );
};

export default GoogleChart;
