package tr.edu.nobel.service;

import org.springframework.stereotype.Service;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.security.CurrentUserPrincipal;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AccountLabelService {
    private final Map<Rol, AccountLabelProvider> providers;

    public AccountLabelService(List<AccountLabelProvider> providers) {
        this.providers = providers.stream().collect(Collectors.toUnmodifiableMap(
                AccountLabelProvider::role, Function.identity()));
    }

    public String displayName(CurrentUserPrincipal user) {
        return providers.get(user.rol()).displayName(user);
    }
}
