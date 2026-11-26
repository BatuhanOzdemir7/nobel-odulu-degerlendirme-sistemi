package tr.edu.nobel.dto.response;

import java.time.LocalDate;

public record AdayBilgiResponse(Long adayId, String ad, String soyad, String cinsiyet, LocalDate dogumTarihi,
                                 String uyruk, String calismaAlani) { }
