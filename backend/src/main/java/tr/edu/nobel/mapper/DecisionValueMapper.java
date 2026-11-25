package tr.edu.nobel.mapper;

import tr.edu.nobel.entity.OyKarari;
import java.util.Map;

public final class DecisionValueMapper {
    private static final Map<OyKarari, String> RESULTS = Map.of(
            OyKarari.KABUL, "KABUL", OyKarari.RED, "RED", OyKarari.INCELEMEDE, "INCELEMEDE");

    private DecisionValueMapper() { }

    public static String toSonuc(OyKarari karar) {
        return RESULTS.get(karar);
    }
}
