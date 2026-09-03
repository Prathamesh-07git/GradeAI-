from flask import Blueprint, render_template, g, redirect, url_for, flash, request, current_app
import functools
import sqlite3

student_bp = Blueprint('student', __name__, url_prefix='/student')

def get_db():
    from flask import g
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(current_app.config['DATABASE'], timeout=20)
        db.row_factory = sqlite3.Row
    return db

def student_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None or g.user['role'] != 'student':
            flash('You must be logged in as a student to view this page.')
            return redirect(url_for('auth.login'))
        return view(**kwargs)
    return wrapped_view

@student_bp.route('/dashboard')
@student_required
def dashboard():
    db = get_db()
    
    # Get all available exams
    available_exams = db.execute('''
        SELECT exams.*, users.name as teacher_name 
        FROM exams 
        JOIN users ON exams.teacher_id = users.id 
        ORDER BY exams.created_at DESC
    ''').fetchall()
    
    # Completed exams
    completed_exams = db.execute('''
        SELECT DISTINCT exams.id, exams.title, exams.total_marks, users.name as teacher_name
        FROM exams
        JOIN users ON exams.teacher_id = users.id
        JOIN submissions ON submissions.exam_id = exams.id
        WHERE submissions.student_id = ?
    ''', (g.user['id'],)).fetchall()
    
    db.close()
    return render_template('student_dashboard.html', 
                           available_exams=available_exams, 
                           len_available=len(available_exams), 
                           len_completed=len(completed_exams),
                           completed_exams=completed_exams)

@student_bp.route('/exam/<int:id>', methods=('GET', 'POST'))
@student_required
def take_exam(id):
    db = get_db()
    exam = db.execute('SELECT * FROM exams WHERE id = ?', (id,)).fetchone()
    if exam is None:
        flash('Exam not found.')
        db.close()
        return redirect(url_for('student.dashboard'))
        
    questions = db.execute('SELECT * FROM questions WHERE exam_id = ?', (id,)).fetchall()
    
    if request.method == 'POST':
        from nlp.evaluator import evaluate_answer
        from datetime import datetime
        
        cursor = db.cursor()
        cursor.execute(
            'INSERT INTO submissions (student_id, exam_id, status, started_at, submitted_at) VALUES (?, ?, ?, ?, ?)',
            (g.user['id'], id, 'submitted', datetime.utcnow(), datetime.utcnow())
        )
        submission_id = cursor.lastrowid

        # Submit all answers
        for q in questions:
            answer_text = request.form.get(f'question_{q["id"]}', '')
            if answer_text.strip():
                cursor.execute(
                    'INSERT INTO student_answers (submission_id, question_id, answer_text) VALUES (?, ?, ?)',
                    (submission_id, q['id'], answer_text.strip())
                )
                answer_id = cursor.lastrowid
                
                # NLP Evaluation Pipeline
                results = evaluate_answer(
                    answer_text.strip(), 
                    q['reference_answer'], 
                    q['keywords'], 
                    q['concepts'], 
                    q['maximum_marks']
                )
                
                cursor.execute(
                    'INSERT INTO evaluations (answer_id, marks, feedback, confidence) VALUES (?, ?, ?, ?)',
                    (answer_id, results['marks'], results['feedback'], results['confidence'])
                )
                
        db.commit()
        db.close()
        flash('Exam submitted and graded successfully! View your results below.')
        return redirect(url_for('student.dashboard'))
        
    db.close()
    return render_template('exam.html', exam=exam, questions=questions)

@student_bp.route('/results/<int:id>')
@student_required
def results(id):
    db = get_db()
    exam = db.execute('SELECT * FROM exams WHERE id = ?', (id,)).fetchone()
    
    if exam is None:
        flash('Exam not found.')
        db.close()
        return redirect(url_for('student.dashboard'))
        
    data = db.execute('''
        SELECT q.question_text, q.maximum_marks, 
               a.answer_text, 
               e.marks, e.feedback, e.confidence
        FROM questions q
        JOIN student_answers a ON q.id = a.question_id
        JOIN submissions s ON a.submission_id = s.id
        JOIN evaluations e ON a.id = e.answer_id
        WHERE q.exam_id = ? AND s.student_id = ?
    ''', (id, g.user['id'])).fetchall()
    
    total_awarded = sum(row['marks'] for row in data) if data else 0
    total_possible = sum(row['maximum_marks'] for row in data) if data else 0
    
    db.close()
    return render_template('student_results.html', exam=exam, data=data, total_awarded=total_awarded, total_possible=total_possible)
