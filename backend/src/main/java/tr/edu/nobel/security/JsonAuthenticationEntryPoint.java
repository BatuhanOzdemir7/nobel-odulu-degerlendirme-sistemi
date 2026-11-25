package tr.edu.nobel.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tr.edu.nobel.exception.ApiErrorFactory;

import java.io.IOException;
import java.util.Map;

@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper mapper;
    private final ApiErrorFactory errors;

    public JsonAuthenticationEntryPoint(ObjectMapper mapper, ApiErrorFactory errors) {
        this.mapper = mapper;
        this.errors = errors;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getOutputStream(), errors.create(HttpStatus.UNAUTHORIZED,
                ApiErrorFactory.AUTHENTICATION_REQUIRED, request.getRequestURI(), Map.of()));
    }
}
