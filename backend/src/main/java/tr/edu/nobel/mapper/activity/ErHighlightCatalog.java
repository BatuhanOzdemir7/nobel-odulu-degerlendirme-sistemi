package tr.edu.nobel.mapper.activity;

import tr.edu.nobel.dto.response.activity.ErHighlightDto;
import tr.edu.nobel.dto.response.activity.ErHighlightDto.Severity;
import java.util.List;
import java.util.stream.Stream;

public final class ErHighlightCatalog {
    private static final String COMMITTEE = "DEGERLENDIRME_KOMITESI";
    private static final List<String> NOMINATION = List.of("KURULUS", "aday_gosterir", "ADAY", "ODUL");
    private static final List<String> EVALUATION = List.of(COMMITTEE, "degerlendirir", "ADAY");
    private static final List<String> MEMBERSHIP = List.of("UZMAN", "uyesidir", COMMITTEE);
    private static final List<String> COMMITTEE_CREATION = List.of("KATEGORI", "olusturulur", COMMITTEE);
    static final List<String> EDGES = List.of(
            "KURULUS-aday_gosterir", "aday_gosterir-ADAY", "aday_gosterir-ODUL",
            "ODUL-kategorisine_aittir", "kategorisine_aittir-KATEGORI",
            "KATEGORI-olusturulur", "olusturulur-DEGERLENDIRME_KOMITESI",
            "DEGERLENDIRME_KOMITESI-degerlendirir", "degerlendirir-ADAY",
            "UZMAN-uyesidir", "uyesidir-DEGERLENDIRME_KOMITESI");

    private ErHighlightCatalog() { }

    public static ErHighlightDto nomination() { return select(NOMINATION, Severity.SUCCESS); }

    public static ErHighlightDto vote() {
        return select(Stream.concat(MEMBERSHIP.stream(), EVALUATION.stream()).distinct().toList(), Severity.SUCCESS);
    }

    public static ErHighlightDto decision() { return select(EVALUATION, Severity.SUCCESS); }

    public static ErHighlightDto registry(RegistryActivityResource resource, Severity severity) {
        return select(registryNodes(resource), severity);
    }

    public static ErHighlightDto committee(boolean membershipChange, Severity severity) {
        return select(membershipChange ? MEMBERSHIP : COMMITTEE_CREATION, severity);
    }

    public static ErHighlightDto constraint(boolean committeeRelated, String tableName) {
        var nodes = committeeRelated ? MEMBERSHIP : RegistryActivityResource.fromTable(tableName)
                .map(ErHighlightCatalog::registryNodes).orElse(List.of());
        return select(nodes, Severity.ERROR);
    }

    private static List<String> registryNodes(RegistryActivityResource resource) {
        return switch (resource) {
            case CATEGORY -> List.of("KATEGORI");
            case AWARD -> List.of("ODUL");
            case ORGANIZATION -> List.of("KURULUS");
            case CANDIDATE -> List.of("ADAY");
            case EXPERT -> List.of("UZMAN");
            case NOMINATION -> NOMINATION;
            case EVALUATION -> EVALUATION;
        };
    }

    private static ErHighlightDto select(List<String> nodes, Severity severity) {
        var edges = EDGES.stream().filter(edge -> {
            var endpoints = edge.split("-", 2);
            return nodes.contains(endpoints[0]) && nodes.contains(endpoints[1]);
        }).toList();
        return new ErHighlightDto(nodes, edges, severity);
    }
}
