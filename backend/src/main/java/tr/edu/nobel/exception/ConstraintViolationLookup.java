package tr.edu.nobel.exception;

import org.hibernate.exception.ConstraintViolationException;

import java.sql.SQLException;

public final class ConstraintViolationLookup {
    private ConstraintViolationLookup() { }

    public static boolean hasConstraint(Throwable failure, String name) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation && name.equals(violation.getConstraintName())) {
                return true;
            }
        }
        return false;
    }

    public static boolean hasSqlState(Throwable failure, String state) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && state.equals(sql.getSQLState())) return true;
        }
        return false;
    }
}
