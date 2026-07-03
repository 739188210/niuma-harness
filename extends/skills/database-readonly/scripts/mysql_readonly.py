#!/usr/bin/env python3
"""Run guarded read-only MySQL queries.

Dependencies: pymysql or mysql-connector-python.
Credentials may be supplied by args or DB_*/MYSQL_* environment variables.
"""

from __future__ import annotations

import argparse
import csv
import getpass
import json
import os
import re
import sys
from decimal import Decimal
from datetime import date, datetime, time


DENY_RE = re.compile(
    r"\b("
    r"insert|update|delete|replace|create|alter|drop|truncate|rename|"
    r"grant|revoke|call|exec|execute|load|lock|unlock|set|reset|flush|"
    r"kill|optimize|repair|analyze|use|begin|start|commit|rollback"
    r")\b",
    re.IGNORECASE,
)
ALLOW_RE = re.compile(r"^\s*(select|show|describe|desc|explain|with)\b", re.IGNORECASE | re.DOTALL)


def env(name: str, fallback: str | None = None) -> str | None:
    return os.environ.get(name) or fallback


def normalize_sql(sql: str) -> str:
    sql = sql.strip()
    while sql.endswith(";"):
        sql = sql[:-1].strip()
    return sql


def validate_readonly(sql: str) -> None:
    stripped = normalize_sql(sql)
    if not stripped:
        raise SystemExit("SQL is empty.")
    if ";" in stripped:
        raise SystemExit("Refusing multi-statement SQL.")
    if not ALLOW_RE.match(stripped):
        raise SystemExit("Only SELECT, SHOW, DESCRIBE/DESC, EXPLAIN, and WITH queries are allowed.")
    if DENY_RE.search(stripped):
        raise SystemExit("Refusing SQL containing write/admin keywords.")
    if re.search(r"\binto\s+(out|dump)?file\b", stripped, flags=re.IGNORECASE):
        raise SystemExit("Refusing SELECT ... INTO FILE.")


def import_driver():
    try:
        import pymysql  # type: ignore

        return "pymysql", pymysql
    except Exception:
        pass
    try:
        import mysql.connector  # type: ignore

        return "mysql.connector", mysql.connector
    except Exception:
        pass
    raise SystemExit(
        "Missing MySQL Python driver. Install one of:\n"
        "  python -m pip install pymysql\n"
        "  python -m pip install mysql-connector-python"
    )


def json_default(value):
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, bytes):
        return value.hex()
    return str(value)


def connect(args):
    driver_name, driver = import_driver()
    if driver_name == "pymysql":
        return driver.connect(
            host=args.host,
            port=args.port,
            user=args.user,
            password=args.password,
            database=args.database,
            charset=args.charset,
            cursorclass=driver.cursors.DictCursor,
            read_timeout=args.timeout,
            write_timeout=args.timeout,
            connect_timeout=args.timeout,
            autocommit=False,
        )
    return driver.connect(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.database,
        charset=args.charset,
        connection_timeout=args.timeout,
        autocommit=False,
    )


def fetch_rows(conn, sql: str, max_rows: int):
    cur = conn.cursor()
    try:
        try:
            cur.execute("SET SESSION TRANSACTION READ ONLY")
        except Exception:
            pass
        cur.execute(sql)
        columns = [d[0] for d in (cur.description or [])]
        raw_rows = cur.fetchmany(max_rows + 1)
        truncated = len(raw_rows) > max_rows
        raw_rows = raw_rows[:max_rows]
        rows = []
        for row in raw_rows:
            if isinstance(row, dict):
                rows.append(row)
            else:
                rows.append(dict(zip(columns, row)))
        conn.rollback()
        return columns, rows, truncated
    finally:
        cur.close()


def print_table(columns, rows, truncated: bool) -> None:
    if not columns:
        print("(no result columns)")
        return
    rendered = []
    for row in rows:
        rendered.append([format_cell(row.get(col)) for col in columns])
    widths = [len(col) for col in columns]
    for row in rendered:
        for i, value in enumerate(row):
            widths[i] = min(max(widths[i], len(value)), 80)
    header = " | ".join(col.ljust(widths[i]) for i, col in enumerate(columns))
    sep = "-+-".join("-" * w for w in widths)
    print(header)
    print(sep)
    for row in rendered:
        print(" | ".join(row[i][: widths[i]].ljust(widths[i]) for i in range(len(columns))))
    if truncated:
        print("\n(result truncated by --max-rows)")


def format_cell(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (datetime, date, time)):
        return value.isoformat(sep=" ") if isinstance(value, datetime) else value.isoformat()
    if isinstance(value, bytes):
        return "0x" + value.hex()
    return str(value)


def print_csv(columns, rows) -> None:
    writer = csv.DictWriter(sys.stdout, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({col: format_cell(row.get(col)) for col in columns})


def parse_args():
    parser = argparse.ArgumentParser(description="Run guarded read-only MySQL queries.")
    parser.add_argument("--host", default=env("DB_HOST", env("MYSQL_HOST", "127.0.0.1")))
    parser.add_argument("--port", type=int, default=int(env("DB_PORT", env("MYSQL_PORT", "3306"))))
    parser.add_argument("--user", default=env("DB_USER", env("MYSQL_USER")))
    parser.add_argument("--password", default=env("DB_PASSWORD", env("MYSQL_PWD")))
    parser.add_argument("--ask-password", action="store_true")
    parser.add_argument("--database", default=env("DB_NAME", env("MYSQL_DATABASE")))
    parser.add_argument("--charset", default="utf8mb4")
    parser.add_argument("--timeout", type=int, default=10)
    parser.add_argument("--max-rows", type=int, default=1000)
    parser.add_argument("--format", choices=["table", "json", "csv"], default="table")
    parser.add_argument("--sql")
    parser.add_argument("--sql-file")
    args = parser.parse_args()
    if not args.user:
        parser.error("--user or DB_USER/MYSQL_USER is required")
    if args.ask_password and not args.password:
        args.password = getpass.getpass("Password: ")
    if args.password is None:
        args.password = ""
    if not args.sql and not args.sql_file:
        parser.error("--sql or --sql-file is required")
    if args.sql and args.sql_file:
        parser.error("Use only one of --sql or --sql-file")
    if args.sql_file:
        with open(args.sql_file, "r", encoding="utf-8") as handle:
            args.sql = handle.read()
    args.sql = normalize_sql(args.sql)
    return args


def main() -> int:
    args = parse_args()
    validate_readonly(args.sql)
    conn = connect(args)
    try:
        columns, rows, truncated = fetch_rows(conn, args.sql, args.max_rows)
    finally:
        conn.close()
    if args.format == "json":
        print(json.dumps({"columns": columns, "rows": rows, "truncated": truncated}, ensure_ascii=False, default=json_default, indent=2))
    elif args.format == "csv":
        print_csv(columns, rows)
        if truncated:
            print("# result truncated by --max-rows", file=sys.stderr)
    else:
        print_table(columns, rows, truncated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
