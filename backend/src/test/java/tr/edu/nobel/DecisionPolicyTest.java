package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tr.edu.nobel.entity.OyKarari;
import tr.edu.nobel.entity.UzmanOyu;
import tr.edu.nobel.service.DecisionPolicy;

import java.time.LocalDateTime;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

class DecisionPolicyTest {
    private final DecisionPolicy policy = new DecisionPolicy();

    @ParameterizedTest
    @CsvSource(value = {
            "KABUL KABUL KABUL, KABUL", "KABUL KABUL RED, KABUL",
            "KABUL RED INCELEMEDE, INCELEMEDE", "KABUL KABUL INCELEMEDE, KABUL",
            "RED RED RED KABUL INCELEMEDE, RED", "KABUL KABUL RED RED INCELEMEDE, INCELEMEDE",
            "KABUL KABUL RED RED, INCELEMEDE"
    })
    void determinesDecision(String choices, OyKarari expected) {
        var votes = Arrays.stream(choices.split(" ")).map(OyKarari::valueOf)
                .map(choice -> vote(choice, "Özgünlük")).toList();
        assertThat(policy.decide(votes).karar()).isEqualTo(expected);
    }

    @Test
    void selectsTheMostFrequentWinningCriterionAndBreaksItsTiesAlphabetically() {
        var result = policy.decide(Arrays.asList(vote(OyKarari.KABUL, "Etki Düzeyi"),
                vote(OyKarari.RED, "Özgünlük"), vote(OyKarari.KABUL, "Bilimsel Katkı")));
        assertThat(result.olcut()).isEqualTo("Bilimsel Katkı");
        assertThat(result.kabul()).isEqualTo(2);
        assertThat(result.red()).isEqualTo(1);
    }

    @Test
    void breaksCriterionTiesInTurkishAlphabeticalOrder() {
        var result = policy.decide(Arrays.asList(vote(OyKarari.KABUL, "Toplumsal Fayda"),
                vote(OyKarari.KABUL, "Özgünlük")));
        assertThat(result.olcut()).isEqualTo("Özgünlük");
    }

    private UzmanOyu vote(OyKarari choice, String criterion) {
        return new UzmanOyu(1L, 2L, 3L, criterion, choice, LocalDateTime.of(2026, 10, 1, 10, 0));
    }
}
