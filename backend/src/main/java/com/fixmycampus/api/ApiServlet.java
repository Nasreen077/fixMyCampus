package com.fixmycampus.api;

import com.fixmycampus.config.Database;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.*;
import java.util.*;

public class ApiServlet extends HttpServlet {
    private static final Set<String> CATEGORIES = Set.of(
        "Maintenance", "Cleanliness", "Electricity", "Water", "Wi-Fi", "Classroom", "Other"
    );
    private static final Set<String> STATUSES = Set.of("Submitted", "In Progress", "Resolved", "Rejected");

    @Override
    public void init() throws ServletException {
        super.init();
        try { Class.forName("com.mysql.cj.jdbc.Driver"); }
        catch (ClassNotFoundException e) { throw new ServletException("MySQL JDBC driver missing", e); }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        try {
            if (path.equals("/health")) {
                try (Connection c = Database.getConnection(); Statement s = c.createStatement();
                     ResultSet rs = s.executeQuery("SELECT 1")) {
                    Json.send(resp, 200, Map.of("status", "ok", "service", "FixMyCampus API", "database", rs.next() ? "connected" : "unknown"));
                }
            } else if (path.equals("/auth/me")) {
                User user = currentUser(req);
                if (user == null) Json.send(resp, 200, Map.of("user", ""));
                else Json.send(resp, 200, Map.of("user", user.asMap()));
            } else if (path.equals("/issues")) {
                User user = requireUser(req, resp);
                if (user == null) return;
                listIssues(resp, user);
            } else if (path.matches("/issues/\\d+")) {
                User user = requireUser(req, resp);
                if (user == null) return;
                long id = Long.parseLong(path.substring("/issues/".length()));
                getIssue(resp, user, id);
            } else {
                Json.send(resp, 404, Map.of("error", "Endpoint not found"));
            }
        } catch (SQLException e) {
            serverError(resp, e);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        try {
            if (path.equals("/auth/register")) register(req, resp);
            else if (path.equals("/auth/login")) login(req, resp);
            else if (path.equals("/auth/logout")) {
                HttpSession session = req.getSession(false);
                if (session != null) session.invalidate();
                Json.send(resp, 200, Map.of("message", "Logged out"));
            } else if (path.equals("/issues")) createIssue(req, resp);
            else Json.send(resp, 404, Map.of("error", "Endpoint not found"));
        } catch (SQLException e) {
            serverError(resp, e);
        }
    }

    @Override
protected void service(HttpServletRequest req, HttpServletResponse resp)
        throws ServletException, IOException {
    if ("PATCH".equalsIgnoreCase(req.getMethod())) {
        doPatch(req, resp);
    } else {
        super.service(req, resp);
    }
}
   protected void doPatch(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if (!path.matches("/issues/\\d+/status")) {
            Json.send(resp, 404, Map.of("error", "Endpoint not found"));
            return;
        }
    User user;
try {
    user = requireUser(req, resp);
} catch (SQLException e) {
    serverError(resp, e);
    return;
}
if (user == null) return;
        if (!"ADMIN".equals(user.role)) {
            Json.send(resp, 403, Map.of("error", "Admin access required"));
            return;
        }
        try {
            Map<?, ?> data = Json.body(req);
            String status = Json.string(data, "status");
            String note = Json.string(data, "adminNote");
            if (!STATUSES.contains(status)) {
                Json.send(resp, 400, Map.of("error", "Invalid issue status"));
                return;
            }
            long id = Long.parseLong(path.split("/")[2]);
            try (Connection c = Database.getConnection();
                 PreparedStatement ps = c.prepareStatement("UPDATE issues SET status=?, admin_note=? WHERE id=?")) {
                ps.setString(1, status);
                ps.setString(2, note.isBlank() ? null : note);
                ps.setLong(3, id);
                int changed = ps.executeUpdate();
                if (changed == 0) Json.send(resp, 404, Map.of("error", "Issue not found"));
                else Json.send(resp, 200, Map.of("message", "Issue updated"));
            }
        } catch (SQLException e) { serverError(resp, e); }
    }

    private void register(HttpServletRequest req, HttpServletResponse resp) throws IOException, SQLException {
        Map<?, ?> data = Json.body(req);
        String name = Json.string(data, "name");
        String email = Json.string(data, "email").toLowerCase(Locale.ROOT);
        String password = Json.string(data, "password");
        if (name.length() < 2 || name.length() > 100 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password.length() < 8) {
            Json.send(resp, 400, Map.of("error", "Enter a valid name/email and password with at least 8 characters."));
            return;
        }
        try (Connection c = Database.getConnection();
             PreparedStatement ps = c.prepareStatement("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name); ps.setString(2, email); ps.setString(3, org.mindrot.jbcrypt.BCrypt.hashpw(password, org.mindrot.jbcrypt.BCrypt.gensalt(12)));
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                User user = new User(keys.getLong(1), name, email, "STUDENT");
                req.changeSessionId();
                req.getSession(true).setAttribute("userId", user.id);
                Json.send(resp, 201, Map.of("user", user.asMap()));
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            Json.send(resp, 409, Map.of("error", "This email is already registered."));
        }
    }

    private void login(HttpServletRequest req, HttpServletResponse resp) throws IOException, SQLException {
        Map<?, ?> data = Json.body(req);
        String email = Json.string(data, "email").toLowerCase(Locale.ROOT);
        String password = Json.string(data, "password");
        try (Connection c = Database.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT id,name,email,password_hash,role FROM users WHERE email=?")) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next() || !org.mindrot.jbcrypt.BCrypt.checkpw(password, rs.getString("password_hash"))) {
                    Json.send(resp, 401, Map.of("error", "Incorrect email or password."));
                    return;
                }
                User user = new User(rs.getLong("id"), rs.getString("name"), rs.getString("email"), rs.getString("role"));
                HttpSession old = req.getSession(false);
                if (old != null) old.invalidate();
                req.getSession(true).setAttribute("userId", user.id);
                Json.send(resp, 200, Map.of("user", user.asMap()));
            }
        }
    }

    private void createIssue(HttpServletRequest req, HttpServletResponse resp) throws IOException, SQLException {
        User user = requireUser(req, resp);
        if (user == null) return;
        Map<?, ?> data = Json.body(req);
        String title = Json.string(data, "title");
        String category = Json.string(data, "category");
        String description = Json.string(data, "description");
        String location = Json.string(data, "location");
        if (title.isBlank() || title.length() > 160 || description.length() < 10 || description.length() > 5000 || location.isBlank() || location.length() > 190 || !CATEGORIES.contains(category)) {
            Json.send(resp, 400, Map.of("error", "Please complete all fields. Description must be at least 10 characters."));
            return;
        }
        try (Connection c = Database.getConnection();
             PreparedStatement ps = c.prepareStatement("INSERT INTO issues(user_id,title,category,description,location) VALUES(?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, user.id); ps.setString(2, title); ps.setString(3, category); ps.setString(4, description); ps.setString(5, location);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                Json.send(resp, 201, Map.of("id", keys.getLong(1), "message", "Issue submitted"));
            }
        }
    }

    private void listIssues(HttpServletResponse resp, User user) throws SQLException, IOException {
        String sql = "SELECT i.id,i.title,i.category,i.description,i.location,i.status,i.admin_note,i.created_at,i.updated_at,u.name AS student_name,u.email AS student_email FROM issues i JOIN users u ON i.user_id=u.id " +
            ("ADMIN".equals(user.role) ? "ORDER BY i.created_at DESC" : "WHERE i.user_id=? ORDER BY i.created_at DESC");
        try (Connection c = Database.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            if (!"ADMIN".equals(user.role)) ps.setLong(1, user.id);
            try (ResultSet rs = ps.executeQuery()) {
                List<Map<String,Object>> out = new ArrayList<>();
                while (rs.next()) out.add(issueMap(rs));
                Json.send(resp, 200, Map.of("issues", out));
            }
        }
    }

    private void getIssue(HttpServletResponse resp, User user, long id) throws SQLException, IOException {
        String sql = "SELECT i.id,i.user_id,i.title,i.category,i.description,i.location,i.status,i.admin_note,i.created_at,i.updated_at,u.name AS student_name,u.email AS student_email FROM issues i JOIN users u ON i.user_id=u.id WHERE i.id=?";
        try (Connection c = Database.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next() || (!"ADMIN".equals(user.role) && rs.getLong("user_id") != user.id)) {
                    Json.send(resp, 404, Map.of("error", "Issue not found")); return;
                }
                Json.send(resp, 200, Map.of("issue", issueMap(rs)));
            }
        }
    }

    private Map<String,Object> issueMap(ResultSet rs) throws SQLException {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", rs.getLong("id")); m.put("title", rs.getString("title"));
        m.put("category", rs.getString("category")); m.put("description", rs.getString("description"));
        m.put("location", rs.getString("location")); m.put("status", rs.getString("status"));
        m.put("adminNote", rs.getString("admin_note")); m.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
        m.put("updatedAt", rs.getTimestamp("updated_at").toInstant().toString());
        m.put("studentName", rs.getString("student_name")); m.put("studentEmail", rs.getString("student_email"));
        return m;
    }

    private User requireUser(HttpServletRequest req, HttpServletResponse resp) throws IOException, SQLException {
        User user = currentUser(req);
        if (user == null) Json.send(resp, 401, Map.of("error", "Please log in."));
        return user;
    }

    private User currentUser(HttpServletRequest req) throws SQLException {
        HttpSession session = req.getSession(false);
        if (session == null || !(session.getAttribute("userId") instanceof Number)) return null;
        long id = ((Number) session.getAttribute("userId")).longValue();
        try (Connection c = Database.getConnection(); PreparedStatement ps = c.prepareStatement("SELECT id,name,email,role FROM users WHERE id=?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? new User(rs.getLong("id"), rs.getString("name"), rs.getString("email"), rs.getString("role")) : null;
            }
        }
    }

    private String path(HttpServletRequest req) {
        String p = req.getPathInfo();
        return p == null ? "/" : p;
    }

    private void serverError(HttpServletResponse resp, Exception e) throws IOException {
        getServletContext().log("FixMyCampus API error", e);
        Json.send(resp, 500, Map.of("error", "Server/database error. Check the Tomcat logs and database settings."));
    }

    private static class User {
        long id; String name, email, role;
        User(long id, String name, String email, String role) { this.id=id; this.name=name; this.email=email; this.role=role; }
        Map<String,Object> asMap() { return Map.of("id",id,"name",name,"email",email,"role",role); }
    }
}
