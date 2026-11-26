package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import tr.edu.nobel.dto.request.DemoLoginRequest;
import tr.edu.nobel.entity.Rol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {"nobel.security.local-demo-login=true", "server.address=127.0.0.1"})
class LocalDemoLoginIT extends AuthPostgresIntegration {
    private static final String ORIGIN = "http://localhost:4200";

    @Test
    void newlyAddedCandidateCanOpenTheirOwnPortalWithoutAnAccount() throws Exception {
        mvc.perform(get("/api/auth/demo-accounts").header(HttpHeaders.ORIGIN, ORIGIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].rol", hasItems("ADMIN", "KURULUS", "UZMAN", "ADAY")))
                .andExpect(jsonPath("$[*].sifreHash").isEmpty());

        Long id = jdbc.queryForObject("""
                INSERT INTO aday (ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani)
                VALUES ('Demo', 'Adayı', 'Belirtilmedi', DATE '1980-01-01', 'TR', 'Fizik') RETURNING aday_id
                """, Long.class);

        mvc.perform(get("/api/auth/demo-accounts").header(HttpHeaders.ORIGIN, ORIGIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].displayName", hasItems("Demo Adayı")));
        byte[] body = select(Rol.ADAY, id).andExpect(status().isOk())
                .andExpect(jsonPath("$.user.rol").value("ADAY"))
                .andExpect(jsonPath("$.user.adayId").value(id))
                .andExpect(jsonPath("$.user.kullaniciId").isEmpty())
                .andReturn().getResponse().getContentAsByteArray();
        String bearer = "Bearer " + json.readTree(body).path("accessToken").asText();

        mvc.perform(get("/api/portal/aday/ozet").header(HttpHeaders.ORIGIN, ORIGIN)
                        .header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aday.adayId").value(id));
        mvc.perform(get("/api/admin/privacy-mode").header(HttpHeaders.ORIGIN, ORIGIN)
                        .header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kullanici WHERE aday_id = ?", Integer.class, id))
                .isZero();

        jdbc.update("DELETE FROM aday WHERE aday_id = ?", id);
        mvc.perform(get("/api/auth/me").header(HttpHeaders.ORIGIN, ORIGIN)
                        .header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void demoEndpointsRejectNonLocalRequests() throws Exception {
        mvc.perform(get("/api/auth/demo-accounts"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/demo-accounts").header(HttpHeaders.ORIGIN, ORIGIN).with(request -> {
            request.setRemoteAddr("192.0.2.1");
            return request;
        })).andExpect(status().isForbidden());
    }

    private ResultActions select(Rol role, long id) throws Exception {
        return mvc.perform(post("/api/auth/demo-login").header(HttpHeaders.ORIGIN, ORIGIN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(new DemoLoginRequest(role, id))));
    }
}
