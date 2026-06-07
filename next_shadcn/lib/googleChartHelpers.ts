/**
 * Pure helper functions for Google Charts - client and server safe
 */

export interface SheetDataColumn {
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime';
  role?: 'tooltip' | 'annotation' | 'style' | 'domain' | 'interval';
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetId?: string | number;
  headers?: boolean;
}

/**
 * Extract sheet title from gviz query response
 */
export const extractSheetTitleFromResponse = (response: any): string | null => {
  try {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const table = response.getDataTable?.();
    if (!table) {
      return null;
    }

    if (response.getProperties && typeof response.getProperties === 'function') {
      const props = response.getProperties();
      if (props && props.title) {
        return props.title;
      }
    }

    if (response.s && Array.isArray(response.s)) {
      for (const item of response.s) {
        if (item && item.p && item.p.title) {
          return item.p.title;
        }
      }
    }

    const responseStr = JSON.stringify(response);
    const titleMatch = responseStr.match(/"title"\s*:\s*"([^"]+)"/);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1];
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Build a Google Visualization API data source URL
 */
export const buildGoogleSheetsDataSourceUrl = (
  config: GoogleSheetConfig,
  query?: string
): string => {
  const { spreadsheetId, sheetId, headers = true } = config;

  const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`;
  const params: string[] = [];

  if (sheetId !== undefined) {
    params.push(`gid=${sheetId}`);
  }

  if (headers) {
    params.push('headers=1');
  }

  if (query) {
    params.push(`tq=${encodeURIComponent(query)}`);
  }

  return baseUrl + '?' + params.join('&');
};

/**
 * Convert array of arrays to Google DataTable format
 */
export const convertToDataTableFormat = (
  columns: SheetDataColumn[],
  rows: Array<Array<string | number | boolean | null>>
): { cols: any[]; rows: any[] } => {
  return {
    cols: columns.map((col) => ({
      label: col.label,
      type: col.type,
      role: col.role,
    })),
    rows: rows.map((row) => ({
      c: row.map((value) => ({ v: value })),
    })),
  };
};

/**
 * GViz Query Language helper - Filter data
 */
export const buildFilterQuery = (
  columnIndex: number,
  operator: string,
  value: string | number
): string => {
  const valueStr = typeof value === 'string' ? `'${value}'` : value;
  return `where col${columnIndex} ${operator} ${valueStr}`;
};

/**
 * GViz Query Language helper - Select columns
 */
export const buildSelectQuery = (columnIndices: number[]): string => {
  const columns = columnIndices.map((idx) => `col${idx}`).join(',');
  return `select ${columns}`;
};

/**
 * Build complete GViz query
 */
export const buildGVizQuery = (
  select?: string,
  where?: string,
  orderBy?: string,
  limit?: number
): string => {
  const parts: string[] = [];

  if (select) {
    parts.push(select);
  }

  if (where) {
    parts.push(where);
  }

  if (orderBy) {
    parts.push(orderBy);
  }

  if (limit) {
    parts.push(`limit ${limit}`);
  }

  return parts.join(' ');
};

/**
 * Example data for testing - Business metrics
 */
export const getExampleBusinessData = () => {
  const columns: SheetDataColumn[] = [
    { label: 'Month', type: 'string' },
    { label: 'Revenue', type: 'number' },
    { label: 'Expenses', type: 'number' },
    { label: 'Profit', type: 'number' },
    { label: 'Growth %', type: 'number' },
  ];

  const rows = [
    ['Jan', 12000, 5000, 7000, 0],
    ['Feb', 14500, 5500, 9000, 12.5],
    ['Mar', 18000, 6000, 12000, 24.1],
    ['Apr', 21500, 6500, 15000, 19.4],
    ['May', 25000, 7000, 18000, 16.3],
    ['Jun', 28500, 7500, 21000, 14.0],
  ];

  return { columns, rows };
};

/**
 * Example data for testing - Sales by category
 */
export const getExampleSalesData = () => {
  const columns: SheetDataColumn[] = [
    { label: 'Product Category', type: 'string' },
    { label: 'Sales', type: 'number' },
  ];

  const rows = [
    ['Electronics', 25000],
    ['Clothing', 18000],
    ['Home & Garden', 15000],
    ['Sports', 12000],
    ['Books', 8000],
  ];

  return { columns, rows };
};

/**
 * Example chart configurations for common use cases
 */
export const chartConfigs = {
  lineChart: {
    title: 'Trend Over Time',
    options: {
      curveType: 'function',
      legend: { position: 'bottom' },
      hAxis: {
        title: 'Time Period',
      },
      vAxis: {
        title: 'Value',
      },
      pointSize: 7,
      lineWidth: 2,
    },
  },

  columnChart: {
    title: 'Category Comparison',
    options: {
      legend: { position: 'bottom' },
      vAxis: {
        title: 'Value',
      },
      bar: { groupWidth: '75%' },
    },
  },

  pieChart: {
    title: 'Distribution',
    options: {
      legend: { position: 'bottom' },
      pieHole: 0.4,
      chartArea: { width: '100%', height: '100%' },
    },
  },

  areaChart: {
    title: 'Area Trend',
    options: {
      legend: { position: 'bottom' },
      hAxis: {
        title: 'Time',
      },
      vAxis: {
        title: 'Value',
      },
      isStacked: false,
    },
  },

  comboChart: {
    title: 'Multi-Series Comparison',
    options: {
      legend: { position: 'bottom' },
      seriesType: 'bars',
      series: {
        1: { type: 'line' },
        2: { type: 'area' },
      },
    },
  },
};
