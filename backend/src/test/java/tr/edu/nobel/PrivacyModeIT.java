package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PrivacyModeIT extends AuthPostgresIntegration {
    @Test
    void switchesBetweenMaskedAndTransparentViews() throws Exception {
        String admin = bearer("admin", "admin123");
        String candidate = bearer("aday_1", "123456");
        var settings = "/api/admin/ayarlar/gizlilik-modu";
        var summary = "/api/portal/aday/ozet";
        mvc.perform(options(settings).header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
        mvc.perform(get(settings).header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.mod").value("SEFFAF"));

        try {
            changeMode(admin, settings, "GIZLI");
            mvc.perform(get(summary).header(HttpHeaders.AUTHORIZATION, candidate))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.gizlilikModu").value("GIZLI"))
                    .andExpect(jsonPath("$.adayliklar[0].kurulusAdi").value("Gizli Kuruluş"))
                    .andExpect(jsonPath("$.adayliklar[0].tarih").isEmpty())
                    .andExpect(jsonPath("$.adayliklar[0].saat").isEmpty())
                    .andExpect(jsonPath("$.adayliklar[0].sonuc").isEmpty())
                    .andExpect(jsonPath("$.adayliklar[0].asama").value("KOMITE_INCELEMESINDE"))
                    .andExpect(jsonPath("$.degerlendirmeler.length()").value(0));
        } finally {
            changeMode(admin, settings, "SEFFAF");
        }

        mvc.perform(get(summary).header(HttpHeaders.AUTHORIZATION, candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.gizlilikModu").value("SEFFAF"))
                .andExpect(jsonPath("$.adayliklar[0].kurulusAdi").value("Küresel Bilim Akademisi"))
                .andExpect(jsonPath("$.adayliklar[0].tarih").isNotEmpty())
                .andExpect(jsonPath("$.degerlendirmeler[0].sonuc").value("Ön değerlendirmede başarılı"));
    }

    private void changeMode(String admin, String settings, String mode) throws Exception {
        mvc.perform(put(settings).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mod\":\"%s\"}".formatted(mode)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.mod").value(mode));
    }
}
