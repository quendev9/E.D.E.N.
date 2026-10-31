from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/")
def home():
    return jsonify({
        "project": "EDEN",
        "name": "Engineering Development Environment",
        "status": "online",
        "message": "EDEN foundation is running."
    })


if __name__ == "__main__":
    app.run(debug=True)