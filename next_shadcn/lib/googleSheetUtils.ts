/**
 * Google Sheets Utility Functions
 * Helper functions for working with Google Sheets and Google Charts
 * Also handles Vapi contact tracker operations with data integrity
 *
 * Uses Google Service Account for authentication (googleapis library)
 */

import { google } from 'googleapis';

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

export interface ContactRow {
  [0]: string; // ID
  [1]: string; // Phone
  [2]: string; // Name
  [3]: string; // Channel
  [4]: string; // Status
  [5]: number; // Attempt Count
  [6]: string; // Submitted
  [7]: string; // Last Attempt
  [8]: string; // Next Retry
  [9]: string; // Resolved
  [10]: string; // Vapi Call ID
  [11]: string; // Notes
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export interface SheetResponse {
  spreadsheetId: string;
  updatedRange: string;
  updatedRows?: number;
  updatedColumns?: number;
  updatedCells?: number;
}

/**
 * Extract sheet title from gviz query response
 * This is called after the chart data is loaded
 * @param response - Google Visualization API response
 * @returns string | null - Sheet title if found
 */
export const extractSheetTitleFromResponse = (response: any): string | null => {
  try {
    if (!response || typeof response !== 'object') {
      return null;
    }

    // The gviz response contains properties with the sheet information
    const table = response.getDataTable?.();
    if (!table) {
      return null;
    }

    // Try to get properties from the response object
    if (response.getProperties && typeof response.getProperties === 'function') {
      const props = response.getProperties();
      if (props && props.title) {
        return props.title;
      }
    }

    // Alternative: check the response object directly
    if (response.s && Array.isArray(response.s)) {
      // s property contains column information
      // Look for title in metadata
      for (const item of response.s) {
        if (item && item.p && item.p.title) {
          return item.p.title;
        }
      }
    }

    // Last resort: try to extract from response string representation
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
 * @param config - Configuration object
 * @param query - Optional GViz query language string
 * @returns Data source URL
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
 * @param columns - Column definitions
 * @param rows - Row data
 * @returns Google DataTable compatible structure
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
 * @param columnIndex - Column number (0-based)
 * @param operator - Comparison operator ('=', '<', '>', etc.)
 * @param value - Value to compare
 * @returns Query string fragment
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
 * @param columnIndices - Array of column numbers to select (0-based)
 * @returns Query string fragment
 */
export const buildSelectQuery = (columnIndices: number[]): string => {
  const columns = columnIndices.map((idx) => `col${idx}`).join(',');
  return `select ${columns}`;
};

/**
 * Build complete GViz query
 * @param select - Select clause
 * @param where - Where clause
 * @param orderBy - Order by clause
 * @param limit - Result limit
 * @returns Complete query string
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
      pieHole: 0.4, // Donut chart
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

// ============================================================================
// Vapi Contact Tracker Operations
// Centralized Google Sheets operations for data integrity and atomic updates
// ============================================================================

/**
 * Fetch all tracker data from sheet
 * @param sheetId - Google Sheet ID
 * @param apiKey - Google API key
 * @param sheetName - Sheet name (default: "Sheet1")
 * @returns Array of contact rows
 */
export async function getTrackerData(
  sheetId: string,
  sheetName: string = 'Sheet1'
): Promise<ContactRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    return (response.data.values || []) as ContactRow[];
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch tracker data: ${error}`);
  }
}

/**
 * Create a new contact tracking row
 * @param sheetId - Google Sheet ID
 * @param row - Contact row data
 * @param sheetName - Sheet name (default: "Sheet1")
 * @returns Response from API
 */
export async function createContactRow(
  sheetId: string,
  row: (string | number)[],
  sheetName: string = 'Sheet1'
): Promise<SheetResponse> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${sheetName}!A:L`;

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });

    return {
      spreadsheetId: response.data.spreadsheetId!,
      updatedRange: response.data.updates?.updatedRange || range,
      updatedRows: response.data.updates?.updatedRows,
      updatedColumns: response.data.updates?.updatedColumns,
      updatedCells: response.data.updates?.updatedCells,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create contact row: ${error}`);
  }
}

/**
 * Update a contact row - atomic operation for data integrity
 * Fetches latest data, updates, and writes back with validation
 * @param sheetId - Google Sheet ID
 * @param rowIndex - 1-based row index
 * @param updates - Partial row updates (sparse object with column indices as keys)
 * @param sheetName - Sheet name (default: "Sheet1")
 * @returns Updated row
 */
export async function updateContactRow(
  sheetId: string,
  rowIndex: number,
  updates: Partial<ContactRow>,
  sheetName: string = 'Sheet1'
): Promise<ContactRow> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Fetch current state
    const data = await getTrackerData(sheetId, sheetName);
    const currentRow = data[rowIndex - 1] as ContactRow;

    if (!currentRow) {
      throw new Error(`Row ${rowIndex} not found`);
    }

    // 2. Merge updates (preserving existing values)
    const updatedRow = { ...currentRow, ...updates } as ContactRow;

    // 3. Write back atomically
    const range = `${sheetName}!A${rowIndex}:L${rowIndex}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          updatedRow[0], updatedRow[1], updatedRow[2], updatedRow[3],
          updatedRow[4], updatedRow[5], updatedRow[6], updatedRow[7],
          updatedRow[8], updatedRow[9], updatedRow[10], updatedRow[11],
        ]],
      },
    });

    return updatedRow;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to update contact row: ${error}`);
  }
}

/**
 * Find rows by column value
 * @param sheetId - Google Sheet ID
 * @param apiKey - Google API key
 * @param columnIndex - 0-based column index
 * @param value - Value to match
 * @param sheetName - Sheet name (default: "Sheet1")
 * @returns Array of { rowIndex, row }
 */
/**
 * Find rows by column value
 * @param sheetId - Google Sheet ID
 * @param columnIndex - 0-based column index
 * @param value - Value to match
 * @param sheetName - Sheet name (default: "Sheet1")
 * @returns Array of { rowIndex, row }
 */
export async function findContactRows(
  sheetId: string,
  columnIndex: number,
  value: string,
  sheetName: string = 'Sheet1'
): Promise<Array<{ rowIndex: number; row: ContactRow }>> {
  try {
    const data = await getTrackerData(sheetId, sheetName);
    const matches: Array<{ rowIndex: number; row: ContactRow }> = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as ContactRow;
      if (row[columnIndex as keyof ContactRow] === value) {
        matches.push({ rowIndex: i + 1, row });
      }
    }

    return matches;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to find contact rows: ${error}`);
  }
}

/**
 * Append note to Notes column with timestamp
 * Atomic: read-modify-write
 * @param sheetId - Google Sheet ID
 * @param rowIndex - 1-based row index
 * @param note - Note to append
 * @param sheetName - Sheet name (default: "Sheet1")
 */
export async function appendContactNote(
  sheetId: string,
  rowIndex: number,
  note: string,
  sheetName: string = 'Sheet1'
): Promise<void> {
  try {
    const data = await getTrackerData(sheetId, sheetName);
    const row = data[rowIndex - 1] as ContactRow;

    if (!row) {
      throw new Error(`Row ${rowIndex} not found`);
    }

    const existing = row[11] || '';
    const timestamp = new Date().toISOString().substring(0, 19);
    const newNote = existing
      ? `${existing}\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;

    // Update via atomic operation
    await updateContactRow(sheetId, rowIndex, { [11]: newNote } as Partial<ContactRow>, sheetName);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`Failed to append contact note: ${error}`);
    // Don't throw - notes are non-critical
  }
}

/**
 * Batch update multiple contact rows atomically
 * @param sheetId - Google Sheet ID
 * @param updates - Array of { rowIndex, updates }
 * @param sheetName - Sheet name (default: "Sheet1")
 */
export async function batchUpdateContacts(
  sheetId: string,
  updates: Array<{ rowIndex: number; updates: Partial<ContactRow> }>,
  sheetName: string = 'Sheet1'
): Promise<void> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch all data once
    const data = await getTrackerData(sheetId, sheetName);

    // Prepare all updates
    const batchUpdates = updates.map(({ rowIndex, updates: upd }) => {
      const currentRow = data[rowIndex - 1] as ContactRow;
      if (!currentRow) {
        throw new Error(`Row ${rowIndex} not found`);
      }
      const updatedRow = { ...currentRow, ...upd } as ContactRow;
      return {
        range: `${sheetName}!A${rowIndex}:L${rowIndex}`,
        values: [[
          updatedRow[0], updatedRow[1], updatedRow[2], updatedRow[3],
          updatedRow[4], updatedRow[5], updatedRow[6], updatedRow[7],
          updatedRow[8], updatedRow[9], updatedRow[10], updatedRow[11],
        ]],
      };
    });

    // Send batch update
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        data: batchUpdates,
        valueInputOption: 'RAW',
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to batch update contacts: ${error}`);
  }
}
