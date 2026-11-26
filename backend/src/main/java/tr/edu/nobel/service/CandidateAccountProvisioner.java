package tr.edu.nobel.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.YeniHesapResponse;
import tr.edu.nobel.entity.Kullanici;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.repository.KullaniciRepository;

@Component
@RequiredArgsConstructor
public class CandidateAccountProvisioner {
    private final KullaniciRepository users;
    private final TemporaryPasswordGenerator passwords;
    private final PasswordEncoder encoder;

    public YeniHesapResponse create(Long adayId) {
        String username = "aday_" + adayId;
        String password = passwords.generate();
        Kullanici user = new Kullanici();
        user.setKullaniciAdi(username);
        user.setSifreHash(encoder.encode(password));
        user.setRol(Rol.ADAY);
        user.setAdayId(adayId);
        users.save(user);
        return new YeniHesapResponse(username, password);
    }
}
