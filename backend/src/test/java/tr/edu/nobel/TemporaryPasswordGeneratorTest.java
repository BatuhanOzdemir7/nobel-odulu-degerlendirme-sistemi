package tr.edu.nobel;

import org.junit.jupiter.api.Test;
import tr.edu.nobel.service.TemporaryPasswordGenerator;

import static org.assertj.core.api.Assertions.assertThat;

class TemporaryPasswordGeneratorTest {
    @Test
    void generatesTenNonAmbiguousCharacters() {
        var generator = new TemporaryPasswordGenerator();
        for (int i = 0; i < 100; i++) {
            assertThat(generator.generate()).matches("[A-HJ-NP-Za-hj-km-np-z2-9]{10}");
        }
    }
}
