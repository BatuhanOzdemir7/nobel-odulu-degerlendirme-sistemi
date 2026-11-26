package tr.edu.nobel;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tr.edu.nobel.dto.request.*;
import tr.edu.nobel.entity.OyKarari;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

abstract class PortalWorkflowITSupport extends AuthPostgresIntegration {
    static final String NOMINATIONS = "/api/portal/kurulus/aday-gostermeler";
    static final String CANDIDATE = "/api/portal/aday/ozet";
    static final String EXPERT = "/api/portal/uzman";

    long firstCommittee() {
        return jdbc.queryForObject("SELECT min(komite_id) FROM degerlendirme_komitesi", Long.class);
    }

    long physicsAward() {
        return jdbc.queryForObject("""
                SELECT min(o.odul_no) FROM odul o JOIN degerlendirme_komitesi k ON k.kategori_id = o.kategori_id
                WHERE k.komite_id = ?
                """, Long.class, firstCommittee());
    }

    long otherAward() {
        return jdbc.queryForObject("""
                SELECT min(o.odul_no) FROM odul o JOIN degerlendirme_komitesi k ON k.kategori_id <> o.kategori_id
                WHERE k.komite_id = ?
                """, Long.class, firstCommittee());
    }

    static YeniAdayRequest newCandidate(String name) {
        return new YeniAdayRequest(name, "Örnek", "Kadın", LocalDate.of(1990, 1, 1), "Türkiye", "Uygulamalı Fizik");
    }

    ResultActions postJson(String url, String bearer, Object input) throws Exception {
        return mvc.perform(post(url).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(input)));
    }

    JsonNode createNomination(String name, long award) throws Exception {
        return json.readTree(postJson(NOMINATIONS, bearer("kurulus_cern", "123456"),
                new AdayGostermeRequest(null, newCandidate(name), award)).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsByteArray());
    }

    ResultActions vote(String bearer, long committee, long candidate, OyKarari decision) throws Exception {
        return postJson(EXPERT + "/oylar", bearer, new OyRequest(committee, candidate, "Özgünlük", decision));
    }

    int decisionCount(long committee, long candidate) {
        return jdbc.queryForObject("SELECT count(*) FROM degerlendirme WHERE komite_id = ? AND aday_id = ?",
                Integer.class, committee, candidate);
    }
}
