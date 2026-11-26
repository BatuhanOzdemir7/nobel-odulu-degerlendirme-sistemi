package tr.edu.nobel.dto.response;

import java.util.List;

public record UzmanKomiteResponse(Long komiteId, String komiteAdi, Long kategoriId, String kategoriAdi,
                                   List<KomiteUyesiResponse> uyeler, long bekleyenAdaySayisi) { }
