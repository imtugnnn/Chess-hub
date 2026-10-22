package vn.chesshub.repository;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.TuitionPaymentEvent;
public interface TuitionPaymentEventRepository extends JpaRepository<TuitionPaymentEvent, UUID> {
  List<TuitionPaymentEvent> findByPaymentIdOrderByCreatedAtDesc(UUID paymentId);
}
