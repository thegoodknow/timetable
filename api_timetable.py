from flask import Flask, jsonify, CORS, request
from pymongo import MongoClient
import os
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app) # Enable CORS for front-end access

# --- MongoDB Configuration ---

MONGO_URI = os.getenv("MONGO_URI") 
DB_NAME = "timetable_db"
COLLECTION_NAME = "weekly_timetables" 

client = None
db = None
collection = None

if not MONGO_URI:
    print("FATAL: MONGO_URI environment variable is NOT set. Please set the GitHub Secret.")
    MONGO_URI = "mongodb://localhost:27017/" 
    print(f"WARNING: Using local fallback connection string: {MONGO_URI}")

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    client.list_database_names() 
    print("MongoDB connection established successfully.")

except Exception as e:
    print(f"FATAL: Could not connect to MongoDB at {MONGO_URI}. API will return errors. Error: {e}")
    client = None 

# --- Helper Functions ---

def get_week_start_date(date_str):
    """
    Calculates the Monday of the week for a given date string (YYYY-MM-DD).
    Returns the date string in YYYY-MM-DD format.
    """
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        # Monday is day 0 in Python's weekday() (Monday=0, Sunday=6)
        start_of_week = date_obj - timedelta(days=date_obj.weekday())
        return start_of_week.strftime('%Y-%m-%d')
    except ValueError:
        raise ValueError("Invalid date format. Expected YYYY-MM-DD.")

def get_formatted_date_string(date_str):
    """
    Converts a date string (YYYY-MM-DD) to the format: "Mon, 01-Dec-2025"
    which is used as the 'date' field in the timetable day objects.
    """
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        day = date_obj.strftime('%a')
        date_num = date_obj.strftime('%d')
        month = date_obj.strftime('%b')
        year = date_obj.strftime('%Y')
        return f"{day}, {date_num}-{month}-{year}"
    except ValueError:
        raise ValueError("Invalid date format.")

# --- API Routes ---

@app.route('/api/timetable', methods=['GET'])
def api_get_timetable():
    """
    Fetches all timetable data from MongoDB.
    """
    try:
        if not client or not collection:
            raise ConnectionError("Database connection failed during application startup.")
            
        # Fetch all documents, excluding the MongoDB _id field
        all_weeks_cursor = collection.find({}, {'_id': 0}) 
        all_weeks_list = list(all_weeks_cursor)
        
        # Sort weeks by weekStartDate
        all_weeks_list.sort(key=lambda w: w.get('weekStartDate', '0000-00-00'))

        return jsonify({"weeks": all_weeks_list})
        
    except Exception as e:
        error_message = f"Failed to retrieve data from MongoDB: {str(e)}"
        print(f"API Error: {error_message}")
        return jsonify({'error': error_message}), 500

@app.route('/api/class', methods=['POST'])
def api_add_class():
    """
    Receives new class data and inserts it into the correct week and day in MongoDB.
    """
    try:
        if not client or not collection:
            raise ConnectionError("Database connection failed.")
            
        data = request.get_json()

        # 1. Validate mandatory fields
        required_fields = ['date', 'time', 'moduleCode', 'moduleName', 'location', 'lecturer']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required class fields.'}), 400

        # 2. Process Dates and Week Start
        class_date_str = data['date'] # YYYY-MM-DD from frontend
        week_start_date = get_week_start_date(class_date_str)
        formatted_day_date = get_formatted_date_string(class_date_str) # "Mon, 01-Dec-2025"

        # 3. Construct the new class object
        new_class = {
            "moduleCode": data['moduleCode'],
            "moduleName": data['moduleName'],
            "time": data['time'],
            "location": data['location'],
            "campus": data.get('campus', 'APU CAMPUS'),
            "lecturer": data['lecturer'],
            "isOnline": data['isOnline']
        }

        # 4. Attempt to insert class into an existing week and day
        query = {
            "weekStartDate": week_start_date,
            "days.date": formatted_day_date
        }
        update_push_class = {
            "$push": { "days.$.classes": new_class }
        }

        result = collection.update_one(query, update_push_class)

        # 5. Handle cases where the week or day does NOT exist
        if result.matched_count == 0:
            
            week_exists = collection.find_one({"weekStartDate": week_start_date})
            
            if week_exists:
                # Week exists, but the day is missing. Push a new day object.
                new_day_object = {
                    "date": formatted_day_date,
                    "classes": [new_class]
                }
                collection.update_one(
                    {"weekStartDate": week_start_date},
                    {"$push": {"days": new_day_object}}
                )
            else:
                # Neither week nor day exists. Insert a brand new week document.
                new_week_document = {
                    "weekStartDate": week_start_date,
                    "days": [
                        {
                            "date": formatted_day_date,
                            "classes": [new_class]
                        }
                    ]
                }
                collection.insert_one(new_week_document)

        return jsonify({'message': 'Class added successfully'}), 201

    except Exception as e:
        error_message = f"Failed to add class: {str(e)}"
        print(f"POST /api/class Error: {error_message}")
        return jsonify({'error': error_message}), 500

if __name__ == '__main__':
    # Flask runs on port 5000 by default
    app.run(port=5000, debug=True)