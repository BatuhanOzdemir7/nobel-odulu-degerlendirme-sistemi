package tr.edu.nobel.dto.request;

import jakarta.validation.constraints.NotNull;
import tr.edu.nobel.entity.PrivacyMode;

public record PrivacyModeRequest(@NotNull PrivacyMode mod) { }
