package vn.chesshub.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.chesshub.entity.ChessClass;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.entity.Tournament;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.TournamentPairingRepository;
import vn.chesshub.repository.TournamentParticipantRepository;
import vn.chesshub.repository.TournamentRepository;
import vn.chesshub.repository.TournamentRoundRepository;
import vn.chesshub.repository.TournamentTieBreakRepository;

class TournamentListingTest {
  @Test
  void identifiesTheClassEvenWhenTwoClassesHaveTheSameName() {
    UUID teacherId = UUID.randomUUID();
    UUID firstClassId = UUID.randomUUID();
    UUID secondClassId = UUID.randomUUID();
    TournamentRepository repository = mock(TournamentRepository.class);
    Tournament first = tournament(firstClassId, "Lớp cờ vua", 3);
    Tournament second = tournament(secondClassId, "Lớp cờ vua", 5);
    when(repository.findByTeacherIdOrderByCreatedAtDesc(teacherId)).thenReturn(List.of(first, second));
    TournamentService service = new TournamentService(mock(ClassSessionRepository.class), repository,
        mock(TournamentParticipantRepository.class), mock(TournamentTieBreakRepository.class),
        mock(TournamentRoundRepository.class), mock(TournamentPairingRepository.class), mock(ChessClassRepository.class));

    var result = service.list(teacherId);

    assertEquals(2, result.size());
    assertEquals(firstClassId, result.get(0).classId());
    assertEquals(secondClassId, result.get(1).classId());
    assertEquals("Lớp cờ vua", result.get(0).className());
    assertEquals(first.getId(), result.get(0).id());
    assertEquals(3, result.get(0).roundCount());
    assertEquals("ACTIVE", result.get(0).status());
  }

  private Tournament tournament(UUID classId, String name, int roundCount) {
    ChessClass classroom = mock(ChessClass.class);
    when(classroom.getId()).thenReturn(classId);
    when(classroom.getName()).thenReturn(name);
    ClassSession session = mock(ClassSession.class);
    when(session.getChessClass()).thenReturn(classroom);
    Tournament tournament = mock(Tournament.class);
    when(tournament.getId()).thenReturn(UUID.randomUUID());
    when(tournament.getSession()).thenReturn(session);
    when(tournament.getChessClass()).thenReturn(classroom);
    when(tournament.getRoundCount()).thenReturn(roundCount);
    when(tournament.getStatus()).thenReturn("ACTIVE");
    return tournament;
  }
}
