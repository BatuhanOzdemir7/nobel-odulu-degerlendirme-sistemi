package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import tr.edu.nobel.dto.request.KararKesinlestirRequest;
import tr.edu.nobel.entity.OyKarari;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ConcurrentVotingIT extends PortalWorkflowITSupport {
    @Test
    void threeConcurrentVotesProduceOneDecisionAndThreeVoteRows() throws Exception {
        long candidate = createNomination("Eşzamanlı", physicsAward()).path("adayGosterme").path("adayId").asLong();
        long committee = firstCommittee();
        String[] tokens = { bearer("uzman_1", "123456"), bearer("uzman_2", "123456"), bearer("uzman_3", "123456") };
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(3)) {
            List<Future<Boolean>> tasks = new ArrayList<>();
            for (String token : tokens) {
                tasks.add(executor.submit(() -> {
                    start.await();
                    var body = vote(token, committee, candidate, OyKarari.KABUL).andExpect(status().isCreated())
                            .andReturn().getResponse().getContentAsByteArray();
                    return json.readTree(body).path("kararKesinlesti").asBoolean();
                }));
            }
            start.countDown();
            int finalized = 0;
            for (Future<Boolean> task : tasks) if (task.get(20, TimeUnit.SECONDS)) finalized++;
            assertThat(finalized).isEqualTo(1);
        }
        assertThat(decisionCount(committee, candidate)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM uzman_oyu WHERE komite_id = ? AND aday_id = ?",
                Integer.class, committee, candidate)).isEqualTo(3);
    }

    @Test
    void committeeWithFourMembersCanFinalizeManuallyAtThreeVotes() throws Exception {
        long committee = firstCommittee();
        long candidate = createNomination("Manuel", physicsAward()).path("adayGosterme").path("adayId").asLong();
        Long extra = jdbc.queryForObject("""
                SELECT min(u.uzman_id) FROM uzman u WHERE NOT EXISTS
                    (SELECT 1 FROM komite_uyesi m WHERE m.komite_id = ? AND m.uzman_id = u.uzman_id)
                """, Long.class, committee);
        jdbc.update("INSERT INTO komite_uyesi (komite_id, uzman_id) VALUES (?, ?)", committee, extra);
        try {
            for (int i = 1; i <= 3; i++) {
                vote(bearer("uzman_" + i, "123456"), committee, candidate, OyKarari.INCELEMEDE)
                        .andExpect(status().isCreated()).andExpect(jsonPath("$.kararKesinlesti").value(false));
            }
            assertThat(decisionCount(committee, candidate)).isZero();
            postJson(EXPERT + "/karar-kesinlestir", bearer("uzman_1", "123456"),
                    new KararKesinlestirRequest(committee, candidate))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.sonuc").value("INCELEMEDE"));
            assertThat(decisionCount(committee, candidate)).isEqualTo(1);
        } finally {
            jdbc.update("DELETE FROM komite_uyesi WHERE komite_id = ? AND uzman_id = ?", committee, extra);
        }
    }
}
