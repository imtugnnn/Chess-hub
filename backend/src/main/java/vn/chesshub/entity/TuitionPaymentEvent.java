package vn.chesshub.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tuition_payment_events")
public class TuitionPaymentEvent implements org.springframework.data.domain.Persistable<UUID> {
  @Id private UUID id;
  @Column(name = "payment_id", nullable = false) private UUID paymentId;
  @Column(nullable = false) private boolean collected;
  @Column(name = "expected_revision", nullable = false) private long expectedRevision;
  @Column(name = "expected_tuition", nullable = false, precision = 18, scale = 0) private BigDecimal expectedTuition;
  @Column(name = "previous_amount", nullable = false, precision = 18, scale = 0) private BigDecimal previousAmount;
  @Column(nullable = false, precision = 18, scale = 0) private BigDecimal amount;
  @Column(name = "actor_id", nullable = false) private UUID actorId;
  @Column(name = "actor_name", nullable = false) private String actorName;
  @Column(name = "created_at", nullable = false) private Instant createdAt;
  protected TuitionPaymentEvent() { }
  @Override public UUID getId() { return id; }
  @Override @Transient public boolean isNew() { return true; }
  public TuitionPaymentEvent(UUID operationId, TuitionPayment p, long expectedRevision, BigDecimal expectedTuition, BigDecimal previousAmount) {
    id = operationId; paymentId = p.getId(); collected = p.isCollected(); this.expectedRevision = expectedRevision;
    this.expectedTuition = expectedTuition; this.previousAmount = previousAmount; amount = p.getAmount();
    actorId = p.getUpdatedBy(); actorName = p.getUpdatedByName(); createdAt = p.getUpdatedAt();
  }
  public boolean matches(UUID payment, boolean collect, long revision, BigDecimal tuition, UUID actor) {
    return paymentId.equals(payment) && collected == collect && expectedRevision == revision && expectedTuition.compareTo(tuition) == 0 && actorId.equals(actor);
  }
  public record View(UUID id, boolean collected, BigDecimal previousAmount, BigDecimal amount, UUID actorId, String actorName, Instant createdAt) {
    public static View from(TuitionPaymentEvent e) { return new View(e.id, e.collected, e.previousAmount, e.amount, e.actorId, e.actorName, e.createdAt); }
  }
}
