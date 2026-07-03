# Connection Safety

## Credential Handling

- Prefer environment variables over command-line passwords because shell history can capture arguments.
- Use `--ask-password` when no safe environment variable is available.
- Redact passwords from final answers and terminal summaries.
- Never save credentials inside `SKILL.md`, scripts, references, or repo files.

Common environment variables:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
MYSQL_HOST
MYSQL_PORT
MYSQL_USER
MYSQL_PWD
MYSQL_DATABASE
```

## Connectivity Checks

Use a TCP test before debugging credentials:

```powershell
Test-NetConnection <host> -Port <port>
```

If TCP fails, do not keep trying credentials. Confirm network route, VPN, Docker network, firewall, or bind address first.

## Migration Verification Queries

Run these on source and target where applicable:

```sql
SELECT COUNT(*) AS row_count FROM table_name;
SELECT MIN(id) AS min_id, MAX(id) AS max_id FROM table_name;
SELECT id, COUNT(*) AS c FROM table_name GROUP BY id HAVING c > 1 LIMIT 20;
SHOW COLUMNS FROM table_name;
SHOW INDEX FROM table_name;
```

For mapped migrations, compare required fields:

```sql
SELECT COUNT(*) AS missing_required
FROM source_table
WHERE create_time IS NULL OR update_time IS NULL;
```

For target conflicts before preserving old IDs:

```sql
SELECT s.id
FROM staging_source_table s
JOIN target_table t ON t.id = s.id
LIMIT 20;
```
