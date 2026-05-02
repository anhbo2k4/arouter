# Docker

This project ships with a `Dockerfile` for building and running Arouter in a container.

## Build image

```bash
docker build -t arouter .
```

## Start container

```bash
docker run --rm \
  -p 1508:1508 \
  -v "$HOME/.arouter:/app/data" \
  -e DATA_DIR=/app/data \
  --name arouter \
  arouter
```

The app listens on port `1508` in the container.

## What the volume does

```bash
-v "$HOME/.arouter:/app/data" \
-e DATA_DIR=/app/data
```

`arouter` stores its database at `path.join(DATA_DIR, "db.json")`.
Without `DATA_DIR`, the app falls back to the current user's home directory (for example `~/.arouter/db.json` on macOS/Linux). In the container, set `DATA_DIR=/app/data` so the bind mount is actually used.

With the example above, the database file is:

```text
/app/data/db.json
```

and it is persisted on the host at:

```text
$HOME/.arouter/db.json
```

## Stop container

```bash
docker stop arouter
```

## Run in background

```bash
docker run -d \
  -p 1508:1508 \
  -v "$HOME/.arouter:/app/data" \
  -e DATA_DIR=/app/data \
  --name arouter \
  arouter
```

## View logs

```bash
docker logs -f arouter
```

## Optional environment variables

You can override runtime env vars with `-e`.

Example:

```bash
docker run --rm \
  -p 1508:1508 \
  -v "$HOME/.arouter:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=1508 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name arouter \
  arouter
```

## Rebuild after code changes

```bash
docker build -t arouter .
```

Then restart the container.
