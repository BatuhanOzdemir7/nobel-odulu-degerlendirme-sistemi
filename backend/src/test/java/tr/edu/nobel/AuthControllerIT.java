package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerIT extends AuthPostgresIntegration {
    @Test
    void adminLoginReturnsBearerAndSafeUserData() throws Exception {
        login("admin", "admin123")
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.user.rol").value("ADMIN"))
                .andExpect(jsonPath("$.user.displayName").value("Yönetici"))
                .andExpect(jsonPath("$.user.sifreHash").doesNotExist());
    }

    @Test
    void unknownWrongAndInactiveAccountsReturnTheSameMessage() throws Exception {
        String message = "Kullanıcı adı veya şifre hatalı";
        login("admin", "yanlis").andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value(message));
        login("olmayan_kullanici", "admin123").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(message));
        login("admin", "ü".repeat(40)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(message));

        jdbc.update("UPDATE kullanici SET aktif = FALSE WHERE kullanici_adi = 'aday_1'");
        try {
            login("aday_1", "123456").andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value(message));
        } finally {
            jdbc.update("UPDATE kullanici SET aktif = TRUE WHERE kullanici_adi = 'aday_1'");
        }
    }

    @Test
    void meRequiresValidBearerAndReadsRoleLabel() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer("kurulus_cern", "123456")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("KURULUS"))
                .andExpect(jsonPath("$.kurulusNo").isNumber())
                .andExpect(jsonPath("$.displayName").value("Küresel Bilim Akademisi"))
                .andExpect(jsonPath("$.sifreHash").doesNotExist());
    }
}
