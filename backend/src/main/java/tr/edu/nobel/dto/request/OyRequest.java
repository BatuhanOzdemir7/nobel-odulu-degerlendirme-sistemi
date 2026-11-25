package tr.edu.nobel.dto.request;

import jakarta.validation.constraints.*;
import tr.edu.nobel.entity.OyKarari;

public record OyRequest(@NotNull @Positive Long komiteId, @NotNull @Positive Long adayId,
                        @NotBlank @Size(max = 255) String olcut, @NotNull OyKarari karar) { }
