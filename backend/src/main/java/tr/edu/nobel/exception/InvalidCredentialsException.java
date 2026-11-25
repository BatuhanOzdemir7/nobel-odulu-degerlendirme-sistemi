package tr.edu.nobel.exception;

import org.springframework.security.authentication.BadCredentialsException;

public class InvalidCredentialsException extends BadCredentialsException {
    public InvalidCredentialsException() {
        super("Kullanıcı adı veya şifre hatalı");
    }
}
