// Saves the spreadsheet. xlsx is large and only needed here, so it is loaded on
// demand (its own chunk) rather than in the main bundle.

import { buildWorkbook, toBook, workbookFileName } from "./workbook.js";

export async function downloadWorkbook({ catalog, data, estimate }) {
  const XLSX = await import("xlsx");
  XLSX.writeFile(toBook(XLSX, buildWorkbook({ catalog, data, estimate })), workbookFileName(data));
}
