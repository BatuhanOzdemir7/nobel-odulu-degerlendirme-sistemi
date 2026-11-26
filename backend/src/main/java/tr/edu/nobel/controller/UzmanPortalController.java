package tr.edu.nobel.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tr.edu.nobel.dto.request.KararKesinlestirRequest;
import tr.edu.nobel.dto.request.OyRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.security.CurrentUserPrincipal;
import tr.edu.nobel.service.EvaluationWorkflowService;
import java.util.List;

@RestController
@RequestMapping("/api/portal/uzman")
@RequiredArgsConstructor
public class UzmanPortalController {
    private final EvaluationWorkflowService workflow;

    @GetMapping("/komitelerim")
    public List<UzmanKomiteResponse> committees(@AuthenticationPrincipal CurrentUserPrincipal principal) {
        return workflow.committees(principal);
    }

    @GetMapping("/komiteler/{komiteId}/adaylar")
    public List<KomiteAdayResponse> candidates(@AuthenticationPrincipal CurrentUserPrincipal principal,
                                              @PathVariable Long komiteId) {
        return workflow.candidates(principal, komiteId);
    }

    @GetMapping("/olcutler")
    public List<String> criteria() {
        return workflow.criteria();
    }

    @PostMapping("/oylar")
    @ResponseStatus(HttpStatus.CREATED)
    public OyKararResponse vote(@AuthenticationPrincipal CurrentUserPrincipal principal,
                                @Valid @RequestBody OyRequest request) {
        return workflow.vote(principal, request);
    }

    @PostMapping("/karar-kesinlestir")
    public DegerlendirmeResponse finalizeDecision(@AuthenticationPrincipal CurrentUserPrincipal principal,
                                                  @Valid @RequestBody KararKesinlestirRequest request) {
        return workflow.finalizeDecision(principal, request);
    }
}
