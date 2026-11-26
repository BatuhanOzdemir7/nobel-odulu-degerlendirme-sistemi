package tr.edu.nobel.mapper.activity;

import tr.edu.nobel.event.AdminMutationEvent.Operation;
import tr.edu.nobel.event.CommitteeChangeEvent;
import tr.edu.nobel.event.DecisionFinalized;
import tr.edu.nobel.event.ExpertVoted;
import tr.edu.nobel.event.NominationRecorded;

public final class SqlSummaryFormatter {
    private SqlSummaryFormatter() { }

    public static String nomination(NominationRecorded e) {
        String summary = "INSERT INTO aday_gosterme (kurulus_no=%d, aday_id=%d, odul_no=%d)"
                .formatted(e.kurulusNo(), e.adayId(), e.odulId());
        if (e.yeniAdayHesabiAcildi()) {
            summary += " · INSERT INTO kullanici (kullanici_adi='aday_%d', rol='ADAY')".formatted(e.adayId());
        }
        return summary;
    }

    public static String vote(ExpertVoted e) {
        return "INSERT INTO uzman_oyu (komite_id=%d, uzman_id=%d, aday_id=%d, karar='%s')"
                .formatted(e.komiteId(), e.uzmanId(), e.adayId(), e.karar().name());
    }

    public static String decision(DecisionFinalized e) {
        return "INSERT INTO degerlendirme (komite_id=%d, aday_id=%d, sonuc='%s')"
                .formatted(e.komiteId(), e.adayId(), e.karar().name());
    }

    public static String registry(RegistryActivityResource resource, Operation operation, Long id) {
        String key = resource.idColumn + "=" + id;
        return switch (operation) {
            case CREATED -> "INSERT INTO " + resource.table + " (" + key + ")";
            case UPDATED -> "UPDATE " + resource.table + " WHERE " + key;
            case DELETED -> "DELETE FROM " + resource.table + " WHERE " + key;
        };
    }

    public static String committee(CommitteeChangeEvent e) {
        return switch (e.operation()) {
            case CREATED -> "INSERT INTO degerlendirme_komitesi (komite_id=%d)".formatted(e.komiteId());
            case DELETED -> "DELETE FROM degerlendirme_komitesi WHERE komite_id=%d".formatted(e.komiteId());
            case MEMBER_ADDED -> "INSERT INTO komite_uyesi (komite_id=%d, uzman_id=%d)"
                    .formatted(e.komiteId(), e.uzmanId());
            case MEMBER_REMOVED -> "DELETE FROM komite_uyesi WHERE komite_id=%d AND uzman_id=%d"
                    .formatted(e.komiteId(), e.uzmanId());
        };
    }

    public static String constraint(String sqlState, String message) {
        return "PostgreSQL [%s] · %s".formatted(sqlState, message);
    }
}
