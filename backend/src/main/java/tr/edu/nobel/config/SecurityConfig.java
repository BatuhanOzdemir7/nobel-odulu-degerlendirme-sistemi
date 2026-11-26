package tr.edu.nobel.config;

import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import tr.edu.nobel.repository.KullaniciRepository;
import tr.edu.nobel.security.JsonAccessDeniedHandler;
import tr.edu.nobel.security.JsonAuthenticationEntryPoint;
import tr.edu.nobel.security.JwtAuthenticationFilter;
import tr.edu.nobel.security.JwtTokenProvider;
import tr.edu.nobel.service.LocalDemoLoginService;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtTokenProvider tokens, KullaniciRepository users,
                                            JsonAuthenticationEntryPoint authentication, JsonAccessDeniedHandler accessDenied,
                                            ObjectProvider<LocalDemoLoginService> demoLogin)
            throws Exception {
        var demo = demoLogin.getIfAvailable();
        return http
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .requestCache(AbstractHttpConfigurer::disable)
                .exceptionHandling(errors -> errors.authenticationEntryPoint(authentication).accessDeniedHandler(accessDenied))
                .authorizeHttpRequests(requests -> {
                    if (demo != null) {
                        requests.requestMatchers(HttpMethod.GET, "/api/auth/demo-accounts").permitAll()
                                .requestMatchers(HttpMethod.POST, "/api/auth/demo-login").permitAll();
                    }
                    requests.dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                            // SECURITY NOTE: Public projection carries display labels and whitelisted SQL summaries.
                            .requestMatchers(HttpMethod.GET, "/api/events/stream", "/api/events/recent").permitAll()
                            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                            .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                            .requestMatchers("/error").permitAll()
                            .requestMatchers("/api/admin/**").hasRole("ADMIN")
                            .requestMatchers("/api/portal/kurulus/**").hasRole("KURULUS")
                            .requestMatchers("/api/portal/aday/**").hasRole("ADAY")
                            .requestMatchers("/api/portal/uzman/**").hasRole("UZMAN")
                            .anyRequest().authenticated();
                })
                .addFilterBefore(new JwtAuthenticationFilter(tokens, users, demo), UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
