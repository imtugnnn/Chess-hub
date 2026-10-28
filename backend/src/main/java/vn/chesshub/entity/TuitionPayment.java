package vn.chesshub.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tuition_payments", uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "identity_id", "report_month"}))
public class TuitionPayment {
  @Id private UUID id = UUID.randomUUID();
  @Column(name = "class_id", nullable = false) private UUID classId;
  @Column(name = "identity_id", nullable = false) private UUID identityId;
  @Column(name = "report_month", nullable = false, length = 7) private String reportMonth;
  @Column(nullable = false) private boolean collected;
  @Column(nullable = false, precision = 18, scale = 0) private BigDecimal amount = BigDecimal.ZERO;
  @Column(nullable = false) private long revision;
  @Column(name = "updated_by", nullable = false) private UUID updatedBy;
  @Column(name = "updated_by_name", nullable = false) private String updatedByName;
  @Column(name = "updated_at", nullable = false) private Instant updatedAt;
  protected TuitionPayment() { }
  public TuitionPayment(UUID classId, UUID identityId, String month) { this.classId = classId; this.identityId = identityId; this.reportMonth = month; }
  public void record(boolean collected, BigDecimal amount, User actor) {
    this.collected = collected; this.amount = collected ? amount : BigDecimal.ZERO; revision++;
    updatedBy = actor.getId(); updatedByName = actor.getFullName(); updatedAt = Instant.now();
  }
  public UUID getId() { return id; }
  public UUID getClassId() { return classId; }
  public UUID getIdentityId() { return identityId; }
  public String getReportMonth() { return reportMonth; }
  public boolean isCollected() { return collected; }
  public BigDecimal getAmount() { return amount; }
  public long getRevision() { return revision; }
  public UUID getUpdatedBy() { return updatedBy; }
  public String getUpdatedByName() { return updatedByName; }
  public Instant getUpdatedAt() { return updatedAt; }
  public record View(long revision, boolean collected, BigDecimal amount, UUID updatedBy, String updatedByName, Instant updatedAt) {
    public static View empty() { return new View(0, false, BigDecimal.ZERO, null, null, null); }
    public static View from(TuitionPayment p) { return new View(p.revision, p.collected, p.amount, p.updatedBy, p.updatedByName, p.updatedAt); }
  }
}
