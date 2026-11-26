package tr.edu.nobel;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tr.edu.nobel.config.JwtProperties;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.security.CurrentUserPrincipal;
import tr.edu.nobel.security.JwtTokenProvider;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {
    private static final JwtProperties PROPERTIES =
            new JwtProperties("a-test-signing-secret-with-at-least-32-bytes", Duration.ofHours(8));
    private static final Instant NOW = Instant.parse("2026-11-25T07:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneId.of("Europe/Istanbul"));
    private static final CurrentUserPrincipal USER = new CurrentUserPrincipal(12L, "test_uzman", Rol.UZMAN,
            null, null, 29L);

    @Test
    void issuedTokenValidatesWithIdentityAndExpiry() {
        JwtTokenProvider provider = new JwtTokenProvider(PROPERTIES, CLOCK);
        var token = provider.issue(USER);

        assertThat(token.expiresAt()).isEqualTo(NOW.plus(Duration.ofHours(8)));
        assertThat(provider.verify(token.value())).isEqualTo(new JwtTokenProvider.TokenIdentity(
                "test_uzman", 12L, Rol.UZMAN, 29L));
    }

    @Test
    void rejectsExpiredTokenUsingInjectedClock() {
        String value = new JwtTokenProvider(PROPERTIES, CLOCK).issue(USER).value();
        var laterProvider = new JwtTokenProvider(PROPERTIES, Clock.offset(CLOCK, Duration.ofHours(9)));

        assertThatThrownBy(() -> laterProvider.verify(value)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void rejectsSignatureFromAnotherKey() {
        var otherProperties = new JwtProperties("a-different-test-key-at-least-32-bytes", PROPERTIES.expiration());
        String value = new JwtTokenProvider(otherProperties, CLOCK).issue(USER).value();

        assertThatThrownBy(() -> new JwtTokenProvider(PROPERTIES, CLOCK).verify(value))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void applicationContextRejectsSecretShorterThan32Bytes() {
        new ApplicationContextRunner()
                .withUserConfiguration(JwtBindingConfiguration.class)
                .withPropertyValues("nobel.security.jwt.secret=short", "nobel.security.jwt.expiration=PT8H")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasStackTraceContaining("JWT anahtarı en az 32 bayt");
                });
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableConfigurationProperties(JwtProperties.class)
    static class JwtBindingConfiguration { }
}
