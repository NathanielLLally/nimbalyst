/**
 * Google Chart Examples
 * Demonstrates various ways to use the GoogleChart component
 */

'use client';

import GoogleChart from './GoogleChart';
import {
  getExampleBusinessData,
  getExampleSalesData,
  chartConfigs
} from '@/lib/googleChartHelpers';

export const LineChartExample = () => {
  const { columns, rows } = getExampleBusinessData();

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3>Revenue Trend (Line Chart)</h3>
      <GoogleChart
        chartType="LineChart"
        title="Monthly Revenue Trend"
        data={rows}
        columns={columns}
        height={400}
        width="100%"
        options={chartConfigs.lineChart.options}
      />
    </div>
  );
};

export const ColumnChartExample = () => {
  const { columns, rows } = getExampleSalesData();

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3>Sales by Category (Column Chart)</h3>
      <GoogleChart
        chartType="ColumnChart"
        title="Sales Distribution by Category"
        data={rows}
        columns={columns}
        height={400}
        width="100%"
        options={chartConfigs.columnChart.options}
      />
    </div>
  );
};

export const PieChartExample = () => {
  const { columns, rows } = getExampleSalesData();

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3>Sales Distribution (Pie Chart)</h3>
      <GoogleChart
        chartType="PieChart"
        title="Market Share by Category"
        data={rows}
        columns={columns}
        height={400}
        width="100%"
        options={chartConfigs.pieChart.options}
      />
    </div>
  );
};

export const GoogleSheetsExample = () => {
  const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
  const SHEET_ID = 0;

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3>Business Growth from Google Sheets</h3>
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        Replace SPREADSHEET_ID with your actual Google Sheet ID
      </p>
      <GoogleChart
        chartType="ComboChart"
        spreadsheetId={SPREADSHEET_ID}
        sheetId={SHEET_ID}
        title="Business Metrics Dashboard"
        height={500}
        width="100%"
        options={{
          title: 'Business Growth Model',
          height: 500,
          legend: { position: 'bottom' },
          seriesType: 'bars',
          series: {
            1: { type: 'line' },
            2: { type: 'area' },
          },
        }}
        onReady={() => console.log('Chart loaded')}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  );
};

export const AreaChartExample = () => {
  const { columns, rows } = getExampleBusinessData();

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3>Financial Overview (Area Chart)</h3>
      <GoogleChart
        chartType="AreaChart"
        title="Revenue and Profit Over Time"
        data={rows}
        columns={columns.slice(0, 4)}
        height={400}
        width="100%"
        options={chartConfigs.areaChart.options}
      />
    </div>
  );
};

export const BarChartExample = () => {
  const columns = [
    { label: 'Task', type: 'string' as const },
    { label: 'Hours', type: 'number' as const },
  ];

  const rows = [
    ['Development', 120],
    ['Testing', 90],
    ['Documentation', 60],
    ['Meetings', 45],
    ['Code Review', 75],
  ];

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3>Time Allocation (Bar Chart)</h3>
      <GoogleChart
        chartType="BarChart"
        title="Hours Spent per Task"
        data={rows}
        columns={columns}
        height={400}
        width="100%"
        options={{
          title: 'Time Allocation',
          legend: { position: 'none' },
          hAxis: {
            title: 'Hours',
          },
        }}
      />
    </div>
  );
};

export const AllChartsExample = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Google Charts Examples</h1>
      <LineChartExample />
      <ColumnChartExample />
      <PieChartExample />
      <AreaChartExample />
      <BarChartExample />
    </div>
  );
};
