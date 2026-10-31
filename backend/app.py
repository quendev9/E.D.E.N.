
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory


# -----------------------------------------
# PATHS AND CONFIGURATION
# -----------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

FRONTEND_DIR = BASE_DIR / "frontend"
DATABASE_DIR = BASE_DIR / "database"
DATABASE_PATH = DATABASE_DIR / "eden.db"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path="/static"
)


# -----------------------------------------
# DATABASE
# -----------------------------------------

def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    DATABASE_DIR.mkdir(exist_ok=True)

    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            problem_statement TEXT DEFAULT '',
            status TEXT DEFAULT 'Active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def project_to_dict(project):
    return dict(project)


def get_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# -----------------------------------------
# FRONTEND ROUTES
# -----------------------------------------

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


# -----------------------------------------
# PROJECT API
# -----------------------------------------

@app.route("/api/projects", methods=["GET"])
def get_projects():
    connection = get_db()

    projects = connection.execute("""
        SELECT * FROM projects
        ORDER BY updated_at DESC
    """).fetchall()

    connection.close()

    return jsonify([project_to_dict(p) for p in projects])


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    problem_statement = str(
        data.get("problem_statement", "")
    ).strip()

    if not name:
        return jsonify({
            "error": "Project name is required."
        }), 400

    timestamp = get_timestamp()

    connection = get_db()

    cursor = connection.execute("""
        INSERT INTO projects (
            name,
            description,
            problem_statement,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        name,
        description,
        problem_statement,
        "Active",
        timestamp,
        timestamp
    ))

    connection.commit()

    project = connection.execute(
        "SELECT * FROM projects WHERE id = ?",
        (cursor.lastrowid,)
    ).fetchone()

    connection.close()

    return jsonify(project_to_dict(project)), 201


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project(project_id):
    connection = get_db()

    project = connection.execute(
        "SELECT * FROM projects WHERE id = ?",
        (project_id,)
    ).fetchone()

    connection.close()

    if project is None:
        return jsonify({"error": "Project not found."}), 404

    return jsonify(project_to_dict(project))


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
def update_project(project_id):
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    problem_statement = str(
        data.get("problem_statement", "")
    ).strip()

    if not name:
        return jsonify({
            "error": "Project name is required."
        }), 400

    connection = get_db()

    existing = connection.execute(
        "SELECT id FROM projects WHERE id = ?",
        (project_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        return jsonify({"error": "Project not found."}), 404

    connection.execute("""
        UPDATE projects
        SET name = ?,
            description = ?,
            problem_statement = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        name,
        description,
        problem_statement,
        get_timestamp(),
        project_id
    ))

    connection.commit()

    project = connection.execute(
        "SELECT * FROM projects WHERE id = ?",
        (project_id,)
    ).fetchone()

    connection.close()

    return jsonify(project_to_dict(project))

# -----------------------------------------
# DELETE PROJECT
# -----------------------------------------

@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):

    connection = get_db()

    existing = connection.execute(
        "SELECT id FROM projects WHERE id = ?",
        (project_id,)
    ).fetchone()

    if existing is None:
        connection.close()

        return jsonify({
            "error": "Project not found."
        }), 404

    connection.execute(
        "DELETE FROM projects WHERE id = ?",
        (project_id,)
    )

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Project deleted successfully."
    }), 200

# -----------------------------------------
# APPLICATION STARTUP
# -----------------------------------------

initialize_database()


if __name__ == "__main__":
    app.run(debug=True)
