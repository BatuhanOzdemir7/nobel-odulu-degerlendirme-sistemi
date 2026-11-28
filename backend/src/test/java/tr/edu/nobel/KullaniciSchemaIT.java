package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KullaniciSchemaIT extends AuthPostgresIntegration {
    @Test
    void cleanDatabaseAppliesMigrationsInVersionOrderAndValidatesHibernateMappings() {
        assertThat(jdbc.queryForList("""
                SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank
                """, String.class)).containsExactly("1", "2", "3", "4", "5", "6", "7");
        assertThat(jdbc.queryForObject("""
                SELECT deger FROM sistem_ayari WHERE anahtar = 'GIZLILIK_MODU'
                """, String.class)).isEqualTo("SEFFAF");
    }

    @Test
    void databaseRejectsRoleOwnershipMismatches() {
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, kurulus_no)
                SELECT 'gecersiz_uzman', 'test', 'UZMAN', kurulus_no
                FROM kurulus WHERE ad = 'Uluslararası Sağlık Enstitüsü'
                """)).isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_kullanici_sahiplik");

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, aday_id)
                SELECT 'gecersiz_admin', 'test', 'ADMIN', aday_id
                FROM aday WHERE ad = 'Deniz' AND soyad = 'Kaya'
                """)).isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_kullanici_sahiplik");
    }
}
