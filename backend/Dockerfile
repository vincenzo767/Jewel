# Build from the repository root (the jar bundles ../frontend/landing):
#   docker build -f backend/Dockerfile .
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
RUN mvn -f backend/pom.xml -B -q dependency:go-offline
COPY backend/src backend/src
COPY frontend/landing frontend/landing
RUN mvn -f backend/pom.xml -B -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/backend/target/brylesdiamonds-api-1.0.0.jar app.jar
# Fit a small instance (Render free: 512 MB)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
