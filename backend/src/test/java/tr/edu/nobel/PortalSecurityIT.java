package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PortalSecurityIT extends AuthPostgresIntegration {
    @Test
    void rejectsCrossRoleRequests() throws Exception {
        mvc.perform(get("/api/portal/uzman/komitelerim").header(HttpHeaders.AUTHORIZATION, bearer("kurulus_cern", "123456")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/portal/kurulus/oduller").header(HttpHeaders.AUTHORIZATION, bearer("uzman_1", "123456")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/ayarlar/gizlilik-modu").header(HttpHeaders.AUTHORIZATION, bearer("aday_1", "123456")))
                .andExpect(status().isForbidden());
    }

    @Test
    void scopesListsToThePrincipalAndSearchesTurkishNamesLiterally() throws Exception {
        String organization = bearer("kurulus_cern", "123456");
        var list = mvc.perform(get("/api/portal/kurulus/aday-gostermeler").param("kurulusNo", "2")
                        .header(HttpHeaders.AUTHORIZATION, organization)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(json.readTree(list).findValuesAsText("kurulusAdi")).containsOnly("Küresel Bilim Akademisi");
        mvc.perform(get("/api/portal/aday/ozet").param("adayId", "3")
                        .header(HttpHeaders.AUTHORIZATION, bearer("aday_1", "123456")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.aday.ad").value("Ada"));
        mvc.perform(get("/api/portal/kurulus/aday-ara").param("q", "YILMAZ").header(HttpHeaders.AUTHORIZATION, organization))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].gorunenAd").value("Ada Yılmaz"))
                .andExpect(jsonPath("$[0].hesapVar").value(true)).andExpect(jsonPath("$[0].kullaniciAdi").doesNotExist());
        mvc.perform(get("/api/portal/kurulus/aday-ara").param("q", "a").header(HttpHeaders.AUTHORIZATION, organization))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/portal/kurulus/aday-ara").param("q", "%%").header(HttpHeaders.AUTHORIZATION, organization))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }
}
