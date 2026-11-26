package tr.edu.nobel.mapper;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.AuthUserResponse;
import tr.edu.nobel.security.CurrentUserPrincipal;

@Component
public class AuthUserMapper {
    public AuthUserResponse toResponse(CurrentUserPrincipal user, String displayName) {
        return new AuthUserResponse(user.kullaniciId(), user.kullaniciAdi(), user.rol(),
                user.kurulusNo(), user.adayId(), user.uzmanId(), displayName);
    }
}
