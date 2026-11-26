package tr.edu.nobel.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import tr.edu.nobel.dto.request.PrivacyModeRequest;
import tr.edu.nobel.dto.response.PrivacyModeResponse;
import tr.edu.nobel.service.PrivacyModeService;

@RestController
@RequestMapping("/api/admin/ayarlar/gizlilik-modu")
@RequiredArgsConstructor
public class AdminSettingsController {
    private final PrivacyModeService privacy;

    @GetMapping
    public PrivacyModeResponse currentMode() {
        return new PrivacyModeResponse(privacy.currentMode());
    }

    @PutMapping
    public PrivacyModeResponse updateMode(@Valid @RequestBody PrivacyModeRequest request) {
        return new PrivacyModeResponse(privacy.updateMode(request.mod()));
    }
}
