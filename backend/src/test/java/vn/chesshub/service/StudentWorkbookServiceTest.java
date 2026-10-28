package vn.chesshub.service;

import java.io.*;
import java.time.LocalDateTime;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class StudentWorkbookServiceTest {
  final StudentWorkbookService service = new StudentWorkbookService();
  MockMultipartFile file(XSSFWorkbook workbook) throws IOException {
    var out = new ByteArrayOutputStream(); workbook.write(out); return new MockMultipartFile("file", "students.xlsx", "application/octet-stream", out.toByteArray());
  }
  @Test void readsSelectedSheetOriginalRowsDatesAndFormattedPhones() throws Exception {
    try (var book = new XSSFWorkbook()) {
      book.createSheet("Khác"); var sheet = book.createSheet("Học sinh");
      sheet.createRow(2).createCell(0).setCellValue("Họ tên"); var row = sheet.createRow(4); row.createCell(0).setCellValue("An");
      var date = row.createCell(1); date.setCellValue(LocalDateTime.of(2016, 2, 3, 0, 0)); var dateStyle = book.createCellStyle(); dateStyle.setDataFormat(book.createDataFormat().getFormat("dd/mm/yyyy")); date.setCellStyle(dateStyle);
      var phone = row.createCell(2); phone.setCellValue(901234567); var phoneStyle = book.createCellStyle(); phoneStyle.setDataFormat(book.createDataFormat().getFormat("0000000000")); phone.setCellStyle(phoneStyle);
      var result = service.read(file(book), 1);
      assertEquals(List.of("Khác", "Học sinh"), result.sheets()); assertEquals(3, result.rows().getFirst().rowNumber()); assertEquals(5, result.rows().get(1).rowNumber());
      assertEquals("2016-02-03", result.rows().get(1).cells().get(1)); assertEquals("0901234567", result.rows().get(1).cells().get(2));
      assertEquals(List.of(2), result.rows().get(1).numericColumns());
    }
  }
  @Test void formulasRemainVisibleErrorsAndAreNeverEvaluated() throws Exception {
    try (var book = new XSSFWorkbook()) {
      book.createSheet().createRow(0).createCell(0).setCellFormula("1+1");
      assertEquals(StudentWorkbookService.FORMULA, service.read(file(book), 0).rows().getFirst().cells().getFirst());
    }
  }
  @Test void rejectsWrongFormatOversizeBrokenWorkbookAndOutOfBoundsSheet() throws Exception {
    assertThrows(ResponseStatusException.class, () -> service.read(new MockMultipartFile("file", "data.csv", "text/csv", "abc".getBytes()), 0));
    assertThrows(ResponseStatusException.class, () -> service.read(new MockMultipartFile("file", "data.xlsx", "", new byte[5 * 1024 * 1024 + 1]), 0));
    assertThrows(ResponseStatusException.class, () -> service.read(new MockMultipartFile("file", "data.xlsx", "", "abc".getBytes()), 0));
    try (var book = new XSSFWorkbook()) { book.createSheet(); assertThrows(ResponseStatusException.class, () -> service.read(file(book), 1)); }
  }
  @Test void rejectsMoreThan100ColumnsOrTooManyNonemptyRows() throws Exception {
    try (var book = new XSSFWorkbook()) {
      var sheet = book.createSheet(); sheet.createRow(0).createCell(100).setCellValue("Outside");
      assertThrows(ResponseStatusException.class, () -> service.read(file(book), 0)); sheet.removeRow(sheet.getRow(0));
      for (int i = 0; i < 1101; i++) sheet.createRow(i).createCell(0).setCellValue("An");
      assertThrows(ResponseStatusException.class, () -> service.read(file(book), 0));
    }
  }
  @Test void exportsOnlyFailedRowsAndKeepsFormulaLikeTextAsText() throws Exception {
    var rows = List.of(new StudentImportService.Row(5, Map.of("fullName", "=1+1", "parentPhoneNumber", "0901234567"), null, null, false, null));
    var results = List.of(new StudentImportService.Result(5, "ERROR", "Ngày sai", null, null, List.of(), false));
    try (var book = new XSSFWorkbook(new ByteArrayInputStream(service.export(rows, results)))) {
      var row = book.getSheetAt(0).getRow(1); assertEquals("=1+1", row.getCell(0).getStringCellValue()); assertEquals(org.apache.poi.ss.usermodel.CellType.STRING, row.getCell(0).getCellType());
      assertEquals("0901234567", row.getCell(3).getStringCellValue()); assertEquals(5, row.getCell(6).getNumericCellValue()); assertEquals("Ngày sai", row.getCell(7).getStringCellValue());
    }
    try (var book = new XSSFWorkbook(new ByteArrayInputStream(service.template()))) { assertEquals(6, book.getSheetAt(0).getRow(0).getLastCellNum()); }
  }
}
