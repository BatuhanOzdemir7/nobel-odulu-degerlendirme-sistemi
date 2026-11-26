package tr.edu.nobel.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;

public record AdayGostermeGorunumResponse(Long adayGostermeId, Long adayId, String adayAdi, Long odulId,
                                          String odulAdi, String kategoriAdi, String kurulusAdi,
                                          LocalDate tarih, LocalTime saat, AdaylikAsamasi asama, String sonuc) { }
