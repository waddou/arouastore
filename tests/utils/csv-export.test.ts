import { describe, it, expect } from 'vitest';
import { generateCSVContent, ColumnDef } from '../../src/utils/csv-export';

describe('generateCSVContent', () => {
  const sampleData = [
    { name: 'iPhone 15', price: 99900, qty: 5 },
    { name: 'Samsung S24', price: 89900, qty: 3 },
  ];

  const sampleColumns: ColumnDef[] = [
    { key: 'name', header: 'Produit' },
    { key: 'price', header: 'Prix' },
    { key: 'qty', header: 'Quantité' },
  ];

  it('generates CSV with semicolon separator', () => {
    const csv = generateCSVContent(sampleData, sampleColumns);

    expect(csv).toContain('"Produit";"Prix";"Quantité"');
    expect(csv).toContain('"iPhone 15";"99900";"5"');
    expect(csv).toContain('"Samsung S24";"89900";"3"');
  });

  it('uses CRLF line endings', () => {
    const csv = generateCSVContent(sampleData, sampleColumns);

    const content = csv.replace(/^\uFEFF/, '');
    const lines = content.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('includes UTF-8 BOM for French Excel compatibility', () => {
    const csv = generateCSVContent(sampleData, sampleColumns);

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('applies custom format functions', () => {
    const columns: ColumnDef[] = [
      { key: 'name', header: 'Produit' },
      {
        key: 'price',
        header: 'Prix',
        format: (v) => `${(Number(v) / 100).toFixed(2)} DA`,
      },
    ];

    const csv = generateCSVContent(sampleData, columns);

    expect(csv).toContain('"999.00 DA"');
    expect(csv).toContain('"899.00 DA"');
  });

  it('escapes double quotes in values', () => {
    const data = [{ name: 'Samsung "Galaxy"', price: 50000 }];
    const columns: ColumnDef[] = [
      { key: 'name', header: 'Produit' },
      { key: 'price', header: 'Prix' },
    ];

    const csv = generateCSVContent(data, columns);

    expect(csv).toContain('"Samsung ""Galaxy"""');
  });

  it('handles null/undefined values gracefully', () => {
    const data = [
      { name: null, price: undefined } as unknown as Record<string, unknown>,
    ];
    const columns: ColumnDef[] = [
      { key: 'name', header: 'Produit' },
      { key: 'price', header: 'Prix' },
    ];

    const csv = generateCSVContent(data, columns);

    const content = csv.replace(/^\uFEFF/, '');
    const dataLine = content.split('\r\n')[1];
    // Both null and undefined become empty strings, each wrapped in quotes
    expect(dataLine).toBe('"";""');
  });

  it('handles empty data array — header only', () => {
    const csv = generateCSVContent([], sampleColumns);

    const content = csv.replace(/^\uFEFF/, '');
    const lines = content.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(1); // just header
    expect(content).toContain('"Produit";"Prix";"Quantité"');
  });

  it('handles missing keys in data objects', () => {
    const data = [{ name: 'Test' }]; // missing 'price' key
    const columns: ColumnDef[] = [
      { key: 'name', header: 'Produit' },
      { key: 'price', header: 'Prix' },
    ];

    const csv = generateCSVContent(data, columns);

    const content = csv.replace(/^\uFEFF/, '');
    const dataLine = content.split('\r\n')[1];
    expect(dataLine).toBe('"Test";""');
  });
});
