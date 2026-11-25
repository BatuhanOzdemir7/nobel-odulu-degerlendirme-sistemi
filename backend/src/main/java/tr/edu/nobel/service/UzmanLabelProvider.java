package tr.edu.nobel.service;

import org.springframework.stereotype.Component;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.entity.Uzman;
import tr.edu.nobel.repository.UzmanRepository;
import tr.edu.nobel.security.CurrentUserPrincipal;

@Component
public class UzmanLabelProvider implements AccountLabelProvider {
    private final UzmanRepository experts;

    public UzmanLabelProvider(UzmanRepository experts) {
        this.experts = experts;
    }

    @Override
    public Rol role() {
        return Rol.UZMAN;
    }

    @Override
    public String displayName(CurrentUserPrincipal user) {
        return experts.findById(user.uzmanId()).map(Uzman::getAd).orElse(user.kullaniciAdi());
    }
}
