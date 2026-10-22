package vn.chesshub.service;

import java.io.*;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentWorkbookService {
  public static final String FORMULA = "[Ô CÔNG THỨC: hãy thay bằng giá trị]";
  public record SheetRow(int rowNumber, List<String> cells, List<Integer> numericColumns) { }
  public record WorkbookData(List<String> sheets, int sheetIndex, List<SheetRow> rows, List<StudentImportService.Field> fields) { }
  public WorkbookData read(MultipartFile file, int sheetIndex) {
    if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024 || file.getOriginalFilename() == null || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"))
      throw bad("Chọn file .xlsx có dung lượng tối đa 5 MB.");
    try (var workbook = new XSSFWorkbook(file.getInputStream())) {
      if (sheetIndex < 0 || sheetIndex >= workbook.getNumberOfSheets()) throw bad("Sheet không tồn tại.");
      List<String> sheets = new ArrayList<>();
      for (int i = 0; i < workbook.getNumberOfSheets(); i++) sheets.add(workbook.getSheetName(i));
      List<SheetRow> rows = new ArrayList<>();
      DataFormatter format = new DataFormatter(Locale.forLanguageTag("vi-VN"));
      for (Row row : workbook.getSheetAt(sheetIndex)) {
        List<String> cells = new ArrayList<>();
        List<Integer> numbers = new ArrayList<>();
        for (int column = 0; column < row.getLastCellNum(); column++) {
          Cell cell = row.getCell(column);
          if (cell != null && cell.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) numbers.add(column);
          String value = cell == null ? "" : cell.getCellType() == CellType.FORMULA ? FORMULA
            : cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell) ? cell.getLocalDateTimeCellValue().toLocalDate().toString() : format.formatCellValue(cell);
          if (column >= 100 && !value.isBlank()) throw bad("Sheet có dữ liệu ngoài 100 cột đầu tiên.");
          if (column < 100) cells.add(value);
        }
        if (cells.stream().anyMatch(v -> !v.isBlank())) rows.add(new SheetRow(row.getRowNum() + 1, cells, numbers));
        if (rows.size() > 1100) throw bad("Sheet quá lớn. Hãy tách danh sách thành tối đa 1.000 học sinh mỗi lần nhập.");
      }
      return new WorkbookData(sheets, sheetIndex, rows, StudentImportService.FIELDS);
    } catch (ResponseStatusException e) { throw e; }
    catch (Exception e) { throw bad("Không đọc được file Excel. Hãy dùng file .xlsx không đặt mật khẩu."); }
  }
  public byte[] template() { return export(List.of(), List.of()); }
  public byte[] export(List<StudentImportService.Row> rows, List<StudentImportService.Result> results) {
    try (var workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet(rows.isEmpty() ? "Học sinh" : "Dòng cần sửa");
      Row header = sheet.createRow(0);
      CellStyle style = workbook.createCellStyle(); Font font = workbook.createFont(); font.setBold(true); style.setFont(font);
      for (int i = 0; i < StudentImportService.FIELDS.size(); i++) {
        Cell cell = header.createCell(i); cell.setCellValue(StudentImportService.FIELDS.get(i).label()); cell.setCellStyle(style);
        sheet.setColumnWidth(i, (i == 5 ? 42 : 25) * 256);
      }
      if (!rows.isEmpty()) { header.createCell(6).setCellValue("Dòng trong file gốc"); header.createCell(7).setCellValue("Lý do"); sheet.setColumnWidth(7, 70 * 256); }
      int index = 1;
      for (var input : rows) {
        var error = results.stream().filter(r -> r.rowNumber() == input.rowNumber() && !r.success()).findFirst();
        if (error.isEmpty()) continue;
        Row row = sheet.createRow(index++);
        for (int i = 0; i < StudentImportService.FIELDS.size(); i++) row.createCell(i).setCellValue(Objects.toString(input.values().get(StudentImportService.FIELDS.get(i).key()), ""));
        row.createCell(6).setCellValue(input.rowNumber()); row.createCell(7).setCellValue(error.get().message());
      }
      CellStyle text = workbook.createCellStyle(); text.setDataFormat(workbook.createDataFormat().getFormat("@"));
      sheet.setDefaultColumnStyle(1, text); sheet.setDefaultColumnStyle(3, text); sheet.setDefaultColumnStyle(4, text);
      sheet.createFreezePane(0, 1); workbook.write(output); return output.toByteArray();
    } catch (IOException e) { throw new IllegalStateException("Không xuất được Excel", e); }
  }
  private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
