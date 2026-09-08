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

### Phase 2 — Settings + Team (planned, not yet started)

*To be logged when implemented.*

---

### Phase 3 — Data Sync Connections (planned, not yet started)

*To be logged when implemented.*

---

### Phase 4 — Brand Persona (planned, not yet started)

*To be logged when implemented.*
