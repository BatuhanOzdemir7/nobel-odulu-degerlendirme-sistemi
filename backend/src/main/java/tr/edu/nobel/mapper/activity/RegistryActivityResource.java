package tr.edu.nobel.mapper.activity;

import java.util.Arrays;
import java.util.Optional;

public enum RegistryActivityResource {
    CATEGORY("kategoriler", "kategori", "kategori_id", "kategoriId"),
    AWARD("oduller", "odul", "odul_no", "odulNo"),
    ORGANIZATION("kuruluslar", "kurulus", "kurulus_no", "kurulusNo"),
    CANDIDATE("adaylar", "aday", "aday_id", "adayId"),
    EXPERT("uzmanlar", "uzman", "uzman_id", "uzmanId"),
    NOMINATION("aday-gostermeler", "aday_gosterme", "aday_gosterme_id", "adayGostermeId"),
    EVALUATION("degerlendirmeler", "degerlendirme", "degerlendirme_id", "degerlendirmeId");

    public final String resource;
    public final String table;
    public final String idColumn;
    public final String responseId;

    RegistryActivityResource(String resource, String table, String idColumn, String responseId) {
        this.resource = resource;
        this.table = table;
        this.idColumn = idColumn;
        this.responseId = responseId;
    }

    public static Optional<RegistryActivityResource> fromResource(String resource) {
        return Arrays.stream(values()).filter(item -> item.resource.equals(resource)).findFirst();
    }

    public static Optional<RegistryActivityResource> fromTable(String table) {
        return Arrays.stream(values()).filter(item -> item.table.equals(table)).findFirst();
    }
}
