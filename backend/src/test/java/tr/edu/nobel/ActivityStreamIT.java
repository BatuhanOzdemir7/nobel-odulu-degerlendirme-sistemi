package tr.edu.nobel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tr.edu.nobel.dto.request.AdayGostermeRequest;
import tr.edu.nobel.dto.request.LoginRequest;
import tr.edu.nobel.dto.request.OyRequest;
import tr.edu.nobel.entity.OyKarari;
import tr.edu.nobel.event.NominationRecorded;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.stream.Stream;

import static java.util.concurrent.TimeUnit.MILLISECONDS;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static tr.edu.nobel.PortalWorkflowITSupport.NOMINATIONS;
import static tr.edu.nobel.PortalWorkflowITSupport.newCandidate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
class ActivityStreamIT {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transaction;
    @Autowired ApplicationEventPublisher publisher;

    private final HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5)).build();

    @Test
    void streamsCommittedWorkflowInOrderAndReplaysNewerIds() throws Exception {
        String organization = login("kurulus_cern", "123456");
        List<String> expertTokens = new ArrayList<>();
        for (int expert = 1; expert <= 3; expert++) expertTokens.add(login("uzman_" + expert, "123456"));
        long committee = firstCommittee();
        long award = jdbc.queryForObject("""
                SELECT min(o.odul_no) FROM odul o JOIN degerlendirme_komitesi k ON k.kategori_id = o.kategori_id
                WHERE k.komite_id = ?
                """, Long.class, committee);

        try (var feed = open(null)) {
            long started = System.nanoTime();
            var nomination = json.readTree(post(NOMINATIONS, organization,
                    new AdayGostermeRequest(null, newCandidate("Sahne"), award), 201).body());
            long candidate = nomination.path("adayGosterme").path("adayId").asLong();
            for (String token : expertTokens) {
                post("/api/portal/uzman/oylar", token, new OyRequest(committee, candidate, "Özgünlük", OyKarari.KABUL), 201);
            }
            var received = new ArrayList<JsonNode>();
            for (int i = 0; i < 5; i++) received.add(feed.take());
            assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
            assertThat(received).extracting(event -> event.path("action").asText()).containsExactly(
                    "NOMINATION_CREATED", "EXPERT_VOTED", "EXPERT_VOTED", "EXPERT_VOTED", "DECISION_FINALIZED");
            assertThat(received).extracting(event -> Long.parseLong(event.path("eventId").asText().substring(4)))
                    .isSorted().doesNotHaveDuplicates();
            assertThat(received.getFirst().path("stageCue").path("newAccount").asBoolean()).isTrue();

            String after = received.get(2).path("eventId").asText();
            try (var replay = open(after)) {
                assertThat(replay.take()).isEqualTo(received.get(3));
                assertThat(replay.take()).isEqualTo(received.get(4));
                assertThat(replay.events.poll(250, MILLISECONDS)).isNull();
            }
            var recent = http.send(request("/api/events/recent?limit=3").GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(recent.statusCode()).isEqualTo(200);
            assertThat(json.readTree(recent.body())).containsExactlyElementsOf(received.subList(2, 5));

            post(NOMINATIONS, organization, new AdayGostermeRequest(candidate, null, award), 409);
            transaction.executeWithoutResult(status -> {
                publisher.publishEvent(new NominationRecorded(1L, "CERN", candidate, "Sahne", award,
                        "Ödül", 1L, "Fizik", false, Instant.now()));
                status.setRollbackOnly();
            });
            assertThat(feed.events.poll(400, MILLISECONDS)).isNull();
        }
    }

    @Test
    void emitsConstraintAfterCommitFailureButNotForThreeMemberBusinessRejection() throws Exception {
        long committee = firstCommittee();
        var originalMembers = jdbc.queryForList(
                "SELECT uzman_id FROM komite_uyesi WHERE komite_id = ? ORDER BY uzman_id", Long.class, committee);
        assertThat(originalMembers).hasSize(3);
        long extra = jdbc.queryForObject("""
                SELECT min(uzman_id) FROM uzman WHERE uzman_id NOT IN
                (SELECT uzman_id FROM komite_uyesi WHERE komite_id = ?)
                """, Long.class, committee);
        String admin = login("admin", "admin123");
        String memberPath = "/api/komiteler/" + committee + "/uyeler/";
        try (var feed = open(null)) {
            var rule = http.send(delete(memberPath + originalMembers.getFirst(), admin),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(rule.statusCode()).isEqualTo(409);
            assertThat(json.readTree(rule.body()).path("message").asText())
                    .isEqualTo("Komitede en az 3 uzman üye kalmalıdır; bu üye çıkarılamaz.");
            assertThat(feed.events.poll(300, MILLISECONDS)).isNull();

            jdbc.update("INSERT INTO komite_uyesi (komite_id, uzman_id) VALUES (?, ?)", committee, extra);
            // Let the service see four members, then hold its DELETE while another transaction commits a removal.
            try (var blocker = dataSource.getConnection()) {
                blocker.setAutoCommit(false);
                try (var lock = blocker.prepareStatement("""
                        SELECT uzman_id FROM komite_uyesi WHERE komite_id = ? AND uzman_id = ? FOR UPDATE
                        """)) {
                    lock.setLong(1, committee);
                    lock.setLong(2, extra);
                    try (var row = lock.executeQuery()) {
                        assertThat(row.next()).isTrue();
                    }
                }
                int blockerPid = blocker.unwrap(org.postgresql.PGConnection.class).getBackendPID();
                var blocked = http.sendAsync(delete(memberPath + extra, admin), HttpResponse.BodyHandlers.ofString());
                awaitBlockedDelete(blockerPid);
                try (var remove = blocker.prepareStatement(
                        "DELETE FROM komite_uyesi WHERE komite_id = ? AND uzman_id = ?")) {
                    remove.setLong(1, committee);
                    remove.setLong(2, originalMembers.getFirst());
                    assertThat(remove.executeUpdate()).isEqualTo(1);
                }
                blocker.commit();
                var response = blocked.get(5, SECONDS);
                assertThat(response.statusCode()).isEqualTo(409);
                assertThat(json.readTree(response.body()).path("message").asText()).contains("en az 3 uzman");
            } finally {
                // Restore the original roster for the workflow test, irrespective of test order.
                transaction.executeWithoutResult(status -> {
                    jdbc.update("INSERT INTO komite_uyesi (komite_id, uzman_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            committee, originalMembers.getFirst());
                    jdbc.update("DELETE FROM komite_uyesi WHERE komite_id = ? AND uzman_id = ?", committee, extra);
                });
            }
            var violation = feed.take();
            assertThat(violation.path("action").asText()).isEqualTo("CONSTRAINT_VIOLATION");
            assertThat(violation.path("sqlSummary").asText()).contains("[23514]");
            assertThat(violation.at("/erHighlight/severity").asText()).isEqualTo("error");
            assertThat(violation.at("/stageCue/scene").asText()).isEqualTo("CONSTRAINT_ERROR");
            assertThat(violation.at("/stageCue/committeeId").asLong()).isEqualTo(committee);
            assertThat(violation.at("/stageCue/members").size()).isEqualTo(3);
            assertThat(feed.events.poll(300, MILLISECONDS)).isNull();
        }
    }

    @Test
    void emitsRegistryAndCommitteeSuccessThroughExistingAdminRoutes() throws Exception {
        String admin = login("admin", "admin123");
        long committee = firstCommittee();
        long category = jdbc.queryForObject("select kategori_id from degerlendirme_komitesi where komite_id = ?",
                Long.class, committee);
        var experts = jdbc.queryForList("select uzman_id from uzman order by uzman_id limit 4", Long.class);
        try (var feed = open(null)) {
            long id = json.readTree(post("/api/kategoriler", admin, Map.of("kategoriAdi", "Canlı test"), 201).body())
                    .path("kategoriId").asLong();
            assertThat(feed.take().path("action").asText()).isEqualTo("REGISTRY_CREATED");
            post("/api/kategoriler", admin, Map.of("kategoriAdi", "Canlı test"), 500);
            var duplicate = feed.take();
            assertThat(duplicate.path("action").asText()).isEqualTo("CONSTRAINT_VIOLATION");
            assertThat(duplicate.path("sqlSummary").asText()).contains("[23505]").doesNotContain("Canlı test");
            assertThat(duplicate.at("/erHighlight/nodes/0").asText()).isEqualTo("KATEGORI");
            assertThat(http.send(delete("/api/kategoriler/" + id, admin), HttpResponse.BodyHandlers.discarding())
                    .statusCode()).isEqualTo(204);
            assertThat(feed.take().path("action").asText()).isEqualTo("REGISTRY_DELETED");

            long newCommittee = json.readTree(post("/api/komiteler", admin,
                    Map.of("komiteAdi", "Sahne Komitesi", "kategoriId", category, "uzmanIdListesi", experts.subList(0, 3)),
                    201).body()).path("komiteId").asLong();
            assertThat(feed.take().path("action").asText()).isEqualTo("COMMITTEE_CREATED");
            String path = "/api/komiteler/" + newCommittee;
            String member = path + "/uyeler/" + experts.getLast();
            var added = http.send(request(member).header("Authorization", admin).POST(HttpRequest.BodyPublishers.noBody())
                    .build(), HttpResponse.BodyHandlers.discarding());
            assertThat(added.statusCode()).isEqualTo(204);
            assertThat(feed.take().path("action").asText()).isEqualTo("COMMITTEE_MEMBER_ADDED");
            assertThat(http.send(delete(member, admin), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(204);
            assertThat(feed.take().path("action").asText()).isEqualTo("COMMITTEE_MEMBER_REMOVED");
            assertThat(http.send(delete(path, admin), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(204);
            assertThat(feed.take().path("action").asText()).isEqualTo("COMMITTEE_DELETED");
        }
    }

    private long firstCommittee() {
        return jdbc.queryForObject("SELECT min(komite_id) FROM degerlendirme_komitesi", Long.class);
    }

    private void awaitBlockedDelete(int blockerPid) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS (SELECT FROM pg_stat_activity
                    WHERE query LIKE 'delete from komite_uyesi%' AND ? = ANY(pg_blocking_pids(pid)))
                    """, Boolean.class, blockerPid))) return;
            Thread.sleep(20);
        }
        throw new AssertionError("Admin DELETE did not reach the row lock");
    }

    private String login(String name, String password) throws Exception {
        return "Bearer " + json.readTree(post("/api/auth/login", null, new LoginRequest(name, password), 200).body())
                .path("accessToken").asText();
    }

    private HttpResponse<String> post(String path, String bearer, Object body, int expectedStatus) throws Exception {
        var builder = request(path).header("Content-Type", "application/json");
        if (bearer != null) builder.header("Authorization", bearer);
        var response = http.send(builder.POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body))).build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as(response.body()).isEqualTo(expectedStatus);
        return response;
    }

    private HttpRequest delete(String path, String token) {
        return request(path).header("Authorization", token).DELETE().build();
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(5));
    }

    private Feed open(String after) throws Exception {
        var request = request("/api/events/stream").header("Accept", "text/event-stream");
        if (after != null) request.header("Last-Event-ID", after);
        var response = http.send(request.GET().build(), HttpResponse.BodyHandlers.ofLines());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Cache-Control")).contains("no-cache");
        assertThat(response.headers().firstValue("X-Accel-Buffering")).contains("no");
        return new Feed(response.body());
    }

    private final class Feed implements AutoCloseable {
        private final Stream<String> lines;
        private final BlockingQueue<JsonNode> events = new LinkedBlockingQueue<>();
        private final java.util.concurrent.CompletableFuture<String> first = new java.util.concurrent.CompletableFuture<>();
        private final Thread reader;

        private Feed(Stream<String> lines) throws Exception {
            this.lines = lines;
            this.reader = Thread.startVirtualThread(this::read);
            assertThat(first.get(2, SECONDS)).isEqualTo("retry:3000");
        }

        private void read() {
            try {
                var source = lines.iterator();
                first.complete(source.next());
                String id = "";
                String type = "";
                while (source.hasNext()) {
                    String line = source.next();
                    if (line.startsWith("id:")) id = line.substring(3).strip();
                    if (line.startsWith("event:")) type = line.substring(6).strip();
                    if (line.startsWith("data:")) {
                        var event = json.readTree(line.substring(5));
                        assertThat(type).isEqualTo("activity");
                        assertThat(id).isEqualTo(event.path("eventId").asText());
                        events.add(event);
                    }
                }
            } catch (Exception failure) {
                first.completeExceptionally(failure);
            }
        }

        private JsonNode take() throws InterruptedException {
            var event = events.poll(2, SECONDS);
            assertThat(event).as("next SSE activity").isNotNull();
            return event;
        }

        @Override
        public void close() {
            lines.close();
            reader.interrupt();
        }
    }
}
