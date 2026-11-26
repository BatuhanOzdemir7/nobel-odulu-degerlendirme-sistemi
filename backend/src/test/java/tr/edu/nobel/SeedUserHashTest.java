package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class SeedUserHashTest {
    @Test
    void migrationHashesMatchTheDocumentedDemoPasswords() throws IOException {
        String sql = new ClassPathResource("db/migration/V5__seed_users.sql").getContentAsString(StandardCharsets.UTF_8);
        List<String> hashes = Pattern.compile("\\$2a\\$10\\$[./A-Za-z0-9]{53}")
                .matcher(sql).results().map(MatchResult::group).distinct().toList();
        PasswordEncoder encoder = new BCryptPasswordEncoder(10);

        assertThat(hashes).hasSize(2);
        assertThat(encoder.matches("admin123", hashes.get(0))).isTrue();
        assertThat(encoder.matches("123456", hashes.get(1))).isTrue();
    }
}
