package vn.chesshub.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.Student;

public interface StudentRepository extends JpaRepository<Student, UUID> {
  Optional<Student> findByCenterIdAndFullNameAndBirthDateAndParentPhoneNumber(UUID centerId, String fullName, LocalDate birthDate, String parentPhoneNumber);
  Optional<Student> findByOwnerUserIdAndFullNameAndBirthDateAndParentPhoneNumber(UUID ownerUserId, String fullName, LocalDate birthDate, String parentPhoneNumber);

  @Query("""
    select distinct student from Student student
    where lower(student.fullName) like lower(concat('%', :query, '%'))
      and (
        student.centerId = (select user.centerId from User user where user.id = :teacherId)
        or student.ownerUserId = :teacherId
        or (
          student.centerId is null and student.ownerUserId is null
          and exists (
            select chessClass.id from ChessClass chessClass join chessClass.students classStudent
            where chessClass.teacher.id = :teacherId and classStudent.id = student.id
          )
        )
      )
    order by student.fullName asc
    """)
  List<Student> findNameSuggestionsForTeacher(@Param("teacherId") UUID teacherId, @Param("query") String query, Pageable pageable);
}
