'use client';

import GoogleChart from '@/components/GoogleChart';
import { getExampleBusinessData, getExampleSalesData } from '@/lib/googleSheetUtils';
import { useState } from 'react';

export default function DemoPage() {
  const [tab, setTab] = useState('static');
  const business = getExampleBusinessData();
  const sales = getExampleSalesData();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#2c3e50', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
        <h1>Google Charts Demo</h1>
      </header>

      <nav style={{ display: 'flex', gap: '10px', padding: '20px', justifyContent: 'center' }}>
        <button onClick={() => setTab('static')} style={{ padding: '10px 20px', backgroundColor: tab === 'static' ? '#3498db' : 'white', color: tab === 'static' ? 'white' : 'black', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}>
          Static Data
        </button>
        <button onClick={() => setTab('sheets')} style={{ padding: '10px 20px', backgroundColor: tab === 'sheets' ? '#3498db' : 'white', color: tab === 'sheets' ? 'white' : 'black', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}>
          Google Sheets
        </button>
        <button onClick={() => setTab('niches')} style={{ padding: '10px 20px', backgroundColor: tab === 'niches' ? '#3498db' : 'white', color: tab === 'niches' ? 'white' : 'black', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}>
          Niche Config
        </button>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {tab === 'static' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <ChartBox title="Line Chart">
              <GoogleChart chartType="LineChart" title="Revenue" data={business.rows} columns={business.columns} height={400} />
            </ChartBox>
            <ChartBox title="Column Chart">
              <GoogleChart chartType="ColumnChart" title="Sales" data={sales.rows} columns={sales.columns} height={400} />
            </ChartBox>
            <ChartBox title="Pie Chart">
              <GoogleChart chartType="PieChart" title="Share" data={sales.rows} columns={sales.columns} height={400} options={{ pieHole: 0.4 }} />
            </ChartBox>
            <ChartBox title="Area Chart">
              <GoogleChart chartType="AreaChart" title="Financial" data={business.rows} columns={business.columns.slice(0, 4)} height={400} />
            </ChartBox>
          </div>
        )}

        {tab === 'sheets' && (
          <div>
            <ChartBox title="Growth">
              <GoogleChart
                chartType="ColumnChart"
                spreadsheetId="1YYVl5EGOy2WOk74l3DmtaugP5RgW_c6UQDtJkTE4itE"
                sheetId={1099472203}
                titleCell="A1"
                subtitleCell="A2"
              />
            </ChartBox>
          </div>
        )}

        {tab === 'niches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <ChartBox title="Ad Spend Range by Niche">
              <GoogleChart
                chartType="BarChart"
                spreadsheetId="1YYVl5EGOy2WOk74l3DmtaugP5RgW_c6UQDtJkTE4itE"
                sheetName="NicheConfig"
                query="select A, B, C"
                title="Ad Spend Range by Niche"
                subtitle="Min / Max monthly ad spend (USD) — from NicheConfig sheet"
                height={500}
                options={{ legend: { position: 'top' }, hAxis: { title: 'USD' } }}
              />
            </ChartBox>
            <ChartBox title="Client Retention Range by Niche">
              <GoogleChart
                chartType="BarChart"
                spreadsheetId="1YYVl5EGOy2WOk74l3DmtaugP5RgW_c6UQDtJkTE4itE"
                sheetName="NicheConfig"
                query="select A, D, E"
                title="Client Retention Range by Niche"
                subtitle="Min / Max retention months — from NicheConfig sheet"
                height={500}
                options={{ legend: { position: 'top' }, hAxis: { title: 'Months' } }}
              />
            </ChartBox>
            <ChartBox title="Model Tuning — Close Rates">
              <GoogleChart
                chartType="ColumnChart"
                spreadsheetId="1YYVl5EGOy2WOk74l3DmtaugP5RgW_c6UQDtJkTE4itE"
                sheetName="ModelTuning"
                query="select B, C"
                title="Close Rate by Model"
                subtitle="From ModelTuning sheet"
                height={300}
                options={{ legend: { position: 'none' }, vAxis: { title: 'Close Rate', format: 'percent' } }}
              />
            </ChartBox>
          </div>
        )}
      </main>
    </div>
  );
}

function ChartBox({ title, children }: any) {
  return <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
    <h2 style={{ marginTop: 0 }}>{title}</h2>
    {children}
  </div>;
}
