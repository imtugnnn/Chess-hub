package vn.chesshub.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  public ResponseEntity<ErrorResponse> handleUploadSize(org.springframework.web.multipart.MaxUploadSizeExceededException exception) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ErrorResponse("Tệp bài giảng tối đa 20 MB."));
  }
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException exception) {
    HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
    return ResponseEntity.status(status).body(new ErrorResponse(exception.getReason() == null ? "Không thể xử lý yêu cầu." : exception.getReason()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorResponse> handleIntegrityViolation(DataIntegrityViolationException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("Dữ liệu đã tồn tại hoặc không hợp lệ."));
  }

  public record ErrorResponse(String message) { }
}
