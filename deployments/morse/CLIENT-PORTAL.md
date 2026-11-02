# Client interface in the Plane fork

The client interface is part of the same React Router web app and Django backend as Plane. It shares Plane's typography, theme, sidebar navigation component, buttons, inputs, status/priority icons and authentication session. There is no separate Vercel or Supabase app.

## Native interface reuse

The client shell follows the existing project tree and compact toolbar. It uses Plane's `Header`, `Row`, `Menu`, `Avatar`, `Badge`, `SidebarNavItem`, `SidebarAddButton` and icons. List rows and board cards use the existing issue-layout styling. Opening a work item keeps the list behind Plane's side-peek frame; the frame is extracted into `WorkItemPeekFrame` and used by both the original staff view and client view. Requests use the existing `ModalCore`. Home reuses `UserGreetingsView` and the native dashboard width, spacing and header.

Only client-relevant navigation and actions are exposed. The staff stores and their API fetching remain outside the client shell. Display controls support list/board, state grouping, priority/date visibility, collapsed groups, search and filtering.

## Client experience

`/client/` opens a client's assigned workspaces, landing on Home when there is one workspace. `/client/<slug>/home` shows scoped work/request/page counts, active work and recently updated shared pages. `/client/<slug>/work` shows shared work in list or board view. The project tree contains Work items, Pages and Requests, with Home above and account/sign-out in the avatar menu. Clients can read a task, reply in its external conversation, upload/download attachments, read shared documents and submit requests into Plane Intake. They cannot change project settings, tasks, labels or internal comments, or see the staff directory, assignees, cycles, internal outcomes or other clients.

Work is visible only with the configured **Client** label or a `ClientRequest` receipt for that portal. Deleted, archived and draft work is excluded. Documents must be selected explicitly, remain public within the project and retain their project link. Making a page private, archiving it, removing the share or revoking client access denies subsequent reads. A page's content revision hash changes with its title or HTML; this is not an approval workflow.

Home can also show website performance and attribution panels. These are layout-only empty states: no provider integration, sample performance metrics or attribution claims are supplied. Staff choose which panels appear per client; existing portals default to neither. Work/page totals count the full authorised queryset, independently of list pagination.

## Staff controls

A user who is an active workspace Admin **and** project Admin can manage that project's client portal at `/client/`. They can create the portal, select shared pages and Home performance panels, grant/revoke access for an existing client account, inspect recent activity and open a read-only client preview.

For portal-enabled projects, Plane's existing comment access selector is available in the internal task conversation. **Public/EXTERNAL** replies appear for clients when the task is shared. **Private/INTERNAL** remains the default. No mention convention or automatic email delivery is implemented.

People must already have a Plane account. An account with any internal workspace/project membership, instance-admin access or staff privileges cannot be converted through this UI. Existing Morse client accounts require a separate migration decision. This build sends no invitations or notification emails.

## Server boundary

`plane.client_portal` owns additive tables for portal/project mapping, permanent client-account classification, active access, document shares, request receipts and action receipts. Content remains in Plane's existing Issue, IssueComment, Page, Intake and FileAsset models.

Client accounts have no staff workspace membership. Middleware also denies their requests to staff APIs, even if membership is accidentally granted later. API-key authentication rejects client accounts. The classification remains after membership revocation, so a removed client cannot fall through to staff access. Client endpoints require the native session and enforce CSRF on writes. Staff preview never authorizes client writes.

Responses are deliberately reduced. Rich text is sanitised server-side; mentions, embeds, scripts, internal links and unbound images are removed. Images and downloads pass through authenticated, parent-bound file routes with `private, no-store` responses. No Plane key or object-storage bearer URL reaches the client. Uploads are limited to 10 MB and served as attachments. Downloads are bounded at 50 MB.

Request and reply receipts are committed in the same database transaction as the Plane objects. Reusing an operation ID returns the same result; reusing it with different content is rejected. Storage uploads use the same receipt mechanism, with immediate object cleanup if creation of the file row fails.

## Local preview

Use the isolated Docker stack from `docker-compose-test.yml` with a unique Compose project name. It has no production data or email delivery. Do not stop unrelated Docker/Supabase projects.

1. Copy `apps/api/.env.example` to ignored `apps/api/.env` if it does not exist. Use local placeholders only.
2. `pnpm install --frozen-lockfile`
3. `pnpm turbo run build --filter=web`
4. Run the isolated API (the password below is for synthetic localhost accounts only):

```sh
docker compose -p refract-client-ui -f docker-compose-test.yml run --rm \
  --name refract-client-preview-api -p 127.0.0.1:4385:8000 \
  -e WEB_URL=http://localhost:4382 -e APP_BASE_URL=http://localhost:4382 \
  -e CORS_ALLOWED_ORIGINS=http://localhost:4382 \
  -e CLIENT_PREVIEW_PASSWORD=local-preview-only \
  -e SECRET_KEY=client-preview-local-isolated-random-79403058 -e EMAIL_HOST= \
  api-tests sh -c 'python manage.py migrate --noinput && python manage.py seed_client_preview && python manage.py runserver 0.0.0.0:8000 --noreload'
```

5. Run `python3 deployments/morse/preview-client.py`, then open `http://localhost:4382/client/`.
6. Synthetic accounts: `client@preview.invalid` and `staff@preview.invalid`, using the local password above. The seed command refuses a non-local `WEB_URL`.
7. After changing code, rebuild the web app, restart the API and reload the browser. The preview uses the actual production web build.
8. Stop the preview processes, then `docker compose -p refract-client-ui -f docker-compose-test.yml down -v` to remove only this disposable stack. Its test data is ephemeral.

## Validation and rollout

Run `pnpm --filter web check:types`, the web build and the focused contract suite:

```sh
docker compose -p refract-client-ui -f docker-compose-test.yml run --rm api-tests \
  pytest --create-db plane/tests/contract/api/test_client_portal.py \
  plane/tests/contract/api/test_portal_pages.py \
  plane/tests/contract/api/test_portal_attachments.py \
  plane/tests/contract/api/test_generic_asset.py
```

`client_portal.0001_initial` and `0002_clientportal_performance_panels` are additive migrations. Apply both before serving the new code. Rehearse migration and verify the existing board/authentication on staging; take a database snapshot before a production deployment. The former backend revision can be redeployed with the new tables left in place, but the client route will then be unavailable. Keep original client accounts and URLs until the migration/pilot is separately verified.

This implementation is for review and staging. Production client migration, invitations, email delivery and approval workflows are separate rollout work.
