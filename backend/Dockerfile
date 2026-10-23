
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM tomcat:10.1-jdk17-temurin
COPY --from=build /app/target/FixMyCampus.war /usr/local/tomcat/webapps/ROOT.war
EXPOSE 8080
