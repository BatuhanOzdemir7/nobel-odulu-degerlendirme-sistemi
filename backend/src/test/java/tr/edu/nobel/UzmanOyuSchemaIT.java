package tr.edu.nobel;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class UzmanOyuSchemaIT extends AuthPostgresIntegration {
    @Autowired DataSource dataSource;
    @Autowired EntityManagerFactoryBuilder entityManagers;

    @Test
    void enforcesMembershipUniqueVoteAndAllowedDecisionInPostgres() {
        long committee = jdbc.queryForObject("SELECT min(komite_id) FROM degerlendirme_komitesi", Long.class);
        long member = jdbc.queryForObject("SELECT min(uzman_id) FROM komite_uyesi WHERE komite_id = ?", Long.class, committee);
        long outsider = jdbc.queryForObject("""
                SELECT min(uzman_id) FROM uzman
                WHERE uzman_id NOT IN (SELECT uzman_id FROM komite_uyesi WHERE komite_id = ?)
                """, Long.class, committee);
        long candidate = jdbc.queryForObject("SELECT min(aday_id) FROM aday", Long.class);
        String insert = "INSERT INTO uzman_oyu (komite_id, uzman_id, aday_id, olcut, karar) VALUES (?, ?, ?, 'Özgünlük', ?)";

        assertThatThrownBy(() -> jdbc.update(insert, committee, outsider, candidate, "KABUL"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("fk_uzman_oyu_komite_uyesi");
        assertThatThrownBy(() -> jdbc.update(insert, committee, member, candidate, "GEÇERSİZ"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_uzman_oyu_karar");
        jdbc.update(insert, committee, member, candidate, "KABUL");
        try {
            assertThatThrownBy(() -> jdbc.update(insert, committee, member, candidate, "RED"))
                    .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("uq_uzman_oyu");
        } finally {
            jdbc.update("DELETE FROM uzman_oyu WHERE komite_id = ? AND aday_id = ?", committee, candidate);
        }
    }

    @Test
    void migratesAnExisting2aSchemaOutOfOrder(@TempDir Path baseline) throws Exception {
        for (String file : List.of("V1__init_schema.sql", "V2__seed_data.sql", "V3__auth_rbac.sql", "V5__seed_users.sql")) {
            try (var input = new ClassPathResource("db/migration/" + file).getInputStream()) {
                Files.copy(input, baseline.resolve(file));
            }
        }
        String schema = "phase_2a_upgrade";
        Flyway.configure().dataSource(dataSource).schemas(schema).locations("filesystem:" + baseline).load().migrate();
        jdbc.update("""
                INSERT INTO phase_2a_upgrade.degerlendirme (aday_id, komite_id, tarih, sonuc, olcut)
                SELECT aday_id, komite_id, tarih + 1, 'KABUL', olcut
                FROM phase_2a_upgrade.degerlendirme WHERE sonuc = 'Ön değerlendirmede başarılı'
                """);
        Flyway.configure().dataSource(dataSource).schemas(schema).outOfOrder(true).load().migrate();

        assertThat(jdbc.queryForList("""
                SELECT sonuc FROM phase_2a_upgrade.degerlendirme
                WHERE kesinlesmis AND tarih = DATE '2025-03-02'
                """, String.class)).containsExactly("KABUL");

        assertThat(jdbc.queryForList("""
                SELECT version FROM phase_2a_upgrade.flyway_schema_history
                WHERE success AND version IS NOT NULL ORDER BY installed_rank
                """, String.class)).containsExactly("1", "2", "3", "5", "4", "6", "7");
        assertThat(jdbc.queryForList("SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank",
                String.class)).containsExactly("1", "2", "3", "4", "5", "6", "7");

        var upgraded = entityManagers.dataSource(dataSource).packages("tr.edu.nobel.entity")
                .persistenceUnit("phase2b-upgrade-validation")
                .properties(Map.of("hibernate.default_schema", schema, "hibernate.hbm2ddl.auto", "validate")).build();
        try {
            upgraded.afterPropertiesSet();
            assertThat(upgraded.getObject()).isNotNull();
        } finally {
            upgraded.destroy();
        }
    }
}
