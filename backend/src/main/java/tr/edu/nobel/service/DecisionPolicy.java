package tr.edu.nobel.service;

import tr.edu.nobel.entity.OyKarari;
import tr.edu.nobel.entity.UzmanOyu;

import java.text.Collator;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class DecisionPolicy {
    public Decision decide(List<UzmanOyu> votes) {
        if (votes.isEmpty()) throw new IllegalArgumentException("Karar için en az bir oy gerekir.");
        Map<OyKarari, Integer> counts = new EnumMap<>(OyKarari.class);
        for (OyKarari value : OyKarari.values()) counts.put(value, 0);
        for (UzmanOyu vote : votes) counts.merge(vote.getKarar(), 1, Integer::sum);

        int highest = counts.values().stream().max(Integer::compareTo).orElseThrow();
        List<OyKarari> leaders = counts.entrySet().stream()
                .filter(entry -> entry.getValue() == highest).map(Map.Entry::getKey).toList();
        OyKarari result = leaders.size() == 1 ? leaders.getFirst() : OyKarari.INCELEMEDE;

        List<String> criteria = votes.stream().filter(vote -> vote.getKarar() == result).map(UzmanOyu::getOlcut).toList();
        // A tie can produce INCELEMEDE even when nobody cast that vote.
        if (criteria.isEmpty()) criteria = votes.stream().map(UzmanOyu::getOlcut).toList();
        Collator alphabet = Collator.getInstance(Locale.forLanguageTag("tr-TR"));
        String criterion = criteria.stream().collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey(alphabet))).findFirst().orElseThrow().getKey();
        return new Decision(result, criterion, counts.get(OyKarari.KABUL), counts.get(OyKarari.RED),
                counts.get(OyKarari.INCELEMEDE));
    }

    public record Decision(OyKarari karar, String olcut, int kabul, int red, int incelemede) { }
}
