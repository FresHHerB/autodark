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

RLS is **enabled** on all tables but policies are **not** included in schema.sql.

You must configure RLS policies separately based on your authentication setup.

Example policies can be found at the end of `schema.sql` (commented out).

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
