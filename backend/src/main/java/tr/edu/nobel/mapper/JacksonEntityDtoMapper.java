package tr.edu.nobel.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class JacksonEntityDtoMapper implements EntityDtoMapper {
    private final ObjectMapper objectMapper;

    public JacksonEntityDtoMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public <T> T toEntity(Map<String, Object> values, Class<T> entityType) {
        return objectMapper.convertValue(values, entityType);
    }

    @Override
    public Map<String, Object> toResponse(Object entity) {
        return new LinkedHashMap<>(objectMapper.convertValue(entity, new TypeReference<Map<String, Object>>() { }));
    }
}
