package com.cloudstorage.service;

import com.cloudstorage.dto.request.LoginRequest;
import com.cloudstorage.dto.request.RegisterRequest;
import com.cloudstorage.dto.response.AuthResponse;
import com.cloudstorage.dto.response.UserDto;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.DuplicateResourceException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Transactional
    public UserDto register(RegisterRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new DuplicateResourceException("Username already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("Email already taken");
        }
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        return toDto(userRepository.save(user));
    }

    public AuthResponse login(LoginRequest request) {
        String login = request.getUsernameOrEmail().trim();
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(login, request.getPassword()));
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(login, login)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return AuthResponse.builder()
                .token(jwtUtil.generateToken(user.getId(), user.getUsername()))
                .expiresIn(jwtUtil.getExpirationMs())
                .user(toDto(user))
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return AuthResponse.builder()
                .token(jwtUtil.generateToken(user.getId(), user.getUsername()))
                .expiresIn(jwtUtil.getExpirationMs())
                .build();
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }
}
