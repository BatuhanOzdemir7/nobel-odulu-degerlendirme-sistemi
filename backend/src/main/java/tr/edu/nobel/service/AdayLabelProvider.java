package tr.edu.nobel.service;

import org.springframework.stereotype.Component;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.repository.AdayRepository;
import tr.edu.nobel.security.CurrentUserPrincipal;

@Component
public class AdayLabelProvider implements AccountLabelProvider {
    private final AdayRepository candidates;

    public AdayLabelProvider(AdayRepository candidates) {
        this.candidates = candidates;
    }

    @Override
    public Rol role() {
        return Rol.ADAY;
    }

    @Override
    public String displayName(CurrentUserPrincipal user) {
        return candidates.findById(user.adayId()).map(aday -> aday.getAd() + " " + aday.getSoyad())
                .orElse(user.kullaniciAdi());
    }
}
