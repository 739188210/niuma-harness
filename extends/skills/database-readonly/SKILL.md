---
name: database-readonly
description: Connect to SQL databases and inspect data safely with read-only queries. Use when Codex needs to test database connectivity, read table schemas, count rows, sample records, compare source and target tables before migration, validate migration results, or export query results without modifying database state.
---

# Database Readonly

Use this skill for database inspection and migration verification tasks where Codex must connect to a database and read data only.

## Safety Rules

- Treat every database as production unless the user explicitly says otherwise.
- Never run write or DDL statements through this skill: no `INSERT`, `UPDATE`, `DELETE`, `REPLACE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `GRANT`, `REVOKE`, `CALL`, `LOAD`, or multi-statement batches.
- Do not print passwords, tokens, JDBC URLs containing credentials, or full connection strings with secrets.
- Prefer `COUNT(*)`, `SHOW COLUMNS`, `SHOW INDEX`, `EXPLAIN`, and sampled `SELECT ... LIMIT n` before reading large tables.
- For migration checks, compare row counts, min/max primary key, nullability assumptions, duplicate keys, and sampled mapped rows before proposing a full transfer.

## Quick Start

Use the bundled MySQL helper when Python has either `pymysql` or `mysql-connector-python` available:

```powershell
python C:\Users\Administrator\.codex\skills\database-readonly\scripts\mysql_readonly.py `
  --host 192.168.31.251 --port 3306 --user root --database overseas-trade-fat `
  --ask-password `
  --sql "SHOW TABLES"
```

Environment variables are preferred for repeated use:

```powershell
$env:DB_HOST="192.168.31.251"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="<secret>"
$env:DB_NAME="overseas-trade-fat"

python C:\Users\Administrator\.codex\skills\database-readonly\scripts\mysql_readonly.py --sql "SELECT COUNT(*) AS c FROM business_canton_fair_type"
```

Supported output formats:

```powershell
python ...\mysql_readonly.py --sql "SELECT * FROM some_table LIMIT 20" --format table
python ...\mysql_readonly.py --sql "SELECT * FROM some_table LIMIT 20" --format json
python ...\mysql_readonly.py --sql "SELECT * FROM some_table LIMIT 20" --format csv
```

## Workflow

1. Identify the database type, host, port, database name, and credential source.
2. Test network reachability first when the target may be inaccessible.
3. Use the helper script or an installed SQL client to run only read-only SQL.
4. Start with schema and counts:

```sql
SHOW COLUMNS FROM table_name;
SHOW INDEX FROM table_name;
SELECT COUNT(*) AS row_count FROM table_name;
SELECT MIN(id) AS min_id, MAX(id) AS max_id FROM table_name;
```

5. For migration planning, inspect source and target tables separately, then produce explicit column mappings instead of using `SELECT *`.
6. Report only the relevant query results and any risk: primary-key conflicts, missing required columns, charset/collation differences, null-to-not-null transformations, and foreign-key/id mapping concerns.

## Resources

- `scripts/mysql_readonly.py`: guarded MySQL read-only query runner.
- `references/connection-safety.md`: credential handling, connectivity checks, and migration verification query patterns.
