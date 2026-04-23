package com.example.arcaller.controllers;

import com.example.arcaller.models.CallerNote;
import com.example.arcaller.models.NoteHistory;
import com.example.arcaller.services.NoteService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) {
        this.service = service;
    }

    private Authentication getAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @GetMapping
    public List<CallerNote> getAll() {
        Authentication auth = getAuth();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        return service.getAllNotesForUser(auth.getName(), role);
    }

    @PostMapping
    public CallerNote create(@Valid @RequestBody CallerNote note) {
        return service.createNote(note);
    }

    @PutMapping("/{id}")
    public CallerNote update(@PathVariable Long id, @Valid @RequestBody CallerNote note) {
        return service.updateNote(id, note);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteNote(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/allocate/{userId}")
    public CallerNote allocate(@PathVariable Long id, @PathVariable Long userId) {
        return service.allocateNote(id, userId);
    }

    @PostMapping("/{id}/history")
    public NoteHistory addHistory(@PathVariable Long id, @RequestBody NoteHistory history) {
        history.setUsername(getAuth().getName());
        return service.addNoteHistory(id, history);
    }

    @GetMapping("/analytics")
    public Map<String, Object> getAnalytics() {
        return service.getAnalytics();
    }

    @GetMapping("/production-stats")
    public Map<String, Object> getProductionStats() {
        return service.getProductionStats(getAuth().getName());
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportCsv() {
        Authentication auth = getAuth();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        List<CallerNote> notes = service.getAllNotesForUser(auth.getName(), role);

        StringBuilder csv = new StringBuilder();
        csv.append("ID,Caller ID,DOS,FIN,Insurance,Billed Amount,Balance,End Action,Status,Allocated To\n");
        for (CallerNote note : notes) {
            String allocated = note.getAllocatedTo() != null ? note.getAllocatedTo().getUsername() : "Unassigned";
            csv.append(String.format("%d,%s,%s,%s,%s,%.2f,%.2f,%s,%s,%s\n",
                    note.getId(), note.getCallerId(), note.getDos(), note.getFin(), note.getInsurance(),
                    note.getBilledAmount(), note.getBalance(), note.getEndAction(), note.getStatus(), allocated));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=gms.csv");
        headers.set(HttpHeaders.CONTENT_TYPE, "text/csv");

        return new ResponseEntity<>(csv.toString(), headers, org.springframework.http.HttpStatus.OK);
    }
}
