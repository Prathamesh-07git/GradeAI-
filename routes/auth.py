from flask import Blueprint, render_template, request, redirect, url_for, flash, session, g
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import bcrypt

auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    from flask import g, current_app
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(current_app.config['DATABASE'], timeout=20)
        db.row_factory = sqlite3.Row
    return db

@auth_bp.route('/register', methods=('GET', 'POST'))
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        role = request.form['role']
        error = None

        if not name or not email or not password or not role:
            error = 'All fields are required.'
        elif role not in ['teacher', 'student']:
            error = 'Invalid role selected.'

        if error is None:
            db = get_db_connection()
            try:
                db.execute(
                    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                    (name, email, bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'), role),
                )
                db.commit()
            except sqlite3.IntegrityError:
                error = f"User with email {email} is already registered."
            else:
                db.close()
                return redirect(url_for('auth.login'))
            finally:
                db.close()

        flash(error)

    return render_template('register.html')

@auth_bp.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        error = None

        db = get_db_connection()
        user = db.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        db.close()

        if user is None:
            error = 'Incorrect email.'
        elif user['password_hash'].startswith('$2b$'):
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                error = 'Incorrect password.'
        elif not check_password_hash(user['password_hash'], password):
            error = 'Incorrect password.'

        if error is None:
            session.clear()
            session['user_id'] = user['id']
            if user['role'] == 'teacher':
                return redirect(url_for('teacher.dashboard'))
            else:
                return redirect(url_for('student.dashboard'))

        flash(error)

    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))
