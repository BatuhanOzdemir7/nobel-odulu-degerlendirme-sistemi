package tr.edu.nobel.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import org.springframework.stereotype.Component;
import tr.edu.nobel.config.JwtProperties;
import tr.edu.nobel.entity.Rol;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Component
public class JwtTokenProvider {
    private final JwtProperties properties;
    private final Clock clock;
    private final SecretKey key;
    private final JwtParser parser;

    public JwtTokenProvider(JwtProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.key = new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.parser = Jwts.parser().verifyWith(key).clock(() -> Date.from(clock.instant())).build();
    }

    public IssuedToken issue(CurrentUserPrincipal user) {
        Instant issuedAt = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        Instant expiresAt = issuedAt.plus(properties.expiration()).truncatedTo(ChronoUnit.SECONDS);
        String value = Jwts.builder()
                .subject(user.kullaniciAdi())
                .claim("uid", user.kullaniciId())
                .claim("role", user.rol().name())
                .claim("entityId", user.entityId())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
        return new IssuedToken(value, expiresAt);
    }

    public TokenIdentity verify(String value) {
        Claims claims = parser.parseSignedClaims(value).getPayload();
        String subject = claims.getSubject();
        Long userId = claims.get("uid", Long.class);
        String role = claims.get("role", String.class);
        if (subject == null || subject.isBlank() || userId == null || role == null || claims.getIssuedAt() == null
                || claims.getExpiration() == null || !claims.getExpiration().toInstant().isAfter(clock.instant())) {
            throw new MalformedJwtException("Geçersiz oturum belirteci.");
        }
        return new TokenIdentity(subject, userId, Rol.valueOf(role), claims.get("entityId", Long.class));
    }

    public record IssuedToken(String value, Instant expiresAt) { }
    public record TokenIdentity(String username, Long userId, Rol role, Long entityId) { }
}
