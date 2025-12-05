// Global data store for the timetable
let timetableData = [];
let parserSandbox = document.getElementById('parser-sandbox');
let currentWeek = getCurrentWeekNumber();
let currentDayElement = null;

// --- Utility Functions ---

/**
 * Calculates the current week number.
 */
function getCurrentWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now - startOfYear;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
}

/**
 * Parses and cleans the fetched JSON data.
 * @param {Array} rawData - The array of timetable objects from the JSON file.
 */
function parseTimetable(rawData) {
    // Aggressively clean up the data after it's been structured (or parsed)
    const cleanedData = rawData.map(daySchedule => {
        // Ensure daySchedule has a classes array before trying to filter it
        if (!daySchedule.classes || !Array.isArray(daySchedule.classes)) {
             return { ...daySchedule, classes: [] };
        }
        
        // Filter out any classes that are missing the required 'time' property
        const validClasses = daySchedule.classes.filter(classInfo => 
            // Safety check: ensure classInfo is an object and has a time property that is a string
            classInfo && classInfo.time && typeof classInfo.time === 'string'
        );
        
        // Return the day schedule with only valid classes
        return {
            ...daySchedule,
            classes: validClasses
        };
    });
    
    return cleanedData;
}

/**
 * Renders the timetable cards for a specific week number.
 * Note: This function assumes timetableData has been populated.
 */
function renderTimetable(weekNum) {
    const container = document.getElementById('timetable-container');
    container.innerHTML = '';
    currentDayElement = null; 

    const displayData = timetableData;
    const today = new Date().toISOString().slice(0, 10);

    displayData.forEach(daySchedule => {
        if (daySchedule.classes.length === 0) return;

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
            
            if (classInfo.status === 'Current') {
                card.classList.add('current-class');
            } 

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

    if (currentDayElement) {
        currentDayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Updates the clock and finds the next upcoming class.
 * Includes the critical safety check for the 'split' error.
 */
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clock-display').textContent = timeString;

    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes(); 
    const todayDateStr = now.toISOString().slice(0, 10);
    let nextClass = "No upcoming classes found.";
    let foundNextClass = false;

    // Start iteration through the entire timetable
    for (let i = 0; i < timetableData.length; i++) {
        const daySchedule = timetableData[i];
        
        // Skip days that are already in the past
        if (daySchedule.date < todayDateStr) {
            continue;
        }

        let classesToConsider = [];

        if (daySchedule.date === todayDateStr) {
            // Filtering for classes on the current day that haven't started yet
            classesToConsider = daySchedule.classes.filter(classInfo => {
                // SAFETY CHECK: Prevents "Cannot read properties of undefined (reading 'split')"
                if (!classInfo || !classInfo.time) { 
                    return false; 
                }
                
                const startTimeStr = classInfo.time.split(' - ')[0]; 
                const [hour, minute] = startTimeStr.split(':').map(Number);
                const startTimeMinutes = hour * 60 + minute;
                
                // Only return classes that start strictly AFTER the current time
                return startTimeMinutes > currentTimeMinutes;
            });

        } else {
            // For future days, consider all classes (they are all upcoming)
            classesToConsider = daySchedule.classes;
        }

        // If we found any classes (either today or a future day)
        if (classesToConsider.length > 0) {
            // Sort by time to ensure we pick the earliest one
            classesToConsider.sort((a, b) => {
                // Ensure time property exists before splitting (though parseTimetable should handle this)
                const timeA = (a.time || '').split(' - ')[0];
                const timeB = (b.time || '').split(' - ')[0];
                return new Date('1970/01/01 ' + timeA) - new Date('1970/01/01 ' + timeB);
            });

            const nextClassInfo = classesToConsider[0];
            const dayLabel = daySchedule.date === todayDateStr ? "Today" : daySchedule.day;

            nextClass = `${dayLabel}: ${nextClassInfo.course} at ${nextClassInfo.time.split(' - ')[0]} (${nextClassInfo.location})`;
            foundNextClass = true;
            break; // Stop searching once the next class is found
        }
    }
    
    document.getElementById('next-class-info').textContent = nextClass;
}


/**
 * Initializes the application: loads data from JSON, sets up controls, and renders.
 */
async function initApp() {
    // 1. Fetch Data from external JSON file (PATH UPDATED for /timetable folder)
    try {
        const response = await fetch('timetable/timetable.json');
        
        if (!response.ok) {
            // Throw a specific error if the file wasn't found (e.g., 404)
            throw new Error(`HTTP error! status: ${response.status}. Ensure file is in 'timetable/timetable.json' and you are using a local server.`);
        }
        
        const rawTimetableData = await response.json();
        
        // 2. Load/Parse Data
        timetableData = parseTimetable(rawTimetableData);

        // 3. Setup Week Selector
        const weekSelect = document.getElementById('week-select');
        weekSelect.value = currentWeek;

        // Add event listener for week change
        weekSelect.addEventListener('change', (event) => {
            renderTimetable(parseInt(event.target.value));
        });

        // 4. Initial Render
        renderTimetable(currentWeek);

        // 5. Update Clock and Summary
        setInterval(updateClock, 1000);
        updateClock(); // Initial call
        
    } catch (error) {
        console.error("Could not load timetable data:", error);
        document.getElementById('next-class-info').textContent = "ERROR: See console for data loading issue.";
    }
}


// --- Execute on Load ---
document.addEventListener('DOMContentLoaded', initApp);