# Event Ease

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_App-2563eb?style=for-the-badge&logo=render&logoColor=white)](https://eventease-gidproject.onrender.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**Event Ease** is a responsive school event management web app for discovering events, registering for activities, and managing participants.

> [Open the live demo](https://eventease-gidproject.onrender.com/)

## Live Preview

| Environment | Link |
| --- | --- |
| Production | [eventease-gidproject.onrender.com](https://eventease-gidproject.onrender.com/) |

The app is hosted on Render. Because it uses a free service tier, the first request may take a few moments while the server starts.

## Features

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
- Database: SQLite with Node's built-in `node:sqlite`
- Authentication: JSON Web Tokens
- Password security: `bcryptjs`

## Deploy on Render

1. Push the project to GitHub.
2. In Render, create a **New > Web Service** and connect the repository.
3. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Runtime | `Node` |
   | Build command | `npm install` |
   | Start command | `npm start` |
   | Health check path | `/` |

4. Add a `JWT_SECRET` environment variable with a strong random value.
5. Deploy. Render will provide a public URL once the service is healthy.

For SQLite, mount a Render persistent disk for `/var/data` and update the database path in `server.js` before deployment. A disk is not included with the default ephemeral filesystem, so database changes may be lost when the service restarts or redeploys.

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


