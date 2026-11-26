package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.entity.PrivacyMode;
import tr.edu.nobel.service.AdayViewMasker;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AdayViewMaskerTest {
    private final AdayViewMasker masker = new AdayViewMasker();
    private final LocalDate date = LocalDate.of(2026, 10, 1);
    private final AdayGostermeGorunumResponse nomination = new AdayGostermeGorunumResponse(1L, 2L, "Deniz Kaya",
            3L, "Fizik Ödülü", "Fizik", "Küresel Bilim Akademisi", date,
            LocalTime.NOON, AdaylikAsamasi.KARAR_VERILDI, "KABUL");
    private final DegerlendirmeResponse decision = new DegerlendirmeResponse(4L, 5L, "Fizik Komitesi", 2L, date,
            "KABUL", "Özgünlük");

    @Test
    void preservesTransparentFields() {
        var view = new AdayOzetResponse(null, List.of(nomination), List.of(decision), PrivacyMode.SEFFAF);
        assertThat(masker.mask(view)).isEqualTo(view);
    }

    @Test
    void hidesOrganizationDateAndDecisionButKeepsTheStage() {
        var view = masker.mask(new AdayOzetResponse(null, List.of(nomination), List.of(decision), PrivacyMode.GIZLI));
        var masked = view.adayliklar().getFirst();
        assertThat(masked.kurulusAdi()).isEqualTo("Gizli Kuruluş");
        assertThat(masked.odulAdi()).isEqualTo(nomination.odulAdi());
        assertThat(masked.asama()).isEqualTo(AdaylikAsamasi.KARAR_VERILDI);
        assertThat(masked.tarih()).isNull();
        assertThat(masked.saat()).isNull();
        assertThat(masked.sonuc()).isNull();
        assertThat(view.degerlendirmeler()).isEmpty();
    }
}
