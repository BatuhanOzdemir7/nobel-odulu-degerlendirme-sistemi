package tr.edu.nobel.security;

import tr.edu.nobel.entity.Kullanici;
import tr.edu.nobel.entity.Rol;

public record CurrentUserPrincipal(Long kullaniciId, String kullaniciAdi, Rol rol,
                                   Long kurulusNo, Long adayId, Long uzmanId) {
    public static CurrentUserPrincipal from(Kullanici kullanici) {
        return new CurrentUserPrincipal(kullanici.getKullaniciId(), kullanici.getKullaniciAdi(),
                kullanici.getRol(), kullanici.getKurulusNo(), kullanici.getAdayId(), kullanici.getUzmanId());
    }

    public Long entityId() {
        return switch (rol) {
            case ADMIN -> null;
            case KURULUS -> kurulusNo;
            case ADAY -> adayId;
            case UZMAN -> uzmanId;
        };
    }
}
