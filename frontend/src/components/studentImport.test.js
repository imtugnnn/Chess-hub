import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHeader, suggestMapping, mappedRows } from './studentImport.js';

const fields = [
  { key: 'fullName', label: 'Họ tên học sinh', aliases: ['Tên bé', 'Họ và tên'] },
  { key: 'birthDate', label: 'Ngày sinh', aliases: ['DOB'] },
  { key: 'phoneNumber', label: 'SĐT học sinh', aliases: ['Số điện thoại'] },
];
test('matches Vietnamese headers and reordered optional columns without reusing a source column', () => {
  assert.equal(normalizeHeader('SỐ ĐIỆN THOẠI'), 'sodienthoai');
  assert.deepEqual(suggestMapping(['Số điện thoại', 'Ten be', 'Không dùng'], fields), { fullName: '1', birthDate: '', phoneNumber: '0' });
});
test('mapping retains original Excel row numbers, leading zeroes and name-only rows', () => {
  const input = [{ rowNumber: 1, cells: ['Tiêu đề'] }, { rowNumber: 3, cells: ['Tên bé', 'Số điện thoại'] }, { rowNumber: 5, cells: ['An', '0901234567'] }, { rowNumber: 6, cells: ['Bình'] }, { rowNumber: 7, cells: ['', ''] }];
  const rows = mappedRows(input, 3, { fullName: '0', phoneNumber: '1', birthDate: '' }, fields);
  assert.deepEqual(rows.map(r => r.rowNumber), [5, 6]); assert.equal(rows[0].values.phoneNumber, '0901234567'); assert.equal(rows[1].values.birthDate, '');
  assert.equal(input[0].cells[0], 'Tiêu đề');
});
test('numeric phone cells require confirmation unless the Excel format retained the leading zero', () => {
  const rows = mappedRows([{ rowNumber: 2, cells: ['An', '901234567'], numericColumns: [1] }, { rowNumber: 3, cells: ['Bình', '0901234567'], numericColumns: [1] }], 1, { fullName: '0', birthDate: '', phoneNumber: '1' }, fields);
  assert(rows[0].issues.phoneNumber); assert.deepEqual(rows[1].issues, {});
});
