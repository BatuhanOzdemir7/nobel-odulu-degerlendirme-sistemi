package tr.edu.nobel.dto.response;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Map;

/** Keeps response payloads detached from JPA entities while retaining a compact API. */
public record ApiResponse(@JsonValue Map<String, Object> values) { }
