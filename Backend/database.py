import os
import re
from typing import Callable, List, Optional
from urllib.parse import quote_plus

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PsycopgConnection

try:
    import mysql.connector  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
    mysql = None  # type: ignore


def _first_env(*names: str) -> Optional[str]:
    for name in names:
        value = os.getenv(name)
        if value is not None:
            value = value.strip()
            if value:
                return value
    return None


def _is_local_host(host: str) -> bool:
    host = (host or "").strip().lower()
    return host in {"localhost", "127.0.0.1", "::1"}


def _normalize_postgres_dsn(dsn: str) -> str:
    dsn = dsn.strip()
    if dsn.startswith("postgres://"):
        dsn = "postgresql://" + dsn[len("postgres://") :]

    if "sslmode=" not in dsn and "host=localhost" not in dsn and "host=127.0.0.1" not in dsn:
        lower = dsn.lower()
        if not any(token in lower for token in ("@localhost", "@127.0.0.1", "@::1")):
            separator = "&" if "?" in dsn else "?"
            dsn = f"{dsn}{separator}sslmode=require"

    return dsn


def _build_postgres_dsn() -> Optional[str]:
    explicit_dsn = _first_env(
        "DATABASE_URL",
        "POSTGRES_URL",
        "POSTGRESQL_URL",
        "RENDER_DATABASE_URL",
        "RENDER_INTERNAL_DATABASE_URL",
        "RENDER_EXTERNAL_DATABASE_URL",
        "INTERNAL_DATABASE_URL",
        "EXTERNAL_DATABASE_URL",
        "DB_URL",
    )
    if explicit_dsn:
        return _normalize_postgres_dsn(explicit_dsn)

    backend_hint = (_first_env("DB_BACKEND", "DATABASE_BACKEND") or "").lower()
    pg_host = _first_env("PGHOST", "POSTGRES_HOST")
    pg_port = _first_env("PGPORT", "POSTGRES_PORT") or "5432"
    pg_db = _first_env("PGDATABASE", "POSTGRES_DB")
    pg_user = _first_env("PGUSER", "POSTGRES_USER")
    pg_password = _first_env("PGPASSWORD", "POSTGRES_PASSWORD")

    if pg_host and pg_db and pg_user:
        sslmode = "disable" if _is_local_host(pg_host) else "require"
        return (
            f"postgresql://{quote_plus(pg_user)}:{quote_plus(pg_password or '')}@{pg_host}:{pg_port}/{quote_plus(pg_db)}"
            f"?sslmode={sslmode}"
        )

    generic_host = _first_env("DB_HOST")
    generic_port = _first_env("DB_PORT")
    generic_db = _first_env("DB_NAME")
    generic_user = _first_env("DB_USER")
    generic_password = _first_env("DB_PASSWORD")

    looks_like_postgres = (
        backend_hint in {"postgres", "postgresql", "pg"}
        or bool(_first_env("PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"))
        or generic_port == "5432"
    )

    if looks_like_postgres and generic_host and generic_db and generic_user:
        sslmode = "disable" if _is_local_host(generic_host) else "require"
        return (
            f"postgresql://{quote_plus(generic_user)}:{quote_plus(generic_password or '')}@{generic_host}:{generic_port or '5432'}/{quote_plus(generic_db)}"
            f"?sslmode={sslmode}"
        )

    return None


def _build_mysql_config() -> Optional[dict]:
    backend_hint = (_first_env("DB_BACKEND", "DATABASE_BACKEND") or "").lower()

    host = _first_env("MYSQLHOST", "MYSQL_HOST", "DB_HOST")
    user = _first_env("MYSQLUSER", "MYSQL_USER", "DB_USER")
    password = _first_env("MYSQLPASSWORD", "MYSQL_PASSWORD", "DB_PASSWORD")
    database = _first_env("MYSQLDATABASE", "MYSQL_DATABASE", "DB_NAME")
    port = _first_env("MYSQLPORT", "MYSQL_PORT", "DB_PORT") or "3306"

    if not host or not user or not database:
        return None

    if backend_hint in {"postgres", "postgresql", "pg"} or port == "5432":
        return None

    config = {
        "host": host,
        "user": user,
        "password": password or "",
        "database": database,
    }
    if _first_env("MYSQLPORT", "MYSQL_PORT", "DB_PORT"):
        config["port"] = int(port)
    return config


def _split_sql_args(arg_string: str) -> List[str]:
    args: List[str] = []
    start = 0
    depth = 0
    in_single = False
    in_double = False
    i = 0

    while i < len(arg_string):
        ch = arg_string[i]

        if ch == "'" and not in_double:
            if in_single and i + 1 < len(arg_string) and arg_string[i + 1] == "'":
                i += 2
                continue
            in_single = not in_single
        elif ch == '"' and not in_single:
            in_double = not in_double
        elif not in_single and not in_double:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == "," and depth == 0:
                args.append(arg_string[start:i].strip())
                start = i + 1

        i += 1

    args.append(arg_string[start:].strip())
    return args


def _find_matching_paren(sql: str, open_idx: int) -> int:
    depth = 0
    in_single = False
    in_double = False
    i = open_idx

    while i < len(sql):
        ch = sql[i]

        if ch == "'" and not in_double:
            if in_single and i + 1 < len(sql) and sql[i + 1] == "'":
                i += 2
                continue
            in_single = not in_single
        elif ch == '"' and not in_single:
            in_double = not in_double
        elif not in_single and not in_double:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    return i

        i += 1

    return -1


def _replace_function_calls(sql: str, func_name: str, builder: Callable[[str], str]) -> str:
    func_name_lower = func_name.lower()
    out: List[str] = []
    i = 0

    while i < len(sql):
        if sql[i : i + len(func_name)].lower() == func_name_lower:
            j = i + len(func_name)
            while j < len(sql) and sql[j].isspace():
                j += 1

            if j < len(sql) and sql[j] == "(":
                end = _find_matching_paren(sql, j)
                if end != -1:
                    inner = sql[j + 1 : end]
                    out.append(builder(inner))
                    i = end + 1
                    continue

        out.append(sql[i])
        i += 1

    return "".join(out)


def _translate_mysql_to_postgres(sql: str) -> str:
    translated = sql

    translated = _replace_function_calls(
        translated,
        "TIMESTAMPDIFF",
        lambda inner: _translate_timestampdiff(inner),
    )
    translated = _replace_function_calls(
        translated,
        "CURDATE",
        lambda inner: "CURRENT_DATE" if not inner.strip() else f"CURDATE({inner})",
    )
    translated = _replace_function_calls(
        translated,
        "DAYNAME",
        lambda inner: f"TO_CHAR({inner.strip()}, 'FMDay')",
    )
    translated = _replace_function_calls(
        translated,
        "YEAR",
        lambda inner: f"EXTRACT(YEAR FROM {inner.strip()})::int",
    )
    translated = _replace_function_calls(
        translated,
        "MONTH",
        lambda inner: f"EXTRACT(MONTH FROM {inner.strip()})::int",
    )

    # Support boolean/tinyint columns that may have been migrated differently.
    translated = re.sub(
        r"\b(((?:[A-Za-z_][A-Za-z0-9_]*\.)?is_[A-Za-z0-9_]+))\s*=\s*0\b",
        lambda m: (
            f"LOWER(COALESCE(CAST({m.group(1)} AS text), '0')) "
            f"IN ('0', 'f', 'false')"
        ),
        translated,
        flags=re.IGNORECASE,
    )
    translated = re.sub(
        r"\b(((?:[A-Za-z_][A-Za-z0-9_]*\.)?is_[A-Za-z0-9_]+))\s*=\s*1\b",
        lambda m: (
            f"LOWER(COALESCE(CAST({m.group(1)} AS text), '0')) "
            f"IN ('1', 't', 'true')"
        ),
        translated,
        flags=re.IGNORECASE,
    )

    return translated


def _translate_timestampdiff(inner: str) -> str:
    args = _split_sql_args(inner)
    if len(args) != 3:
        return f"TIMESTAMPDIFF({inner})"

    unit, start_expr, end_expr = args
    if unit.strip().upper() != "YEAR":
        return f"TIMESTAMPDIFF({inner})"

    return f"DATE_PART('year', AGE({end_expr.strip()}, {start_expr.strip()}))::int"


class CompatCursor:
    def __init__(self, inner_cursor):
        self._inner = inner_cursor

    def execute(self, sql, params=None):
        return self._inner.execute(_translate_mysql_to_postgres(sql), params)

    def executemany(self, sql, seq_of_params):
        return self._inner.executemany(_translate_mysql_to_postgres(sql), seq_of_params)

    def __iter__(self):
        return iter(self._inner)

    def __enter__(self):
        self._inner.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):
        return self._inner.__exit__(exc_type, exc, tb)

    def __getattr__(self, name):
        return getattr(self._inner, name)


class CompatPostgresConnection(PsycopgConnection):
    def cursor(self, *args, **kwargs):
        dictionary = kwargs.pop("dictionary", False)
        cursor_factory = kwargs.pop("cursor_factory", None)

        if dictionary and cursor_factory is None:
            cursor_factory = RealDictCursor

        inner = super().cursor(*args, cursor_factory=cursor_factory, **kwargs)
        return CompatCursor(inner)


def get_database_connection():
    """
    Return a database connection that works in both local development and Render.

    Priority:
    1. PostgreSQL URL-style settings (best for Render / hosted deploys)
    2. MySQL host/user/password settings (best for the original local setup)
    3. Local PostgreSQL fallback used by the recent project version
    """

    postgres_dsn = _build_postgres_dsn()
    if postgres_dsn:
        return psycopg2.connect(
            postgres_dsn,
            connection_factory=CompatPostgresConnection,
            connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
        )

    mysql_config = _build_mysql_config()
    if mysql_config:
        if mysql is None:
            raise RuntimeError(
                "mysql-connector-python is not installed, but MySQL environment variables were provided."
            )
        return mysql.connector.connect(**mysql_config)

    local_postgres = "postgresql://postgres:sdgp@localhost:5432/performedge"
    return psycopg2.connect(
        local_postgres,
        connection_factory=CompatPostgresConnection,
        connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
    )



def get_db_connection():
    """Alias used by older modules."""
    return get_database_connection()
