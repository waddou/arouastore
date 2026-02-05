export interface ColumnDef {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

export function generateCSVContent(
  data: Record<string, unknown>[],
  columns: ColumnDef[]
): string {
  const separator = ';';
  const header = columns.map((col) => `"${col.header}"`).join(separator);

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const value = col.format ? col.format(raw) : String(raw ?? '');
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(separator)
  );

  const bom = '\uFEFF';
  return bom + [header, ...rows].join('\r\n');
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns: ColumnDef[]
): void {
  const csv = generateCSVContent(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
