package com.example.arcaller.repositories;

import com.example.arcaller.models.NoteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteHistoryRepository extends JpaRepository<NoteHistory, Long> {
    List<NoteHistory> findByCallerNoteIdOrderByCreatedAtDesc(Long callerNoteId);
    int countByUsernameAndCreatedAtGreaterThanEqual(String username, java.time.LocalDateTime startOfDay);
}
