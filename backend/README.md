# Smart Segment Backend

## 1. Install
```bash
npm install
```

## 2. Configure MySQL
Copy `.env.example` to `.env` and set your MySQL credentials.

Recommended: create a dedicated application user instead of using `root`. From a terminal:

```bash
sudo mysql
```

Then run:

```sql
CREATE DATABASE IF NOT EXISTS smart_segment;
CREATE USER IF NOT EXISTS 'smart_segment_app'@'localhost' IDENTIFIED BY 'YourStrongPassword';
GRANT ALL PRIVILEGES ON smart_segment.* TO 'smart_segment_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Put the same password in `backend/.env`:

```text
DB_USER=smart_segment_app
DB_PASSWORD=YourStrongPassword
DB_NAME=smart_segment
```

If you already use Ubuntu MySQL `root` with the `auth_socket` plugin, use this instead:

```text
DB_USER=root
DB_PASSWORD=
DB_SOCKET=/var/run/mysqld/mysqld.sock
DB_NAME=smart_segment
```

## 3. Create tables
```bash
mysql -u smart_segment_app -p smart_segment < sql/schema.sql
```

## 4. Start
```bash
npm start
```

Health check: `http://localhost:3000/api/health`

## Important
- Do not commit `.env` to GitHub.
- Change `JWT_SECRET` before deployment.
- Payment in this college-project version is simulated.


## Database setup

Create `.env` from `.env.example` before starting the server. For a MySQL root account using a password:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=smart_segment
JWT_SECRET=replace-with-a-random-secret
```

If Ubuntu MySQL root uses `auth_socket`, either use a dedicated MySQL application user or set `DB_SOCKET=/var/run/mysqld/mysqld.sock`.

The server now checks the database on startup and the frontend API client times out after 8 seconds instead of appearing to buffer indefinitely.
