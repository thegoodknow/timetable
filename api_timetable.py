from flask import Flask, jsonify, CORS
from pymongo import MongoClient
import os # Necessary for accessing environment variables

app = Flask(__name__)
CORS(app) # Enable CORS for front-end access

# --- MongoDB Configuration ---

# 1. Retrieve the connection string from the environment variable (GitHub Secret)
# The secret must be configured in GitHub with the key 'MONGO_URI'.
MONGO_URI = os.getenv("MONGO_URI") 
DB_NAME = "timetable_db"
COLLECTION_NAME = "weekly_timetables" 

# Initialize client and collection globally
client = None
db = None
collection = None

if not MONGO_URI:
    print("FATAL: MONGO_URI environment variable is NOT set. Please set the GitHub Secret.")
    # Fallback to localhost for local testing if the environment variable is missing
    MONGO_URI = "mongodb://localhost:27017/" 
    print(f"WARNING: Using local fallback connection string: {MONGO_URI}")

try:
    # 2. Establish connection using the retrieved URI
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Optional: Verify connection by attempting to list database names
    client.list_database_names() 
    print("MongoDB connection established successfully.")

except Exception as e:
    print(f"FATAL: Could not connect to MongoDB at {MONGO_URI}. API will return errors. Error: {e}")
    client = None # Ensure client is set to None if connection fails

@app.route('/api/timetable', methods=['GET'])
def api_get_timetable():
    """
    Fetches all timetable data from MongoDB and returns it as JSON.
    """
    try:
        # Check if the connection attempt was successful
        if not client or not collection:
            raise ConnectionError("Database connection failed during application startup.")
            
        # Fetch all documents, excluding the MongoDB _id field for cleaner JSON
        all_weeks_cursor = collection.find({}, {'_id': 0}) 
        all_weeks_list = list(all_weeks_cursor)
        
        # Sort weeks by weekStartDate (assuming it's present in the documents)
        all_weeks_list.sort(key=lambda w: w.get('weekStartDate', '0000-00-00'))

        # Return the data in the expected {"weeks": [...] } format
        return jsonify({"weeks": all_weeks_list})
        
    except Exception as e:
        error_message = f"Failed to retrieve data from MongoDB: {str(e)}"
        print(f"API Error: {error_message}")
        return jsonify({'error': error_message}), 500

if __name__ == '__main__':
    # Start the Flask server
    app.run(port=5000, debug=True)