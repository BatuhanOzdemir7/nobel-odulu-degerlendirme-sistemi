package tr.edu.nobel.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tr.edu.nobel.entity.Kullanici;
import tr.edu.nobel.repository.KullaniciRepository;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String BEARER = "Bearer ";
    private final JwtTokenProvider tokens;
    private final KullaniciRepository users;

    public JwtAuthenticationFilter(JwtTokenProvider tokens, KullaniciRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.regionMatches(true, 0, BEARER, 0, BEARER.length())
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticate(authorization.substring(BEARER.length()));
        }
        chain.doFilter(request, response);
    }

    private void authenticate(String value) {
        JwtTokenProvider.TokenIdentity identity;
        try {
            identity = tokens.verify(value);
        } catch (JwtException | IllegalArgumentException ex) {
            return;
        }

        users.findByKullaniciAdi(identity.username())
                .filter(Kullanici::isAktif)
                .map(CurrentUserPrincipal::from)
                .filter(user -> user.rol() == identity.role() && user.kullaniciId().equals(identity.userId())
                        && Objects.equals(user.entityId(), identity.entityId()))
                .ifPresent(user -> {
                    var authority = new SimpleGrantedAuthority("ROLE_" + user.rol().name());
                    var context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, List.of(authority)));
                    SecurityContextHolder.setContext(context);
                });
    }
}
