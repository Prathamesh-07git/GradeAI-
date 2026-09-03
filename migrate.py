import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'database', 'database.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE questions ADD COLUMN question_type VARCHAR DEFAULT 'subjective'")
        conn.commit()
        print("Column question_type added successfully.")
    except Exception as e:
        print("Migration note:", e)
    
    # Create question_options table if it doesn't exist
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS question_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            option_text VARCHAR NOT NULL,
            is_correct BOOLEAN DEFAULT 0,
            FOREIGN KEY(question_id) REFERENCES questions(id)
        )
        """)
        conn.commit()
        print("question_options table ensured.")
    except Exception as e:
        print("Table creation error:", e)

    conn.close()
else:
    print(f"Database not found at {db_path}")
