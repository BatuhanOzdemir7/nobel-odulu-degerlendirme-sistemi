package tr.edu.nobel.service;

import tr.edu.nobel.dto.request.KararKesinlestirRequest;
import tr.edu.nobel.dto.request.OyRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.security.CurrentUserPrincipal;
import java.util.List;

public interface EvaluationWorkflowService {
    List<UzmanKomiteResponse> committees(CurrentUserPrincipal principal);
    List<KomiteAdayResponse> candidates(CurrentUserPrincipal principal, Long komiteId);
    List<String> criteria();
    OyKararResponse vote(CurrentUserPrincipal principal, OyRequest request);
    DegerlendirmeResponse finalizeDecision(CurrentUserPrincipal principal, KararKesinlestirRequest request);
}
