package tr.edu.nobel.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("nobel.evaluation")
public record EvaluationProperties(@DefaultValue("3") @Min(1) int quorum) { }
