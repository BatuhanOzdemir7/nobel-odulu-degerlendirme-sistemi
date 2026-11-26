package tr.edu.nobel.service;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.AdayGostermeGorunumResponse;
import tr.edu.nobel.dto.response.AdayOzetResponse;

import java.util.Comparator;
import java.util.List;

@Component
public class AdayViewMasker {
    private final Strategy transparent = new TransparentMasker();
    private final Strategy secret = new NobelSecrecyMasker();

    public AdayOzetResponse mask(AdayOzetResponse view) {
        return switch (view.gizlilikModu()) {
            case SEFFAF -> transparent.apply(view);
            case GIZLI -> secret.apply(view);
        };
    }

    private interface Strategy {
        AdayOzetResponse apply(AdayOzetResponse view);
    }

    private static final class TransparentMasker implements Strategy {
        @Override
        public AdayOzetResponse apply(AdayOzetResponse view) {
            return view;
        }
    }

    private static final class NobelSecrecyMasker implements Strategy {
        @Override
        public AdayOzetResponse apply(AdayOzetResponse view) {
            var masked = view.adayliklar().stream()
                    .map(row -> new AdayGostermeGorunumResponse(row.adayGostermeId(), row.adayId(), row.adayAdi(),
                            row.odulId(), row.odulAdi(), null, "Gizli Kuruluş", null, null, row.asama(), null))
                    .sorted(Comparator.comparing(AdayGostermeGorunumResponse::odulAdi)
                            .thenComparing(AdayGostermeGorunumResponse::adayGostermeId))
                    .toList();
            return new AdayOzetResponse(view.aday(), masked, List.of(), view.gizlilikModu());
        }
    }
}
