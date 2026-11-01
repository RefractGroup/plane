# Morse Micro board

A Morse Micro-branded build of [Plane](https://github.com/makeplane/plane) Community Edition, run by Refract for the Morse Micro website and content programme.

This branch (`morse`) is upstream `v1.4.2` plus a small set of changes, mostly frontend:

- Brand colors use the eight Morse Micro brand colors (`packages/tailwind-config/variables.css`).
- The Plane wordmark, icon, favicons and loading spinner show the Morse Micro logo.
- The "Star us on GitHub" link and the Community edition / paid plan badge are removed.
- Kanban columns are 290px wide so four fit on a laptop screen.
- The light theme is the default (people can still choose dark), and page titles read "Morse Micro | Website and Content".
- Cards show two-line titles and short dates ("Nov 5"). The inline "New work item" rows are hidden.
- The sidebar hides Stickies, Your work and Drafts.
- Modules are called "Outcomes" in the English labels.
- New members start on a simple list grouped by category, showing only status, date and outcome. This is the one backend change: `apps/api/plane/db/models/issue.py` is copied into the image.
- Links between board pages open in the same tab. Cmd, Ctrl or Shift click still opens a new tab.
- The pages list sorts oldest first, so the plan comes first and the numbered strategy pages follow in order.
- `/morsemicro` is a short link to the board. It redirects to `MORSE_SHORT_LINK_TARGET`, a path set in the service variables, or to the workspace home if that isn't set.
- The web app's HTML is sent with `Cache-Control: no-cache`, so people see a new deploy straight away instead of a cached copy. Hashed files under `/assets/` cache as normal.

## How it is built

`deployments/morse/Dockerfile` rebuilds only the web app from this branch, using the same build settings as upstream `apps/web/Dockerfile.web`. The API, workers, realtime server and proxy come from the official `makeplane/plane-aio-community` image of the same version, with the one model file above copied over. The proxy runs that image's Caddy with our `Caddyfile`, which is upstream's `apps/proxy/Caddyfile.aio.ce` plus the short link and cache header.

`supervisor.conf` is upstream's all-in-one process config with logs sent to stdout, a capped Celery worker concurrency (`CELERY_WORKER_CONCURRENCY`, default 2), and an idempotent admin bootstrap (`morse_bootstrap_admin.py`) so `/god-mode` is never left unclaimed.

## Deploying on Railway

Point the service at this repository and branch, set `RAILWAY_DOCKERFILE_PATH=deployments/morse/Dockerfile`, and keep the existing Postgres, Redis, RabbitMQ and bucket variables. `DOMAIN_NAME` is the board's public address (`portal.refract.group`, added as a custom domain on the service); Plane builds its links, sign-in redirects and allowed origins from it. Data lives in Postgres and the bucket, so rebuilding the image does not touch board content.

## Updating from upstream

Merge or rebase onto a newer upstream tag, then bump `PLANE_VERSION` in the Dockerfile to the same tag so the web build and runtime image match.

## License

Plane is licensed under AGPL-3.0. These modifications are published in this public repository under the same license.
