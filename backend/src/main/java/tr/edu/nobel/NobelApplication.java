package tr.edu.nobel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class NobelApplication {
    public static void main(String[] args) {
        SpringApplication.run(NobelApplication.class, args);
    }
}
