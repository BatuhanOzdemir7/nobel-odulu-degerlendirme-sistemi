package tr.edu.nobel.mapper;

import java.util.Map;

public interface EntityDtoMapper {
    <T> T toEntity(Map<String, Object> values, Class<T> entityType);
    Map<String, Object> toResponse(Object entity);
}
