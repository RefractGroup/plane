# Product UX baseline

Reviewed 2 November 2026. These are heuristic findings and implementation criteria, not user research results or a declaration that the whole product is finished.

## Users and jobs

Clients need to understand delivery, find a shared item, read its context, respond with feedback or files, and submit a request. Staff need the full Plane planning and delivery toolset. Simplifying client permissions must not remove useful orientation, navigation or feedback.

## Evidence

- Inspected the deployed fork's work list and open work-item peek, plus its native `issues/peek-overview` components. Retain the global workspace header, project navigation, compact list, state/priority meanings and peek/full-screen model. The client glyphs now use the shared Refract Phosphor family described below.
- Plane's [display options](https://docs.plane.so/core-concepts/issues/display-options) and [work-item details](https://docs.plane.so/work-items/work-item-details) document the underlying interaction model. Staff-only actions must remain available to staff; client scope uses the existing restricted API.
- [Nielsen's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) supply review criteria: visible status, consistency, recognition, user control, error prevention and recovery.
- Linear [detail reference](https://mobbin.com/screens/cef36326-d8ec-4c6f-acd4-a9f1e1060d33) and [navigation reference](https://mobbin.com/screens/16e4d0c7-bf36-4daa-98f5-d3d31882cfec): quiet metadata, content/property separation, contextual navigation. These are references, not copied assets.
- Cyna's actual product repositories are the current visual reference, not its Figma. Inspected [v1](https://github.com/RefractGroup/cyna-proposals-ai) at `b8093dbc`: `src/styles.css`, widgets, buttons, tables, filter bars, auth scene, authenticated shell and dashboard. Inspected [v2](https://github.com/RefractGroup/cyna-v2) at `5552be44aca71424ec936aedeffd4e5ca21e8024`: extracted tokens, theme and design-system audit. V2 is a rebuild; v1 remains the production product. Only Cyna's public sign-in was inspected live; authenticated compositions were reviewed in source.
- Adapted from Cyna: Inter throughout, 13px operational text, restrained 24–28px headings, 4–7px corners, a neutral canvas with white content surfaces, ink primary actions and quiet surface borders. Refract keeps its own blue focus/selection colour and Plane's functionality.
- Saunday's product supplied the restrained contact-shadow and surface-edge reference. Colour is used for selection and meaning, rather than decoration on every row.
- Prism Product V1, Figma `uLkSNHZvob1RCunTfYQt7r`, informed earlier account-entry and workspace explorations. The current Cyna-derived typography and geometry supersede that exploration in code.
- Interfere remains the shared primitive/token source. Adding shadows does not replace interaction design.

## Findings and corrections

| Finding                                                               | UX consequence                                            | Implemented correction                                                                                                         |
| --------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Icon-only list controls                                               | Controls require guessing                                 | Labelled State, Priority, Sort and Display menus                                                                               |
| Display/filter state lives only in component state                    | Reloading or closing an item loses the user's place       | URL state for view, filters, sorting, pagination, layout and visible columns; return context on item navigation                |
| Every row property has a box                                          | Excess visual competition with the title                  | Aligned identifier, title, priority and date; state shown at group level                                                       |
| Home picks the first item as “your next step”                         | Implies urgency or client responsibility without evidence | Honest active-work overview ordered by due date, linked counts, shared pages                                                   |
| Narrow detail requires excessive scrolling                            | Context and response are separated                        | Responsive properties layout; expanded view puts properties in a rail                                                          |
| Detail has no traversal or link feedback                              | Repeated close/reopen and uncertainty                     | Previous/next in current result page, copy-link confirmation and failure state                                                 |
| Comment action offers little feedback                                 | Unclear whether feedback was saved                        | Sending/disabled state, success/error feedback, Ctrl/Cmd+Enter; unsent-comment warning on detail navigation and browser unload |
| Empty results have no recovery                                        | User reaches a dead end                                   | Clear filters, retry, or new-request action according to state                                                                 |
| Header search stays populated after clearing the result filter        | Search text contradicts the visible results               | Header input follows the route query, including browser navigation                                                             |
| Menu icons stack above labels and Display closes after each selection | Menus are tall, clipped and slow to adjust                | Aligned shared rows, keyboard highlight, consistent open state and close-on-select behaviour                                   |

## Acceptance criteria

- Filtering and sorting operate on the authorised queryset before pagination. Hidden staff work and other-client work never enter results or counts.
- Completed/cancelled work is never overdue. Due today is not overdue. Undated work sorts last by due date.
- Opening and closing a work item preserves search, view, page and layout. Requests return to Requests. Home links return to Home.
- Keyboard users can reach labelled controls and see focus. Escape closes detail; dirty-comment warning prevents accidental loss through detail controls.
- All visible controls work. Do not add decorative assignees, timelines, approvals, notifications or analytics without a real data/permission model.
- No fabricated metrics, client urgency, delivery promises, reviewer identities or activity history.
- Staff retain Plane's richer editing, relationships, sub-items, labels, cycles, outcomes and subscription capabilities. Client restrictions are deliberate and enforced by the API.

## Desktop verification

The local production build and web/propel type checks passed, along with seven targeted client view tests. The earlier scoped API suite passed 39 tests; this visual pass did not change API permissions. Browser review covered client sign-in, Home, list/board, detail, pages, requests and account in light/dark, plus native staff sign-in, list and detail. Password recovery was checked through form enablement without sending an email. Request cancellation was checked without creating another request. Shared controls retain Plane's high-contrast roles, checked in a temporary built-CSS control harness, and the account navigation item now shows its active state consistently. Menu mouse/keyboard selection, Escape, multiple Display changes and search clearing were rechecked after the final fixes.

Figma page **10 · Desktop implementation** contains twelve raster captures of the working local product. Earlier native design explorations remain editable on their original pages. These captures use synthetic data and do not establish production or mobile acceptance. The current design source and component inventory are recorded in `integration.json`.

Desktop checks used the actual 1200×897 browser viewport. The provider ignored a requested 1024×768 override; alternate-width acceptance is not claimed. The sign-in hydration warning was traced with temporary instrumentation to the browser QA tool inserting `div#codex-agent-overlay-root` directly under `html` while React hydrated the document. The diagnostics were removed and no product workaround was added for the tool overlay. A deployed authentication smoke test remains separate from this local review.

## Icon and Work items refinement · 3 November 2026

- Client navigation, Home, pages, account, authentication and work controls use `@plane/propel/refract-icons`, backed by the pinned Phosphor React package. Direct per-icon imports keep the module graph bounded. This is an opt-in shared entry point; the internal Plane icon registry is unchanged.
- Use regular icons at 16px for controls and 18px for navigation/overview. Filled navigation marks the current page; filled half/check circles distinguish started/completed work. Priority uses readable up/equal/down glyphs, an urgent warning and a neutral dash for no priority. Decorative icons are hidden from assistive technology; controls retain accessible names.
- Priority and due-date text are now 13px with 16px/15px glyphs. Work rows remain flat; table labels are 12px. Do not shrink the data to fit a dense toolbar.
- State and Priority remain separate, directly accessible dropdowns with icons, readable 13px options and visible selection checks. Choices apply immediately and close the menu; active chips can be removed independently. Sort uses the same keyboard menu; Display uses switches for grouping and visible properties.
- Search updates after 250ms and has an inline clear action. View, filter, sort, layout and column state still live in the URL. Clearing filters preserves the selected view.
- Work results remain visible during query changes, with a subdued progress line. Retention is explicitly keyed by workspace, preview mode and request/work scope; access failures remove old results. Aborted fetch responses cannot replace newer results. Reduced-motion preferences disable the progress animation and popover movement.
- Verification: web/Propel builds and type checks passed; 10 targeted Node tests passed, including retention scope isolation. Browser checks covered filters used together, empty states, reset, keyboard selection/Escape, live search, rapid Display changes, sorting, board/detail navigation and light/dark surfaces. Priority/date computed styles were confirmed at 13px. After restoring separate State/Priority dropdowns, the web build, type check and scoped lint passed again; browser checks confirmed combined constraints, independent removal, keyboard selection and Escape focus return.
- The new Storybook page is `Refract/Iconography`. Figma's 2 November raster captures precede this refinement; the local code and fresh browser screenshots are the current version.

## Remaining product work

This pass completes the core browse/read/respond flow, not all portal UX. Client-facing assignees, structured approvals, sub-items, activity history, notifications and rich-text comments need explicit visibility models and implementation. Performance remains a disconnected layout, as requested. Invite/setup screens in Figma need end-to-end implementation validation. Responsive browser checks and real-client task testing must be recorded separately from desktop/Figma checks.

Before calling the design ready, test with clients: find an upcoming item, explain its status, leave feedback, recover from an empty search, submit a request and find it again. Record completion, confusion and recovery, rather than relying on subjective polish.
