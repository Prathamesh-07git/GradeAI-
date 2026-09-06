import os
import sys
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.models.models import (
    Base, User, StudentProfile, Exam, Question, QuestionOption,
    QuestionConcept, QuestionKeyword, Submission, StudentAnswer,
    Evaluation, EvaluationConcept, EvaluationKeyword, TeacherReview, AuditLog
)

def migrate_sqlite_to_postgres(sqlite_db_path: str, pg_url: str):
    """
    Migrates all existing data from a local SQLite database into PostgreSQL.
    """
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting to SQLite source: {sqlite_db_path}")
    if not os.path.exists(sqlite_db_path):
        print(f"Error: SQLite database file not found at {sqlite_db_path}")
        return

    print(f"Connecting to Target PostgreSQL: {pg_url}")
    target_engine = create_engine(pg_url, pool_pre_ping=True)

    # Ensure tables exist in target PostgreSQL
    Base.metadata.create_all(bind=target_engine)

    TargetSession = sessionmaker(bind=target_engine)
    pg_db = TargetSession()

    sqlite_conn = sqlite3.connect(sqlite_db_path)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()

    try:
        # Table mapping order respecting foreign key constraints
        tables_to_migrate = [
            ("users", User),
            ("student_profiles", StudentProfile),
            ("exams", Exam),
            ("questions", Question),
            ("question_options", QuestionOption),
            ("question_concepts", QuestionConcept),
            ("question_keywords", QuestionKeyword),
            ("submissions", Submission),
            ("student_answers", StudentAnswer),
            ("evaluations", Evaluation),
            ("evaluation_concepts", EvaluationConcept),
            ("evaluation_keywords", EvaluationKeyword),
            ("teacher_reviews", TeacherReview),
            ("audit_logs", AuditLog),
        ]

        for table_name, model_class in tables_to_migrate:
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            print(f"Migrating {len(rows)} records from table: {table_name}...")
            
            for row in rows:
                data = dict(row)
                # Check if row already exists in PostgreSQL
                existing = pg_db.query(model_class).filter_by(id=data["id"]).first()
                if not existing:
                    obj = model_class(**data)
                    pg_db.add(obj)

            pg_db.commit()

        print("Successfully migrated SQLite data to PostgreSQL!")

    except Exception as e:
        pg_db.rollback()
        print(f"Migration failed with error: {e}")
        raise e
    finally:
        sqlite_conn.close()
        pg_db.close()

if __name__ == "__main__":
    sqlite_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join("database", "database.db")
    postgres_target = os.environ.get("DATABASE_URL")
    
    if not postgres_target or postgres_target.startswith("sqlite"):
        print("Please provide a target PostgreSQL URL via environment variable DATABASE_URL.")
        print("Usage: DATABASE_URL=postgresql://user:pass@host/dbname python -m backend.migrate_sqlite_to_postgres [sqlite_db_path]")
    else:
        migrate_sqlite_to_postgres(sqlite_path, postgres_target)
