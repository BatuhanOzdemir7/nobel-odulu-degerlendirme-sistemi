package tr.edu.nobel.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tr.edu.nobel.dto.response.AdayOzetResponse;
import tr.edu.nobel.security.CurrentUserPrincipal;
import tr.edu.nobel.service.AdayPortalService;

@RestController
@RequestMapping("/api/portal/aday")
@RequiredArgsConstructor
public class AdayPortalController {
    private final AdayPortalService portal;

    @GetMapping("/ozet")
    public AdayOzetResponse summary(@AuthenticationPrincipal CurrentUserPrincipal principal) {
        return portal.summary(principal);
    }
}
