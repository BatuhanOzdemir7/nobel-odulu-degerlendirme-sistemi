package tr.edu.nobel.exception;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.ApiError;

import java.time.Clock;
import java.util.Map;

@Component
public class ApiErrorFactory {
    public static final String AUTHENTICATION_REQUIRED = "Bu işlem için oturum açmalısınız.";
    public static final String ACCESS_DENIED = "Bu işlem için yetkiniz yok.";

    private final Clock clock;

    public ApiErrorFactory(Clock clock) {
        this.clock = clock;
    }

    public ApiError create(HttpStatus status, String message, String path, Map<String, String> fieldErrors) {
        return new ApiError(clock.instant(), status.value(), status.getReasonPhrase(), message, path, fieldErrors);
    }
}
