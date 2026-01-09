document.addEventListener('DOMContentLoaded', () => {

        // --- Helper Functions ---
        function makeUniqueId(weekStart, dayDate, time, moduleCode) {
            return `${weekStart}___${dayDate}___${time}___${moduleCode}`;
        }

        // FIX #1: Added check for invalid date parsing to prevent using an 'Invalid Date' object later.
        function parseJsonDate(dateStr) {
            // Converts "Day, DD-Month-YYYY" to a Date object
            if (typeof dateStr !== 'string') return new Date(0);
            
            const datePart = dateStr.includes(',') ? dateStr.split(', ')[1] : dateStr;
            const parts = datePart.split('-');
            
            if (parts.length !== 3) return new Date(0); // Ensure format is correct
            
            const [dayNum, monthStr, yearStr] = parts;
            
            // Reconstruct as 'Month DD, YYYY' for better cross-browser compatibility
            const d = new Date(`${monthStr} ${dayNum}, ${yearStr}`); 

            // Return a default date if parsing fails (e.g., unrecognized month name)
            if (isNaN(d.getTime())) return new Date(0); 

            return d; 
        }

        // FIX #2: Enhanced robustness in parseTime to handle null/undefined inputs and missing separators.
        function parseTime(time, isStart) {
            // Must be a string AND contain the range separator "-"
            if (typeof time !== 'string' || !time.includes("-")) { 
                return { hour: 0, minute: 0 };
            }
            
            const parts = time.split(" - ");
            // Use logical OR to ensure 'str' is at least an empty string if split failed
            const str = isStart ? (parts[0] || '') : (parts[1] || '');
            
            // Ensure the time part contains the hour:minute separator ":"
            if (!str.includes(":")) {
                 return { hour: 0, minute: 0 };
            }
            
            const [h, m] = str.split(":");
            return { hour: +h, minute: +m };
        }
        
        const formatYYYYMMDD = d => d.toISOString().slice(0,10);
        function getMondayOf(date) {
            const c = new Date(date);
            const d = c.getDay(); // 0 = Sunday, 1 = Monday
            // If Sunday (0), go back 6 days (-6). Otherwise, go back d-1 days.
            const diff = d === 0 ? -6 : 1 - d; 
            c.setDate(c.getDate() + diff);
            c.setHours(0,0,0,0);
            return c;
        }

        // --- DOM Elements & Global State ---
        const timetableList = document.getElementById('timetable-list');
        const weekSelect = document.getElementById('week-select');
        const currentClock = document.getElementById('current-clock');
        const nextClassDisplay = document.getElementById('next-class-display');

        let allWeeks = [];
        let currentWeekStart = ''; 
        let allWeekData = {};
        let currentClassUniqueId = null;
        let lastLoadDate = new Date(); 

        // --- Real-time Logic (Finds current and next class from loaded data) ---

        function findCurrentAndNextClass(data) {
            const now = new Date();
            const nowMidnight = new Date(now);
            nowMidnight.setHours(0,0,0,0);

            let nextClass = null;
            let currentClass = null;
            let bestDiff = Infinity;

            for (const weekStart in data) {
                if (!data.hasOwnProperty(weekStart)) continue;

                for (const dayObj of data[weekStart]) {
                    const classDate = parseJsonDate(dayObj.date);
                    const classDateMidnight = new Date(classDate);
                    classDateMidnight.setHours(0,0,0,0);
                    
                    if (classDateMidnight < nowMidnight) continue; 

                    for (const cls of dayObj.classes) {
                        
                        cls.uniqueId = makeUniqueId(weekStart, dayObj.date, cls.time, cls.moduleCode);

                        // FIX #3: The crucial fix for the Uncaught TypeError.
                        // Ensure cls.time is a string and contains the required time separator before parsing.
                        if (typeof cls.time !== 'string' || !cls.time.includes(" - ")) continue;

                        const st = parseTime(cls.time, true);
                        const et = parseTime(cls.time, false);

                        const start = new Date(classDate);
                        start.setHours(st.hour, st.minute, 0, 0);

                        const end = new Date(classDate);
                        end.setHours(et.hour, et.minute, 0, 0);

                        // 1. Current Class Check (must be today)
                        if (classDateMidnight.getTime() === nowMidnight.getTime()) {
                            if (now >= start && now < end) {
                                currentClass = { ...cls, fullDate: start, endTime: end };
                            }
                        }

                        // 2. Next Class Check (must be in the future, within 24 hours)
                        if (start > now) {
                            const diff = start - now;
                            
                            if (diff < 24 * 60 * 60 * 1000) { 
                                if (diff < bestDiff) {
                                    bestDiff = diff;
                                    nextClass = { ...cls, fullDate: start };
                                }
                            }
                        }
                    }
                }
            }
            return { currentClass, nextClass };
        }

        function updateClock() {
            const now = new Date();
            currentClock.textContent = now.toLocaleTimeString("en-US");

            // Timetable content is now always visible since login is removed
            const { currentClass, nextClass } = findCurrentAndNextClass(allWeekData);

            let html = `<span class="material-icons">alarm</span>`;

            if (currentClass) {
                currentClassUniqueId = currentClass.uniqueId;
                const remaining = currentClass.endTime - now;
                const m = Math.floor(remaining/60000);
                const s = Math.floor((remaining%60000)/1000);

                html = `
                    <span class="material-icons" style="color:var(--color-current)">play_arrow</span>
                    <span style="color:var(--color-current);font-weight:700">TIME UNTIL CLASS END: (${m}m ${s}s)</span>
                    | Current Class: ${currentClass.moduleCode || 'CODE'} in ${currentClass.location || 'LOC'}
                `;
            }
            else if (nextClass) {
                currentClassUniqueId = null;

                const diff = nextClass.fullDate - now;
                const h = Math.floor(diff/3600000);
                const m = Math.floor((diff%3600000)/60000);
                const s = Math.floor((diff%60000)/1000);

                const timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
                const datePart = nextClass.fullDate.toLocaleDateString('en-US', { weekday: 'short' });
                const codeLoc = `${nextClass.moduleCode || 'CODE'} at ${nextClass.location || 'LOC'}`;

                html += `
                    <span style="color:var(--color-primary)">Time until next class: ${timeStr} </span>
                     | Next Class: ${codeLoc} (${datePart})
                `;
            }
            else {
                currentClassUniqueId = null;
                html += `（⊙ｏ⊙）Oops! Looks like there is no upcoming classes within 24h from now.`;
            }

            nextClassDisplay.innerHTML = html;
            applyCurrentClassHighlighting();
            checkAndReloadDaily();
        }


        function applyCurrentClassHighlighting() {
            document.querySelectorAll('.class-card.current-class').forEach(e=>e.classList.remove('current-class'));

            if (currentClassUniqueId) {
                const el = document.querySelector(`[data-unique-id="${currentClassUniqueId}"]`);
                if (el) {
                    el.classList.add('current-class');
                    if (weekSelect.value === '__TODAY__') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }
        
        function checkAndReloadDaily() {
            const now = new Date();
            const lastLoadMidnight = new Date(lastLoadDate);
            lastLoadMidnight.setHours(0, 0, 0, 0);
            const nowMidnight = new Date(now);
            nowMidnight.setHours(0, 0, 0, 0);

            if (nowMidnight.getTime() > lastLoadMidnight.getTime()) {
                console.log("New day detected. Reloading timetable data.");
                fetchAllWeeks();
            }
        }

        // --- Data Fetching and Rendering ---

        async function fetchAllWeeks() {
            timetableList.innerHTML = `<p style="padding:30px;text-align:center;color:var(--text-subtle)">Loading week data...</p>`;
            
            const now = new Date();
            const paths = [];
            
            // Generate paths for (-1, 0, +1, +2) weeks
            [-1, 0, 1, 2].forEach(off=>{
                const m = getMondayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + off*7));
                paths.push(`../timetable/${formatYYYYMMDD(m)}.json`);
            });

            const results = await Promise.all(paths.map(p =>
                fetch(p).then(r => r.ok ? r.json() : null).catch(()=>null)
            ));

            allWeekData = {};
            allWeeks = [];

            results.forEach(j=>{
                if (j && j.weekStartDate) {
                    allWeekData[j.weekStartDate] = j.days;
                    allWeeks.push(j.weekStartDate);
                }
            });

            lastLoadDate = new Date();
            
            allWeeks.sort((a,b)=>new Date(a)-new Date(b));
            updateWeekSelect();

            const initialSelection = weekSelect.value || "__TODAY__";
            weekSelect.value = initialSelection;
            renderTimetable(initialSelection);
        }

        function updateWeekSelect() {
            const currentSelection = weekSelect.value;
            weekSelect.innerHTML = `
                <option value="__TODAY__">Today</option>
                <option value="__TOMORROW__">Tomorrow</option>
            `;

            allWeeks.forEach(w=>{
                const d = new Date(w);
                const e = new Date(d); e.setDate(e.getDate()+6);
                const startStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                const option = document.createElement('option');
                option.value = w;
                option.textContent = `Week: ${startStr} - ${endStr}`;
                if (w === currentSelection) option.selected = true;
                
                weekSelect.appendChild(option);
            });
            
            if (currentSelection === '__TODAY__' || currentSelection === '__TOMORROW__') {
                 weekSelect.value = currentSelection;
            } else if (!weekSelect.value && allWeeks.length > 0) {
                 weekSelect.value = '__TODAY__';
            }
        }

        function renderTimetable(key) {
            let days = [];

            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

            if (key==="__TODAY__" || key==="__TOMORROW__") {
                const target = key==="__TODAY__"?today:tomorrow;
                let foundDay = null;
                let foundWeekStart = null;
                
                for (const w in allWeekData) {
                    if (!allWeekData.hasOwnProperty(w)) continue;
                    
                    foundDay = allWeekData[w].find(d=>{
                        const dd = parseJsonDate(d.date);
                        dd.setHours(0,0,0,0);
                        return dd.getTime() === target.getTime();
                    });
                    if (foundDay) {
                        foundWeekStart = w;
                        break; // Stop searching once the day is found (Efficiency fix)
                    }
                }

                if (foundDay) {
                    currentWeekStart = foundWeekStart; 
                    days = [foundDay];
                } else {
                    timetableList.innerHTML = `<div class="day-header">${key==="__TODAY__"?"Today":"Tomorrow"}</div><p style="padding:20px;color:var(--text-subtle);text-align:center">(●ˇ∀ˇ●) Ooo! Looks like there is no classes scheduled for today</p>`;
                    applyCurrentClassHighlighting();
                    return;
                }
            }
            else {
                days = allWeekData[key] || [];
                currentWeekStart = key;
            }

            let html = "";

            days.forEach(day=>{
                const dd = parseJsonDate(day.date);
                const isToday = dd.toDateString() === new Date().toDateString();

                html += `<div class="day-header">${day.date}${isToday?" (TODAY)":""}</div>`;

                if (day.classes.length === 0) {
                    html += `<div class="class-card" style="padding: 10px; color: var(--text-subtle); font-style: italic;">(●ˇ∀ˇ●) Yay! There is no classes scheduled on this day.</div>`;
                    return;
                }
                
                day.classes.forEach(cls=>{
                    const uid = makeUniqueId(currentWeekStart, day.date, cls.time, cls.moduleCode);
                    const isReplacement = cls.isReplacement || false;
                    const isOnline = cls.isOnline || false;
                    
                    const moduleCode = cls.moduleCode || 'CODE';
                    const moduleName = cls.moduleName || 'MODULE NAME MISSING';
                    const time = cls.time || 'TBD';
                    const location = cls.location || 'TBC';
                    const lecturerName = cls.lecturer || 'Staff TBC'; 
                    const classType = cls.classType || 'Class'; 
                    
                    // --- DURATION CALCULATION ---
                    let durationString = 'Duration TBD';
                    if (typeof cls.time === 'string' && cls.time.includes(" - ")) {
                        const st = parseTime(cls.time, true);
                        const et = parseTime(cls.time, false);
                        
                        // Convert to total minutes
                        const startMinutes = st.hour * 60 + st.minute;
                        const endMinutes = et.hour * 60 + et.minute;
                        let durationMinutes = endMinutes - startMinutes;

                        // Handle negative duration (e.g., class starts at 23:00 and ends at 01:00 the next day)
                        if (durationMinutes < 0) {
                            durationMinutes += 24 * 60; 
                        }

                        const durationHours = Math.floor(durationMinutes / 60);
                        const durationMins = durationMinutes % 60;
                        
                        durationString = '';
                        if (durationHours > 0) {
                            durationString += `${durationHours}hr`;
                        }
                        if (durationMins > 0) {
                            if (durationHours > 0) durationString += ' ';
                            durationString += `${durationMins}min`;
                        }
                        if (durationString === '') {
                             durationString = '0 min';
                        }
                    }
                    // --- END DURATION CALCULATION ---

                    let modalityIcon;
                    let modalityPill = '';
                    
                    if (isReplacement) {
                        modalityIcon = `<span class="material-icons replacement-icon">event_note</span>`;
                        const type = cls.replacementType ? cls.replacementType.toUpperCase() : 'CLASS';
                        modalityPill = `<span class="pill replacement-tag">REPLACEMENT ${type} CLASS</span>`;
                    }
                    else if (isOnline) {
                        modalityIcon = `<span class="material-icons online-icon">laptop_chromebook</span>`;
                        modalityPill = `<span class="pill online-tag">Online</span>`;
                    } else {
                        modalityIcon = `<span class="material-icons inperson-icon">room</span>`;
                        modalityPill = ``; 
                    }

                    html += `
                        <div class="class-card ${isToday?"today":""}" data-unique-id="${uid}">
                            <div class="card-title">
                                ${modalityIcon}
                                ${moduleCode} - ${moduleName} ${modalityPill}
                            </div>
                            <div class="card-subtitle">${lecturerName} (${classType})</div>
                            <div class="card-details">
                                <span class="card-detail-item">
                                    <span class="material-icons">schedule</span>
                                    ${time}
                                </span>
                                <span class="card-detail-item">
                                    <span class="material-icons">timer</span>
                                    ${durationString}
                                </span>
                                <span class="card-detail-item">
                                    <span class="material-icons">location_on</span>
                                    ${location}
                                </span>
                            </div>
                        </div>
                    `;
                });
            });

            timetableList.innerHTML = html;
            applyCurrentClassHighlighting();
        }

        // --- Initialization ---

        function initializeApp() {
            weekSelect.addEventListener("change", e => renderTimetable(e.target.value));
            fetchAllWeeks();
        }
        
        // Start the application immediately since login is removed
        initializeApp();
        setInterval(updateClock, 1000); 
    });