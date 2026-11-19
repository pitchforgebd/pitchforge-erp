# Local stack and images

## Local stack

Needs Docker. From the repository root, once:

```bash
cp .env.example .env    # then replace every change-me
docker compose --env-file .env -f infra/docker/compose.yaml up -d --wait
pnpm db:migrate
```

| Service    | Address                   | For                                             |
| ---------- | ------------------------- | ----------------------------------------------- |
| `postgres` | `127.0.0.1:5432`          | PostgreSQL 16, with the roles in `db/README.md` |
| `cache`    | `127.0.0.1:6379`          | Valkey: sessions and queues                     |
| `storage`  | `127.0.0.1:9000`          | Garage: S3-compatible files                     |
| `mail`     | `127.0.0.1:1025`, `:8025` | Mailpit: SMTP, and a web page of caught mail    |

Roles are created only when the `postgres-data` volume is first made. To start again, remove the volumes with `docker compose -f infra/docker/compose.yaml down -v`; that deletes all local data.

### Storage setup

Garage starts empty. Run this once, after the first `up`:

```bash
compose="docker compose --env-file .env -f infra/docker/compose.yaml exec storage /garage"
$compose status                                     # copy the node id
$compose layout assign -z local -c 1G <node id>
$compose layout apply --version 1
$compose bucket create pitchforge-dev
$compose key create pitchforge-dev-key              # copy the key id and secret into .env
$compose bucket allow --read --write pitchforge-dev --key pitchforge-dev-key
```

## Images

`api`, `worker` and `web` each build from the repository root. All three:

- pin both base images by digest
- run as user 10001, with the application files owned by root
- have no shell and no package manager in the final image
- are made to run on a read-only root filesystem (`docker run --read-only`, and `readonlyRootFilesystem` in ECS)

`web` builds with the mock API for staging. `--build-arg BUILD_WITHOUT_MOCKS=true` removes it for production, and the image then refuses `API_MODE=mock`.

CI builds all three and runs `scripts/ci/check-images.mjs` on them.

The API takes `TRUSTED_PROXY_HOPS`, the number of proxies in front of it, so that the rate limit sees the caller's address.
