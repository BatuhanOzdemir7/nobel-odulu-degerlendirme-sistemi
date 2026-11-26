package tr.edu.nobel.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tr.edu.nobel.dto.request.DemoLoginRequest;
import tr.edu.nobel.dto.response.DemoAccountResponse;
import tr.edu.nobel.dto.response.LoginResponse;
import tr.edu.nobel.service.LocalDemoLoginService;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@ConditionalOnProperty(prefix = "nobel.security", name = "local-demo-login", havingValue = "true")
public class LocalDemoLoginController {
    private final LocalDemoLoginService demo;

    public LocalDemoLoginController(LocalDemoLoginService demo) {
        this.demo = demo;
    }

    @GetMapping("/demo-accounts")
    public ResponseEntity<List<DemoAccountResponse>> accounts(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(demo.list(request));
    }

    @PostMapping(value = "/demo-login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody DemoLoginRequest selection, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(demo.login(selection, request));
    }
}
