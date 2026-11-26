package tr.edu.nobel.dto.response;

import tr.edu.nobel.entity.PrivacyMode;
import java.util.List;

public record AdayOzetResponse(AdayBilgiResponse aday, List<AdayGostermeGorunumResponse> adayliklar,
                                List<DegerlendirmeResponse> degerlendirmeler, PrivacyMode gizlilikModu) { }
