package com.example.arcaller.controllers;

import com.example.arcaller.models.CallLog;
import com.example.arcaller.models.User;
import com.example.arcaller.repositories.CallLogRepository;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/call-logs")
@CrossOrigin(origins = "*")
public class CallLogController {

    private final CallLogRepository repository;
    private final UserRepository userRepository;

    public CallLogController(CallLogRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Optional<User> userOpt = userRepository.findByUsername(auth.getName());
        return userOpt.orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<CallLog> getAllForUser() {
        return repository.findByUserOrderByCallDateDesc(getCurrentUser());
    }

    @PostMapping
    public CallLog create(@RequestBody CallLog log) {
        log.setUser(getCurrentUser());
        log.setCallDate(LocalDateTime.now());
        return repository.save(log);
    }
}
