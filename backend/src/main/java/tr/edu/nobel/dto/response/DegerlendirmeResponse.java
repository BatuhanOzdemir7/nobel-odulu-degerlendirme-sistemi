package tr.edu.nobel.dto.response;

import java.time.LocalDate;

public record DegerlendirmeResponse(Long degerlendirmeId, Long komiteId, String komiteAdi, Long adayId,
                                    LocalDate tarih, String sonuc, String olcut) { }
