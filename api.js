// --- REQUIRED BACKEND SERVER FILE (Node.js/Express) ---
// This file demonstrates how to securely connect to MongoDB 
// and handle the API requests from the frontend (timetable.html).
// It must be run on a server, not in a browser.

const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

// 1. SECURELY LOAD ENVIRONMENT VARIABLE (GitHub Secret simulation)
// In a real deployment, the host environment (like GitHub Actions, Heroku, etc.) 
// injects the MONGO_URI. For local testing, you'd use a .env file (npm install dotenv).
// process.env.MONGO_URI = "mongodb://localhost:27017/myTimetableDB"; // Example local URI
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI environment variable is not set.");
    console.error("Please set MONGO_URI in your environment variables (or GitHub Secrets).");
    process.exit(1);
}

const app = express();
const port = 3000;

// Middleware to parse JSON bodies from the frontend
app.use(express.json());

// Serve static files (like timetable.html, favicon.svg)
app.use(express.static(path.join(__dirname, ''))); 

// --- Database Connection Initialization ---
let db;
let client;

async function connectDB() {
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log("MongoDB connection successful!");
        db = client.db('TimetableDatabase'); // Use your actual database name
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        // Do not proceed if the database connection fails
        process.exit(1); 
    }
}

// Helper to format class data for the frontend (similar structure to the old JSON file)
function formatTimetableData(classes) {
    const weeks = {}; // { 'YYYY-MM-DD': { days: [ { date: '...', classes: [...] } ] } }
    
    classes.forEach(cls => {
        // Convert date string (YYYY-MM-DD) to Date object
        const classDate = new Date(cls.date + 'T00:00:00Z');
        
        // Find the start of the week (e.g., Sunday or Monday, depending on convention, using Monday here)
        // 1=Monday, 7=Sunday. getDate() returns 1-7.
        const dayOfWeek = classDate.getUTCDay();
        const diff = classDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
        const weekStartDate = new Date(classDate.getTime());
        weekStartDate.setUTCDate(diff);
        
        const weekStartKey = weekStartDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const formattedDate = classDate.toLocaleDateString('en-US', { 
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' 
        }).replace(/(\w+)\s+(\d+),\s+(\d+)/, (match, month, day, year) => `${day}-${month}-${year}`);
        
        // Fix for "Mon, 01-Dec-2025" style
        const dateParts = formattedDate.split('-');
        const dateObj = new Date(`${dateParts[1]} ${dateParts[0]}, ${dateParts[2]}`);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const finalDateString = `${dayName}, ${formattedDate}`;

        if (!weeks[weekStartKey]) {
            weeks[weekStartKey] = {
                weekStartDate: weekStartKey,
                days: []
            };
        }
        
        let dayEntry = weeks[weekStartKey].days.find(d => d.date === finalDateString);
        
        if (!dayEntry) {
            dayEntry = { date: finalDateString, classes: [] };
            weeks[weekStartKey].days.push(dayEntry);
        }

        dayEntry.classes.push({
            moduleCode: cls.moduleCode,
            moduleName: cls.moduleName,
            time: cls.time,
            location: cls.location,
            isOnline: cls.isOnline,
            lecturer: cls.lecturer,
            campus: cls.campus
        });
    });

    // Sort days within each week
    Object.values(weeks).forEach(week => {
        week.days.sort((a, b) => parseJsonDate(a.date).getTime() - parseJsonDate(b.date).getTime());
    });

    // Sort weeks
    const sortedWeeks = Object.values(weeks).sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate));

    return { weeks: sortedWeeks };
}

// --- API Endpoint 1: Fetch Timetable Data ---
app.get('/api/timetable', async (req, res) => {
    try {
        const classesCollection = db.collection('classes');
        // Fetch all classes from MongoDB
        const allClasses = await classesCollection.find({}).toArray();

        // Convert the flat list of classes into the required grouped/nested format
        const formattedData = formatTimetableData(allClasses);

        res.json(formattedData);
    } catch (error) {
        console.error("Error fetching timetable data:", error);
        res.status(500).json({ message: "Internal server error during data retrieval." });
    }
});

// --- API Endpoint 2: Add New Class ---
app.post('/api/add-class', async (req, res) => {
    try {
        const newClass = req.body;
        
        // Basic Validation
        if (!newClass.moduleCode || !newClass.date || !newClass.time || !newClass.location) {
            return res.status(400).json({ message: "Missing required class fields." });
        }
        
        // Data structure cleanup before insertion
        const classToInsert = {
            moduleCode: newClass.moduleCode,
            moduleName: newClass.moduleName || 'TBA',
            lecturer: newClass.lecturer || 'TBA',
            date: newClass.date, // Format: YYYY-MM-DD
            time: newClass.time, // Format: HH:MM - HH:MM
            location: newClass.location,
            isOnline: newClass.isOnline,
            campus: newClass.campus || 'APU',
            createdAt: new Date()
        };

        const classesCollection = db.collection('classes');
        const result = await classesCollection.insertOne(classToInsert);

        console.log(`Class added with _id: ${result.insertedId}`);
        res.status(201).json({ message: "Class added successfully!", id: result.insertedId });

    } catch (error) {
        console.error("Error inserting new class:", error);
        res.status(500).json({ message: "Internal server error during data insertion." });
    }
});

// Start the server only after successfully connecting to the database
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log("Client should access the Timetable at: http://localhost:3000/timetable.html");
    });
});
