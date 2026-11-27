# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S nobel && adduser -S -G nobel nobel
COPY --from=build /build/target/*.jar app.jar
USER nobel
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
