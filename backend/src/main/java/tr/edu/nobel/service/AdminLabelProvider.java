package tr.edu.nobel.service;

import org.springframework.stereotype.Component;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.security.CurrentUserPrincipal;

@Component
public class AdminLabelProvider implements AccountLabelProvider {
    @Override
    public Rol role() {
        return Rol.ADMIN;
    }

    @Override
    public String displayName(CurrentUserPrincipal user) {
        return "Yönetici";
    }
}
