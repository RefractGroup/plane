# Refract board

A Refract-branded build of [Plane](https://github.com/makeplane/plane) Community Edition. It serves the internal Refract workspace and the existing Morse Micro review workspace. The deployment folder and branch retain their original names.

The production branch (`morse`) is upstream `v1.4.3` plus a small set of changes, mostly frontend:

- Brand colors use the eight Morse Micro brand colors (`packages/tailwind-config/variables.css`).
- The wordmark, icon, favicon and loading spinner show Refract's existing logo. The sign-in screen uses Refract copy without Plane's customer-logo promotion.
- The "Star us on GitHub" link and the Community edition / paid plan badge are removed.
- Kanban columns are 290px wide so four fit on a laptop screen.
- The light theme is the default (people can still choose dark), and app and authentication titles use Refract.
- Cards show two-line titles and short dates ("Nov 5"). The inline "New work item" rows are hidden.
- The sidebar hides Stickies, Your work and Drafts.
- Modules are called "Outcomes" in the English labels.
- New members start on a simple list grouped by category, showing only status, date and outcome. These defaults live in `apps/api/plane/db/models/issue.py`.
- Links between board pages open in the same tab. Cmd, Ctrl or Shift click still opens a new tab.
- The pages list sorts oldest first, so the plan comes first and the numbered strategy pages follow in order.
- `/morsemicro` is a short link to the board. It redirects to `MORSE_SHORT_LINK_TARGET`, a path set in the service variables, or to the workspace home if that isn't set.
- The web app's HTML is sent with `Cache-Control: no-cache`, so people see a new deploy straight away instead of a cached copy. Hashed files under `/assets/` cache as normal.
- When the board moves address, set `MORSE_OLD_HOST` to the old host name and every request to it redirects to the same path on `DOMAIN_NAME`. Only set it in the same change that moves `DOMAIN_NAME`; while the two match, the redirect would loop.

## How it is built

`deployments/morse/Dockerfile` rebuilds the web app and copies the complete pinned backend package (`apps/api/plane`) from this branch into the matching official runtime image. The API and workers therefore execute our fork, including the document API and file-access checks. Runtime dependencies, the realtime server and proxy remain from the official `makeplane/plane-aio-community` image of the same version. Backend dependency or migration changes must be reviewed against that pinned runtime before upgrading. The proxy runs that image's Caddy with our `Caddyfile`, which is upstream's `apps/proxy/Caddyfile.aio.ce` plus the short link, the cache header and the old-address redirect.

`supervisor.conf` is upstream's all-in-one process config with logs sent to stdout, a capped Celery worker concurrency (`CELERY_WORKER_CONCURRENCY`, default 2), and an idempotent admin bootstrap (`morse_bootstrap_admin.py`) so `/god-mode` is never left unclaimed.

## Deploying on Railway

Point the service at this repository and branch, set `RAILWAY_DOCKERFILE_PATH=deployments/morse/Dockerfile`, and keep the existing Postgres, Redis, RabbitMQ and bucket variables. `DOMAIN_NAME` is the board's public address (`portal.refract.group`, added as a custom domain on the service); Plane builds its links, sign-in redirects and allowed origins from it. Data lives in Postgres and the bucket, so rebuilding the image does not touch board content.

## Updating from upstream

The board doesn't follow Plane automatically: it's pinned to the release in `PLANE_VERSION`, and Railway only deploys pushes to `morse`. A workflow, `.github/workflows/morse-plane-release-check.yml`, checks Plane's latest release on the 1st of each month and opens an issue here when there's a newer one. It changes nothing itself. GitHub pauses scheduled workflows in public repos after 60 days without commits and emails a warning first, so re-enable it from the Actions tab if that happens.

To update (this is how v1.4.2 went to v1.4.3 on 2 November 2026):

1. Read the release notes and diff the new tag against the current one for files this branch changes, new migrations, and changes to `apps/web/Dockerfile.web`, `deployments/aio/community/` and `apps/proxy/Caddyfile.aio.ce`, which our build copies.
2. Back up the database: a Railway snapshot of the Postgres volume and a `pg_dump` (run inside the Postgres service with `railway ssh`).
3. Merge the tag on a branch, bump `PLANE_VERSION` (and anything copied from upstream build files), and push the branch. Railway won't deploy it.
4. Test on a staging copy: duplicate the production environment, point its Plane service at the branch and its own domain, restore the dump into its Postgres, then check start-up, the version, content, sign-in, editing and comments.
5. Fast-forward `morse` to the branch. Railway switches over only after the health check passes, and the previous deployment is the rollback.
6. Compare the board's content before and after, then delete the staging environment.

## License

Plane is licensed under AGPL-3.0. These modifications are published in this public repository under the same license.

## Client portal API additions

The authenticated v1 API includes read-only project pages at `projects/{project_id}/pages/`, page detail at `pages/{page_id}/`, and protected image/file redirects at `pages/{page_id}/assets/{asset_id}/`. These require active workspace membership and project Member/Admin access. Private, archived, moved and removed pages are excluded. Responses omit staff identities; detail includes live HTML, a content revision hash and bound asset metadata. The separate portal must still enforce its explicit client sharing allowlist.

Attachment APIs verify project membership and bind every asset to the work item in the URL. Generic asset routes also check the asset's project and private-page access. No schema migration is required.

Run the contract tests in `plane/tests/contract/api/test_portal_pages.py`, `test_portal_attachments.py` and `test_generic_asset.py` using the isolated Docker test stack before changing these routes. After deployment, repeat the synthetic integration checks from the private portal repository.

## Client interface

The native client interface is documented in [CLIENT-PORTAL.md](CLIENT-PORTAL.md). It reuses this fork's web app, design system, Django authentication and content models. Local preview and rollout status are separate from the live board.

The complete client interface and shared Refract design-system work are collected on `main`. Production continues to deploy `morse`; pushing `main` does not deploy the portal or migrate existing client accounts. The shared tokens, buttons, inputs and authentication surfaces apply to the staff platform as well as the client portal. Client navigation and Phosphor icons are scoped to the client interface. See `docs/design-system/PRODUCT-UX.md` for the implemented flows and remaining work.
