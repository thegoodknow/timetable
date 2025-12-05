// --- All your JavaScript functions and logic will go here ---

// Global data store for the timetable
let timetableData = [];
let parserSandbox = document.getElementById('parser-sandbox');
let currentWeek = getCurrentWeekNumber();
let currentDayElement = null; // To store the currently focused day header

// --- Utility Functions ---

/**
 * Calculates the current week number relative to the start of the semester/year.
 * This is a simplified function and might need adjustment based on academic calendar.
 */
function getCurrentWeekNumber() {
    // Example: Assuming the semester starts on Week 1 of the year.
    // Replace with your actual semester start date logic if needed.
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now - startOfYear;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    // We add 1 to the result of Math.floor or Math.ceil based on how your academic calendar defines week 1.
    // Math.ceil is used here to ensure Week 1 starts immediately at the beginning of the year.
    return Math.ceil(diff / oneWeek);
}

/**
 * Parses the raw HTML string provided by the user into a structured Timetable array.
 * @param {string} rawHtml - The HTML content to parse.
 * @returns {Array<Object>} The structured timetable data.
 */
function parseTimetable(rawHtml) {
    // 
    // IMPORTANT: This is placeholder data. 
    // You will need to implement a robust parser function here 
    // that extracts data from 'rawHtml' or loads it from an actual source (e.g., JSON file).
    // 
    return [
        {
            day: "Monday", date: "2025-12-08", classes: [
                { time: "09:00 - 10:00", course: "Data Structures", type: "Lecture", location: "Online", status: "Current" },
                { time: "10:00 - 11:00", course: "Algorithms", type: "Tutorial", location: "F201" },
            ]
        },
        {
            day: "Tuesday", date: "2025-12-09", classes: [
                { time: "14:00 - 16:00", course: "Networking", type: "Practical", location: "L402", status: "Replacement" },
            ]
        },
        {
            day: "Wednesday", date: "2025-12-10", classes: [
                { time: "11:00 - 12:00", course: "Software Engineering", type: "Lecture", location: "Online" },
            ]
        },
        {
            day: "Thursday", date: "2025-12-11", classes: [
                { time: "14:00 - 15:00", course: "Database Management", type: "Tutorial", location: "S105" },
            ]
        },
        {
            day: "Friday", date: "2025-12-05", classes: [
                { time: "10:00 - 12:00", course: "Web Development", type: "Practical", location: "Lab A" },
            ]
        },
        {
            day: "Saturday", date: "2025-12-06", classes: []
        },
        {
            day: "Sunday", date: "2025-12-07", classes: []
        },
    ];
}

/**
 * Renders the timetable cards for a specific week number.
 * @param {number} weekNum - The week number to display.
 */
function renderTimetable(weekNum) {
    const container = document.getElementById('timetable-container');
    container.innerHTML = '';
    currentDayElement = null; // Reset current day tracker

    // In a real application, you would filter timetableData by weekNum
    const displayData = timetableData;

    const today = new Date().toISOString().slice(0, 10);

    displayData.forEach(daySchedule => {
        if (daySchedule.classes.length === 0) return; // Skip days with no classes

        // 1. Create Day Header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = `${daySchedule.day} (${new Date(daySchedule.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        dayHeader.id = `day-${daySchedule.day.toLowerCase()}`;
        container.appendChild(dayHeader);

        // Check if this is today
        if (daySchedule.date === today) {
            dayHeader.classList.add('today');
            currentDayElement = dayHeader;
        }

        // 2. Create Class Cards
        daySchedule.classes.forEach(classInfo => {
            const card = document.createElement('div');
            card.className = 'class-card';
            
            // Check for current class status
            if (classInfo.status === 'Current') {
                card.classList.add('current-class');
            } 

            // Determine icons and tags based on type and location
            const isOnline = classInfo.location.toLowerCase() === 'online';
            const isReplacement = classInfo.status === 'Replacement';
            let iconClass = isReplacement ? 'replacement-icon' : (isOnline ? 'online-icon' : 'inperson-icon');
            let iconName = isReplacement ? 'event_repeat' : (isOnline ? 'videocam' : 'location_on');
            let typeTag = `<span class="pill ${isOnline ? 'online-tag' : ''} ${isReplacement ? 'replacement-tag' : ''}">${isReplacement ? 'REPLACEMENT' : classInfo.type}</span>`;
            
            card.innerHTML = `
                <div class="card-title">
                    <span class="material-icons ${iconClass}">${iconName}</span>
                    ${classInfo.course}
                    ${typeTag}
                </div>
                <div class="card-subtitle">${classInfo.type} - Week ${weekNum}</div>
                <div class="card-details">
                    <div class="card-detail-item">
                        <span class="material-icons">schedule</span>
                        ${classInfo.time}
                    </div>
                    <div class="card-detail-item">
                        <span class="material-icons">${isOnline ? 'language' : 'meeting_room'}</span>
                        ${classInfo.location}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    });

    // Scroll to the current day header
    if (currentDayElement) {
        currentDayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Initializes the application: loads data, sets up controls, and renders.
 */
function initApp() {
    // 1. Placeholder: Load/Parse Data
    timetableData = parseTimetable(parserSandbox.innerHTML);

    // 2. Setup Week Selector
    const weekSelect = document.getElementById('week-select');
    weekSelect.value = currentWeek; // Set to the calculated current week

    // Add event listener for week change
    weekSelect.addEventListener('change', (event) => {
        renderTimetable(parseInt(event.target.value));
    });

    // 3. Initial Render
    renderTimetable(currentWeek);

    // 4. Update Clock and Summary (Simulated header component logic)
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.getElementById('clock-display').textContent = timeString;

        // Simplified Next Class Logic: Find the first class later than the current time
        const currentTime = now.getHours() * 60 + now.getMinutes(); 
        let nextClass = "No class today.";

        // Find today's schedule (Using the simplified Friday date of 2025-12-05 for current time context)
        const todaySchedule = timetableData.find(d => d.date === "2025-12-05"); 

        if (todaySchedule) {
            for (const classInfo of todaySchedule.classes) {
                // Parse start time (e.g., "10:00 - 12:00")
                const startTimeStr = classInfo.time.split(' - ')[0];
                const [hour, minute] = startTimeStr.split(':').map(Number);
                const startTime = hour * 60 + minute;

                if (startTime > currentTime) {
                    nextClass = `${classInfo.course} at ${startTimeStr} (${classInfo.location})`;
                    break;
                }
            }
        }
        document.getElementById('next-class-info').textContent = nextClass;
    }
    setInterval(updateClock, 1000);
    updateClock(); // Initial call
}


// --- Execute on Load ---
document.addEventListener('DOMContentLoaded', initApp);