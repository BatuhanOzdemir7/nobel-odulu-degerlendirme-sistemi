package tr.edu.nobel.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.dto.request.DemoLoginRequest;
import tr.edu.nobel.dto.response.DemoAccountResponse;
import tr.edu.nobel.dto.response.LoginResponse;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.exception.ResourceNotFoundException;
import tr.edu.nobel.mapper.AuthUserMapper;
import tr.edu.nobel.security.CurrentUserPrincipal;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "nobel.security", name = "local-demo-login", havingValue = "true")
@Transactional(readOnly = true)
public class LocalDemoLoginService {
    private static final String TOKEN_PREFIX = "local-demo-";
    private static final String DEMO_ORIGIN = "http://localhost:4200";
    private static final Set<String> LOOPBACK = Set.of("127.0.0.1", "::1", "0:0:0:0:0:0:0:1");
    private static final Duration SESSION_DURATION = Duration.ofHours(1);
    private static final int MAX_SESSIONS = 512;
    private static final String ACCOUNTS = """
            SELECT 'ADMIN' AS role, u.kullanici_id AS profile_id, u.kullanici_id AS user_id,
                   u.kullanici_adi AS username, u.kullanici_adi AS label
            FROM kullanici u WHERE u.rol = 'ADMIN' AND u.aktif
            UNION ALL
            SELECT 'KURULUS', k.kurulus_no, u.kullanici_id, u.kullanici_adi, k.ad
            FROM kurulus k LEFT JOIN kullanici u ON u.kurulus_no = k.kurulus_no
            WHERE u.kullanici_id IS NULL OR u.aktif
            UNION ALL
            SELECT 'UZMAN', z.uzman_id, u.kullanici_id, u.kullanici_adi, z.ad
            FROM uzman z LEFT JOIN kullanici u ON u.uzman_id = z.uzman_id
            WHERE u.kullanici_id IS NULL OR u.aktif
            UNION ALL
            SELECT 'ADAY', a.aday_id, u.kullanici_id, u.kullanici_adi, a.ad || ' ' || a.soyad
            FROM aday a LEFT JOIN kullanici u ON u.aday_id = a.aday_id
            WHERE u.kullanici_id IS NULL OR u.aktif
            """;

    private final JdbcTemplate jdbc;
    private final AccountLabelService labels;
    private final AuthUserMapper mapper;
    private final Clock clock;
    private final Map<String, DemoSession> sessions = new LinkedHashMap<>();

    public LocalDemoLoginService(JdbcTemplate jdbc, AccountLabelService labels, AuthUserMapper mapper,
                                  Clock clock, ServerProperties server) {
        if (server.getAddress() == null || !server.getAddress().isLoopbackAddress()) {
            throw new IllegalStateException("Yerel demo girişi için server.address bir loopback adresi olmalıdır.");
        }
        this.jdbc = jdbc;
        this.labels = labels;
        this.mapper = mapper;
        this.clock = clock;
    }

    public List<DemoAccountResponse> list(HttpServletRequest request) {
        requireLocalBrowser(request);
        return jdbc.query(ACCOUNTS + " ORDER BY role, label, profile_id", (rs, row) ->
                new DemoAccountResponse(role(rs), rs.getLong("profile_id"), rs.getString("label")));
    }

    public LoginResponse login(DemoLoginRequest selection, HttpServletRequest request) {
        requireLocalBrowser(request);
        CurrentUserPrincipal user = findPrincipal(selection.rol(), selection.id())
                .orElseThrow(() -> new ResourceNotFoundException("Demo hesabı bulunamadı."));
        Instant now = clock.instant();
        Instant expiry = now.plus(SESSION_DURATION);
        String token = TOKEN_PREFIX + UUID.randomUUID();
        synchronized (sessions) {
            sessions.values().removeIf(session -> !session.expiresAt().isAfter(now));
            if (sessions.size() == MAX_SESSIONS) sessions.remove(sessions.keySet().iterator().next());
            sessions.put(token, new DemoSession(selection.rol(), selection.id(), expiry));
        }
        return new LoginResponse(token, "Bearer", expiry, mapper.toResponse(user, labels.displayName(user)));
    }

    public boolean isDemoToken(String token) {
        return token.startsWith(TOKEN_PREFIX);
    }

    public Optional<CurrentUserPrincipal> authenticate(String token, HttpServletRequest request) {
        if (!isLocalBrowser(request)) return Optional.empty();
        DemoSession session;
        synchronized (sessions) {
            session = sessions.get(token);
            if (session == null) return Optional.empty();
            if (!session.expiresAt().isAfter(clock.instant())) {
                sessions.remove(token);
                return Optional.empty();
            }
        }
        return findPrincipal(session.role(), session.id());
    }

    private Optional<CurrentUserPrincipal> findPrincipal(Rol role, long id) {
        String sql = "SELECT * FROM (" + ACCOUNTS + ") demo WHERE role = ? AND profile_id = ?";
        return jdbc.query(sql, (rs, row) -> principal(rs, role, id), role.name(), id).stream().findFirst();
    }

    private static CurrentUserPrincipal principal(ResultSet rs, Rol role, long id) throws SQLException {
        String username = rs.getString("username");
        if (username == null) username = "demo-" + role.name() + "-" + id;
        return new CurrentUserPrincipal(
                rs.getObject("user_id", Long.class), username, role,
                role == Rol.KURULUS ? id : null, role == Rol.ADAY ? id : null, role == Rol.UZMAN ? id : null);
    }

    private static Rol role(ResultSet row) throws SQLException {
        return Rol.valueOf(row.getString("role"));
    }

    private static void requireLocalBrowser(HttpServletRequest request) {
        if (!isLocalBrowser(request)) throw new AccessDeniedException("Demo girişi yalnızca yerel arayüzde kullanılabilir.");
    }

    private static boolean isLocalBrowser(HttpServletRequest request) {
        return LOOPBACK.contains(request.getRemoteAddr())
                && "localhost".equalsIgnoreCase(request.getServerName())
                && DEMO_ORIGIN.equals(request.getHeader(HttpHeaders.ORIGIN));
    }

    private record DemoSession(Rol role, long id, Instant expiresAt) { }
}
