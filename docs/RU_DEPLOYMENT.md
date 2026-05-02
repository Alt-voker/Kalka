# Kalka Deployment Target for Russian Infrastructure

## Target Shape
- Frontend static hosting or CDN
- Backend API layer
- PostgreSQL database
- S3-compatible object storage
- Redis optional for cache/session acceleration
- Monitoring and logging
- Backups and restore procedures

## Environment Variables
- `KALKA_API_URL`
- `KALKA_AUTH_URL`
- `KALKA_DB_URL`
- `KALKA_STORAGE_URL`
- `KALKA_STORAGE_BUCKET`
- `KALKA_PUBLIC_URL`
- `KALKA_ENV`
- `KALKA_LOG_LEVEL`

## Portability Notes
- Frontend must speak only through `KalkaApi`, `KalkaAuth`, `KalkaStorage`, and `KalkaConfig`.
- Provider implementations can be swapped from Supabase to local/regional services without rewriting business logic.
- Upload flows should accept S3-compatible storage once the storage adapter is swapped.
