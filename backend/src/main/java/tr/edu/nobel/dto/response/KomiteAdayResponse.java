package tr.edu.nobel.dto.response;

import java.util.List;

public record KomiteAdayResponse(Long adayId, String adayAdi, String calismaAlani, int votesCast, int votesRequired,
                                  int memberCount, OyResponse myVote, List<OyResponse> oylar, boolean finalized,
                                  DegerlendirmeResponse degerlendirme) { }
