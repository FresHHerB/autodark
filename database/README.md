# Database Schema

This directory contains the complete database schema for the AutoDark project.

## Files

- **schema.sql** - Complete DDL to create all tables, relationships, and constraints
- **supabase/** - Supabase configuration and migrations
- **scripts/** - Utility scripts for database maintenance

## Using schema.sql

### Creating a Fresh Database

```sql
-- Connect to your Supabase/PostgreSQL database
psql -h your-host -U your-user -d your-database

-- Execute the schema
\i database/schema.sql
```

### Via Supabase Dashboard

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `schema.sql`
3. Execute the script

### Important Notes

⚠️ **Before running schema.sql:**
- Backup your existing database if needed
- Uncomment the DROP statements if you want to recreate tables
- The script does NOT include RLS policies (configure separately)
- The script does NOT include data (structure only)

## Table Creation Order

Tables are created in dependency order:

1. **apis** - Base table (no dependencies)
2. **modelos_imagem** - Independent table
3. **vozes** - Depends on apis
4. **canais** - Depends on vozes
5. **roteiros** - Depends on canais
6. **videos** - Depends on roteiros

## CASCADE Delete Behavior

```
DELETE canal
  ↓
  └─ Deletes all roteiros (CASCADE)
       ↓
       └─ Deletes all videos (CASCADE)
```

## Row Level Security (RLS)

RLS is **enabled** on all tables and policies **ARE included** in schema.sql.

### Current Policy Configuration

**All policies allow authenticated users to access all data** - suitable for:
- Single-user environments
- Trusted multi-user setups
- Internal/admin tools

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| **apis** | ✅ | ✅ | ❌ | ❌ | Read + Insert only |
| **vozes** | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| **canais** | ✅ | ❌ | ❌ | ❌ | Read-only (writes via webhooks) |
| **roteiros** | ✅ | ❌ | ❌ | ❌ | Read-only (writes via webhooks) |
| **videos** | ✅ | ✅ | ✅ | ✅ | Full CRUD (has redundant ALL policy) |
| **modelos_imagem** | ✅ | ✅ | ✅ | ✅ | Full CRUD |

### Important Notes

⚠️ **Current policies use `USING (true)` and `WITH CHECK (true)`**
- This means ALL authenticated users can access ALL rows
- No user-specific filtering or multi-tenancy

⚠️ **videos table has redundant policies**
- Has both specific policies (SELECT, INSERT) AND an ALL policy
- Consider cleaning this up in a future migration

⚠️ **canais and roteiros are READ-ONLY via RLS**
- Write operations are handled by N8N webhooks and backend services
- Frontend only has SELECT access

### For Multi-Tenant or User-Specific Access

If you need to restrict access per user, modify policies like:

```sql
-- Example: Only show user's own canais
DROP POLICY "Enable read access for authenticated" ON public.canais;

CREATE POLICY "Users can view own canais"
  ON public.canais FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);  -- Requires adding user_id column
```

## Migrations

For incremental changes, use Supabase migrations in `supabase/migrations/`.

The `schema.sql` file is meant for:
- Fresh database setup
- Documentation reference
- Understanding complete structure

## Need Help?

- See [CLAUDE.md](../CLAUDE.md) for development patterns
- See [docs/API-REFERENCE.md](../docs/API-REFERENCE.md) for API integration
- Check DATABASE SCHEMA section in CLAUDE.md for detailed table documentation
