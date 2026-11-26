package tr.edu.nobel.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.hibernate.JDBCException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tr.edu.nobel.dto.response.ApiError;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private final ApiErrorFactory errors;
    private final ConstraintActivityReporter activity;

    public GlobalExceptionHandler(ApiErrorFactory errors, ConstraintActivityReporter activity) {
        this.errors = errors;
        this.activity = activity;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> accessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, ApiErrorFactory.ACCESS_DENIED, request, Map.of());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> authentication(AuthenticationException ex, HttpServletRequest request) {
        String message = ex instanceof InvalidCredentialsException
                ? ex.getMessage() : ApiErrorFactory.AUTHENTICATION_REQUIRED;
        return error(HttpStatus.UNAUTHORIZED, message, request, Map.of());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> notFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), request, Map.of());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiError> businessRule(BusinessRuleException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request, Map.of());
    }

    @ExceptionHandler(CategoryMismatchException.class)
    public ResponseEntity<ApiError> categoryMismatch(CategoryMismatchException ex, HttpServletRequest request) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), request, Map.of());
    }

    @ExceptionHandler({DataIntegrityViolationException.class, ConstraintViolationException.class, TransactionSystemException.class})
    public ResponseEntity<ApiError> integrity(RuntimeException ex, HttpServletRequest request) {
        if (ex instanceof DataIntegrityViolationException || ex instanceof TransactionSystemException) {
            activity.report(ex, request);
        }
        return error(HttpStatus.CONFLICT, databaseMessage(ex), request, Map.of());
    }

    @ExceptionHandler(JDBCException.class)
    public void untranslatedDatabaseError(JDBCException ex, HttpServletRequest request) {
        // Direct EntityManager flushes can bypass Spring's exception translation.
        activity.report(ex, request);
        throw ex;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError field : ex.getBindingResult().getFieldErrors()) {
            fields.put(field.getField(), field.getDefaultMessage());
        }
        return error(HttpStatus.BAD_REQUEST, "İstek doğrulanamadı.", request, fields);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
    public ResponseEntity<ApiError> badRequest(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request, Map.of());
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiError> invalidParameter(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "İstek parametresi eksik veya geçersiz.", request, Map.of());
    }

    private String databaseMessage(Throwable throwable) {
        for (Throwable current = throwable; current != null; current = current.getCause()) {
            if (current instanceof SQLException sql && sql.getMessage() != null) {
                return sql.getMessage().replaceFirst("^ERROR:\\s*", "");
            }
        }
        return "Kayıt veritabanı kurallarını ihlal ediyor.";
    }

    private ResponseEntity<ApiError> error(HttpStatus status, String message, HttpServletRequest request,
                                           Map<String, String> fieldErrors) {
        return ResponseEntity.status(status).body(errors.create(status, message, request.getRequestURI(), fieldErrors));
    }
}
