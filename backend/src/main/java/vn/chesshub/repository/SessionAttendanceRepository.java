package vn.chesshub.repository;

import java.util.List;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.SessionAttendance;

public interface SessionAttendanceRepository extends JpaRepository<SessionAttendance, UUID> {
  @EntityGraph(attributePaths = "student")
  List<SessionAttendance> findBySessionId(UUID sessionId);

  @EntityGraph(attributePaths = {"session.chessClass", "student"})
  List<SessionAttendance> findBySessionChessClassTeacherIdAndSessionSessionDateBetween(UUID teacherId, LocalDate from, LocalDate to);
}
