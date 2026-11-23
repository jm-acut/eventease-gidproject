# Event Ease

Event Ease is a mobile-friendly school event management web app. Students can discover school activities, view event information, and register in one place. Staff and admins can review registrations, while admins manage account roles.

## What the system does

### Students

- Create an account and log in.
- Enter a student ID in the format **4 digits, a hyphen, then 4 digits** (for example, `2024-0452`). The example is not a fixed ID; each account needs a unique ID.
- Browse, search, and filter upcoming events.
- View event dates, times, locations, and descriptions.
- Register for events and view or cancel registrations in **My Events**.
- Add or change a profile photo using a PNG or JPG image up to 2 MB.

### Staff

- Open the Admin Panel to view accounts and event registrations.
- Search accounts and registrations by a full or partial student ID.
- Staff cannot change account roles.

### Admins

- View and search accounts and event registrations.
- Change an account role between **Student**, **Staff**, and **Admin**.
- New accounts are always created as students. Only an admin can grant staff or admin access.
- Admins cannot change their own role, and the last admin cannot be demoted.

## Technology

- Frontend: HTML, CSS, and browser JavaScript
- Backend: Node.js and Express
- Database: SQLite, using Node's built-in `node:sqlite`
- Authentication: JSON Web Tokens; passwords are hashed with `bcryptjs`

## Run locally

Use Node.js 22.13 or newer.

1. Open a terminal in the project folder.
2. Install the dependencies:

   ```powershell
   npm install
   ```

3. Start the server:

   ```powershell
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in a browser.

For development with automatic server restarts:

```powershell
npm run dev
```

The server uses port `3000` by default. Set the `PORT` environment variable to use a different port.

## Database and sample events

On its first run, the server creates `eventease.db` in the project folder, creates the required tables, and adds sample events. Account and registration data is stored in this database and remains there when the server restarts.

Keep `eventease.db` backed up if you need to preserve user data. Do not delete it unless you intentionally want to reset the local database. Sample events are only seeded when the events table is empty.

## API overview

The browser app communicates with the Express server using these main routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a student account |
| `POST` | `/api/auth/login` | Log in |
| `GET` | `/api/events` | List/search/filter events |
| `GET` | `/api/events/:id` | Get event details |
| `POST` | `/api/events/:id/register` | Register for an event |
| `DELETE` | `/api/events/:id/register` | Cancel a registration |
| `GET` | `/api/my-events` | Get the signed-in user's registrations |
| `GET` | `/api/admin/registrations?studentId=...` | Staff/admin account and registration search |
| `PUT` | `/api/admin/users/:id/role` | Admin-only role change |
| `PUT` | `/api/me/profile-picture` | Update the signed-in user's profile photo |

Admin and staff permissions are checked by the server, not just hidden in the interface.

## Before deploying

This project is intended as a local/student project prototype. Before putting it on a public server:

- Replace the development JWT fallback with a strong, private `JWT_SECRET` environment variable.
- Replace the hard-coded admin bootstrap credentials in `server.js` with a secure setup method. Never publish or share admin credentials.
- Use HTTPS, protect and back up the SQLite database, and review how accounts and personal information are handled.
