"use client";

type CellValue = string | number | boolean | Date | null | undefined;
export type SpreadsheetRow = Record<string, CellValue>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportExcel(sheets: Array<{ name: string; rows: SpreadsheetRow[] }>, filename: string) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CorpuKU Academy";
  workbook.created = new Date();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    const headers = Array.from(new Set(sheet.rows.flatMap(row => Object.keys(row))));
    worksheet.columns = headers.map(header => ({
      header,
      key: header,
      width: Math.min(45, Math.max(14, header.length + 4)),
    }));
    worksheet.addRows(sheet.rows);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle" };
    worksheet.autoFilter = headers.length ? { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } } : undefined;
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

function parseCsv(text: string): SpreadsheetRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift()?.map(value => value.trim()) || [];
  return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

export async function parseSpreadsheet(file: File): Promise<SpreadsheetRow[]> {
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv(await file.text());
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Gunakan file .xlsx atau .csv.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran spreadsheet maksimal 10 MB.");
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  // ExcelJS accepts a Uint8Array in browsers, while its public type currently
  // narrows this parameter to Node's Buffer.
  const loadBrowserBuffer = workbook.xlsx.load.bind(workbook.xlsx) as unknown as (data: ArrayBuffer) => Promise<unknown>;
  await loadBrowserBuffer(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headerValues = worksheet.getRow(1).values;
  const headers = Array.isArray(headerValues) ? headerValues.slice(1).map(value => String(value || "").trim()) : [];
  const result: SpreadsheetRow[] = [];
  worksheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values = excelRow.values;
    if (!Array.isArray(values)) return;
    const record: SpreadsheetRow = {};
    let populated = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const raw = values[index + 1];
      const value = raw && typeof raw === "object" && "text" in raw ? String(raw.text) : raw as CellValue;
      record[header] = value;
      if (value !== null && value !== undefined && value !== "") populated = true;
    });
    if (populated) result.push(record);
  });
  return result;
}
