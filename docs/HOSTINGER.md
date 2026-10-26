# Install OurDealsHub on Hostinger

This guide installs a new site on managed hosting using GitHub, Node 22 and
MariaDB. For an existing site, follow [data migration](DEPLOY.md#backups-and-data-migration)
before enabling scheduled jobs, and skip initial administrator creation.

## 1. Prepare your hosting account

Use a Hostinger plan that includes **Node.js Web Apps**, a MySQL/MariaDB database,
cron jobs and SSH access for one-time initialization. Hostinger currently lists
Business/Unlimited and Cloud plans for managed Node.js apps. Confirm the feature
is included in your account; the word “unlimited” alone does not identify its
runtime capabilities. See [Hostinger's app setup guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

Have your domain and GitHub repository ready. If the repository is private,
authorize Hostinger's GitHub app to access it. Your production origin must use
HTTPS, for example `https://deals.example.com`.

## 2. Create a database

In your website's hPanel database management area, create a database and its user.
Record the full database name, username, password and connection host. Hostinger
documents `127.0.0.1` for an app's local MySQL database; use the connection details
shown for your account. See [Hostinger's Prisma database instructions](https://www.hostinger.com/support/how-to-deploy-prisma-apps-on-hostinger-node-js-hosting/).

The application uses the Prisma **mysql** provider for MariaDB/MySQL. Its
connection URL has this format:

```text
mysql://DATABASE_USER:ENCODED_PASSWORD@127.0.0.1:3306/DATABASE_NAME?connection_limit=5
```

Percent-encode reserved characters in the username/password components. Do not
encode the entire URL. Keep this value private.

## 3. Connect GitHub and set the application options

In hPanel, create a website using **Web App → Import Git Repository**, authorize
GitHub if necessary, and select your repository and production branch. Hostinger
detects frameworks and offers build settings in this flow. See the
[GitHub deployment steps](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/#deploying-from-a-github-repository).

Use these settings for this repository:

| Setting | Value |
| --- | --- |
| Framework | Next.js, with server-side support |
| Node.js | **22.x**, matching `.nvmrc` and `package.json` |
| Project root | Repository root, containing `package.json` |
| Package manager | npm, using the committed `package-lock.json` |
| Install command, if editable | `npm ci --include=dev` |
| Build command | `npm run build:hostinger` |
| Build output, if requested | `.next` |
| Start command, if requested | `npm start` |

Hostinger allows selecting [Node 22](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/).
The build must include development dependencies because Prisma's CLI, TypeScript
and build tooling are needed during deployment. The project already pins matching
Prisma/client versions and generates the client after dependency installation.

Leave `NEXT_OUTPUT` unset, allow the platform to supply `PORT`, and keep the
standard Next.js server deployment. Do not choose static export or upload only
the `public/` directory: authentication, database access and redirects need Node.

## 4. Set production environment variables and deploy

Add these variables in the Node.js app's environment settings **before building**.
Values below are placeholders; replace them with your own.

| Variable | Required value |
| --- | --- |
| `DATABASE_URL` | The private `mysql://` URL from step 2 |
| `NEXT_PUBLIC_SITE_URL` | Your canonical HTTPS origin, without a trailing slash |
| `AUTH_URL` | Same canonical HTTPS origin |
| `NEXTAUTH_URL` | Same canonical HTTPS origin |
| `AUTH_SECRET` | A random secret of at least 32 characters |
| `NEXTAUTH_SECRET` | The **same** value as `AUTH_SECRET` |
| `CRON_SECRET` | A separate random secret of at least 16 characters |
| `ADMIN_EMAIL` | Initial administrator's email address |
| `ADMIN_PASSWORD` | Strong, unique initial administrator password |
| `ADMIN_NAME` | Administrator's display name |
| `CONTACT_EMAIL` | Public contact address for the website |
| `NODE_ENV` | `production` |

Generate secrets locally using Node, once for the authentication secret and
again for the separate cron secret:

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex') + '\n')"
```

Use the existing authentication secret when migrating a site. Changing it would
make stored API keys, social tokens and mail credentials unreadable. API and
mail credentials can be entered later through the admin panel; see
[`.env.example`](../.env.example) for optional environment fallbacks.

Connect your domain and enable HTTPS using hPanel. Deploy the app and inspect
its build log: `build:hostinger` runs database migrations, generates Prisma's
client and builds Next.js. `DATABASE_URL` must work from the build environment,
as explained in [Hostinger's Prisma guide](https://www.hostinger.com/support/how-to-deploy-prisma-apps-on-hostinger-node-js-hosting/).
The storefront may be empty until initialization and product entry are complete.

Changing `NEXT_PUBLIC_SITE_URL` later requires a rebuild because Next.js inlines
public environment variables into its browser bundle.

## 5. Create the initial administrator

**New empty databases only.** This creates the Super Admin and category structure.
For a transferred database, use its existing admin account instead: running the
seed again resets the configured administrator's password and role.

Enable SSH access in hPanel and connect using the SSH host, username and port
shown for your account. Hostinger documents that `npm` commands are unavailable
through SSH on managed plans, so use the Node executable directly. Its current
application directory layout is documented under
[finding your live files](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

Replace `USER` and `DOMAIN` throughout these commands:

```bash
cd /home/USER/domains/DOMAIN/hbuilds/current/nodejs
ALLOW_PROD_SEED=1 SEED_WIPE=0 /opt/alt/alt-nodejs22/root/bin/node --env-file=/home/USER/domains/DOMAIN/hbuilds/config/.env node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Check that the private environment file exists and contains the production
settings from step 4. The `ALLOW_PROD_SEED` flag applies only to this invocation;
`SEED_WIPE=0` prevents catalog deletion. Never add seeding to the normal build
command or recurring cron jobs.

Open `https://YOUR_DOMAIN/admin/login` and sign in with the `ADMIN_EMAIL` and
`ADMIN_PASSWORD` you configured. No shared default credentials are provided.

## 6. Configure products, automation and email

1. Under **Admins**, enter each owner's US, UK and/or Canada tracking IDs.
2. Under **Settings → API Keys**, save the relevant Amazon Creators API
   credentials and test the connections. Set up Gemini for generated copy, or
   use manual product entry. API access eligibility is controlled by Amazon.
3. Add a real product. Verify its marketplace, owner and Amazon destination.
   Savings badges appear only for eligible, fresh API offers; they cannot be
   entered manually. See [verified discounts](DISCOUNTS.md).
4. Optionally add previews under **Settings → Samples**. Their savings are
   illustrative and their buttons do not shop on Amazon. Remove them before launch.
5. Connect channels under **Automation** following [social setup](SOCIAL.md).
   Instagram/Pinterest need public HTTPS access to the generated share images.
6. Configure **Settings → Email notifications**, send a test, then enable alerts.
   Gmail uses an App Password; personal Outlook uses Microsoft OAuth. See
   [email setup](EMAIL.md).

Review the site's contact details, privacy policy, terms and affiliate disclosure
before making it public.

## 7. Configure scheduled jobs

Open **Advanced → Cron Jobs** for the app. Hostinger's Node jobs use UTC and need
an explicit environment file. The documented command format is:

```text
/opt/alt/alt-nodejs22/root/bin/node --env-file=/home/USER/domains/DOMAIN/hbuilds/config/.env /home/USER/domains/DOMAIN/hbuilds/current/nodejs/scripts/cron-mail.mjs
```

Replace the username/domain and confirm the actual paths. Use the command above
for mail, and change the final script filename for each other job:

| Script | Cron expression (UTC) | Purpose |
| --- | --- | --- |
| `cron-mail.mjs` | `* * * * *` | Health monitoring and administrator notifications |
| `cron-social.mjs` | `*/5 * * * *` | Deliver queued social posts |
| `cron-amazon.mjs` | `17 * * * *` | Refresh eligible Amazon savings and product data |
| `cron-daily.mjs` | `0 13 * * *` | Scheduled publishing and daily maintenance |

Hostinger limits each job to one command of at most 255 characters, disallows
`%` in the command, and stops jobs after 30 minutes. Keep URL-encoded secrets in
the environment file instead of the command field. Check each job's output after
its first run. See [Hostinger's Node cron instructions](https://www.hostinger.com/support/how-to-run-cron-jobs-for-node-js-websites-at-hostinger/).

Do not separately schedule `/api/cron/daily` if the daily script is scheduled.
Mail and social processing have database claims against duplicate delivery;
keep maintenance and offer-refresh schedules apart and within the account's
resource and API limits. These scripts finish and exit, matching Hostinger's
[restrictions on persistent background workers](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/).

## 8. Backups, updates and launch checks

Use the hosting account's database backup/export facilities and keep an
independent copy. If `mariadb-dump` or `mysqldump` is available, the optional
`scripts/backup-db.mjs` job can write private compressed backups; set `BACKUP_DIR`
to a durable directory outside the deployment versions and `public_html`.
See [backup and migration instructions](DEPLOY.md#backups-and-data-migration).

Back up before schema changes, then redeploy the intended GitHub commit through
hPanel. Ensure any automatic deployment targets the intended branch. Keep the
normal build command `npm run build:hostinger`; do not seed during updates.

Before launch, verify the storefront, category/search pages, admin sign-in,
product import, email test, social delivery history and scheduled-job output.
Confirm that `/.env` is inaccessible and that site URLs use the public HTTPS
domain. Add independent uptime monitoring for outages that prevent the app's
own notifier from running.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No Node.js Web App option | Confirm the plan includes managed Node.js apps |
| `prisma: not found` while installing/building | Ensure build dependencies are installed; see Hostinger's Prisma guide |
| Migration cannot connect / Prisma `P1001` | Database host, full username/name, encoded password and build-time `DATABASE_URL` |
| Prisma engine missing at runtime | Follow the engine target guidance in Hostinger's Prisma guide, then rebuild |
| Cannot sign in on a new database | Complete step 5 once and confirm production URL/authentication secrets |
| Cron cannot locate a script | Confirm `hbuilds/current/nodejs`, the Node 22 path and private environment file |
| No discount badge | Confirm API access, an eligible offer and recent refresh-job output |
| Email or social stays queued | Check cron output, connection credentials and delivery history |
| Site returns 503 | Inspect runtime logs and hosting resource usage; restart through hPanel after fixing the cause |

Provider documentation was checked on October 26, 2026. Account-specific paths
and hPanel labels can differ; use the values displayed for your account.
