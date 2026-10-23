package com.fixmycampus.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

public final class Json {
    public static final ObjectMapper MAPPER = new ObjectMapper();
    private Json() {}

    public static Map<?, ?> body(HttpServletRequest req) throws IOException {
        return MAPPER.readValue(req.getInputStream(), Map.class);
    }

    public static void send(HttpServletResponse resp, int status, Object value) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        resp.setHeader("Cache-Control", "no-store");
        MAPPER.writeValue(resp.getOutputStream(), value);
    }

    public static String string(Map<?, ?> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : value.toString().trim();
    }
}
