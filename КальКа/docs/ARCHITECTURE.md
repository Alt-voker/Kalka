# Kalka Architecture

## Cloud-Agnostic Rule
New business logic must not depend directly on Vercel, Supabase, or localStorage.
It must go through adapters only:
- `authProvider`
- `apiClient`
- `storageProvider`
- `configProvider`

## Storage Rules
`localStorage` may be used only for UI preferences and non-business settings.
It must not be the source of truth for:
- organizations
- users
- suppliers
- price lists
- orders
- roles
- permissions

## Adapter Boundary
- `KalkaConfig` owns runtime configuration
- `KalkaApi` owns RPC and DB operations
- `KalkaAuth` owns sign-in/session/logout
- `KalkaStorage` owns file uploads/downloads/public URLs

## Migration Strategy
- Existing Supabase behavior remains as fallback.
- New code should prefer adapters first.
- Direct `window.__supabase` access is legacy and should be phased out gradually.
