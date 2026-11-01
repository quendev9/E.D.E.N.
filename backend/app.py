from flask import Flask, jsonify, request, send_from_directory
import sqlite3
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'eden.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Projects Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            status TEXT DEFAULT 'Active',
            problem_statement TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Ideas Table (Concept Incubator)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            raw_notes TEXT,
            tags TEXT,
            status TEXT DEFAULT 'Incubating',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# --- PROJECTS API ---
@app.route('/api/projects', methods=['GET'])
def get_projects():
    status_filter = request.args.get('status', 'All')
    search_query = request.args.get('search', '')
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM projects WHERE 1=1"
    params = []
    if status_filter != 'All':
        query += " AND status = ?"
        params.append(status_filter)
    if search_query:
        query += " AND (title LIKE ? OR description LIKE ?)"
        params.extend([f"%{search_query}%", f"%{search_query}%"])
    query += " ORDER BY updated_at DESC"
    cursor.execute(query, params)
    projects = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in projects])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM projects")
    total = cursor.fetchone()['total']
    cursor.execute("SELECT COUNT(*) as active FROM projects WHERE status = 'Active'")
    active = cursor.fetchone()['active']
    cursor.execute("SELECT COUNT(*) as completed FROM projects WHERE status = 'Completed'")
    completed = cursor.fetchone()['completed']
    conn.close()
    return jsonify({'total': total, 'active': active, 'completed': completed})

# --- IDEA STUDIO API ---
@app.route('/api/ideas', methods=['GET'])
def get_ideas():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ideas ORDER BY updated_at DESC")
    ideas = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in ideas])

@app.route('/api/ideas', methods=['POST'])
def create_idea():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO ideas (title, category, raw_notes, tags) VALUES (?, ?, ?, ?)",
        (data.get('title'), data.get('category', 'General'), data.get('raw_notes'), data.get('tags', ''))
    )
    conn.commit()
    idea_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Idea created successfully', 'id': idea_id}), 201

@app.route('/api/ideas/<int:idea_id>', methods=['DELETE'])
def delete_idea(idea_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ideas WHERE id = ?", (idea_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Idea deleted successfully'})

@app.route('/api/ideas/<int:idea_id>/promote', methods=['POST'])
def promote_idea(idea_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,))
    idea = cursor.fetchone()
    
    if not idea:
        conn.close()
        return jsonify({'error': 'Idea not found'}), 404

    cursor.execute(
        "INSERT INTO projects (title, category, status, problem_statement, description) VALUES (?, ?, 'Active', ?, ?)",
        (idea['title'], idea['category'], idea['raw_notes'], f"Promoted from Idea Studio. Tags: {idea['tags']}")
    )
    cursor.execute("UPDATE ideas SET status = 'Promoted' WHERE id = ?", (idea_id,))
    conn.commit()
    project_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Idea promoted to project!', 'project_id': project_id})

if __name__ == '__main__':
    app.run(debug=True, port=5000)