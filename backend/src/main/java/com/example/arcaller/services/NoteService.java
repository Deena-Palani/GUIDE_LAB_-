package com.example.arcaller.services;

import com.example.arcaller.models.CallerNote;
import com.example.arcaller.models.NoteHistory;
import com.example.arcaller.models.User;
import com.example.arcaller.repositories.CallerNoteRepository;
import com.example.arcaller.repositories.NoteHistoryRepository;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class NoteService {

    private final CallerNoteRepository repository;
    private final NoteHistoryRepository historyRepository;
    private final UserRepository userRepository;

    public NoteService(CallerNoteRepository repository, NoteHistoryRepository historyRepository, UserRepository userRepository) {
        this.repository = repository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
    }

    public List<CallerNote> getAllNotesForUser(String username, String role) {
        if ("ROLE_TL".equals(role)) {
            return repository.findAll();
        } else {
            return repository.findAll().stream()
                    .filter(note -> note.getAllocatedTo() != null && note.getAllocatedTo().getUsername().equals(username))
                    .toList();
        }
    }

    public Optional<CallerNote> getNoteById(Long id) {
        return repository.findById(id);
    }

    public CallerNote createNote(CallerNote note) {
        return repository.save(note);
    }

    public CallerNote updateNote(Long id, CallerNote updatedNote) {
        return repository.findById(id).map(note -> {
            note.setCallerId(updatedNote.getCallerId());
            note.setDos(updatedNote.getDos());
            note.setFin(updatedNote.getFin());
            note.setInsurance(updatedNote.getInsurance());
            note.setBilledAmount(updatedNote.getBilledAmount());
            note.setBalance(updatedNote.getBalance());
            note.setEndAction(updatedNote.getEndAction());
            note.setStatus(updatedNote.getStatus());
            return repository.save(note);
        }).orElseThrow(() -> new RuntimeException("Note not found with id " + id));
    }

    public void deleteNote(Long id) {
        repository.deleteById(id);
    }

    public CallerNote allocateNote(Long noteId, Long userId) {
        CallerNote note = repository.findById(noteId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        note.setAllocatedTo(user);
        return repository.save(note);
    }

    public NoteHistory addNoteHistory(Long noteId, NoteHistory historyEntry) {
        CallerNote note = repository.findById(noteId).orElseThrow();
        historyEntry.setCallerNote(note);
        return historyRepository.save(historyEntry);
    }

    public Map<String, Object> getAnalytics() {
        return Map.of(
            "topPendingReasons", repository.findTopPendingReasons(),
            "highValueAccounts", repository.findHighValueAccounts(),
            "balanceTrends", repository.findBalanceTrends()
        );
    }

    public Map<String, Object> getProductionStats(String username) {
        java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
        int countToday = historyRepository.countByUsernameAndCreatedAtGreaterThanEqual(username, startOfDay);
        return Map.of(
            "workedToday", countToday,
            "target", 40
        );
    }
}
