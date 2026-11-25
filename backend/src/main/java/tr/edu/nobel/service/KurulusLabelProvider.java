package tr.edu.nobel.service;

import org.springframework.stereotype.Component;
import tr.edu.nobel.entity.Kurulus;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.repository.KurulusRepository;
import tr.edu.nobel.security.CurrentUserPrincipal;

@Component
public class KurulusLabelProvider implements AccountLabelProvider {
    private final KurulusRepository organizations;

    public KurulusLabelProvider(KurulusRepository organizations) {
        this.organizations = organizations;
    }

    @Override
    public Rol role() {
        return Rol.KURULUS;
    }

    @Override
    public String displayName(CurrentUserPrincipal user) {
        return organizations.findById(user.kurulusNo()).map(Kurulus::getAd).orElse(user.kullaniciAdi());
    }
}
