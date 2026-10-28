package vn.chesshub.controller;

import java.time.YearMonth;
import java.util.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import vn.chesshub.entity.*;
import vn.chesshub.service.TuitionPaymentService;

@RestController
@RequestMapping("/api/v1/teachers/{teacherId}/classes/{classId}/tuition-payments/{identityId}")
public class TuitionPaymentController {
  private final TuitionPaymentService service;
  public TuitionPaymentController(TuitionPaymentService service) { this.service = service; }
  @PutMapping
  public TuitionPayment.View save(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID identityId,
      @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month, @RequestBody TuitionPaymentService.Command command) {
    return service.save(teacherId, classId, identityId, month, command);
  }
}
