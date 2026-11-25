package tr.edu.nobel.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record KararKesinlestirRequest(@NotNull @Positive Long komiteId, @NotNull @Positive Long adayId) { }
