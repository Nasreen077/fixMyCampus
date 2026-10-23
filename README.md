# FixMyCampus — Fresh Starter Project

A local development starter with:
- React + Vite frontend
- Java Servlets (Jakarta Servlet API) backend
- MySQL database
- Student registration/login, issue submission and tracking
- Admin dashboard to update issue status

## Requirements
- Java JDK 17+ (JDK 24 should also work)
- Maven 3.9+
- Node.js 20+ (includes npm)
- MySQL 8+
- Apache Tomcat 10.1+

## 1. Create the database
Open MySQL Workbench or the MySQL command line and run `database/schema.sql`.
It creates `fixmycampus_db` and the required tables.

For a local demo, create an app database user (change the password to your own):
```sql
CREATE USER 'fixmycampus_app'@'localhost'
IDENTIFIED BY 'YOUR_OWN_LOCAL_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON fixmycampus_fresh.* TO 'fixmycampus_app'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Configure the backend
Open `backend/src/main/java/com/fixmycampus/config/Database.java`.
Set `DB_USER` and `DB_PASSWORD` as Windows environment variables, or use the default local values in that file (recommended: use environment variables).

Windows Command Prompt for the current terminal only:
```bat
set DB_USER=fixmycampus_app
set DB_PASSWORD=YOUR_OWN_LOCAL_PASSWORD
```

## 3. Build and deploy backend
From the `backend` directory:
```bat
mvn clean package
```
Copy `backend\target\FixMyCampus.war` to:
`C:\apache-tomcat-10.1.61\webapps\FixMyCampus.war`
(adjust path if your Tomcat folder differs).

Start Tomcat using `bin\startup.bat`, then open:
`http://localhost:8080/FixMyCampus/api/health`

Expected:
```json
{"status":"ok","service":"FixMyCampus API"}
```

If you previously deployed an app with the same name, stop Tomcat and back up/rename the old `webapps\FixMyCampus` folder and `FixMyCampus.war` first. Do not delete your old project or database until you have verified this new one works.

## 4. Start frontend
Open a new terminal in `frontend`:
```bat
npm install
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`).

The frontend proxies `/api` requests to `http://localhost:8080/FixMyCampus` during development.

## 5. First admin account
Register a normal account in the website, then promote it in MySQL:
```sql
USE fixmycampus_fresh;
UPDATE users SET role='ADMIN' WHERE email='your-email@example.com';
```
Sign out and sign back in. Admin access is controlled by the server, not just the frontend.

## API routes
- `GET /api/health`
- `POST /api/auth/register` `{ "name", "email", "password" }`
- `POST /api/auth/login` `{ "email", "password" }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/issues`
- `POST /api/issues` `{ "title", "category", "description", "location" }`
- `GET /api/issues/{id}`
- `PATCH /api/issues/{id}/status` `{ "status", "adminNote" }` (admin only)

## Troubleshooting
- `404` at `/FixMyCampus/`: use `/FixMyCampus/api/health` to test the API; this starter does not define a traditional server-rendered homepage.
- `No suitable driver`: ensure the WAR includes `WEB-INF/lib/mysql-connector-j-9.4.0.jar`; Maven dependency is included.
- `Access denied for user`: check MySQL username/password and grants.
- `Connection refused`: check that MySQL is running and port 3306 is available.
- Frontend API error: ensure Tomcat is running and `/FixMyCampus/api/health` works.
- If the frontend says not logged in after refresh, check browser cookies and that frontend is accessed through Vite's URL, not by opening an HTML file directly.

This is a local learning starter, not production-hardened. Before public deployment, configure HTTPS, secure cookie settings, CSRF protections, rate limiting, logging, and secret management.
