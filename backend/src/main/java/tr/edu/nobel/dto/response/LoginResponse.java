package tr.edu.nobel.dto.response;

import java.time.Instant;

public record LoginResponse(String accessToken, String tokenType, Instant expiresAt, AuthUserResponse user) { }
