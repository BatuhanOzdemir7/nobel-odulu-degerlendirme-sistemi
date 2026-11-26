package tr.edu.nobel.mapper.activity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import tr.edu.nobel.dto.response.activity.ErHighlightDto;
import tr.edu.nobel.dto.response.activity.ErHighlightDto.Severity;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;

class ErHighlightCatalogTest {
    @Test
    void catalogUsesTheContractTopology() throws Exception {
        Map<String, Set<String>> contract;
        try (var fixture = getClass().getResourceAsStream("/activity/er-topology.json")) {
            contract = new ObjectMapper().readValue(fixture, new TypeReference<>() { });
        }
        Set<String> nodes = contract.get("nodes");
        Set<String> edges = contract.get("edges");
        assertThat(ErHighlightCatalog.EDGES).containsExactlyInAnyOrderElementsOf(edges);
        List<ErHighlightDto> highlights = new ArrayList<>(List.of(ErHighlightCatalog.nomination(),
                ErHighlightCatalog.vote(), ErHighlightCatalog.decision(),
                ErHighlightCatalog.committee(false, Severity.INFO), ErHighlightCatalog.committee(true, Severity.SUCCESS),
                ErHighlightCatalog.constraint(true, "komite_uyesi"), ErHighlightCatalog.constraint(false, null)));

        for (var resource : RegistryActivityResource.values()) {
            highlights.add(ErHighlightCatalog.registry(resource, Severity.SUCCESS));
            highlights.add(ErHighlightCatalog.constraint(false, resource.table));
        }

        for (var highlight : highlights) {
            assertThat(highlight.nodes()).isSubsetOf(nodes);
            assertThat(highlight.edges()).isSubsetOf(edges);
            for (String edge : highlight.edges()) {
                assertThat(highlight.nodes()).contains(edge.split("-", 2));
            }
        }
    }
}
