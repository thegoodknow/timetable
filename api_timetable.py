from flask import Flask, jsonify
import json
import os

app = Flask(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), 'timetable_data.json')

@app.route('/api/timetable', methods=['GET'])
def api_get_timetable():
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
