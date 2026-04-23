package com.example.arcaller.controllers;

import com.example.arcaller.models.User;
import com.example.arcaller.repositories.UserRepository;
import com.example.arcaller.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil, UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );

        Optional<User> userOptional = userRepository.findByUsername(username);
        if (userOptional.isPresent()) {
            String role = userOptional.get().getRole();
            String token = jwtUtil.generateToken(username, role);
            return Map.of("token", token, "role", role, "username", username);
        } else {
            throw new RuntimeException("Invalid credentials");
        }
    }
}
