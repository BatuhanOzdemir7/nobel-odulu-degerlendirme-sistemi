package tr.edu.nobel.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tr.edu.nobel.dto.request.AdayGostermeRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.security.CurrentUserPrincipal;
import tr.edu.nobel.service.NominationWorkflowService;
import java.util.List;

@RestController
@RequestMapping("/api/portal/kurulus")
@RequiredArgsConstructor
public class KurulusPortalController {
    private final NominationWorkflowService workflow;

    @GetMapping("/oduller")
    public List<OdulSecenekResponse> awards() {
        return workflow.awards();
    }

    @GetMapping("/aday-ara")
    public List<AdayAramaResponse> search(@RequestParam String q) {
        return workflow.search(q);
    }

    @GetMapping("/aday-gostermeler")
    public List<AdayGostermeGorunumResponse> nominations(@AuthenticationPrincipal CurrentUserPrincipal principal) {
        return workflow.nominations(principal);
    }

    @PostMapping("/aday-gostermeler")
    public ResponseEntity<KurulusAdayGostermeResponse> nominate(@AuthenticationPrincipal CurrentUserPrincipal principal,
                                                              @Valid @RequestBody AdayGostermeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(workflow.nominate(principal, request));
    }
}
