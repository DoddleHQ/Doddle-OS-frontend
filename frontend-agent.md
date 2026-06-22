# Frontend Agent — Building Scalable Frontend Applications

> **Purpose:** This document serves as the definitive guide for building scalable, maintainable, and production-ready frontend applications in the Agentic Marketing OS ecosystem. It codifies architecture decisions, coding standards, best practices, and patterns that every developer (human or AI agent) must follow.

---

## Table of Contents

1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [Component Design Principles](#4-component-design-principles)
5. [Design System & Styling](#5-design-system--styling)
6. [Type System & TypeScript Standards](#6-type-system--typescript-standards)
7. [State Management](#7-state-management)
8. [Data Layer & API Integration](#8-data-layer--api-integration)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Routing & Layout Patterns](#10-routing--layout-patterns)
11. [Error Handling & Loading States](#11-error-handling--loading-states)
12. [Real-Time Streaming & HITL Protocol](#12-real-time-streaming--hitl-protocol)
13. [Code Cleanliness & Quality](#13-code-cleanliness--quality)
14. [Performance & Scalability](#14-performance--scalability)
15. [Testing Strategy](#15-testing-strategy)
16. [Naming Conventions](#16-naming-conventions)
17. [New Module Checklist](#17-new-module-checklist)

---

## 1. Tech Stack & Dependencies

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| **Next.js** | 14.1+ | App Router, SSR, file-based routing |
| **React** | 18.2+ | UI library with hooks paradigm |
| **TypeScript** | 5.0+ | Strict type safety |

### Styling & UI
| Package | Purpose |
|---------|---------|
| **Tailwind CSS** | Utility-first CSS framework |
| **Class Variance Authority (CVA)** | Component variant definitions |
| **clsx + tailwind-merge** | Conditional class merging via `cn()` utility |
| **Framer Motion** | Animations, transitions, accordions |
| **Lucide React** | Icon library (tree-shakeable) |
| **@mui/material** | Supplementary UI components (use sparingly) |

### Data & Validation
| Package | Purpose |
|---------|---------|
| **Zod** | Runtime schema validation (HITL payloads, API responses) |
| **React Hook Form** | Form state management |
| **react-markdown** | Markdown rendering in chat messages |

### Developer Experience
| Package | Purpose |
|---------|---------|
| **ESLint** (next config) | Code linting |
| **Jest + React Testing Library** | Unit and integration testing |
| **Playwright** | E2E testing |

### Notifications
| Package | Purpose |
|---------|---------|
| **react-toastify** | Toast notifications for async operation feedback (signup success, login errors, etc.) |

### Dependency Rules
- **NEVER** add a dependency without documenting its purpose in this table.
- **PREFER** tree-shakeable libraries (e.g., `lucide-react` over `react-icons`).
- **AVOID** heavy UI libraries that conflict with Tailwind (MUI is an exception for complex components only).
- **ALWAYS** pin major versions in `package.json`.

---

## 2. Architecture Overview

### Design Philosophy

The application follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                    Pages (app/)                       │  Route-level components
│  Server Components by default, Client when needed     │
├─────────────────────────────────────────────────────┤
│              Domain Components (components/)          │  Feature-specific
│  Business logic, complex compositions                  │
├─────────────────────────────────────────────────────┤
│                UI Primitives (components/ui/)          │  Reusable atoms
│  Button, Card, Badge, Modal, etc.                     │
├─────────────────────────────────────────────────────┤
│                  Data Layer (lib/)                     │  Services, hooks, types
│  API client, auth, streaming, validation               │
└─────────────────────────────────────────────────────┘
```

### Core Patterns

| Pattern | Where Used | Description |
|---------|-----------|-------------|
| **Atomic Design** | `components/` | Atoms (UI primitives) → Molecules (composed) → Organisms (domain) |
| **Server/Client Split** | `app/` | Server Components for layouts/data, Client Components for interactivity |
| **Provider Pattern** | `app/providers.tsx` | Global state via React Context (Auth, Thread) |
| **Composition Pattern** | Domain components | Complex UI built by composing smaller primitives |
| **Variant Pattern (CVA)** | `components/ui/` | Type-safe component variants (Button, Badge, Card) |
| **Barrel Exports** | `index.ts` files | Single import point per module |
| **Service Layer** | `lib/services/` | API logic separated from components |
| **Custom Hooks** | `lib/hooks/` | Reusable stateful logic encapsulation |

---

## 3. Directory Structure

```
app/                              # Next.js App Router — pages and layouts
  layout.tsx                     # Root layout (fonts, providers, metadata)
  page.tsx                        # Landing page (workspace listing)
  providers.tsx                   # Client-side provider wrapper
  globals.css                     # Global styles, CSS variables, Tailwind layers
  login/                          # Auth pages
  signup/
  check-email/                    # Post-signup email verification interstitial
  verify-email/                   # Email verification callback (from email link)
  forgot-password/
  reset-password/
  api-playground/                 # Dev API testing tool
  workspaces/
    [workspaceId]/                # Dynamic workspace route
      layout.tsx                  # Workspace shell (LeftNav, TopBar, RightRail)
      loading.tsx                 # Workspace loading skeleton
      error.tsx                   # Workspace error boundary
      page.tsx                    # Default workspace view
      mission-control/            # Kanban dashboard
      modules/
        [moduleSlug]/             # Dynamic module route
          page.tsx                # Module listing view
          loading.tsx             # Module loading skeleton
          error.tsx               # Module error boundary
          [threadSlug]/           # Dynamic thread route
            page.tsx              # Thread detail view
            loading.tsx           # Thread loading skeleton
            error.tsx             # Thread error boundary
        {module-name}/            # Named module routes (seo-cluster, content-factory, etc.)
          page.tsx
          loading.tsx
          error.tsx
          layout.tsx              # Module-specific layout (if needed)
          new/                    # New thread creation
          [threadId]/             # Thread detail
      settings/                   # Workspace settings

components/                       # All reusable UI components
  ui/                             # Design system primitives
    Button.tsx                    # CVA-based button with variants
    Card.tsx                      # Composable card (Header, Title, Content, Footer)
    Badge.tsx                     # Status badges
    Avatar.tsx                    # User/agent avatars
    Modal.tsx                     # Overlay dialog
    Skeleton.tsx                   # Loading placeholder
    EmptyState.tsx                # Error/empty state display
    ProgressBar.tsx                # Progress indicators
    MetricStat.tsx                # KPI metric display
    Accordion.tsx                 # Expandable sections
    Tag.tsx                       # Label tags
    Tooltip.tsx                   # Hover tooltips
    SegmentedControl.tsx          # Tab-like toggle
    Input.tsx                     # Form input
    Notification.tsx              # Toast notifications
    index.ts                       # Barrel export
  layout/                         # App shell components
    LeftNav.tsx                   # Sidebar navigation
    TopBar.tsx                    # Top header bar
    RightRail.tsx                 # Context-aware sidebar
    UserMenu.tsx                  # User dropdown menu
    WorkspaceSwitcher.tsx        # Discord-style workspace switcher
  domains/                        # Feature-specific domain components
    AgentScorecard.tsx            # Agent performance metrics
    ConflictPanel.tsx             # Agent conflict resolution
    ThreadTimeline.tsx            # Thread event timeline
    kanban/                       # Kanban board components
      KanbanBoard.tsx
      KanbanCard.tsx
      BoardHeader.tsx
      BoardInsightsStrip.tsx
      LiveActivityRail.tsx
      DomainHealthChips.tsx
  {module-name}/                  # Module-specific components
    chat/                         # Chat-related components
      ChatInput.tsx
      ChatMessage.tsx
      HITLMessageCard.tsx         # Human-in-the-loop interaction card
      artifacts/                   # Artifact display components
        ArtifactCardRouter.tsx
        ArtifactCardShell.tsx
        DataTableArtifactCard.tsx
        MarkdownArtifactCard.tsx
        GenericArtifactCard.tsx
    form/                         # Form components
      FormField.tsx
      ContentTypesSelector.tsx
      TeamMemberSelector.tsx
    types/                        # Module-specific types
    utils/                        # Module-specific utilities
  common/                         # Shared cross-domain components
    ArtifactContentView.tsx
    MetricsGrid.tsx
  auth/                           # Auth-specific components
    ResendVerificationEmail.tsx   # Reusable resend verification button with cooldown

lib/                              # Core library code (NOT components)
  utils.ts                        # cn() utility (clsx + tailwind-merge)
  theme.ts                        # Design tokens (colors, spacing, shadows)
  apiMock.ts                       # Mock API functions for development
  streamLangGraph.ts              # LangGraph SSE streaming client
  config/                         # Configuration files
    langgraph.config.ts           # LangGraph endpoint configuration
  contexts/                       # React Context providers
    AuthContext.tsx                # Authentication state & token management
    ThreadContext.tsx              # Thread state management
  hooks/                          # Custom React hooks
    useLangGraphStream.ts         # LangGraph streaming hook with HITL support
  services/                       # API service layer
    apiClient.ts                   # Auth-aware fetch wrapper (401 → refresh → retry)
    authService.ts                # Authentication API calls
    threadService.ts              # Thread CRUD operations
  types/                          # Shared TypeScript types
    graph-events.types.ts         # LangGraph event type definitions
    thread.types.ts               # Thread & artifact types
    gsc.types.ts                  # Google Search Console types
    report.types.ts               # Report types
    site.types.ts                 # Site configuration types
  utils/                          # Utility functions
    artifactUtils.ts              # Artifact processing helpers
    eventValidator.ts             # Zod-based event validation
    urlUtils.ts                   # URL manipulation helpers

data/                             # Mock data (development only)
  mockData.ts                     # Core interfaces and mock data
  contentFactory.ts               # Content factory module data
  missionControl.ts               # Mission control data
  saasLaunchOps.ts                # SaaS launch ops data
  seoCluster.ts                   # SEO cluster data

middleware.ts                      # Next.js Edge middleware (auth guard)
```

---

## 4. Component Design Principles

### 4.1 Server Components by Default

Every component in the `app/` directory is a **Server Component** by default. Only add `'use client'` when the component genuinely needs:

- Interactive state (`useState`, `useReducer`)
- Event listeners (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `document`, `localStorage`)
- React hooks (`useEffect`, `useCallback`, custom hooks)

```tsx
// ✅ GOOD — Server Component (default, no directive needed)
export default function ModulePage({ params }: { params: { workspaceId: string } }) {
  return <div>Static content with server-fetched data</div>;
}

// ✅ GOOD — Client Component only when necessary
'use client';
export function ConflictPanel({ options }: { options: Option[] }) {
  const [selected, setSelected] = useState<Option | null>(null);
  return <div onClick={() => setSelected(options[0])}>...</div>;
}
```

### 4.2 Component Composition

Prefer **composition over configuration**. Build complex UIs by nesting simple primitives:

```tsx
// ✅ GOOD — Composable Card
<Card variant="outlined">
  <CardHeader>
    <CardTitle>Module Health</CardTitle>
    <CardDescription>Real-time system metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <MetricStat label="Uptime" value="99.9%" trend="up" />
  </CardContent>
  <CardFooter>
    <Button variant="primary" size="sm">View Details</Button>
  </CardFooter>
</Card>
```

### 4.3 Component Variant Pattern (CVA)

All UI primitives use **Class Variance Authority** for type-safe variants:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva(
  'base-classes-applied-to-all-variants', // Base styles
  {
    variants: {
      variant: {
        default: 'variant-specific-classes',
        primary: 'primary-variant-classes',
      },
      size: {
        sm: 'small-size-classes',
        default: 'default-size-classes',
        lg: 'large-size-classes',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => (
    <element
      ref={ref}
      className={cn(componentVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Component.displayName = 'Component';
```

### 4.4 Barrel Exports

Every component directory must have an `index.ts` barrel file:

```typescript
// components/ui/index.ts
export { Button, buttonVariants, type ButtonProps } from './Button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, type CardProps } from './Card';
```

### 4.5 Props Interface Rules

- **ALWAYS** define explicit prop interfaces (never use inline types for complex props).
- **ALWAYS** extend native HTML attributes when wrapping elements.
- **NEVER** use `any` — use `unknown` and narrow with type guards.
- **PREFER** discriminated unions for variant props:

```typescript
// ✅ GOOD — Discriminated union for status
type Status = 'idle' | 'running' | 'complete' | 'error';

// ✅ GOOD — Explicit interface extending native attributes
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

---

## 5. Design System & Styling

### 5.1 Design Tokens

All design tokens are centralized in [`lib/theme.ts`](lib/theme.ts) and imported into [`tailwind.config.ts`](tailwind.config.ts):

```typescript
// lib/theme.ts — Single source of truth
export const theme = {
  colors: {
    primary: { 50: '...', 500: '#3b82f6', 900: '...' },
    neutral: { 50: '...', 500: '#6b7280', 900: '...' },
    success: { ... },
    warning: { ... },
    error: { ... },
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', ... },
  borderRadius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', ... },
  fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', ... },
  boxShadow: { sm: '...', md: '...', lg: '...' },
  animation: { spin: '...', pulse: '...', bounce: '...' },
};
```

### 5.2 Color Naming Convention

Use **semantic color names** aligned with the theme:

| Token | Usage |
|-------|-------|
| `primary-*` | Primary actions, active states, links |
| `neutral-*` | Text, borders, backgrounds, subtle UI |
| `success-*` | Positive states, confirmations, health |
| `warning-*` | Caution states, approaching limits |
| `error-*` | Errors, destructive actions, failures |

**NEVER** use raw Tailwind color values (e.g., `bg-blue-500`) when a semantic token exists (e.g., `bg-primary-500`).

### 5.3 The `cn()` Utility

The [`cn()`](lib/utils.ts) utility (clsx + tailwind-merge) is the **only** way to conditionally apply classes:

```typescript
import { cn } from '@/lib/utils';

// ✅ GOOD
<div className={cn(
  'base-padding text-sm',
  isActive && 'bg-primary-500 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className // Allow consumer overrides
)} />
```

### 5.4 Styling Rules

1. **ALWAYS** use Tailwind CSS classes — **NEVER** inline styles.
2. **NEVER** use `!important` — restructure specificity instead.
3. **PREFER** Tailwind's `@apply` only in `globals.css` for repeated patterns.
4. **KEEP** component styles co-located with the component (no separate CSS files).
5. **USE** CSS variables (`var(--foreground)`) only for root-level theme values in `globals.css`.
6. **AVOID** magic numbers — use design tokens or Tailwind's spacing scale.

### 5.5 Responsive Design

```tsx
// ✅ GOOD — Mobile-first responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// Custom breakpoints defined in tailwind.config.ts
// xs: 475px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 3xl: 1600px
```

---

## 6. Type System & TypeScript Standards

### 6.1 Strict Mode

TypeScript strict mode is **always enabled** in [`tsconfig.json`](tsconfig.json):

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

### 6.2 Type Organization

| Location | Purpose |
|----------|---------|
| `lib/types/*.types.ts` | Shared cross-cutting types |
| `components/{module}/types/` | Module-specific types |
| `data/*.ts` | Mock data interfaces |
| Inline in component files | Local-only types (prefer extraction if reused) |

### 6.3 Type Definition Standards

```typescript
// ✅ GOOD — Use `interface` for object shapes, `type` for unions/intersections
export interface Thread {
  id: string;
  title: string;
  status: ThreadStatus; // Reference a named type
  events: Event[];
}

export type ThreadStatus = 'running' | 'complete' | 'error';

// ✅ GOOD — Use branded types for important IDs
export type WorkspaceId = string & { __brand: 'WorkspaceId' };
export type ModuleId = 'business-audit' | 'content-factory' | 'seo-cluster' | ...;

// ✅ GOOD — Use Zod for runtime validation with TypeScript inference
import { z } from 'zod';

const HITLPayloadSchema = z.object({
  requestId: z.string(),
  message: z.string(),
  requestType: z.enum(['data_input', 'approval', 'multi_select']),
});

type HITLPayload = z.infer<typeof HITLPayloadSchema>;
```

### 6.4 Prohibitions

- **NEVER** use `any` — use `unknown` and narrow.
- **NEVER** use `@ts-ignore` — fix the type error.
- **NEVER** use non-null assertions (`!`) — handle nullability properly.
- **NEVER** export types from implementation files — keep them in dedicated type files.

---

## 7. State Management

### 7.1 State Strategy

| State Type | Solution | Example |
|-----------|----------|---------|
| **Server state** | Next.js Server Components, `fetch` | Workspace data, module listings |
| **Client global state** | React Context | Auth state, active thread |
| **Client local state** | `useState` / `useReducer` | Form inputs, UI toggles, sidebar open/close |
| **Form state** | React Hook Form + Zod validation | Thread creation forms |
| **URL state** | Next.js `useParams` / `useSearchParams` | Active workspace, filters |
| **Streaming state** | Custom hooks (`useLangGraphStream`) | Real-time agent events |

### 7.2 Context Pattern

Contexts follow a strict pattern — see [`AuthContext.tsx`](lib/contexts/AuthContext.tsx) as the reference:

```typescript
// 1. Define discriminated union state type
type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; org: OrgResponse; expiresIn: number }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

// 2. Define context value type (state + actions)
type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
};

// 3. Create context with null default
const AuthContext = createContext<AuthContextValue | null>(null);

// 4. Provider wraps children
export function AuthProvider({ children }: { children: ReactNode }) { ... }

// 5. Custom hook with guard
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
```

### 7.3 Custom Hook Standards

Custom hooks in `lib/hooks/` must:

1. **Start with `use`** — e.g., `useLangGraphStream`, `useAuth`.
2. **Return a typed object** — never return a tuple unless it's a simple `[value, setter]`.
3. **Use `useCallback` for functions** returned from hooks.
4. **Use `useMemo` for derived values** to prevent unnecessary re-renders.
5. **Use `useRef` for mutable values** that shouldn't trigger re-renders.
6. **Document the hook** with JSDoc explaining purpose, parameters, and return value.

```typescript
/**
 * LangGraph Stream Hook
 *
 * A React hook for streaming events from LangGraph workflows.
 * Supports thread-based runs for HITL (Human-in-the-Loop) resumption.
 */
export function useLangGraphStream(options: UseLangGraphStreamOptions): UseLangGraphStreamReturn {
  // ... implementation
}
```

---

## 8. Data Layer & API Integration

### 8.1 Service Layer Architecture

All API communication goes through the service layer in `lib/services/`:

```
Component → Custom Hook → Service → apiClient → Backend
                              ↓
                          Zod Validation
```

### 8.2 API Client

The [`apiClient.ts`](lib/services/apiClient.ts) provides an auth-aware fetch wrapper:

```typescript
// ✅ GOOD — Use the apiClient for all API calls
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/services/apiClient';

const threads = await apiGet<Thread[]>('/api/v1/threads');
const newThread = await apiPost<Thread>('/api/v1/threads', { title: '...' });
```

**Features:**
- Automatic `credentials: 'include'` for HttpOnly cookies.
- 401 → refresh token → retry (single attempt).
- Request timeout (15 seconds default).
- JSON convenience methods (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`).

### 8.3 Service Function Pattern

```typescript
// lib/services/threadService.ts

export async function listThreads(params: ListThreadsParams): Promise<Thread[]> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.skip) searchParams.set('skip', String(params.skip));
  if (params.limit) searchParams.set('limit', String(params.limit));

  return apiGet<Thread[]>(`/api/v1/threads?${searchParams}`);
}

export async function createThread(data: CreateThreadRequest): Promise<Thread> {
  return apiPost<Thread>('/api/v1/threads', data);
}
```

### 8.4 Mock Data Strategy

During development, mock data lives in `data/`:

```typescript
// data/mockData.ts — Defines interfaces AND mock data
export interface Workspace { ... }
export const workspaces: Workspace[] = [...];
```

**Rules:**
- Mock data must match the same TypeScript interfaces as real API responses.
- Mock API functions in `lib/apiMock.ts` simulate async behavior with delays.
- **NEVER** import mock data in production code paths.

---

## 9. Authentication & Authorization

### 9.1 Architecture

The auth system uses a **dual-layer** approach:

1. **Edge Middleware** ([`middleware.ts`](middleware.ts)) — Server-side route protection
2. **Auth Context** ([`AuthContext.tsx`](lib/contexts/AuthContext.tsx)) — Client-side session management

### 9.2 Middleware Auth Guard

```typescript
// middleware.ts — Runs on Edge Runtime
// - Caches valid sessions in-memory (1-minute TTL)
// - Redirects unauthenticated users to /login?next={originalPath}
// - Redirects authenticated users away from auth pages
```

### 9.3 Auth Context Flow

```
App Mount → getMe() → Success → setState(authenticated) → scheduleRefresh()
                      → Fail → doRefresh() → Success → setState(authenticated)
                                       → Fail → setState(unauthenticated) → redirect
```

**Key Features:**
- Proactive token refresh at 80% of token lifetime.
- Concurrent refresh prevention (single-flight pattern).
- Auth-aware `authFetch` with automatic 401 retry.
- `DISABLE_AUTH_REDIRECT` flag for development.

### 9.4 Public vs Protected Routes

```typescript
const PUBLIC_PATHS = [
  '/login', '/signup', '/check-email', '/verify-email',
  '/forgot-password', '/reset-password',
  '/terms', '/privacy', '/api-playground'
];
```

---

## 10. Routing & Layout Patterns

### 10.1 Route Hierarchy

```
/                                  → Landing page (workspace listing)
/login                             → Login (public)
/signup                            → Signup (public)
/check-email                       → Post-signup email verification interstitial (public)
/verify-email                      → Email verification callback (public)
/forgot-password                   → Password reset request (public)
/reset-password                    → Password reset form (public)
/workspaces/[workspaceId]           → Workspace shell (protected)
  /mission-control                 → Kanban dashboard
  /modules/[moduleSlug]             → Dynamic module view
    /[threadSlug]                  → Thread detail
  /modules/{name}                  → Named module views
    /new                           → New thread creation
    /[threadId]                    → Thread detail
  /settings                        → Workspace settings
```

### 10.2 Layout Nesting

```
RootLayout (app/layout.tsx)
  └── Providers (app/providers.tsx)
        └── WorkspaceLayout (app/workspaces/[workspaceId]/layout.tsx)
              ├── WorkspaceSwitcher
              ├── LeftNav (sidebar)
              ├── TopBar
              ├── MainContent → {children}
              └── RightRail (context-aware)
```

### 10.3 Layout Component Standards

The workspace layout in [`app/workspaces/[workspaceId]/layout.tsx`](app/workspaces/[workspaceId]/layout.tsx) demonstrates the shell pattern:

- **Persistent navigation** — Left sidebar with module links.
- **Breadcrumb top bar** — Shows current location.
- **Collapsible panels** — Sidebar and right rail can be toggled.
- **Context-aware right rail** — Shows system health, active agents, alerts.

### 10.4 Dynamic Route Parameters

```tsx
// ✅ GOOD — Type-safe params
export default function ThreadPage({
  params,
}: {
  params: { workspaceId: string; threadId: string };
}) {
  const { workspaceId, threadId } = params;
  // ...
}
```

---

## 11. Error Handling & Loading States

### 11.1 Next.js Error Boundaries

Every route segment **must** have `loading.tsx` and `error.tsx`:

```
app/workspaces/[workspaceId]/
  loading.tsx    ← Workspace-level loading skeleton
  error.tsx      ← Workspace-level error boundary
  modules/
    seo-cluster/
      loading.tsx  ← Module-level loading skeleton
      error.tsx    ← Module-level error boundary
```

### 11.2 Loading State Pattern

Use `Skeleton` components that **mimic the structure** of the content being loaded:

```tsx
// ✅ GOOD — Structural skeleton
export default function ModuleLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Metrics skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
```

### 11.3 Error State Pattern

Use `EmptyState` for user-friendly error display with recovery actions:

```tsx
// ✅ GOOD — Error boundary with recovery
'use client';

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description={error.message}
      action={
        <Button variant="primary" onClick={reset}>
          Try Again
        </Button>
      }
    />
  );
}
```

### 11.4 Component-Level Error Handling

```tsx
// ✅ GOOD — Graceful degradation in components
try {
  const data = await fetchData();
  return <DataView data={data} />;
} catch (error) {
  return <EmptyState variant="error" message="Failed to load data" />;
}
```

---

## 12. Real-Time Streaming & HITL Protocol

### 12.1 LangGraph Streaming

The application streams events from LangGraph workflows using Server-Sent Events (SSE):

```
Frontend Hook (useLangGraphStream)
  → streamLangGraphEvents() — SSE client
    → convertToGraphEvent() — Raw → typed event
      → handleGraphEvent() — State update
```

### 12.2 Event Types

| Event | Purpose |
|-------|---------|
| `step_start` | Workflow step begins |
| `step_complete` | Workflow step finishes |
| `system` | System messages, phase transitions |
| `agent_message` | Agent communication to user |
| `artifact` | Generated content (markdown, data tables, links) |
| `progress` | Progress bar updates |
| `error` | Error with retry information |
| `complete` | Workflow finished |

### 12.3 Human-in-the-Loop (HITL) Protocol

The HITL system uses **interrupt-based detection** via thread state polling:

```
Stream completes → Poll thread state → Check for interrupts
  → Interrupt found → Convert to HITLRequest → Set status: 'hitl_pending'
  → User responds → resumeLangGraphWorkflow() → Stream continues
  → No interrupt → Normal completion
```

**Key Rules:**
- Always validate HITL payloads with Zod schemas.
- Provide graceful degradation for invalid payloads.
- Support multiple HITL rounds (workflow can pause multiple times).
- Use feature flags (`USE_INTERRUPT_BASED_HITL`) for migration.

---

## 13. Code Cleanliness & Quality

### 13.1 File Organization Rules

1. **One component per file** — except for tightly coupled sub-components (e.g., `Card` + `CardHeader`).
2. **Co-locate related files** — types, utils, and tests near their components.
3. **Barrel exports** — Every directory has an `index.ts` for clean imports.
4. **Maximum file length** — 300 lines for components, 500 lines for hooks/services. Split if exceeded.
5. **Order of sections** in a file:
   ```
   1. Imports
   2. Types/Interfaces
   3. Constants
   4. Helper functions
   5. Main component/hook
   6. Sub-components (if any)
   7. Exports
   ```

### 13.2 Import Order

```typescript
// 1. React / Next.js
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';

// 3. Internal aliases (@/)
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/AuthContext';

// 4. Relative imports
import { ChatInput } from './ChatInput';
import type { Message } from './types';
```

### 13.3 Comment Standards

```typescript
/**
 * Component-level JSDoc — describes purpose, usage, and important notes.
 * Include @see references to related files or documentation.
 *
 * @example
 * ```tsx
 * <ConflictPanel options={options} onSelect={handleSelect} />
 * ```
 */

// Section separators for long files
// ============================================================================
// Constants
// ============================================================================

// Inline comments for WHY, not WHAT
// Cache hit — session was recently validated (explains WHY, not WHAT the code does)
```

### 13.4 Code Style

- **Functional components only** — no class components.
- **Arrow functions** for component definitions (consistency).
- **Destructured props** in function signature.
- **Template literals** over string concatenation.
- **Optional chaining** (`?.`) and nullish coalescing (`??`) over manual checks.
- **Early returns** to reduce nesting.

```tsx
// ✅ GOOD — Clean component structure
interface ThreadCardProps {
  thread: Thread;
  isActive?: boolean;
  onSelect?: (id: string) => void;
}

const ThreadCard = ({ thread, isActive = false, onSelect }: ThreadCardProps) => {
  if (!thread) return null; // Early return

  return (
    <Card className={cn('cursor-pointer', isActive && 'ring-2 ring-primary-500')}>
      <CardContent>
        <h3 className="font-semibold">{thread.title}</h3>
        <Badge variant={thread.status === 'running' ? 'primary' : 'ghost'}>
          {thread.status}
        </Badge>
      </CardContent>
    </Card>
  );
};
```

### 13.5 Prohibited Patterns

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| `any` type | `unknown` + type narrowing |
| `// @ts-ignore` | Fix the type error |
| Inline styles | Tailwind classes |
| `!` non-null assertion | Proper null handling |
| Direct `fetch()` in components | Use `lib/services/apiClient.ts` |
| State in Server Components | Move to Client Component |
| Giant component files (>300 lines) | Split into sub-components |
| Prop drilling beyond 2 levels | Context or composition |
| `console.log` in production | Remove or use proper logging |

---

## 14. Performance & Scalability

### 14.1 Rendering Strategy

| Technique | When to Use |
|-----------|-------------|
| **Server Components** | Default for all pages/layouts that don't need interactivity |
| **Client Components** | Only when state, events, or browser APIs are needed |
| **Dynamic imports** | Heavy components (e.g., rich text editors, charts) |
| **Suspense boundaries** | Async data fetching in Server Components |
| **`loading.tsx`** | Automatic streaming SSR with skeletons |

### 14.2 Bundle Optimization

```tsx
// ✅ GOOD — Dynamic import for heavy components
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false, // Skip SSR for client-only components
});
```

### 14.3 Image & Asset Optimization

- Use `next/image` for all images.
- Use `next/font/local` for custom fonts (already configured with Inter).
- Preload critical fonts with `display: 'swap'`.

### 14.4 Data Fetching Patterns

```tsx
// ✅ GOOD — Server Component data fetching (default)
export default async function ModulePage({ params }: Props) {
  const data = await fetchModuleData(params.moduleId);
  return <ModuleView data={data} />;
}

// ✅ GOOD — Client Component data fetching with SWR-like pattern
'use client';
const { data, error, isLoading } = useSWR('/api/threads', fetcher);
```

### 14.5 Scalability Guidelines for Adding New Modules

When the application grows, follow these principles:

1. **Colocation** — Keep module components, types, and utils together in `components/{module-name}/`.
2. **Route isolation** — Each module gets its own route segment with `loading.tsx` and `error.tsx`.
3. **Lazy loading** — Use dynamic imports for module-specific heavy components.
4. **Shared primitives** — Build new UI on top of existing `components/ui/` primitives.
5. **Type safety** — Define module types in `lib/types/` or `components/{module}/types/`.
6. **Service abstraction** — Add module API functions in `lib/services/`.

---

## 15. Testing Strategy

### 15.1 Testing Pyramid

| Level | Tool | What to Test |
|-------|------|-------------|
| **Unit** | Jest + React Testing Library | Utility functions, hooks, pure logic |
| **Integration** | React Testing Library | Component interactions, context providers |
| **Visual** | Manual + screenshots | UI matches reference designs |
| **E2E** | Playwright | Critical user paths |

### 15.2 What to Test

- **Utility functions** — `cn()`, validators, formatters.
- **Custom hooks** — State transitions, edge cases.
- **Service functions** — API call formatting, error handling.
- **Complex components** — Conflict resolution, HITL flows, form validation.
- **Context providers** — Auth state transitions, token refresh.

### 15.3 What NOT to Test

- Static Server Components (test the data, not the markup).
- Simple wrapper components with no logic.
- Third-party library behavior.

### 15.4 Test File Convention

```
lib/utils.ts              → lib/__tests__/utils.test.ts
lib/hooks/useAuth.ts      → lib/hooks/__tests__/useAuth.test.ts
components/ui/Button.tsx  → components/ui/__tests__/Button.test.tsx
```

---

## 16. Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| **Component files** | PascalCase | `AgentScorecard.tsx` |
| **Utility/hook files** | camelCase | `useLangGraphStream.ts` |
| **Type files** | camelCase with `.types.ts` suffix | `graph-events.types.ts` |
| **Directories** | kebab-case or camelCase | `content-factory/`, `kanban/` |
| **Components** | PascalCase | `<ConflictPanel />` |
| **Functions/variables** | camelCase | `handleSelect`, `isLoading` |
| **Constants** | UPPER_SNAKE_CASE | `USE_INTERRUPT_BASED_HITL`, `CACHE_TTL_MS` |
| **CSS classes** | Tailwind utilities | `bg-primary-500`, `text-neutral-700` |
| **Boolean props** | `is`/`has`/`should` prefix | `isActive`, `hasPermission`, `shouldRetry` |
| **Event handlers** | `handle` prefix | `handleClick`, `handleSubmit`, `handleError` |
| **Render functions** | `render` prefix | `renderHeader`, `renderTimeline` |
| **Custom hooks** | `use` prefix | `useAuth`, `useLangGraphStream` |
| **Context providers** | `{Name}Provider` | `AuthProvider`, `ThreadProvider` |
| **Context hooks** | `use{Name}` | `useAuth`, `useThread` |

---

## 17. New Module Checklist

When adding a new module to the application, follow this checklist:

### Route Setup
- [ ] Create route directory: `app/workspaces/[workspaceId]/modules/{module-name}/`
- [ ] Create `page.tsx` with module listing view
- [ ] Create `loading.tsx` with structural skeleton
- [ ] Create `error.tsx` with EmptyState recovery
- [ ] Create `layout.tsx` if module needs specific layout wrapping
- [ ] Create `new/page.tsx` for thread creation (if applicable)
- [ ] Create `[threadId]/page.tsx` for thread detail view
- [ ] Create `[threadId]/loading.tsx` and `[threadId]/error.tsx`
- [ ] Add module to the navigation array in workspace layout

### Component Setup
- [ ] Create `components/{module-name}/` directory
- [ ] Create module-specific components
- [ ] Create `types/` subdirectory for module types
- [ ] Create `utils/` subdirectory for module utilities (if needed)
- [ ] Create `index.ts` barrel export

### Data Layer
- [ ] Define TypeScript interfaces in `lib/types/{module}.types.ts`
- [ ] Create service functions in `lib/services/{module}Service.ts`
- [ ] Add mock data in `data/{module}.ts` (development)

### Integration
- [ ] Register module in workspace layout navigation
- [ ] Add module to `ModuleId` union type if applicable
- [ ] Test loading and error states
- [ ] Verify responsive behavior
- [ ] Verify accessibility (keyboard navigation, ARIA labels)

---

## Appendix: Quick Reference

### Path Aliases
```typescript
@/* → ./*  (e.g., @/components/ui/Button → ./components/ui/Button)
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/utils.ts` | `cn()` utility for class merging |
| `lib/theme.ts` | Design tokens (single source of truth) |
| `lib/services/apiClient.ts` | Auth-aware API client |
| `lib/contexts/AuthContext.tsx` | Authentication state management |
| `lib/hooks/useLangGraphStream.ts` | Real-time streaming with HITL |
| `middleware.ts` | Route protection middleware |
| `tailwind.config.ts` | Tailwind configuration with theme tokens |
| `components/ui/index.ts` | UI primitive barrel exports |

### Common Patterns Cheat Sheet

```tsx
// Class merging
className={cn('base-class', isActive && 'active-class', className)}

// CVA variant
const variants = cva('base', { variants: { variant: { ... } } });

// Barrel export
export { Component, type ComponentProps } from './Component';

// Custom hook
export function useFeature(options): UseFeatureReturn { ... }

// Context with guard
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('...');
  return ctx;
}

// API call
const data = await apiGet<Data>('/api/v1/resource');

// Dynamic import
const HeavyComponent = dynamic(() => import('./Heavy'), { ssr: false });
```

---

*This document is a living reference. Update it as patterns evolve and new best practices emerge.*
