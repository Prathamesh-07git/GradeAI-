from flask import Blueprint, render_template, g, redirect, url_for, flash, request, current_app
import functools
import sqlite3

teacher_bp = Blueprint('teacher', __name__, url_prefix='/teacher')

def get_db():
    from flask import g
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(current_app.config['DATABASE'], timeout=20)
        db.row_factory = sqlite3.Row
    return db

def teacher_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None or g.user['role'] != 'teacher':
            flash('You must be logged in as a teacher to view this page.')
            return redirect(url_for('auth.login'))
        return view(**kwargs)
    return wrapped_view

@teacher_bp.route('/dashboard')
@teacher_required
def dashboard():
    db = get_db()
    exams = db.execute('SELECT * FROM exams WHERE teacher_id = ? ORDER BY created_at DESC', (g.user['id'],)).fetchall()
    
    total_exams = len(exams)
    
    # We will compute these realistically in later phases
    total_answers = 0
    
    db.close()
    return render_template('teacher_dashboard.html', exams=exams, total_exams=total_exams, total_answers=total_answers)

@teacher_bp.route('/create_exam', methods=('GET', 'POST'))
@teacher_required
def create_exam():
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        total_marks = request.form['total_marks']
        error = None

        if not title or not total_marks:
            error = 'Title and Total Marks are required.'

        if error is not None:
            flash(error)
        else:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                'INSERT INTO exams (title, description, teacher_id, total_marks) VALUES (?, ?, ?, ?)',
                (title, description, g.user['id'], total_marks)
            )
            db.commit()
            db.close()
            flash('Exam created successfully! Now you can add questions to it.')
            return redirect(url_for('teacher.dashboard'))
            
    return render_template('create_exam.html')

@teacher_bp.route('/exam/<int:id>/add_question', methods=('GET', 'POST'))
@teacher_required
def add_question(id):
    db = get_db()
    exam = db.execute('SELECT * FROM exams WHERE id = ? AND teacher_id = ?', (id, g.user['id'])).fetchone()
    
    if exam is None:
        flash('Exam not found or you are not authorized.')
        return redirect(url_for('teacher.dashboard'))
    
    if request.method == 'POST':
        question_text = request.form['question_text']
        reference_answer = request.form['reference_answer']
        maximum_marks = request.form['maximum_marks']
        keywords = request.form['keywords']
        concepts = request.form['concepts']
        error = None
        
        if not question_text or not reference_answer or not maximum_marks:
            error = 'Question, Reference Answer, and Marks are required.'
            
        if error is not None:
            flash(error)
        else:
            db.execute(
                'INSERT INTO questions (exam_id, question_text, reference_answer, maximum_marks, keywords, concepts) VALUES (?, ?, ?, ?, ?, ?)',
                (id, question_text, reference_answer, maximum_marks, keywords, concepts)
            )
            db.commit()
            flash('Question added successfully!')
            return redirect(url_for('teacher.dashboard'))
            
    db.close()
    return render_template('add_question.html', exam=exam)
