package vn.chesshub.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import vn.chesshub.entity.ClassSession;

public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {
  @EntityGraph(attributePaths = {"chessClass", "chessClass.memberships", "chessClass.memberships.student"})
  List<ClassSession> findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(UUID teacherId, LocalDate from, LocalDate to);

  List<ClassSession> findByChessClassIdOrderBySessionDateAscStartTimeAsc(UUID classId);

  void deleteByChessClassIdAndSessionDateAfter(UUID classId, LocalDate date);

  @org.springframework.data.jpa.repository.Query(value = "select exists (select 1 from session_materials where session_id = :sessionId)", nativeQuery = true)
  boolean hasTeachingMaterials(UUID sessionId);

  @org.springframework.data.jpa.repository.Query(value = "select exists (select 1 from tournaments where session_id = :sessionId)", nativeQuery = true)
  boolean hasTournament(UUID sessionId);

  @org.springframework.data.jpa.repository.Query(value = "select exists (select 1 from session_attendance where session_id = :sessionId)", nativeQuery = true)
  boolean hasAttendance(UUID sessionId);

  @EntityGraph(attributePaths = {"chessClass.memberships", "chessClass.memberships.student"})
  Optional<ClassSession> findByIdAndChessClassIdAndChessClassTeacherId(UUID id, UUID classId, UUID teacherId);
}
