# Safe legacy-compatible migration for КальКа

This migration is designed for the existing Supabase legacy schema.
It does not drop tables and does not delete data.

## Files

- `legacy_safe_migration.sql`
- `legacy_safe_seed.sql`
- `legacy_safe_assign_org.sql`

## Apply order

1. Apply `legacy_safe_migration.sql`
2. Create a real owner in Supabase Auth
3. Copy that `auth.users.id`
4. Put the UUID into `legacy_safe_seed.sql` as `owner_user_id`
5. Apply `legacy_safe_seed.sql`
6. Only after manual confirmation, run `legacy_safe_assign_org.sql`

## What the migration does

- Creates the new normalized tables if they do not exist
- Adds `organization_id uuid` to existing legacy tables using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Keeps old rows nullable so the migration does not fail
- Adds foreign keys only where they are safe for nullable legacy columns
- Sets RLS so:
  - `platform_owner` sees everything
  - organization members see their own organization
  - rows without organization_id are not broken by the policy

## Why this does not delete data

- There are no `DROP TABLE` statements.
- There are no destructive deletes.
- Existing columns are added only if missing.
- Old data remains readable because the new org columns are nullable.

## Notes

- `legacy_safe_seed.sql` fails on purpose if `owner_user_id` is not replaced.
- `legacy_safe_assign_org.sql` is a manual follow-up step and must be run only after confirmation.
- The old `app_state`, Firebase and browser storage are not used by this migration.

