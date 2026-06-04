# HRMS — Human Resource Management System v2.0
## Hono.js · Next.js · TypeScript · PostgreSQL · Better Auth

---

## What Changed from v1 (JWT) to v2 (Better Auth)

| Feature | v1 Manual JWT | v2 Better Auth |
|---------|--------------|----------------|
| Login | Manual bcrypt + jose | `authClient.signIn.email()` |
| Sessions | JWT in localStorage | Secure HTTP-only cookies |
| Logout | Delete localStorage token | `authClient.signOut()` |
| Auth middleware | Custom JWT verify | `auth.api.getSession()` |
| Password reset | ❌ Not available | ✅ Built-in |
| Email verification | ❌ Not available | ✅ Built-in |
| OAuth (Google etc.) | ❌ Not available | ✅ Built-in |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Hono.js + TypeScript |
| Authentication | Better Auth |
| Frontend | Next.js 16 + TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |

---

## Setup & Run

### 1. Create the database
```sql
CREATE DATABASE hrms_db;
```

### 2. Backend setup
```bash
cd backend
npm install
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hrms_db
BETTER_AUTH_SECRET=any-random-32-character-string-here
BETTER_AUTH_URL=http://localhost:3001
PORT=3001
```

Push schema:
```bash
npx drizzle-kit push
```

Start backend:
```bash
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Create your first admin user

Better Auth uses email instead of username. Create admin via the API:

```bash
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrms.com","password":"admin123","name":"Admin User"}'
```

Then update the role in pgAdmin:
```sql
UPDATE "user" SET role = 'HR_ADMIN' WHERE email = 'admin@hrms.com';
```

### 5. Login
Open `http://localhost:3000/login`
- **Email:** `admin@hrms.com`
- **Password:** `admin123`

---

## Key Difference — Login Field

| Version | Login with |
|---------|-----------|
| v1 | username |
| v2 | email |
