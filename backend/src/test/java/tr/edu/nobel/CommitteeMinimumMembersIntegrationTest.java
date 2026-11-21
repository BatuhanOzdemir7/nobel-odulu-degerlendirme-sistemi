package tr.edu.nobel;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tr.edu.nobel.entity.DegerlendirmeKomitesi;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class CommitteeMinimumMembersIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("nobel_test")
            .withUsername("nobel_user")
            .withPassword("nobel_password");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired EntityManager entityManager;
    @Autowired TransactionTemplate transactionTemplate;

    @Test
    void rejectsCommitteeCreationWithFewerThanThreeMembersAtCommit() {
        assertThatThrownBy(() -> transactionTemplate.execute(status -> {
            DegerlendirmeKomitesi committee = new DegerlendirmeKomitesi();
            committee.setKomiteAdi("Yetersiz üyeli test komitesi");
            committee.setKategoriId(1L);
            entityManager.persist(committee);
            entityManager.flush();
            return null;
        })).satisfies(error -> org.assertj.core.api.Assertions.assertThat(rootMessage(error))
                .contains("Komite en az 3 uzman üyeye sahip olmalıdır"));
    }

    @Test
    void rejectsRemovingMemberWhenCommitteeWouldHaveFewerThanThree() {
        assertThatThrownBy(() -> transactionTemplate.execute(status -> {
            entityManager.createNativeQuery("DELETE FROM komite_uyesi WHERE komite_id = 1 AND uzman_id = 1")
                    .executeUpdate();
            return null;
        })).satisfies(error -> org.assertj.core.api.Assertions.assertThat(rootMessage(error))
                .contains("Komite en az 3 uzman üyeye sahip olmalıdır"));
    }

    private String rootMessage(Throwable error) {
        Throwable current = error;
        while (current.getCause() != null) current = current.getCause();
        return current.getMessage();
    }
}
