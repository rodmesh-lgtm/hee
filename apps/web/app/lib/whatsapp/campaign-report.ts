export function campaignCsvCell(value: unknown) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  // Prevent spreadsheet formula execution, including leading whitespace/control bytes.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function campaignCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(campaignCsvCell).join(",")).join("\r\n");
}
