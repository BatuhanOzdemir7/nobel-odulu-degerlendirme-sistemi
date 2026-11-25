package tr.edu.nobel.config;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "nobel.security.jwt")
public record JwtProperties(String secret, @NotNull Duration expiration) {
    @AssertTrue(message = "JWT anahtarı en az 32 bayt olmalıdır.")
    public boolean isSecretLongEnough() {
        return secret != null && secret.getBytes(StandardCharsets.UTF_8).length >= 32;
    }

    @AssertTrue(message = "JWT süresi pozitif olmalıdır.")
    public boolean isExpirationPositive() {
        return expiration != null && expiration.isPositive();
    }
}
