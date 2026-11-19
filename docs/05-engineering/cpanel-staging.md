# Staging on cPanel

How to put the web app on the cPanel subdomain ([ADR-0013](../02-architecture/adr/0013-staging-on-cpanel.md)). It runs **in mock mode only**, with fictional sample data. Never upload real data, `.env` files or secrets.

## 1. Build the package

On a developer machine, from the repository root:

```bash
pnpm build:cpanel
```

This writes `dist/cpanel/pitchforge-web.tar.gz`: the built app, one flat `node_modules` and the start file `app.cjs`. The script stops if a symlink is left or if the client bundle fails the secret and mock-code check.

## 2. Upload

With SSH (replace the user and host):

```bash
scp dist/cpanel/pitchforge-web.tar.gz <user>@<host>:~/
ssh <user>@<host>
mkdir -p ~/apps && tar -xzf ~/pitchforge-web.tar.gz -C ~/apps && rm ~/pitchforge-web.tar.gz
```

The app goes in `~/apps/pitchforge-web`, **outside `public_html`**, so Apache never serves its files directly.

## 3. Create the Node.js app (first time only)

cPanel → **Setup Node.js App** → **Create Application**:

| Field                    | Value                 |
| ------------------------ | --------------------- |
| Node.js version          | **24.19.0**           |
| Application mode         | Production            |
| Application root         | `apps/pitchforge-web` |
| Application URL          | The staging subdomain |
| Application startup file | `app.cjs`             |

Environment variables:

| Name                      | Value                   |
| ------------------------- | ----------------------- |
| `NODE_ENV`                | `production`            |
| `API_MODE`                | `mock`                  |
| `ALLOW_MOCK_API`          | `true`                  |
| `API_URL`                 | `http://127.0.0.1:4000` |
| `NEXT_TELEMETRY_DISABLED` | `1`                     |

`API_URL` is never reached: the mock API answers inside the app. Do not press **Run NPM Install**; the package already holds everything it needs.

## 4. HTTPS and access

1. cPanel → **SSL/TLS Status**: run AutoSSL for the subdomain.
2. cPanel → **Domains**: turn on **Force HTTPS Redirect** for the subdomain. The app's cookies work only over HTTPS.
3. cPanel → **Directory Privacy**: protect the subdomain's folder with a username and password, so only the review team can open it.

## 5. Check

- Open `https://<subdomain>/login` and sign in with a sample user (`farhana@pitchforge.example`, password `sample-only`, code `123456`).
- Scan the address on a header scanner for grade A. Save the report in `docs/04-security/evidence/`.

## Update

```bash
scp dist/cpanel/pitchforge-web.tar.gz <user>@<host>:~/
ssh <user>@<host>
rm -rf ~/apps/pitchforge-web.old && mv ~/apps/pitchforge-web ~/apps/pitchforge-web.old
tar -xzf ~/pitchforge-web.tar.gz -C ~/apps && rm ~/pitchforge-web.tar.gz
```

Then press **Restart** in Setup Node.js App. To roll back, move `pitchforge-web.old` back and restart.

## If it does not start

Setup Node.js App shows the error log path. The usual causes are a Node version other than 24.19.0, a missing environment variable (`API_MODE=mock is refused` means `ALLOW_MOCK_API` is not `true`), or the memory limit of the hosting plan.
