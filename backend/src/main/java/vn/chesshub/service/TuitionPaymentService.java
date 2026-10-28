package vn.chesshub.service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.controller.AttendanceSummaryController;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;

@Service
public class TuitionPaymentService {
  private final ChessClassRepository classes;
  private final TuitionPaymentRepository payments;
  private final AttendanceSummaryController summary;
  public TuitionPaymentService(ChessClassRepository classes, TuitionPaymentRepository payments, AttendanceSummaryController summary) {
    this.classes = classes; this.payments = payments; this.summary = summary;
  }
  public record Command(Boolean collected, Long expectedRevision, BigDecimal expectedTuition) { }

  @Transactional
  public TuitionPayment.View save(UUID teacherId, UUID classId, UUID identityId, YearMonth month, Command cmd) {
    if (cmd == null || cmd.collected == null || cmd.expectedRevision == null || cmd.expectedRevision < 0
        || cmd.expectedTuition == null || cmd.expectedTuition.signum() < 0 || cmd.expectedTuition.stripTrailingZeros().scale() > 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin ghi nhận thu tiền không hợp lệ.");
    }
    var classroom = classes.findForUpdate(classId, teacherId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    var payment = payments.findByClassIdAndIdentityIdAndReportMonth(classId, identityId, month.toString()).orElse(null);
    var student = summary.list(teacherId, month).stream().filter(c -> c.classId().equals(classId)).flatMap(c -> c.students().stream())
      .filter(s -> s.identityId().equals(identityId)).findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khoản học phí trong tháng."));
    if (student.tuitionAmount().compareTo(cmd.expectedTuition) != 0) throw conflict();
    // A retry may repeat the immediately completed state, without storing an event ledger.
    if (payment != null && payment.getRevision() == cmd.expectedRevision + 1 && payment.isCollected() == cmd.collected
        && payment.getAmount().compareTo(cmd.collected ? student.tuitionAmount() : BigDecimal.ZERO) == 0) return TuitionPayment.View.from(payment);
    if ((payment == null ? 0 : payment.getRevision()) != cmd.expectedRevision) throw conflict();
    if (cmd.collected && student.tuitionAmount().signum() == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoản này không phát sinh học phí. Nếu đã thu trước đó, hãy bỏ đánh dấu để đối soát.");
    if (!cmd.collected && (payment == null || !payment.isCollected())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoản này chưa được đánh dấu đã thu.");
    if (payment == null) payment = new TuitionPayment(classId, identityId, month.toString());
    payment.record(cmd.collected, student.tuitionAmount(), classroom.getTeacher());
    payments.saveAndFlush(payment);
    return TuitionPayment.View.from(payment);
  }
  private ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "Khoản học phí đã thay đổi. Tải lại dữ liệu trước khi ghi nhận."); }
}
