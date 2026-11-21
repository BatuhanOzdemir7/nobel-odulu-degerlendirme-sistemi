package tr.edu.nobel.service;

import tr.edu.nobel.dto.request.ApiRequest;
import tr.edu.nobel.dto.response.ApiResponse;
import java.util.List;

public interface CommitteeService {
    List<ApiResponse> list();
    ApiResponse create(ApiRequest request);
    void delete(Long committeeId);
    void addMember(Long committeeId, Long expertId);
    void removeMember(Long committeeId, Long expertId);
}
