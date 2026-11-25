package tr.edu.nobel.service;

import tr.edu.nobel.dto.request.AdayGostermeRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.security.CurrentUserPrincipal;
import java.util.List;

public interface NominationWorkflowService {
    List<OdulSecenekResponse> awards();
    List<AdayAramaResponse> search(String query);
    KurulusAdayGostermeResponse nominate(CurrentUserPrincipal principal, AdayGostermeRequest request);
    List<AdayGostermeGorunumResponse> nominations(CurrentUserPrincipal principal);
}
