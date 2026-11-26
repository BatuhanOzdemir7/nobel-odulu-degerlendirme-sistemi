package tr.edu.nobel.mapper.activity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import tr.edu.nobel.entity.OyKarari;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.event.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class ActivityEventFactoryTest {
    private static final Instant TIME = Instant.parse("2026-11-21T11:32:10Z");
    private static final List<MemberRef> MEMBERS = List.of(new MemberRef(2L, "Prof. Dr. İlker Kaya"));
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    void mapsEveryActionToGoldenJsonWithOnlyPublicFields() throws Exception {
        var factory = new ActivityEventFactory(List.of(new NominationActivityMapper(), new ExpertVoteActivityMapper(),
                new DecisionActivityMapper(), new AdminMutationActivityMapper(), new CommitteeChangeActivityMapper(),
                new ConstraintViolationActivityMapper()), Clock.fixed(TIME, ZoneId.of("Europe/Istanbul")));

        List<DomainEvent> input = List.of(
                new NominationRecorded(1L, "CERN", 4L, "Dr. Selin Arslan", 2L, "Nobel Fizik Ödülü",
                        3L, "Fizik", true, TIME),
                new ExpertVoted(1L, "Fizik Komitesi", "Fizik", 2L, "Prof. Dr. İlker Kaya", 4L, "Dr. Selin Arslan",
                        OyKarari.KABUL, "hash=sifre", 3, 3, 3, MEMBERS, List.of(new VoteRef(2L, OyKarari.KABUL)), TIME),
                new DecisionFinalized(1L, "Fizik Komitesi", 4L, "Dr. Selin Arslan",
                        OyKarari.INCELEMEDE, 1, 1, 1, true, MEMBERS, TIME),
                new AdminMutationEvent("oduller", AdminMutationEvent.Operation.CREATED, 2L, Rol.ADMIN, "Yönetici", TIME),
                new AdminMutationEvent("adaylar", AdminMutationEvent.Operation.UPDATED, 4L, Rol.ADMIN, "Yönetici", TIME),
                new AdminMutationEvent("degerlendirmeler", AdminMutationEvent.Operation.DELETED, 5L, Rol.ADMIN, "Yönetici", TIME),
                new CommitteeChangeEvent(CommitteeChangeEvent.Operation.CREATED, 1L, null, "Fizik Komitesi", null, "Yönetici", TIME),
                new CommitteeChangeEvent(CommitteeChangeEvent.Operation.DELETED, 1L, null, "Fizik Komitesi", null, "Yönetici", TIME),
                new CommitteeChangeEvent(CommitteeChangeEvent.Operation.MEMBER_ADDED, 1L, 2L, "Fizik Komitesi", "İlker", "Yönetici", TIME),
                new CommitteeChangeEvent(CommitteeChangeEvent.Operation.MEMBER_REMOVED, 1L, 2L, "Fizik Komitesi", "İlker", "Yönetici", TIME),
                new ConstraintViolationEvent("23514", "komite_en_az_uc_uzman", "sifre=geciciSifre", 1L, "Yönetici", TIME,
                        "komite_uyesi", new ConstraintViolationEvent.CommitteeContext("Fizik Komitesi", "İlker", MEMBERS)));

        var actual = input.stream().map(factory::create).toList();
        assertThat(actual).allSatisfy(event -> assertThat(event.sqlSummary()).doesNotContain("sifre", "hash", "geciciSifre"));
        try (var fixture = getClass().getResourceAsStream("/activity/event-golden.json")) {
            assertThat(json.readTree(json.writeValueAsBytes(actual))).isEqualTo(json.readTree(fixture));
        }
    }
}
