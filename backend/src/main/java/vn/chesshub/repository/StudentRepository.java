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
  @Query("select s from Student s where lower(trim(s.fullName)) = lower(:name) and ((:centerId is not null and s.centerId = :centerId) or (:centerId is null and s.centerId is null and s.ownerUserId = :ownerId)) order by s.createdAt, s.id")
  List<Student> scopeCandidates(UUID centerId, UUID ownerId, String name);
  Optional<Student> findByCenterIdAndFullNameAndBirthDateAndParentPhoneNumber(UUID centerId, String fullName, LocalDate birthDate, String parentPhoneNumber);
  Optional<Student> findByOwnerUserIdAndFullNameAndBirthDateAndParentPhoneNumber(UUID ownerUserId, String fullName, LocalDate birthDate, String parentPhoneNumber);
  boolean existsByOwnerUserId(UUID ownerUserId);

  @Query(value = """
    select distinct student.* from student
    where lower(student.full_name) like lower(concat('%', :query, '%'))
      and (
        (student.center_id = (select account.center_id from users account where account.id = :teacherId)
          and exists (select 1 from center_memberships membership where membership.center_id = student.center_id and membership.user_id = :teacherId and membership.status = 'ACTIVE'))
        or (student.owner_user_id = :teacherId and not exists (
          select 1 from center_memberships membership join users account on account.id = membership.user_id and account.center_id = membership.center_id
          where membership.user_id = :teacherId and membership.status = 'ACTIVE'
        ))
        or (
          student.center_id is null and student.owner_user_id is null
          and exists (
            select 1 from chess_class_students class_student join chess_classes chess_class on chess_class.id = class_student.chess_class_id
            where chess_class.teacher_id = :teacherId and class_student.student_id = student.id
          )
        )
      )
    order by student.full_name asc
    """, nativeQuery = true)
  List<Student> findNameSuggestionsForTeacher(@Param("teacherId") UUID teacherId, @Param("query") String query, Pageable pageable);
}
