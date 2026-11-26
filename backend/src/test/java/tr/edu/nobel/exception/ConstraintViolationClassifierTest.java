package tr.edu.nobel.exception;

import org.junit.jupiter.api.Test;
import tr.edu.nobel.dto.response.activity.ErHighlightDto.Severity;
import tr.edu.nobel.mapper.activity.ErHighlightCatalog;
import java.sql.SQLException;
import static org.assertj.core.api.Assertions.assertThat;

class ConstraintViolationClassifierTest {
    @Test
    void classifiesDeferredTriggerAndExtractsCommitteeId() {
        var violation = ConstraintViolationClassifier.classify("23514", "komite_en_az_uc_uzman", null,
                "Komite en az 3 uzman üyeye sahip olmalıdır (komite_id=8; mevcut üye=2).");
        assertThat(violation.committeeId()).isEqualTo(8L);
        assertThat(violation.message()).isEqualTo("PostgreSQL Trigger: En az 3 uzman gerekli!");
        var highlight = ErHighlightCatalog.constraint(violation.committeeRelated(), violation.tableName());
        assertThat(highlight.severity()).isEqualTo(Severity.ERROR);
        assertThat(highlight.nodes()).containsExactly("UZMAN", "uyesidir", "DEGERLENDIRME_KOMITESI");
    }

    @Test
    void classifiesLegacyRaiseExceptionAndWhitelistsMessages() {
        var trigger = ConstraintViolationClassifier.classify("P0001", null, null, "En az 3 uzman gerekli!");
        assertThat(trigger.committeeRelated()).isTrue();

        var foreignKey = ConstraintViolationClassifier.classify("23503", "odul_kategori_id_fkey",
                "odul", "Internal row: sifre=secret");
        assertThat(foreignKey.committeeRelated()).isFalse();
        assertThat(foreignKey.message()).doesNotContain("secret");
        assertThat(ErHighlightCatalog.constraint(false, foreignKey.tableName()).nodes()).containsExactly("ODUL");

        var unique = ConstraintViolationClassifier.classify("23505", null, "kategori", "Internal duplicate values");
        assertThat(unique.message()).isEqualTo("Aynı anahtarla bir kayıt zaten var.");
        assertThat(ErHighlightCatalog.constraint(false, null).nodes()).isEmpty();
        assertThat(ConstraintViolationClassifier.from(new SQLException("Not a PostgreSQL error", "23514"), null)).isEmpty();
    }
}
