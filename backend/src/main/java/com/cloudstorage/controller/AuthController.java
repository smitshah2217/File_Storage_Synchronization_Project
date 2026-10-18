package com.cloudstorage.controller;

import com.cloudstorage.dto.request.LoginRequest;
import com.cloudstorage.dto.request.RegisterRequest;
import com.cloudstorage.dto.response.AuthResponse;
import com.cloudstorage.dto.response.UserDto;
import com.cloudstorage.security.JwtUtil;
import com.cloudstorage.service.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Claims claims = jwtUtil.getClaimsFromToken(header.substring(7).trim());
        Number userId = claims.get("userId", Number.class);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.refresh(userId.longValue()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // JWT logout is stateless by design; the client discards its token.
        return ResponseEntity.ok().build();
    }
}
