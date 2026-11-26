package tr.edu.nobel.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@TekAdaySecimi
public record AdayGostermeRequest(@Positive Long mevcutAdayId, @Valid YeniAdayRequest yeniAday,
                                 @NotNull @Positive Long odulId) { }
