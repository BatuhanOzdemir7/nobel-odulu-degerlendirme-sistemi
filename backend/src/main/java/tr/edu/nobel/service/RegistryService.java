package tr.edu.nobel.service;

import tr.edu.nobel.dto.request.ApiRequest;
import tr.edu.nobel.dto.response.ApiResponse;
import java.util.List;

public interface RegistryService {
    List<ApiResponse> list(String resource);
    ApiResponse create(String resource, ApiRequest request);
    void delete(String resource, Long id);
}
