package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityRulesIT extends AuthPostgresIntegration {
    private static final String TEST_USER = "security_test_kurulus";
    private static final String TEST_PASSWORD = "kurulus-test-sifre";

    @Autowired PasswordEncoder passwords;

    @Test
    void adminCanUseExistingCrudAndOtherRolesReceiveJsonForbidden() throws Exception {
        mvc.perform(get("/api/kategoriler")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.path").value("/api/kategoriler"));
        mvc.perform(get("/api/kategoriler").header(HttpHeaders.AUTHORIZATION, bearer("admin", "admin123")))
                .andExpect(status().isOk());

        createOrganizationUser();
        try {
            String bearer = bearer(TEST_USER, TEST_PASSWORD);
            for (String endpoint : new String[]{"/api/kategoriler", "/api/komiteler", "/api/admin/test",
                    "/api/portal/aday/test", "/api/portal/uzman/test"}) {
                mvc.perform(get(endpoint).header(HttpHeaders.AUTHORIZATION, bearer)).andExpect(status().isForbidden())
                        .andExpect(jsonPath("$.status").value(403))
                        .andExpect(jsonPath("$.path").value(endpoint));
            }
        } finally {
            removeTestUser();
        }
    }

    @Test
    void corsAllowsUnauthenticatedPreflightWithAuthorizationHeader() throws Exception {
        mvc.perform(options("/api/kategoriler")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString("authorization")));
    }

    @Test
    void oldTokenStopsWorkingWhenDatabaseRoleChanges() throws Exception {
        createOrganizationUser();
        try {
            String bearer = bearer(TEST_USER, TEST_PASSWORD);
            jdbc.update("UPDATE kullanici SET rol = 'ADMIN', kurulus_no = NULL WHERE kullanici_adi = ?", TEST_USER);
            mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isUnauthorized());
        } finally {
            removeTestUser();
        }
    }

    private void createOrganizationUser() {
        jdbc.update("""
                INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, kurulus_no)
                SELECT ?, ?, 'KURULUS', kurulus_no FROM kurulus WHERE ad = 'Uluslararası Sağlık Enstitüsü'
                """, TEST_USER, passwords.encode(TEST_PASSWORD));
    }

    private void removeTestUser() {
        jdbc.update("DELETE FROM kullanici WHERE kullanici_adi = ?", TEST_USER);
    }
}
