package tr.edu.nobel.exception;

public class CategoryMismatchException extends RuntimeException {
    public CategoryMismatchException() {
        super("Adayın bu komitenin kategorisinde adaylığı bulunmuyor.");
    }
}
