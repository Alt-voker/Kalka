# КальКа: Server-First Foundation

This folder contains the new stable PostgreSQL-first foundation for the platform.

## Source of truth

- Supabase Auth: user authentication
- Supabase PostgreSQL: all business data
- Supabase Storage: price list files
- localStorage: UI-only temporary settings

Legacy sources like `pv_cache`, `kalka_app_state_v1`, Firebase fallback and old `app_state` snapshots are not part of this foundation.

## Files

- `server_base_schema.sql` - schema, helper functions, indexes and RLS policies
- `server_base_seed.sql` - baseline seed with one platform owner, one organization, one legal entity and one supplier

## Applying the schema

1. Open the Supabase SQL editor or migration runner.
2. Apply `server_base_schema.sql` first.
3. Apply `server_base_seed.sql` after the schema is created.

## Creating the first owner

1. Create the user in Supabase Auth.
2. Copy the generated `auth.users.id`.
3. Update `server_base_seed.sql` so `owner_user_id` matches that id.
4. Re-run the seed.

## How access works

- `platform_owner` sees everything.
- `organization_owner` sees data for their organization.
- Other roles see only data for organizations where they are a member.
- Price lists are additionally filtered by assigned legal entities.

## How to verify that data no longer depends on browser storage

1. Open the application on a clean browser profile.
2. Confirm the app still loads because data comes from Supabase, not `pv_cache`.
3. Switch to another device/browser and confirm the same organizations, users and suppliers are visible.
4. Clear localStorage/sessionStorage and reload. Business data should remain because it lives on the server.

