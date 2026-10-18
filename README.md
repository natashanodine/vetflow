# Equora

Equine clinic app: a public website plus the clinic workspace (agenda, patients, owners, medical history, documents and team).

## Services

| Service            | Port | What it does                                                      |
| ------------------ | ---- | ----------------------------------------------------------------- |
| web                | 5173 | React site (nginx). Public pages at `/`, clinic app at `/app`     |
| gateway            | 3000 | Single entry point. Checks the sign-in on every request           |
| identity-service   | 3003 | Sign-in, passwords, team members and roles, clinic name           |
| clinic-service     | 3001 | Owners, patients, medical history and uploaded files              |
| scheduling-service | 3002 | Appointments                                                      |
| mongo              | 27018| One MongoDB server with a database per service                    |

Each service talks to MongoDB through Mongoose. Data lives in the `mongo-data` Docker volume and uploaded files in `clinic-uploads`, so both survive restarts and rebuilds.

## Deploying

See [DEPLOY.md](DEPLOY.md) for putting it online: the website on Cloudflare Workers, the backend on Render, the database on MongoDB Atlas and uploaded files on Cloudflare R2.

## Roles

- **Admin**: everything, including the Team page. An admin can also be marked as a vet.
- **Vet**: edits owners, patients and medical history; can be assigned as a patient's responsible vet.
- **Staff**: adds owners, patients and appointments and uploads files, but can't edit patients, owners or medical history.

## Running it

1. `cp .env.example .env`, then fill in:
   - `MONGO_ROOT_PASSWORD`: run `openssl rand -hex 16`.
   - `SESSION_SECRET` and `INTERNAL_API_TOKEN`: run `openssl rand -hex 32` once for each.
   - `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (12+ characters): the first admin, created on first start.
2. `docker compose up --build`
3. Open http://localhost:5173 and sign in at **Staff sign in**.

Collections and indexes are created automatically when each service starts.

To browse the data, connect MongoDB Compass to `mongodb://equora:<MONGO_ROOT_PASSWORD>@localhost:27018/?authSource=admin`.

Useful commands:

- `docker compose logs -f identity-service`: see sign-in and first-admin messages.
- `docker compose down`: stop everything (data is kept).
- `docker compose down -v`: stop and **delete all data and uploaded files**.

## Forgotten admin password

```sh
docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='new-password-here' \
  identity-service node apps/identity-service/dist/scripts/create-admin.js
```

This creates the admin or resets their password. Other team members' passwords can be reset by an admin on the Team page.
