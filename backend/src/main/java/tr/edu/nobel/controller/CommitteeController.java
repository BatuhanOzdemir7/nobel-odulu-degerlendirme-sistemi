package tr.edu.nobel.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tr.edu.nobel.dto.request.ApiRequest;
import tr.edu.nobel.dto.response.ApiResponse;
import tr.edu.nobel.service.CommitteeService;

import java.util.List;

@RestController
@RequestMapping("/api/komiteler")
public class CommitteeController {
    private final CommitteeService committeeService;

    public CommitteeController(CommitteeService committeeService) {
        this.committeeService = committeeService;
    }

    @GetMapping
    public List<ApiResponse> list() { return committeeService.list(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse create(@Valid @RequestBody ApiRequest request) { return committeeService.create(request); }

    @DeleteMapping("/{komiteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long komiteId) { committeeService.delete(komiteId); }

    @PostMapping("/{komiteId}/uyeler/{uzmanId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMember(@PathVariable Long komiteId, @PathVariable Long uzmanId) {
        committeeService.addMember(komiteId, uzmanId);
    }

    @DeleteMapping("/{komiteId}/uyeler/{uzmanId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable Long komiteId, @PathVariable Long uzmanId) {
        committeeService.removeMember(komiteId, uzmanId);
    }
}
