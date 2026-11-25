package tr.edu.nobel.dto.request;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TekAdaySecimi.Validator.class)
public @interface TekAdaySecimi {
    String message() default "Mevcut bir aday seçin ya da yeni aday bilgilerini girin.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<TekAdaySecimi, AdayGostermeRequest> {
        @Override
        public boolean isValid(AdayGostermeRequest value, ConstraintValidatorContext context) {
            if (value == null || (value.mevcutAdayId() != null) != (value.yeniAday() != null)) return true;
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                    .addPropertyNode("adaySecimi").addConstraintViolation();
            return false;
        }
    }
}
