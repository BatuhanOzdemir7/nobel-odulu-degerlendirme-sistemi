package tr.edu.nobel.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import tr.edu.nobel.event.ConstraintViolationEvent;
import tr.edu.nobel.event.ConstraintViolationEvent.CommitteeContext;
import tr.edu.nobel.mapper.activity.RegistryActivityResource;
import tr.edu.nobel.service.ActivityActor;
import tr.edu.nobel.service.CommitteeActivityContext;
import java.time.Clock;
import java.util.regex.Pattern;

@Component
public class ConstraintActivityReporter {
    private static final Logger log = LoggerFactory.getLogger(ConstraintActivityReporter.class);
    private static final Pattern COMMITTEE_PATH = Pattern.compile(
            "/komiteler/(\\d{1,18})(?:/uyeler/(\\d{1,18}))?(?=/|$)");

    private final ApplicationEventPublisher events;
    private final ActivityActor actors;
    private final CommitteeActivityContext committees;
    private final Clock clock;

    public ConstraintActivityReporter(ApplicationEventPublisher events, ActivityActor actors,
                                      CommitteeActivityContext committees, Clock clock) {
        this.events = events;
        this.actors = actors;
        this.committees = committees;
        this.clock = clock;
    }

    public void report(RuntimeException failure, HttpServletRequest request) {
        try {
            String path = request.getRequestURI().substring(request.getContextPath().length());
            ConstraintViolationClassifier.from(failure, tableFor(path)).ifPresent(violation -> publish(violation, path));
        } catch (RuntimeException reportFailure) {
            log.warn("Veritabanı ihlali olay akışına aktarılamadı.", reportFailure);
        }
    }

    private void publish(ConstraintViolationClassifier.Violation violation, String path) {
        var matcher = COMMITTEE_PATH.matcher(path);
        Long committeeId = violation.committeeId();
        Long expertId = null;
        if (matcher.find()) {
            if (committeeId == null) committeeId = Long.valueOf(matcher.group(1));
            if (matcher.group(2) != null) expertId = Long.valueOf(matcher.group(2));
        }

        CommitteeContext context = null;
        if (violation.committeeRelated() && committeeId != null) {
            try {
                context = committees.find(committeeId, expertId);
            } catch (RuntimeException lookupFailure) {
                log.debug("Kısıt olayı için komite bağlamı okunamadı.", lookupFailure);
            }
        }

        String actorLabel = null;
        try {
            var actor = actors.current();
            if (actor != null) actorLabel = actor.label();
        } catch (RuntimeException lookupFailure) {
            log.debug("Kısıt olayı için aktör etiketi okunamadı.", lookupFailure);
        }
        events.publishEvent(new ConstraintViolationEvent(violation.sqlState(), violation.constraintName(),
                violation.message(), committeeId, actorLabel, clock.instant(), violation.tableName(), context));
    }

    private String tableFor(String path) {
        if (path.startsWith("/api/komiteler")) {
            return path.contains("/uyeler/") ? "komite_uyesi" : "degerlendirme_komitesi";
        }
        if (path.equals("/api/portal/uzman/oylar")) return "uzman_oyu";
        if (path.equals("/api/portal/uzman/karar-kesinlestir")) return "degerlendirme";
        if (path.equals("/api/portal/kurulus/aday-gostermeler")) return "aday_gosterme";
        String[] parts = path.split("/");
        return parts.length > 2 ? RegistryActivityResource.fromResource(parts[2]).map(item -> item.table).orElse(null)
                : null;
    }
}
