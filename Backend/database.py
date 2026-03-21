# database.py
"""Database connection helpers.

The existing codebase uses `get_database_connection()`.
The performance module expects `get_db_connection()`.

Both functions return a `mysql.connector` connection.

Defaults match the original project settings, but you can override them
using environment variables:
  - DB_HOST
  - DB_USER
  - DB_PASSWORD
  - DB_NAME
"""

from __future__ import annotations

import os

import mysql.connector


def get_database_connection():
    """Primary DB connection helper used across the project."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "sdgp"),
        database=os.getenv("DB_NAME", "performedge"),
    )


def get_db_connection():
    """Alias used by the Performance module."""
    return get_database_connection()
