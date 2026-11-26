package tr.edu.nobel.dto.response;

public record OyKararResponse(OyResponse oy, int votesCast, int votesRequired, int memberCount,
                               boolean kararKesinlesti, DegerlendirmeResponse degerlendirme) { }
