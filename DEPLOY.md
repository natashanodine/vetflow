# Deploying Equora

| Part                            | Where                    | Cost                         |
| ------------------------------- | ------------------------ | ---------------------------- |
| Website (React app)             | Cloudflare Workers       | Free                         |
| Backend (gateway + 3 services)  | Render, free plan        | Free                         |
| Database                        | MongoDB Atlas, M0 free   | Free (512 MB)                |
| Uploaded files                  | Cloudflare R2            | Free up to 10 GB             |

```
Browser ──> Cloudflare Worker (vetflow.<you>.workers.dev)
              ├── pages, scripts, images  (served by Cloudflare)
              └── /api/*  ──> equora-gateway.onrender.com
                                ├── equora-identity    ─┐
                                ├── equora-clinic      ─┼─> MongoDB Atlas
                                └── equora-scheduling  ─┘   (clinic also -> R2)
```

The Worker forwards `/api` to Render, so the browser only ever talks to one
site and the sign-in cookie works without any cross-site setup.

**About Render's free plan:** each service sleeps after 15 minutes without
traffic. The first sign-in after a quiet period shows "Starting up the clinic
system…" for up to a minute while all four services wake together. The public
website (home, services, team pages) never wakes them. The free plan includes
750 service-hours a month across all services; with four services awake
together that is roughly 185 hours of active use. To remove the sleep, change
each service's instance type to a paid one in Render (about $7/month each).

---

## 1. Push the code to GitHub

Render and Cloudflare both deploy from the GitHub repo, and redeploy
automatically whenever you push to `main`.

```sh
git add -A
git commit -m "Prepare deployment to Render and Cloudflare"
git push
```

## 2. Create the database (MongoDB Atlas)

1. Sign up at https://www.mongodb.com/cloud/atlas and create a **free (M0)**
   cluster. Choose **AWS, N. Virginia (us-east-1)**, close to the Render
   services.
2. **Database Access → Add new database user.** Use a password with only
   letters and numbers (it goes into a URL). Role: *Read and write to any
   database*.
3. **Network Access → Add IP address → Allow access from anywhere**
   (`0.0.0.0/0`). Render's free plan has no fixed IP addresses.
4. **Connect → Drivers** and copy the connection string. It looks like:
   `mongodb+srv://equora:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
   Put your password in place of `<password>`. Keep it for step 4.

Each service keeps its own database inside this cluster (`vetflow_identity`,
`vetflow_clinic`, `vetflow_scheduling`), created on first start.

## 3. Create the file storage (Cloudflare R2)

1. Sign up at https://dash.cloudflare.com. In the sidebar open **R2 Object
   Storage** and enable it. Cloudflare may ask for a payment method; usage
   within the free tier isn't charged.
2. **Create bucket** named `equora-files` (keep the default settings; the
   bucket stays private).
3. **Manage API tokens → Create API token** (R2 token):
   - Permissions: **Object Read & Write**
   - Specify bucket: **equora-files**
4. Copy the **Access Key ID**, the **Secret Access Key** and your
   **Account ID** (shown on the R2 overview page). Keep them for step 4.
   The secret is only shown once.

### Staying inside the free tier

Cloudflare has no switch that stops R2 at the free limit, so the app enforces
one itself: once all uploaded files together reach **9 GB**, new uploads are
refused with "File storage is full" until some files are deleted. Change it
with `STORAGE_LIMIT_GB` on `equora-clinic` in Render. Each file is also capped
at 15 MB, and images are shrunk in the browser before upload.

The other two free allowances (1 million uploads and 10 million file views a
month) are far beyond what a clinic uses. For extra peace of mind, add an
email alert: **Manage Account → Billing → Billable Usage → Create budget
alert** with a threshold of $1. It only notifies; it doesn't stop anything.

## 4. Deploy the backend (Render)

1. Sign up at https://render.com with your GitHub account.
2. **New + → Blueprint**, pick the `vetflow` repository. Render reads
   `render.yaml` and lists four services and the `equora-shared` group.
3. Fill in the values it asks for:

   | Service             | Setting                  | Value                                    |
   | ------------------- | ------------------------ | ---------------------------------------- |
   | equora-identity     | `MONGODB_URI`            | Atlas connection string (step 2)         |
   | equora-identity     | `INITIAL_ADMIN_NAME`     | Your name                                |
   | equora-identity     | `INITIAL_ADMIN_EMAIL`    | Your sign-in email                       |
   | equora-identity     | `INITIAL_ADMIN_PASSWORD` | A password with 12+ characters           |
   | equora-clinic       | `MONGODB_URI`            | The same Atlas connection string         |
   | equora-clinic       | `R2_ACCOUNT_ID`          | Cloudflare Account ID (step 3)           |
   | equora-clinic       | `R2_ACCESS_KEY_ID`       | R2 Access Key ID (step 3)                |
   | equora-clinic       | `R2_SECRET_ACCESS_KEY`   | R2 Secret Access Key (step 3)            |
   | equora-scheduling   | `MONGODB_URI`            | The same Atlas connection string         |

   `INTERNAL_API_TOKEN`, `SESSION_SECRET` and `DATA_ENCRYPTION_KEY` are
   generated by Render. Copy `DATA_ENCRYPTION_KEY` from `equora-identity` →
   **Environment** somewhere safe (a password manager): names and emails in
   the database are encrypted with it and can't be read without it.
4. **Apply.** The first build takes several minutes per service.
5. When all four show **Live**, open each one and check its address. They
   should be `https://equora-gateway.onrender.com`,
   `https://equora-identity.onrender.com`, and so on. If Render added
   something to a name (because it was taken), update:
   - the URLs in **Environment Groups → equora-shared** (then redeploy the
     services), and
   - `API_ORIGIN` in `apps/web/wrangler.jsonc` (the gateway's address).
6. Check `https://equora-gateway.onrender.com/wake`. It should answer
   `{"ready":true}` (it may take a minute the first time).

## 5. Deploy the website (Cloudflare Workers)

1. In the Cloudflare dashboard: **Workers & Pages → Create → Import a
   repository** and pick `vetflow`.
2. Build settings:
   - **Project name:** `vetflow` (must match `name` in `apps/web/wrangler.jsonc`)
   - **Root directory:** leave empty (the repo root)
   - **Build command:** `npm ci && npm run build --workspace=@vetflow/web`
   - **Deploy command:** `npx wrangler deploy --config apps/web/wrangler.jsonc`
3. **Deploy.** Then open **Settings → Domains & Routes** and switch on the
   **Production** `workers.dev` address. The site is at
   `https://vetflow.<your-subdomain>.workers.dev`.
4. Open it, click **Staff sign in**, and use the admin email and password from
   step 4. Then add the rest of the team on the **Team** page.

You can also deploy the website from your Mac instead:
`npx wrangler login`, then `npm run deploy --workspace=@vetflow/web`.

## Custom domain (optional)

If you own a domain, add it to Cloudflare, then in the Worker open
**Settings → Domains & Routes → Add → Custom domain** (for example
`www.equora.com`). Nothing on Render needs to change.

## Updating

Push to `main`. Cloudflare rebuilds the website, and Render rebuilds only
the services whose folders changed.

## Troubleshooting

- **"Starting up the clinic system…" never finishes:** open the Render
  dashboard and check each service's **Logs**. A wrong `MONGODB_URI` or an
  Atlas IP rule that doesn't allow `0.0.0.0/0` are the usual causes.
- **Can't sign in after deploying:** the first admin is only created when
  the database has no users. Check the `equora-identity` logs for
  "Created the first admin". To create an admin or reset a forgotten admin
  password, run this on your Mac from the repo folder (after `npm install`),
  using the Atlas connection string:

  ```sh
  MONGODB_URI='mongodb+srv://…' MONGODB_DB_NAME=vetflow_identity \
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='new-password-here' \
  npm run admin:create --workspace=@vetflow/identity-service
  ```
- **Uploads fail:** check the `R2_*` settings on `equora-clinic` and that the
  token has Object Read & Write on `equora-files`.

## Security notes

- **Passwords** are stored only as bcrypt hashes; they can't be recovered,
  only reset.
- **Sign-in** issues a signed JSON Web Token (HS256, 7 days) in an HttpOnly,
  Secure, SameSite cookie, so page scripts can't read it. Every request is
  checked against the live account, so changing or resetting a password, or
  deactivating someone, signs them out everywhere immediately.
- **Names and emails** of clinic users are encrypted in the database
  (AES-256-GCM, key `DATA_ENCRYPTION_KEY`). Users are found by a keyed
  fingerprint of their email, never by the readable address.
- **Repeated wrong passwords** (10 in a row) lock the account for 15 minutes.
  An admin resetting the password on the Team page unlocks it.

