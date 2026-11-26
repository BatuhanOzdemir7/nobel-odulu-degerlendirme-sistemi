package tr.edu.nobel.service;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.security.CurrentUserPrincipal;

@Component
public class ActivityActor {
    private final AccountLabelService labels;

    public ActivityActor(AccountLabelService labels) {
        this.labels = labels;
    }

    public Actor current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof CurrentUserPrincipal principal
                ? new Actor(principal.rol(), labels.displayName(principal)) : null;
    }

    public record Actor(Rol role, String label) { }
}
