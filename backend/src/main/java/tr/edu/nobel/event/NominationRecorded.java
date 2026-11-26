package tr.edu.nobel.event;

import java.time.Instant;

public record NominationRecorded(Long kurulusNo, String kurulusLabel, Long adayId, String adayLabel,
                                 Long odulId, String odulLabel, Long kategoriId, String kategoriLabel,
                                 boolean yeniAdayHesabiAcildi, Instant occurredAt) implements DomainEvent { }
