package tr.edu.nobel.service;

import tr.edu.nobel.dto.request.LoginRequest;
import tr.edu.nobel.dto.response.AuthUserResponse;
import tr.edu.nobel.dto.response.LoginResponse;
import tr.edu.nobel.security.CurrentUserPrincipal;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    AuthUserResponse me(CurrentUserPrincipal user);
}
