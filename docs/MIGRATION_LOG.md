# Demo → Production Migration Log

Every change made during the migration is logged here with **what**, **why**, and **how** so we can audit correctness later.

---

## Architecture Principles (established before starting)

These were agreed upon before any code was changed. Every decision below must respect them.

1. **Demo's AI layer is the foundation.** The demo uses the Vercel AI SDK and its own thread/run engine. Production's `useLangGraphStream` SSE hook, `RunRegistry`, `RunContainer`, and `ThreadContext` are NOT being brought over.
2. **Threads live in LangGraph only.** No separate DB persistence for threads/artifacts. The demo reads/writes LangGraph's own thread API directly. Production's `threadService`/`AuditThread` DB mirror is not part of this migration.
3. **Production business features wrap the demo.** Auth, workspaces, settings, team, invites, data-sync connections, and brand persona persistence are production infrastructure that the demo UI adopts.
4. **Demo design system stays.** The paper-timetable material, dock, collapsible rail, launchpad, and all UI components keep their current look. Production components are restyled into the demo's design tokens, not the other way around.
5. **Demo-only innovations preserved.** Command palette (⌘K), triage panel, artifact vault, `g`+number keyboard navigation, per-thread stdout terminal — these stay and have no production equivalent.

---

## Migration Phases

### Phase 1 — Auth + Workspace Wiring

#### 1.1 Remove `/demo` from PUBLIC_PATHS in middleware.ts

**Date:** 2026-09-08
**Status:** Already done in a previous session.
**What:** Removed `/demo` from the `PUBLIC_PATHS` array in `middleware.ts`.
**Why:** The demo was added to `PUBLIC_PATHS` so it could be viewed without logging in during the design exploration phase. Now that we're migrating it to be the main setup, it needs the same auth guard as every other protected route.
**How:** Single-line removal from the array. The middleware's existing logic handles the rest — unauthenticated requests to `/demo/*` will redirect to `/login?next={path}`.
**Impact:** Anyone visiting `/demo` without a valid session gets redirected to login. The login page already exists and works.
**Audit check:** Visit `/demo` in an incognito window — should redirect to `/login`.

#### 1.2 Restructure demo routes to be workspace-scoped

**Date:** 2026-09-08
**What:** Changed all demo routes from `/demo`, `/demo/launchpad`, etc. to `/demo/[workspaceId]`, `/demo/[workspaceId]/launchpad`, etc.
**Why:** Every production route is scoped by workspace ID. The demo needs the same so that:
- The workspace domain (used by agents) can be pulled from the URL
- Multiple workspaces can coexist (each has its own agents, connections, persona)
- The existing `WorkspaceContext` and `useCurrentWorkspace` hook work without modification
**How:**
- Moved `app/demo/layout.tsx` → `app/demo/[workspaceId]/layout.tsx`
- Moved `app/demo/page.tsx` → `app/demo/[workspaceId]/page.tsx`
- Moved `app/demo/launchpad/page.tsx` → `app/demo/[workspaceId]/launchpad/page.tsx`
- Same for `power-agents`, `graphs`, `agency-hub`, `settings`
- Updated `DEMO_ROUTES` in `Dock.tsx` to include `[workspaceId]` in path construction
- Updated `CommandPalette.tsx` navigation to use workspace-scoped paths
- Added `useParams()` to read `workspaceId` from the URL in shell components
**Impact:** Old flat URLs (`/demo/launchpad`) will 404. New URLs are `/demo/{workspaceId}/launchpad`.
**Audit check:** Navigate to `/demo/{any-workspace-id}` — should render the dashboard with the workspace's real name and domain.

#### 1.3 Wire demo shell into AuthContext + WorkspaceContext

**Date:** 2026-09-08
**What:** Updated `DemoShell` to pull the real workspace and user from existing contexts instead of mock constants.
**Why:** The demo was using `OPERATOR` (mock: "Vivek") and a hardcoded workspace context. Now that auth guards the route, the real logged-in user and their workspace should drive the UI.
**How:**
- `DemoShell` now uses `useAuth()` from `AuthContext` for the user's display name (fallback to "Operator" if still loading)
- The demo layout passes `workspaceId` from the URL params
- `useCurrentWorkspace(workspaceId)` fetches the real workspace (name, domain, persona status)
- Greeting uses the real user name; dashboard domain references use the workspace's `websiteDomain`
**Impact:** The welcome hero shows the actual logged-in user's name. The workspace domain (not a hardcoded URL) feeds into agent inputs.
**Audit check:** Login and visit `/demo/{workspaceId}` — the greeting should show your real name, and the telemetry header should reflect the workspace.

#### 1.4 Replace mock operator with real user data

**Date:** 2026-09-08
**What:** Removed `OPERATOR` from `lib/demo/data.ts` and replaced all usages with real auth/workspace data.
**Why:** `OPERATOR` was a mock constant ("Vivek", "Forward Deployed Engineer", "Acme_SaaS_Context"). With real auth, this data comes from the backend.
**How:**
- `WelcomeHero` uses `useAuth().user?.name` for the greeting
- `TelemetryHeader` status line uses the real workspace name
- `FeedAvatar` (launchpad) uses the real user's initials
- `Dock` avatar uses real user initials, links to workspace-scoped settings
**Impact:** All hardcoded user references are gone. The UI reflects the actual session.
**Audit check:** The dock avatar and welcome greeting should show the logged-in user's info.

---

### Phase 2 — Settings + Team

#### 2.1 Real settings page with account, workspace, members, and invites

**Date:** 2026-09-08
**What:** Rebuilt the demo settings page with 7 tabs wired to real backend services.
**Why:** The demo settings had only local mock forms. Now it uses the production service layer for real CRUD operations.
**How:**
- **Profile tab**: editable display name via `editProfile` (PATCH `/user/edit-profile`), read-only email, contextual expertise textarea (informational, stored in persona)
- **Workspace tab**: editable workspace name via `workspaceService.updateWorkspace`, immutable domain (visually distinct with dashed border), creation date, danger zone with delete workspace (confirm + `deleteWorkspace` + redirect)
- **Members tab**: real member list via `memberService.listMembers`, role dropdown (editor/viewer) via `updateMemberRole`, remove member via `removeMember`, admin badge, "(you)" indicator, loading skeleton, error retry
- **Invite links tab**: create editor/viewer links via `inviteLinkService.createInviteLink`, copy invite URL to clipboard, regenerate, revoke; handles `InviteLinkConflictError` (409) gracefully; shows usage count and expiry
- **Billing/Guardrails/Analytics/Integrations tabs**: kept as static demo content (no backend for these yet)
**Impact:** The settings page now performs real API calls. Users can manage their account, workspace, team, and invites from the demo interface.
**Audit check:** Login → visit `/demo/{workspaceId}/settings` → edit profile name → check it persisted. Add a member via invite link → verify they appear in the members list.

**Services used:** `authService.editProfile`, `workspaceService.updateWorkspace/deleteWorkspace`, `memberService.listMembers/updateMemberRole/removeMember`, `inviteLinkService.createInviteLink/listInviteLinks/regenerateInviteLink/revokeInviteLink`, `useCurrentWorkspace` + `invalidateWorkspace` for cache invalidation, `notify` for toasts.

---

### Phase 3 — Data Sync Connections

#### 3.1 Data sync tab with real connection management

**Date:** 2026-09-08
**What:** Added a `data_sync` tab to the demo settings page with real credential forms, sync scheduling, and per-entity health monitoring for all 4 data sources.
**Why:** The Magento connection gate (`MagentoGate`) checks `connectionService.listConnections` before letting Mia start. The demo needs the same connection management UI so operators can actually set up and manage their data sources.
**How:**
- Created `components/demo/settings/DataSyncSection.tsx` — a self-contained component with a `SourcePanel` per data source
- **4 sources** organized into 2 groups: E-commerce (Magento) and Google (Search Console, Merchant Center, Analytics 4)
- **Each panel has 3 states**: not connected (show `connect()` button + credential form), connected (show health + schedule + sync/disconnect), checking (loading)
- **Connect form**: source-specific fields (Magento: base_url/store_id/access_token; GSC: site_url/client_id/client_secret/refresh_token; etc.), frequency selector (manual/hourly/6h/12h/daily), calls the appropriate `connectMagento/connectGsc/connectGmc/connectGa4` service method
- **Sync health**: per-entity rows showing record counts, last sync status (success/failed/running), consecutive failure count with warning badge
- **Schedule management**: dropdown to change sync frequency; calls the appropriate `updateMagento/updateGsc/updateGmc/updateGa4` with the new cron
- **Manual sync trigger**: `sync` button calls `triggerSync`, shows toast with enqueued job count, refreshes health after 2s
- **Disconnect**: confirm dialog + `connectionService.disconnect`
- Uses `FREQUENCY_OPTIONS` and `cronToFrequency` from `lib/utils/cron.ts` — the same production cron utility
**Impact:** The demo now has full data-source connection management. The Magento gate can work because operators can connect their store from the demo settings.
**Services used:** `connectionService.listConnections/connectMagento/connectGsc/connectGmc/connectGa4/updateMagento/updateGsc/updateGmc/updateGa4/disconnect/triggerSync/getSyncStates`

---

### Phase 4 — Brand Persona

#### 4.1 Brand persona editor + dashboard status indicator

**Date:** 2026-09-08
**What:** Added a `brand_persona` tab to settings with a full markdown editor (edit/preview toggle), and a persona status call-out on the dashboard.
**Why:** The brand persona feeds agent prompts — it defines the tone, terminology, and style guidelines agents use when writing content. Without it configured, agents produce generic copy. The dashboard banner prompts operators to set it up.
**How:**
- **Settings `brand_persona` tab** (replaced the static `guardrails` tab):
  - Fetches the persona via `workspaceService.getPersona` (GET `…/persona`)
  - Full markdown editor with edit/preview toggle, 18-row textarea
  - Shows `configured` / `not_set` status chip
  - Warning banner when not configured
  - Save via `workspaceService.upsertPersona` (PUT `…/persona`)
  - Unsaved-changes indicator ("unsaved" label, save button disabled when clean)
  - Static circuit-breaker guardrail card retained below the editor
  - Placeholder template pre-filled when no persona exists (voice/tone, style guidelines, terminology, SEO notes)
- **Dashboard persona status**:
  - Amber call-out with `configure()` link when no persona is set
  - Green `brand_persona: configured` check when it exists
  - Checked on mount via `workspaceService.getPersona`, non-blocking (null while loading = hidden)
**Impact:** Agents can now access the brand persona for personalized output. The dashboard nudges operators to configure it if they haven't.
**Services used:** `workspaceService.getPersona`, `workspaceService.upsertPersona`

---

## Migration Summary

| Phase | What was migrated | Commit |
|---|---|---|
| 1 | Auth guard + workspace-scoped routes + real user data | `74fb671` |
| 2 | Settings: account, workspace, members, invite links | `7e9592c` |
| 3 | Data sync: Magento, GSC, GMC, GA4 connections | `01fdb1d` |
| 4 | Brand persona editor + dashboard status | *this commit* |

### What was NOT migrated (by design)
- **Production's `useLangGraphStream` SSE hook** — the demo's AI layer uses the Vercel AI SDK
- **Production's `ThreadContext` / `threadService` DB persistence** — threads live in LangGraph only
- **Production's `RunRegistry` / `RunContainer`** — the demo has its own engine
- **Production's `InstrumentShell`** — the demo has its own dock-based design system

### Demo innovations preserved (no production equivalent)
- Command palette (⌘K)
- Triage panel (HITL approvals + circuit breaker)
- Artifact vault (run history browser)
- Keyboard navigation (`g` + number)
- Per-thread stdout terminal in Launchpad
- Collapsible dock with inline labels

---

## Phase 5 — Overlay Panels on Real Data

### 5.1 Triage panel: fabricated approval cards → real halted threads

**Date:** 2026-09-14
**What:** Rewrote `components/workspace/overlays/TriagePanel.tsx`. The panel previously rendered `TRIAGE_SEED` from `lib/demo/data.ts` — a fabricated "Q4 Marketing Assets" approval card with an `approve()` button. It now fetches real threads across every module we ship and lists the ones with `status: error`.
**Why:** Standing rules: no fabricated data in user-visible surfaces, and no underscores or parentheses in labels. The old card also implied an approval workflow that does not exist in the backend.
**How:** New hook `useAttentionThreads` in `lib/hooks/usePanelData.ts` queries `threadService.listThreads` per module (v2 agent modules + legacy `content-factory` + retired `magento-content-writer`), merges, and filters for errors. Each card links to the thread via a new `threadHref` resolver (v2 detail route for live agents, v1 detail for retired Maya, module home otherwise — fixes a 404 found when linking `/modules/{moduleId}` directly). Fetches only while the panel is open.
**Impact:** Triage is now a real "needs attention" surface for halted runs; the theatrical approve/reject theater is gone.

### 5.2 Artifact vault: fabricated run archive → real artifacts

**Date:** 2026-09-14
**What:** Rewrote `components/workspace/overlays/VaultPanel.tsx`. Previously seeded with `VAULT_SEED` (a fake "GSC MCP pipeline" run with a hardcoded ClickHouse schema). Now shows the latest real artifacts from the five most recent threads, with an Inspect toggle that reveals the actual persisted content.
**Why:** Same rules as 5.1 — the vault pretended to have run history the system never produced.
**How:** New hook `useRecentArtifacts` in `usePanelData.ts`. Fetch-on-open, newest first, capped at 10 artifacts.

### 5.3 Deleted dead TelemetryHeader; cleaned palette and store

**Date:** 2026-09-14
**What:**
- Deleted `components/workspace/dashboard/TelemetryHeader.tsx` (unmounted dead code carrying `triage_queue` / `active_swarms` labels).
- Command palette: removed the "Run Demo Swarm" command and simulator-thread entries; unified labels to "Go to …" / "Open Triage" / "Open Artifact Vault".
- `osStore`: `triage` and `vault` now initialize empty instead of with fabricated seeds; toast strings cleaned of underscores and long dashes; dead static-seed toast branch removed.
**Why:** The palette could trigger the demo simulator from any page, seeding fake threads into shared state; the seeds resurfaced fabricated content after every reload.
**Impact:** No user-visible surface outside Launchpad fabricates data anymore. The Launchpad page itself is still a simulator (see Known Gaps).

### Known Gaps (flagged, not yet rebuilt)

- **Launchpad** (`app/workspaces/[workspaceId]/launchpad/page.tsx`) is still the original demo simulator: a fake "gsc-mcp" swarm driven by `lib/demo/engine.ts` plus a hardcoded "q4-assets" campaign feed (`@glob_Writer`, `approve()`, `reject()`). Rebuilding it on the real run registry is a product decision — what should Launchpad be when runs are real?
- `TRIAGE_SEED` / `VAULT_SEED` remain in `lib/demo/data.ts` for the Launchpad theater but are no longer consumed by the store or panels.
