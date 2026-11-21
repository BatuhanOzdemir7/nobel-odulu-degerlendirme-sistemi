package tr.edu.nobel.dto.request;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.validation.constraints.NotNull;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Small phase-one command envelope for the generic catalogue endpoints. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ApiRequest(@NotNull @JsonValue Map<String, Object> values) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public ApiRequest {
        values = values == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
