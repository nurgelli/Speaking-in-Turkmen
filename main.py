import os
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import get_db_connection, init_db
from schemas import (
    CategoryCreate, CategoryResponse,
    QuestionCreate, QuestionResponse
)

app = FastAPI(title="LinguaSpin - Language Teacher Carousel & Admin")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# --- CATEGORY ENDPOINTS ---

@app.get("/api/categories", response_model=List[CategoryResponse])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.*, COUNT(q.id) as question_count
        FROM categories c
        LEFT JOIN questions q ON c.id = q.category_id
        GROUP BY c.id
        ORDER BY c.id ASC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/categories", response_model=CategoryResponse)
def create_category(category: CategoryCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)',
        (category.name, category.description, category.icon, category.color)
    )
    cat_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute('SELECT *, 0 as question_count FROM categories WHERE id = ?', (cat_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@app.put("/api/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category: CategoryCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM categories WHERE id = ?', (category_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Kategori bulunamadı.")
        
    cursor.execute('''
        UPDATE categories
        SET name = ?, description = ?, icon = ?, color = ?
        WHERE id = ?
    ''', (category.name, category.description, category.icon, category.color, category_id))
    conn.commit()
    
    cursor.execute('''
        SELECT c.*, COUNT(q.id) as question_count
        FROM categories c
        LEFT JOIN questions q ON c.id = q.category_id
        WHERE c.id = ?
        GROUP BY c.id
    ''', (category_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM categories WHERE id = ?', (category_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Kategori bulunamadı.")
        
    cursor.execute('DELETE FROM categories WHERE id = ?', (category_id,))
    cursor.execute('DELETE FROM questions WHERE category_id = ?', (category_id,))
    conn.commit()
    conn.close()
    return {"message": "Kategori ve ilişkili tüm sorular silindi."}


# --- QUESTION ENDPOINTS ---

@app.get("/api/questions", response_model=List[QuestionResponse])
def get_questions(category_id: Optional[int] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if category_id is not None:
        cursor.execute('''
            SELECT q.*, c.name as category_name
            FROM questions q
            JOIN categories c ON q.category_id = c.id
            WHERE q.category_id = ?
            ORDER BY q.id DESC
        ''', (category_id,))
    else:
        cursor.execute('''
            SELECT q.*, c.name as category_name
            FROM questions q
            JOIN categories c ON q.category_id = c.id
            ORDER BY q.id DESC
        ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/questions/random", response_model=QuestionResponse)
def get_random_question(category_id: int = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT q.*, c.name as category_name
        FROM questions q
        JOIN categories c ON q.category_id = c.id
        WHERE q.category_id = ?
    ''', (category_id,))
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        raise HTTPException(status_code=404, detail="Bu kategoride henüz soru eklenmemiş.")
    
    chosen = random.choice(rows)
    return dict(chosen)

@app.post("/api/questions", response_model=QuestionResponse)
def create_question(question: QuestionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check category existence
    cursor.execute('SELECT name FROM categories WHERE id = ?', (question.category_id,))
    cat_row = cursor.fetchone()
    if not cat_row:
        conn.close()
        raise HTTPException(status_code=400, detail="Geçersiz kategori ID.")
    cat_name = cat_row['name']
    
    cursor.execute('''
        INSERT INTO questions (category_id, question_text, hint, difficulty)
        VALUES (?, ?, ?, ?)
    ''', (question.category_id, question.question_text, question.hint, question.difficulty))
    q_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute('SELECT * FROM questions WHERE id = ?', (q_id,))
    row = dict(cursor.fetchone())
    row['category_name'] = cat_name
    conn.close()
    return row

@app.put("/api/questions/{question_id}", response_model=QuestionResponse)
def update_question(question_id: int, question: QuestionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM questions WHERE id = ?', (question_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
        
    cursor.execute('''
        UPDATE questions
        SET category_id = ?, question_text = ?, hint = ?, difficulty = ?
        WHERE id = ?
    ''', (question.category_id, question.question_text, question.hint, question.difficulty, question_id))
    conn.commit()
    
    cursor.execute('''
        SELECT q.*, c.name as category_name
        FROM questions q
        JOIN categories c ON q.category_id = c.id
        WHERE q.id = ?
    ''', (question_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.delete("/api/questions/{question_id}")
def delete_question(question_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM questions WHERE id = ?', (question_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
        
    cursor.execute('DELETE FROM questions WHERE id = ?', (question_id,))
    conn.commit()
    conn.close()
    return {"message": "Soru başarıyla silindi."}


# Mount Static Files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "LinguaSpin API Server Running."}
