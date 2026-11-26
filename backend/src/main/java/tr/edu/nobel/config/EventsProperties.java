package tr.edu.nobel.config;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("nobel.events")
public record EventsProperties(@Positive int bufferSize, @Positive int heartbeatSeconds) { }
