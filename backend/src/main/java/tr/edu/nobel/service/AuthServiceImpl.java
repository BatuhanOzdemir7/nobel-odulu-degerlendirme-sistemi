package tr.edu.nobel.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.dto.request.LoginRequest;
import tr.edu.nobel.dto.response.AuthUserResponse;
import tr.edu.nobel.dto.response.LoginResponse;
import tr.edu.nobel.entity.Kullanici;
import tr.edu.nobel.exception.InvalidCredentialsException;
import tr.edu.nobel.mapper.AuthUserMapper;
import tr.edu.nobel.repository.KullaniciRepository;
import tr.edu.nobel.security.CurrentUserPrincipal;
import tr.edu.nobel.security.JwtTokenProvider;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {
    private final KullaniciRepository users;
    private final PasswordEncoder passwords;
    private final JwtTokenProvider tokens;
    private final AccountLabelService labels;
    private final AuthUserMapper mapper;
    private final String dummyHash;

    public AuthServiceImpl(KullaniciRepository users, PasswordEncoder passwords, JwtTokenProvider tokens,
                           AccountLabelService labels, AuthUserMapper mapper) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.labels = labels;
        this.mapper = mapper;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        Kullanici account = users.findByKullaniciAdi(request.kullaniciAdi()).orElse(null);
        String password = request.sifre();
        boolean bcryptLength = password.getBytes(StandardCharsets.UTF_8).length <= 72;
        String hash = account == null ? dummyHash : account.getSifreHash();
        boolean matches = passwords.matches(bcryptLength ? password : "invalid-password-length", hash);
        if (!bcryptLength || !matches || account == null || !account.isAktif()) {
            throw new InvalidCredentialsException();
        }

        CurrentUserPrincipal user = CurrentUserPrincipal.from(account);
        JwtTokenProvider.IssuedToken token = tokens.issue(user);
        return new LoginResponse(token.value(), "Bearer", token.expiresAt(), toResponse(user));
    }

    @Override
    public AuthUserResponse me(CurrentUserPrincipal user) {
        return toResponse(user);
    }

    private AuthUserResponse toResponse(CurrentUserPrincipal user) {
        return mapper.toResponse(user, labels.displayName(user));
    }
}
