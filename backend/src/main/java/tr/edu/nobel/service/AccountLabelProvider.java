package tr.edu.nobel.service;

import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.security.CurrentUserPrincipal;

public interface AccountLabelProvider {
    Rol role();
    String displayName(CurrentUserPrincipal user);
}
