export const normalizeHeader = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');

export function suggestMapping(cells, fields) {
  const used = new Set();
  return Object.fromEntries(fields.map(field => {
    const aliases = [field.label, field.key, ...field.aliases].map(normalizeHeader);
    const index = cells.findIndex((cell, i) => !used.has(i) && aliases.includes(normalizeHeader(cell)));
    if (index >= 0) used.add(index);
    return [field.key, index < 0 ? '' : String(index)];
  }));
}

export function mappedRows(sheetRows, headerRow, mapping, fields) {
  return sheetRows.filter(row => row.rowNumber > headerRow).map(row => ({
    rowNumber: row.rowNumber,
    values: Object.fromEntries(fields.map(field => [field.key, mapping[field.key] === '' || mapping[field.key] == null ? '' : row.cells[Number(mapping[field.key])] ?? ''])),
    studentId: null, membershipId: null, confirmNew: false, reuseRowNumber: null,
    issues: Object.fromEntries(['phoneNumber', 'parentPhoneNumber'].filter(key => mapping[key] !== '' && mapping[key] != null && row.numericColumns?.includes(Number(mapping[key])) && !/^0\d+$/.test(row.cells[Number(mapping[key])] ?? '')).map(key => [key, 'SĐT đang là ô số trong Excel, có thể đã mất số 0 đầu. Hãy kiểm tra, sửa hoặc xác nhận số đang hiển thị.'])),
  })).filter(row => Object.values(row.values).some(value => String(value).trim()));
}
