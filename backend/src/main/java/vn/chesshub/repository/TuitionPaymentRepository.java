package vn.chesshub.repository;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.TuitionPayment;
public interface TuitionPaymentRepository extends JpaRepository<TuitionPayment, UUID> {
  Optional<TuitionPayment> findByClassIdAndIdentityIdAndReportMonth(UUID classId, UUID identityId, String reportMonth);
  List<TuitionPayment> findByClassIdInAndReportMonth(Collection<UUID> classIds, String reportMonth);
}
