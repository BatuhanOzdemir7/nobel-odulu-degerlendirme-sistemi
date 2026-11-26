package tr.edu.nobel.exception;

import org.postgresql.util.PSQLException;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public final class ConstraintViolationClassifier {
    private static final Pattern COMMITTEE_ID = Pattern.compile("\\bkomite_id\\s*=\\s*(\\d{1,18})\\b");

    private ConstraintViolationClassifier() { }

    public static Optional<Violation> from(Throwable failure, String fallbackTable) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (!(cause instanceof PSQLException postgres)) continue;
            String state = postgres.getSQLState();
            if (state == null || !(state.startsWith("23") || state.equals("P0001"))) continue;
            var error = postgres.getServerErrorMessage();
            String table = error == null || error.getTable() == null ? fallbackTable : error.getTable();
            return Optional.of(classify(state, error == null ? null : error.getConstraint(), table,
                    error == null ? postgres.getMessage() : error.getMessage()));
        }
        return Optional.empty();
    }

    public static Violation classify(String state, String name, String table, String postgresMessage) {
        String message = postgresMessage == null ? "" : postgresMessage;
        boolean minimum = "komite_en_az_uc_uzman".equals(name)
                || message.toLowerCase(Locale.forLanguageTag("tr")).contains("en az 3 uzman");
        boolean membership = minimum || "komite_uyesi".equals(table) || "uzman_oyu".equals(table)
                || "degerlendirme_komitesi".equals(table)
                || (name != null && (name.startsWith("komite_uyesi_") || name.contains("uzman_oyu")));
        String publicMessage = minimum ? "PostgreSQL Trigger: En az 3 uzman gerekli!" : switch (state) {
            case "23502" -> "Zorunlu bir alan boş bırakılamaz.";
            case "23503" -> "Bağlı kayıtlar nedeniyle işlem tamamlanamadı.";
            case "23505" -> "Aynı anahtarla bir kayıt zaten var.";
            case "23514" -> "Kayıt veritabanı denetim kuralını ihlal ediyor.";
            case "P0001" -> "PostgreSQL trigger işlemi reddetti.";
            default -> "Kayıt veritabanı kuralını ihlal ediyor.";
        };
        var matcher = COMMITTEE_ID.matcher(message);
        Long committeeId = minimum && matcher.find() ? Long.valueOf(matcher.group(1)) : null;
        return new Violation(state, name, minimum && table == null ? "komite_uyesi" : table,
                membership, publicMessage, committeeId);
    }

    public record Violation(String sqlState, String constraintName, String tableName,
                            boolean committeeRelated, String message, Long committeeId) { }
}
