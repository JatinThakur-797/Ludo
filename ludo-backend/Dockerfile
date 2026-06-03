# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Cache Maven dependencies separately (only re-runs when pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the application JAR (skip tests — tests run in CI, not Docker build)
COPY src ./src
RUN mvn clean package -DskipTests -B

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S ludo && adduser -S ludo -G ludo

COPY --from=build /app/target/*.jar app.jar

# Change ownership
RUN chown ludo:ludo app.jar
USER ludo

EXPOSE 8080

# JVM tuning for container environments
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
