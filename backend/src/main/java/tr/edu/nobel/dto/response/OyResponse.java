package tr.edu.nobel.dto.response;

import tr.edu.nobel.entity.OyKarari;
import java.time.LocalDateTime;

public record OyResponse(Long oyId, Long komiteId, Long adayId, Long uzmanId, String uzmanAdi,
                          String olcut, OyKarari karar, LocalDateTime oyZamani) { }
