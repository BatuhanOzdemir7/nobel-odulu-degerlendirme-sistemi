package tr.edu.nobel.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import tr.edu.nobel.entity.Rol;

public record DemoLoginRequest(@NotNull Rol rol, @NotNull @Positive Long id) { }
