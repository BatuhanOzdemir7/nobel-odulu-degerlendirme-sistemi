package tr.edu.nobel.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record YeniAdayRequest(
        @NotBlank @Size(max = 100) String ad,
        @NotBlank @Size(max = 100) String soyad,
        @NotBlank @Size(max = 30) String cinsiyet,
        @NotNull LocalDate dogumTarihi,
        @NotBlank @Size(max = 100) String uyruk,
        @NotBlank @Size(max = 150) String calismaAlani) { }
