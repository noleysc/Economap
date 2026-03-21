from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess, json

app = Flask(__name__)
CORS(app)

@app.route('/api/prices/<zip_code>', methods=['GET'])
def get_prices(zip_code):
    try:
        # Pass the zip code directly to the npm script
        process = subprocess.run(['npm', 'run', 'scrape', '--', zip_code], capture_output=True, text=True)
        
        # Extract the JSON line from the scraper logs
        output = [line for line in process.stdout.split('\n') if line.startswith('[{"name"')][0]
        return jsonify({
            "status": "success", 
            "location": zip_code, 
            "data": json.loads(output)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
