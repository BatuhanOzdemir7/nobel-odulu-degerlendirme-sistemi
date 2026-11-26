package tr.edu.nobel.event;

import tr.edu.nobel.entity.OyKarari;
import java.time.Instant;
import java.util.List;

public record DecisionFinalized(Long komiteId, String komiteLabel, Long adayId, String adayLabel,
                                OyKarari karar, int kabul, int red, int incelemede, boolean otomatik,
                                List<MemberRef> members, Instant occurredAt) implements DomainEvent {
    public DecisionFinalized {
        members = List.copyOf(members);
    }
}
