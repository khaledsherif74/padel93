export function escapeCsvValue(value) {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename, rows) {
  if (!rows?.length) return;

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(escapeCsvValue).join(',')];

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvValue(row[column])).join(','));
  }

  const blob = new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
