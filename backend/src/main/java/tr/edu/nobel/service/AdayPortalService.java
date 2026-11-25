package tr.edu.nobel.service;

import tr.edu.nobel.dto.response.AdayOzetResponse;
import tr.edu.nobel.security.CurrentUserPrincipal;

public interface AdayPortalService {
    AdayOzetResponse summary(CurrentUserPrincipal principal);
}
