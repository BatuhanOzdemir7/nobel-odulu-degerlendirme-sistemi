package tr.edu.nobel.dto.response.activity;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.List;

public record ErHighlightDto(List<String> nodes, List<String> edges, Severity severity) {
    public ErHighlightDto {
        nodes = List.copyOf(nodes);
        edges = List.copyOf(edges);
    }

    public enum Severity {
        SUCCESS("success"), INFO("info"), ERROR("error");

        private final String wireValue;

        Severity(String wireValue) { this.wireValue = wireValue; }

        @JsonValue
        public String wireValue() { return wireValue; }
    }
}
