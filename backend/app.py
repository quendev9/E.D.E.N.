import sqlite3
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'eden.db')
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT DEFAULT 'General Engineering',
            description TEXT,
            problem_statement TEXT,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Serve Frontend Static Files
@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

# API Routes
@app.route('/api/projects', methods=['GET'])
def get_projects():
    status_filter = request.args.get('status', 'All')
    search_query = request.args.get('search', '').strip()
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM projects WHERE 1=1"
    params = []
    
    if status_filter != 'All':
        query += " AND status = ?"
        params.append(status_filter)
        
    if search_query:
        query += " AND (title LIKE ? OR description LIKE ? OR problem_statement LIKE ?)"
        wildcard = f"%{search_query}%"
        params.extend([wildcard, wildcard, wildcard])
        
    query += " ORDER BY updated_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    projects = [dict(row) for row in rows]
    conn.close()
    
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json(silent=True) or request.form or {}
    title = data.get('title')
    
    if not title:
        print("❌ ERROR: Title is missing from request data.")
        return jsonify({'error': 'Title is required'}), 400
        
    category = data.get('category', 'General Engineering')
    description = data.get('description', '')
    problem_statement = data.get('problem_statement', '')
    status = data.get('status', 'Active')
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO projects (title, category, description, problem_statement, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (title, category, description, problem_statement, status))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        print(f"✅ SUCCESS: Created project ID {new_id}: '{title}' [{status}]")
        return jsonify({'id': new_id, 'message': 'Project created successfully'}), 201
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    data = request.get_json(silent=True) or request.form or {}
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE projects
            SET title = ?, category = ?, description = ?, problem_statement = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('title'),
            data.get('category', 'General Engineering'),
            data.get('description', ''),
            data.get('problem_statement', ''),
            data.get('status', 'Active'),
            project_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Project updated successfully'})
    except Exception as e:
        print(f"❌ Database Error on Update: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Project deleted successfully'})
    except Exception as e:
        print(f"❌ Database Error on Delete: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as total FROM projects')
    total = cursor.fetchone()['total']
    cursor.execute("SELECT COUNT(*) as active FROM projects WHERE status = 'Active'")
    active = cursor.fetchone()['active']
    cursor.execute("SELECT COUNT(*) as completed FROM projects WHERE status = 'Completed'")
    completed = cursor.fetchone()['completed']
    conn.close()
    
    return jsonify({
        'total': total,
        'active': active,
        'completed': completed
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)