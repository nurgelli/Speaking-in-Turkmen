import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "carousel.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT DEFAULT '💬',
            color TEXT DEFAULT '#6366f1'
        )
    ''')
    
    # Create questions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            hint TEXT,
            difficulty TEXT DEFAULT 'Orta',
            FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )
    ''')
    
    # Check if DB is empty, if so seed initial categories and questions
    cursor.execute('SELECT COUNT(*) FROM categories')
    count = cursor.fetchone()[0]
    
    if count == 0:
        seed_default_data(cursor)
        
    conn.commit()
    conn.close()

def seed_default_data(cursor):
    categories_data = [
        ("Günlük Konuşma (Daily Talk)", "Günlük yaşam, hobiler ve kişisel deneyimler hakkında sorular.", "🗣️", "#4f46e5"),
        ("İş İngilizcesi (Business)", "Toplantı, mülakat ve profesyonel hayat senaryoları.", "💼", "#0284c7"),
        ("Dilbilgisi & Yapılar (Grammar)", "Zamanlar, koşul cümleleri ve cümle kurma egzersizleri.", "✏️", "#059669"),
        ("Deyimler & Atasözleri (Idioms)", "Popüler İngilizce deyimler ve kullanım alanları.", "💡", "#d97706"),
        ("Rol Yapma Senaryoları (Roleplay)", "Restoran, havaalanı, otel vb. gerçek hayat durumları.", "🎭", "#ec4899")
    ]
    
    for name, desc, icon, color in categories_data:
        cursor.execute(
            'INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)',
            (name, desc, icon, color)
        )
    
    # Get inserted category IDs
    cursor.execute('SELECT id, name FROM categories')
    cat_rows = cursor.fetchall()
    cat_map = {row['name']: row['id'] for row in cat_rows}
    
    questions_data = [
        # Daily Talk
        (cat_map.get("Günlük Konuşma (Daily Talk)"), "Tell me about your favorite vacation spot and why you love it.", "Use past simple tense and describe sights/food.", "Kolay"),
        (cat_map.get("Günlük Konuşma (Daily Talk)"), "What would your dream house look like? Describe 3 main features.", "Use conditional 'would' and adjectives.", "Orta"),
        (cat_map.get("Günlük Konuşma (Daily Talk)"), "If you could meet any historical figure, who would it be and what would you ask?", "Explain the reason for your choice.", "Zor"),
        (cat_map.get("Günlük Konuşma (Daily Talk)"), "Describe your morning routine from the moment you wake up.", "Use sequence markers: First, then, after that, finally.", "Kolay"),
        (cat_map.get("Günlük Konuşma (Daily Talk)"), "How do you handle stress after a long busy day?", "Talk about activities, music, sports or hobbies.", "Orta"),
        
        # Business English
        (cat_map.get("İş İngilizcesi (Business)"), "How would you handle a disagreement with a team colleague on a key project?", "Focus on professional communication and problem solving.", "Orta"),
        (cat_map.get("İş İngilizcesi (Business)"), "Introduce yourself in a 1-minute elevator pitch for a software job interview.", "Highlight your background, skills, and value.", "Zor"),
        (cat_map.get("İş İngilizcesi (Business)"), "Describe a challenge you faced at work and how you overcame it.", "Use the STAR method (Situation, Task, Action, Result).", "Zor"),
        (cat_map.get("İş İngilizcesi (Business)"), "How do you prioritize tasks when you have multiple tight deadlines?", "Mention tools or strategies you use.", "Orta"),

        # Grammar & Structures
        (cat_map.get("Dilbilgisi & Yapılar (Grammar)"), "Form 3 sentences using Third Conditional: 'If I had studied harder...'", "Past unreal situation: If + past perfect, would have + V3.", "Zor"),
        (cat_map.get("Dilbilgisi & Yapılar (Grammar)"), "Explain the difference between 'Present Perfect' and 'Past Simple' with examples.", "Life experience vs finished time.", "Orta"),
        (cat_map.get("Dilbilgisi & Yapılar (Grammar)"), "Make 3 sentences using Passive Voice in different tenses.", "Object + Be + V3 (Past participle).", "Orta"),
        (cat_map.get("Dilbilgisi & Yapılar (Grammar)"), "Use 'used to' and 'be used to' in two separate sentences.", "'used to + V1' vs 'be used to + V-ing'.", "Orta"),

        # Idioms
        (cat_map.get("Deyimler & Atasözleri (Idioms)"), "What does 'Break a leg' mean, and in what context is it used?", "Good luck, especially before a performance.", "Kolay"),
        (cat_map.get("Deyimler & Atasözleri (Idioms)"), "Explain the phrase 'Bite the bullet' and create an example sentence.", "To face a difficult situation with courage.", "Orta"),
        (cat_map.get("Deyimler & Atasözleri (Idioms)"), "What does 'Hit the nail on the head' mean?", "To describe exactly what is causing a situation.", "Orta"),
        (cat_map.get("Deyimler & Atasözleri (Idioms)"), "Explain 'Once in a blue moon' and tell a personal story using it.", "Something that happens very rarely.", "Kolay"),

        # Roleplay
        (cat_map.get("Rol Yapma Senaryoları (Roleplay)"), "You are at a hotel reception and your room key doesn't work. Politely ask for help.", "Use polite expressions: 'Excuse me', 'I was wondering if...'", "Kolay"),
        (cat_map.get("Rol Yapma Senaryoları (Roleplay)"), "You ordered pasta at a restaurant but got wrong dish. Complain politely to waiter.", "Express disappointment calmly and request change.", "Orta"),
        (cat_map.get("Rol Yapma Senaryoları (Roleplay)"), "You missed your flight due to train delay. Talk to airport desk staff.", "Explain situation, ask for rebooking options.", "Zor"),
        (cat_map.get("Rol Yapma Senaryoları (Roleplay)"), "You are buying a souvenir at a market and want to negotiate the price.", "Use phrases like 'Could you give me a discount?'", "Orta")
    ]
    
    for cat_id, text, hint, diff in questions_data:
        if cat_id:
            cursor.execute(
                'INSERT INTO questions (category_id, question_text, hint, difficulty) VALUES (?, ?, ?, ?)',
                (cat_id, text, hint, diff)
            )

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
