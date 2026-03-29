
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_database_connection():
    """
    Connects to the PostgreSQL database using the DATABASE_URL 
    provided by Render.
    """

    db_url = os.getenv("DATABASE_URL")
    
    # If DATABASE_URL isn't found, it falls back to local defaults for your laptop
    if not db_url:
        db_url = "postgresql://postgres:sdgp@localhost:5432/performedge"

    # Connect to the server
    conn = psycopg2.connect(db_url)
    return conn

def get_db_connection():
    """Alias used by the Performance module."""
    return get_database_connection()