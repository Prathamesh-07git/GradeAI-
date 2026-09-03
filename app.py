from flask import Flask, render_template, g, session
import sqlite3
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'], timeout=20)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        schema_path = os.path.join(app.config['BASE_DIR'], 'database', 'schema.sql')
        with app.open_resource(schema_path, mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

from routes.auth import auth_bp
from routes.teacher import teacher_bp
from routes.student import student_bp

app.register_blueprint(auth_bp)
app.register_blueprint(teacher_bp)
app.register_blueprint(student_bp)

@app.before_request
def load_logged_in_user():
    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        db = get_db()
        g.user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Initialize the database if it doesn't exist
    if not os.path.exists(app.config['DATABASE']):
        print("Initializing database...")
        init_db()
        print("Database initialized successfully.")
    app.run(debug=True)
