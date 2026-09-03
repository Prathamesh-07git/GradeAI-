# Auto-Grading Subjective Answers Using NLP

## Problem Statement
Evaluating subjective or descriptive answers manually is time-consuming, prone to human bias, and inconsistent across different evaluators. As the number of students increases, providing detailed, constructive feedback for each subjective answer becomes a massive challenge for educators.

## Motivation
To reduce the burden on educators and provide a fair, standardized evaluation mechanism that not only grades students but also explains why the grade was awarded. 

## Objectives
- Automate the evaluation of subjective student answers.
- Use advanced NLP techniques to evaluate meaning, not just exact words.
- Provide detailed, explainable feedback highlighting matched and missing concepts.
- Create a human-in-the-loop system where AI assists rather than completely replaces human judgment.

## Features
- **Role-based Dashboards**: Separate views for teachers and students.
- **Exam Management**: Teachers can create exams, add questions, reference answers, concepts, and keywords.
- **NLP Evaluation Engine**: Uses TF-IDF, Semantic Similarity (Sentence Transformers), Keyword Matching, Concept Coverage, and Relevance detection.
- **Explainable Evaluation**: Shows a full breakdown of scores and generated feedback.
- **Manual Override**: Teachers can review AI-generated scores and override them if confidence is low.

## Technology Stack
- **Frontend**: HTML5, CSS3 (Custom responsive design), JavaScript
- **Backend**: Python, Flask
- **NLP/Machine Learning**: NLTK, spaCy, scikit-learn, Sentence-Transformers
- **Database**: SQLite (Designed to be scalable to PostgreSQL/MySQL)

## System Architecture
```
Frontend (HTML/CSS/JS)
         ↓
    Flask Backend
         ↓
Authentication Layer
         ↓
  Question Management / Answer Submission
         ↓
 NLP Evaluation Engine
         ↓
  Scoring Engine & Feedback Generator
         ↓
    SQLite Database
```

## NLP Pipeline
1. Text Cleaning & Normalization
2. Sentence & Word Tokenization
3. Stopword Removal & Lemmatization
4. Keyword Extraction & Matching
5. TF-IDF Feature Extraction
6. Semantic Similarity (via Sentence Transformers)
7. Concept Matching & Answer Completeness check
8. Final Score Calculation & Feedback Generation

## Scoring Methodology
The final score is a weighted combination:
- **Keyword Matching**: 20%
- **TF-IDF Similarity**: 20%
- **Semantic Similarity**: 35%
- **Concept Coverage**: 20%
- **Answer Relevance**: 5%

## Database Design
The system uses the following relational structure:
- `users`: Stores teacher and student credentials.
- `exams`: Contains exam metadata.
- `questions`: Stores questions, reference answers, keywords, concepts, and max marks.
- `student_answers`: Stores submitted answers.
- `evaluations`: Stores the NLP evaluation results, scores, and feedback.

## Installation Instructions
1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd auto-grading-nlp
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize NLP models (To be added in future phases)**:
   ```bash
   python -m spacy download en_core_web_sm
   ```

## How to Run
1. Ensure your virtual environment is activated.
2. Run the Flask application:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to `http://127.0.0.1:5000`.
   *(Note: The database is automatically initialized on the first run).*

## Example Evaluation
**Question**: "Explain inheritance in Java."
**Reference**: "Inheritance allows one class to acquire properties and methods of another class. It supports code reuse and represents an IS-A relationship."
**Student**: "Inheritance allows a child class to use properties and methods of a parent class. It is useful for code reuse."
**System Output**: Score: 8.5/10. Feedback: "Good answer. You correctly explained inheritance and code reuse. To improve your answer, mention the IS-A relationship and explain it briefly."

## Screenshots
*(Screenshots will be added in later phases once the UI is fully developed).*

## Testing
Unit testing covers:
- Text preprocessing
- Similarity metrics
- Score calculations
- API endpoints

Run tests using:
```bash
python -m pytest tests/
```

## Limitations
- NLP cannot perfectly understand every subjective answer, especially those requiring complex domain knowledge.
- Reference answer quality significantly affects grading.
- Sarcasm, poor grammar, and highly ambiguous language can lower evaluation accuracy.
- Requires teacher review for low-confidence scores.

## Future Scope
- Integration with LLM-based evaluation (e.g., GPT-4 / Llama).
- Multilingual answer grading.
- Handwritten answer OCR integration.
- Fine-tuning models on institution-specific datasets.

## Authors
- Developed as a complete academic project for automated subjective grading.
