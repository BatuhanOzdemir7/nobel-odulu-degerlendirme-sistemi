package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import tr.edu.nobel.dto.request.*;
import tr.edu.nobel.entity.OyKarari;
import tr.edu.nobel.event.*;

import java.time.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RecordApplicationEvents
class EndToEndWorkflowIT extends PortalWorkflowITSupport {
    @Autowired ApplicationEvents events;
    @Autowired Clock clock;

    @Test
    void recordsNominationsAndVotesThenPublishesOneFinalDecision() throws Exception {
        long committee = firstCommittee();
        long award = physicsAward();
        var before = ZonedDateTime.now(clock).minusSeconds(1);
        var response = createNomination("Ece", award);
        var after = ZonedDateTime.now(clock).plusSeconds(1);
        var nomination = response.path("adayGosterme");
        long candidate = nomination.path("adayId").asLong();
        var account = response.path("yeniHesap");
        assertThat(account.path("kullaniciAdi").asText()).isEqualTo("aday_" + candidate);
        String password = account.path("geciciSifre").asText();
        assertThat(password).hasSize(10);
        assertThat(jdbc.queryForObject("SELECT sifre_hash FROM kullanici WHERE aday_id = ?", String.class, candidate))
                .startsWith("$2").isNotEqualTo(password);
        var recorded = LocalDate.parse(nomination.path("tarih").asText())
                .atTime(LocalTime.parse(nomination.path("saat").asText())).atZone(clock.getZone());
        assertThat(recorded).isBetween(before, after);

        String organization = bearer("kurulus_cern", "123456");
        postJson(NOMINATIONS, organization, new AdayGostermeRequest(candidate, null, otherAward()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.yeniHesap").isEmpty());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kullanici WHERE aday_id = ?", Integer.class, candidate)).isEqualTo(1);
        postJson(NOMINATIONS, organization, new AdayGostermeRequest(candidate, null, award)).andExpect(status().isConflict());
        postJson(NOMINATIONS, organization, new AdayGostermeRequest(candidate, newCandidate("Yasak"), award))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.adaySecimi").exists());

        String candidateToken = bearer(account.path("kullaniciAdi").asText(), password);
        mvc.perform(get(CANDIDATE).header(HttpHeaders.AUTHORIZATION, candidateToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.adayliklar.length()").value(2))
                .andExpect(jsonPath("$.adayliklar[0].asama").value("ADAYLIK_ALINDI"));

        String first = bearer("uzman_1", "123456");
        String second = bearer("uzman_2", "123456");
        String third = bearer("uzman_3", "123456");
        mvc.perform(get(EXPERT + "/komitelerim").header(HttpHeaders.AUTHORIZATION, first))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].komiteId").value((int) committee))
                .andExpect(jsonPath("$[0].uyeler.length()").value(3));
        vote(first, committee, candidate, OyKarari.KABUL).andExpect(status().isCreated())
                .andExpect(jsonPath("$.votesCast").value(1)).andExpect(jsonPath("$.kararKesinlesti").value(false));
        vote(first, committee, candidate, OyKarari.RED).andExpect(status().isConflict());
        postJson(EXPERT + "/karar-kesinlestir", first, new KararKesinlestirRequest(committee, candidate))
                .andExpect(status().isConflict());
        mvc.perform(get(CANDIDATE).header(HttpHeaders.AUTHORIZATION, candidateToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.adayliklar[?(@.odulId == " + award + ")].asama").value(contains("KOMITE_INCELEMESINDE")));

        vote(second, committee, candidate, OyKarari.KABUL).andExpect(status().isCreated())
                .andExpect(jsonPath("$.votesCast").value(2));
        mvc.perform(get(EXPERT + "/komiteler/" + committee + "/adaylar").header(HttpHeaders.AUTHORIZATION, first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.adayId == " + candidate + ")].myVote.karar").value(contains("KABUL")))
                .andExpect(jsonPath("$[?(@.adayId == " + candidate + ")].votesCast").value(contains(2)));
        assertThat(decisionCount(committee, candidate)).isZero();
        vote(third, committee, candidate, OyKarari.RED).andExpect(status().isCreated())
                .andExpect(jsonPath("$.votesCast").value(3)).andExpect(jsonPath("$.votesRequired").value(3))
                .andExpect(jsonPath("$.kararKesinlesti").value(true)).andExpect(jsonPath("$.degerlendirme.sonuc").value("KABUL"));
        vote(third, committee, candidate, OyKarari.RED).andExpect(status().isConflict());
        assertThat(decisionCount(committee, candidate)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM uzman_oyu WHERE komite_id = ? AND aday_id = ?",
                Integer.class, committee, candidate)).isEqualTo(3);

        long outside = createNomination("KategoriDışı", otherAward()).path("adayGosterme").path("adayId").asLong();
        vote(first, committee, outside, OyKarari.KABUL).andExpect(status().isUnprocessableEntity());
        jdbc.update("""
                INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, uzman_id)
                SELECT 'dis_uzman', k.sifre_hash, 'UZMAN', u.uzman_id FROM kullanici k CROSS JOIN uzman u
                WHERE k.kullanici_adi = 'uzman_1' AND NOT EXISTS
                    (SELECT 1 FROM komite_uyesi m WHERE m.komite_id = ? AND m.uzman_id = u.uzman_id)
                ORDER BY u.uzman_id LIMIT 1
                """, committee);
        String outsider = bearer("dis_uzman", "123456");
        vote(outsider, committee, candidate, OyKarari.KABUL).andExpect(status().isForbidden());
        mvc.perform(get(EXPERT + "/komiteler/" + committee + "/adaylar").header(HttpHeaders.AUTHORIZATION, outsider))
                .andExpect(status().isForbidden());
        vote(organization, committee, candidate, OyKarari.KABUL).andExpect(status().isForbidden());
        mvc.perform(get(CANDIDATE).header(HttpHeaders.AUTHORIZATION, first)).andExpect(status().isForbidden());

        assertThat(events.stream(NominationRecorded.class).filter(event -> event.adayId() == candidate))
                .extracting(NominationRecorded::yeniAdayHesabiAcildi).containsExactly(true, false);
        assertThat(events.stream(ExpertVoted.class)).extracting(ExpertVoted::votesCast).containsExactly(1, 2, 3);
        assertThat(events.stream(DecisionFinalized.class)).singleElement().satisfies(event -> {
            assertThat(event.karar()).isEqualTo(OyKarari.KABUL);
            assertThat(event.otomatik()).isTrue();
            assertThat(event.kabul()).isEqualTo(2);
        });
        assertThat(events.stream(DomainEvent.class)).hasSize(7);
        for (var event : events.stream(DomainEvent.class).toList()) {
            assertThat(json.writeValueAsString(event)).doesNotContain(password, "geciciSifre", "sifreHash");
        }
    }
}
