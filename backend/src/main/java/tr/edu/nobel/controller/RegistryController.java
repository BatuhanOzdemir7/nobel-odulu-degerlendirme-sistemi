package tr.edu.nobel.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tr.edu.nobel.dto.request.ApiRequest;
import tr.edu.nobel.dto.response.ApiResponse;
import tr.edu.nobel.service.RegistryService;

import java.util.List;

@RestController
@RequestMapping("/api")
public class RegistryController {
    private final RegistryService registryService;

    public RegistryController(RegistryService registryService) {
        this.registryService = registryService;
    }

    @GetMapping("/{resource}")
    public List<ApiResponse> list(@PathVariable String resource) {
        return registryService.list(resource);
    }

    @PostMapping("/{resource}")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse create(@PathVariable String resource, @Valid @RequestBody ApiRequest request) {
        return registryService.create(resource, request);
    }

    @DeleteMapping("/{resource}/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String resource, @PathVariable Long id) {
        registryService.delete(resource, id);
    }
}
