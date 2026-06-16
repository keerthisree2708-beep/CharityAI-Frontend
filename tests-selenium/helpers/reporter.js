'use strict';

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ─── Colour palette ──────────────────────────────────────────────────────────
const COLORS = {
  PASS:    { argb: 'FF22C55E' },   // green-500
  FAIL:    { argb: 'FFEF4444' },   // red-500
  SKIP:    { argb: 'FFFBBF24' },   // amber-400
  HEADER:  { argb: 'FF1E3A5F' },   // dark navy
  SUMMARY_BG: { argb: 'FF0F172A' },
  WHITE:   { argb: 'FFFFFFFF' },
  LIGHT:   { argb: 'FFF1F5F9' },
  DARK_TEXT: { argb: 'FF0F172A' },
};

// ─── Status display labels ────────────────────────────────────────────────────
const STATUS_LABEL = {
  PASS: '✅ PASS',
  FAIL: '❌ FAIL',
  SKIP: '⏭ SKIP',
};

/**
 * Generates the test-report.xlsx file from a flat array of result objects.
 *
 * @param {Array<{
 *   id: string,
 *   category: string,
 *   name: string,
 *   status: 'PASS'|'FAIL'|'SKIP',
 *   durationMs: number,
 *   error: string|null
 * }>} results
 * @param {string} outputDir   Directory to write the file into
 * @returns {string}           Absolute path of the generated file
 */
async function generateReport(results, outputDir = process.cwd()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CharityAI E2E Test Runner';
  workbook.created = new Date();

  // ─── SHEET 1: Summary ─────────────────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF1E3A5F' } },
  });

  const pass  = results.filter(r => r.status === 'PASS').length;
  const fail  = results.filter(r => r.status === 'FAIL').length;
  const skip  = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  const totalDuration = results.reduce((acc, r) => acc + (r.durationMs || 0), 0);

  // Title block
  summary.mergeCells('A1:F1');
  const titleCell = summary.getCell('A1');
  titleCell.value = '🏛  CharityAI — Selenium E2E Test Report';
  titleCell.font = { bold: true, size: 18, color: COLORS.WHITE };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.SUMMARY_BG };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summary.getRow(1).height = 40;

  // Run metadata
  const meta = [
    ['Run Date',       new Date().toLocaleString()],
    ['Base URL',       process.env.TEST_BASE_URL || 'N/A'],
    ['API URL',        process.env.TEST_API_URL  || 'N/A'],
    ['Total Duration', `${(totalDuration / 1000).toFixed(1)} s`],
  ];

  meta.forEach(([key, val], i) => {
    const row = summary.getRow(i + 2);
    row.getCell('A').value = key;
    row.getCell('A').font = { bold: true, color: COLORS.DARK_TEXT };
    row.getCell('B').value = val;
    row.getCell('B').font = { color: COLORS.DARK_TEXT };
    row.getCell('A').fill = row.getCell('B').fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.LIGHT };
    summary.mergeCells(`B${i + 2}:F${i + 2}`);
  });

  // Spacer
  summary.addRow([]);

  // Stats table
  const statsHeader = summary.addRow(['Category', 'Tests Run', 'PASS ✅', 'FAIL ❌', 'SKIP ⏭', 'Pass Rate']);
  statsHeader.eachCell(cell => {
    cell.font = { bold: true, color: COLORS.WHITE };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.HEADER };
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: COLORS.WHITE } };
  });

  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(cat => {
    const catResults = results.filter(r => r.category === cat);
    const cPass = catResults.filter(r => r.status === 'PASS').length;
    const cFail = catResults.filter(r => r.status === 'FAIL').length;
    const cSkip = catResults.filter(r => r.status === 'SKIP').length;
    const rate  = catResults.length ? `${Math.round((cPass / catResults.length) * 100)}%` : '0%';
    const row = summary.addRow([cat, catResults.length, cPass, cFail, cSkip, rate]);
    row.eachCell(cell => { cell.alignment = { horizontal: 'center' }; });
    row.getCell(3).font = { color: COLORS.PASS, bold: true };
    row.getCell(4).font = { color: COLORS.FAIL, bold: true };
    row.getCell(5).font = { color: COLORS.SKIP, bold: true };
  });

  // Totals row
  const passRate = total ? `${Math.round((pass / total) * 100)}%` : '0%';
  const totalRow = summary.addRow(['TOTAL', total, pass, fail, skip, passRate]);
  totalRow.eachCell(cell => {
    cell.font = { bold: true, color: COLORS.WHITE };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.SUMMARY_BG };
    cell.alignment = { horizontal: 'center' };
  });

  // Column widths
  summary.columns = [
    { key: 'A', width: 22 },
    { key: 'B', width: 12 },
    { key: 'C', width: 12 },
    { key: 'D', width: 12 },
    { key: 'E', width: 12 },
    { key: 'F', width: 12 },
  ];

  // ─── SHEET 2: Detailed Results ────────────────────────────────────────────
  const detail = workbook.addWorksheet('Detailed Results', {
    properties: { tabColor: { argb: 'FF22C55E' } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Header row
  const headers = ['Test ID', 'Category', 'Test Name', 'Status', 'Duration (s)', 'Error Message'];
  const headerRow = detail.addRow(headers);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: COLORS.WHITE, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.HEADER };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: COLORS.WHITE } };
  });
  headerRow.height = 28;

  // Data rows
  results.forEach((r, idx) => {
    const color = r.status === 'PASS' ? COLORS.PASS : r.status === 'FAIL' ? COLORS.FAIL : COLORS.SKIP;
    const bgArgb = idx % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
    const row = detail.addRow([
      r.id,
      r.category,
      r.name,
      STATUS_LABEL[r.status] || r.status,
      r.durationMs ? (r.durationMs / 1000).toFixed(2) : '—',
      r.error || '—',
    ]);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', wrapText: colNumber === 6 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    });
    // Colour the Status cell
    row.getCell(4).font = { bold: true, color: color };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    // Colour ID cell lightly
    row.getCell(1).font = { bold: true, color: COLORS.HEADER };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    // Error in red text if present
    if (r.error) {
      row.getCell(6).font = { color: COLORS.FAIL, italic: true };
    }
  });

  // Column widths
  detail.columns = [
    { key: 'id',       width: 12 },
    { key: 'category', width: 18 },
    { key: 'name',     width: 42 },
    { key: 'status',   width: 14 },
    { key: 'duration', width: 14 },
    { key: 'error',    width: 55 },
  ];

  // Auto-filter on header
  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

  // ─── Write file ───────────────────────────────────────────────────────────
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName  = `test-report-${timestamp}.xlsx`;
  const filePath  = path.join(outputDir, fileName);

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = { generateReport };
