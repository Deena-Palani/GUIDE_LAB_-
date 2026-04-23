package com.example.arcaller.controllers;

import com.example.arcaller.models.TimeLog;
import com.example.arcaller.models.User;
import com.example.arcaller.repositories.TimeLogRepository;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/time-tracker")
@CrossOrigin(origins = "*")
public class TimeTrackerController {

    private final TimeLogRepository repository;
    private final UserRepository userRepository;

    public TimeTrackerController(TimeLogRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Optional<User> userOpt = userRepository.findByUsername(auth.getName());
        return userOpt.orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<TimeLog> getAllForUser() {
        return repository.findByUserOrderByTimestampDesc(getCurrentUser());
    }

    @PostMapping
    public TimeLog logEvent(@RequestParam String event, @RequestParam(required = false) String reason) {
        // Events: LOGIN, LOGOUT, BREAK_START, BREAK_END
        TimeLog log = new TimeLog();
        log.setUser(getCurrentUser());
        log.setEventType(event);
        log.setTimestamp(LocalDateTime.now());
        if(reason != null && !reason.trim().isEmpty()) {
            log.setReason(reason);
        }
        return repository.save(log);
    }
}
