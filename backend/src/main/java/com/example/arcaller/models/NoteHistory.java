package com.example.arcaller.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "note_histories")
@NoArgsConstructor
@AllArgsConstructor
public class NoteHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caller_note_id")
    @JsonIgnore
    private CallerNote callerNote;

    @NotNull
    private String username;

    @Column(columnDefinition = "TEXT")
    private String noteText;

    private String actionTaken;

    @NotNull
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CallerNote getCallerNote() { return callerNote; }
    public void setCallerNote(CallerNote callerNote) { this.callerNote = callerNote; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getNoteText() { return noteText; }
    public void setNoteText(String noteText) { this.noteText = noteText; }

    public String getActionTaken() { return actionTaken; }
    public void setActionTaken(String actionTaken) { this.actionTaken = actionTaken; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
