document.addEventListener('DOMContentLoaded', () => {

    // --- Department Operating Hours Configuration (The existing array DEPARTMENTS is here) ---
    const DEPARTMENTS = [
        // ... (Your existing DEPARTMENTS array content)
        { 
            name: "Admin", 
            shop: false,
            schedule: [ 
                { days: [1, 2, 3, 4, 5], start: { h: 8, m: 30 }, end: { h: 18, m: 0 } },
            ] 
        },
        { 
            name: "Cashier", 
            shop: false,
            schedule: [ 
                { days: [1, 2, 3, 4, 5], start: { h: 9, m: 15 }, end: { h: 18, m: 0 } } 
            ] 
        },
        { 
            name: "Clinic", 
            shop: false,
            schedule: [ 
                { days: [1, 2, 3, 4, 5], start: { h: 9, m: 0 }, end: { h: 17, m: 0 } }
            ] 
        },
        { 
            name: "Student Service", 
            shop: false,
            schedule: [ 
                { days: [1, 2, 3, 4, 5], start: { h: 8, m: 30 }, end: { h: 19, m: 0 } },
                { days: [6], start: { h: 8, m: 30 }, end: { h: 13, m: 0 } }
            ]
        },
        { 
            name: "Library", 
            shop: false,
            schedule: [ 
                { days: [1, 2, 3, 4, 5], start: { h: 8, m: 30 }, end: { h: 19, m: 0 } },
                { days: [6], start: { h: 9, m: 0 }, end: { h: 13, m: 0 } }
            ] 
        },
        { 
            name: "Technology Labs", 
            shop: false,
            schedule: [
                { days: [1, 2, 3, 4, 5], start: { h: 8, m: 30 }, end: { h: 19, m: 0 } },
                { days: [6], start: { h: 9, m: 0 }, end: { h: 13, m: 0 } }
            ]
        },
        { 
            name: "Bila-Bila Mart", 
            shop: true,
            schedule: [
                { days: [1,2,3,4,5,6,0], start: { h: 7, m: 0 }, end: { h: 23, m: 59 } }
            ] 
        },
        { 
            name: "TS Convenience Store",
            shop: true, 
            schedule: [ 
                { days: [1,2,3,4,5,6,0], start: { h: 7, m: 30 }, end: { h: 20, m: 30 } }
            ]
        }
    ];
    
    const CLOSING_SOON_THRESHOLD_MINUTES = 30;
    const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    const currentClock = document.getElementById('current-clock');
    const departmentStatusDisplay = document.getElementById('next-class-display');
    const departmentsList = document.getElementById('departments-list');

    // =========================================================================
    // NEW FEATURE: Notification Logic
    // =========================================================================

    // Keep track of departments that have already been notified to prevent spam.
    const NOTIFIED_DEPARTMENTS = new Set(); 

    /**
     * Request browser notification permission if not granted.
     */
    function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }
    
    /**
     * Sends a browser notification for a department closing soon.
     * @param {string} title - The title of the notification.
     * @param {string} body - The body text of the notification.
     */
    function sendNotification(title, body) {
        if (Notification.permission === "granted") {
            new Notification(title, { body: body, icon: 'path/to/your/icon.png' }); // Change 'path/to/your/icon.png' if you have one
        }
    }


    // =========================================================================
    // End NEW FEATURE
    // =========================================================================


    // Utility formatting functions
    const formatTime = ({h, m}) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        const min = m.toString().padStart(2, '0');
        return `${hour}:${min} ${ampm}`;
    };

    function formatDaysDisplay(schedule) {
        return schedule.map(item => {
            const days = item.days.map(d => DAY_NAMES[d].substring(0,3));
            let dayRange;

            if (item.days.length === 5 && item.days[0] === 1 && item.days[4] === 5) {
                dayRange = "Mon-Fri";
            } else if (item.days.length === 1) {
                dayRange = days[0];
            } else {
                dayRange = `${days[0]}-${days[days.length - 1]}`;
            }

            return `[${dayRange}]: ${formatTime(item.start)} - ${formatTime(item.end)}`;
        }).join(' | ');
    }


    function getOperationTime(dept, now) {
        const day = now.getDay();
        return dept.schedule.find(s => s.days.includes(day)) || null;
    }

    function isDepartmentOpen(dept, now) {
        const sched = getOperationTime(dept, now);
        if (!sched) return false;

        const mins = now.getHours() * 60 + now.getMinutes();
        const openM = sched.start.h * 60 + sched.start.m;
        const closeM = sched.end.h * 60 + sched.end.m;

        return mins >= openM && mins < closeM;
    }

    function getNextOpeningTime(dept, now) {
    const currentDay = now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;

        const sched = dept.schedule.find(s => s.days.includes(checkDay));
        if (!sched) continue;

        const openM = sched.start.h * 60 + sched.start.m;

        // Today but not yet opened
        if (i === 0 && currentMins < openM) {
            return `Today at ${formatTime(sched.start)}`;
        }

        // Tomorrow
        if (i === 1) {
            return `Tomorrow at ${formatTime(sched.start)}`;
        }

        // Other days
        if (i > 1) {
            return `${DAY_NAMES[checkDay]} at ${formatTime(sched.start)}`;
        }
    }

    return "Indefinitely Closed";
}



    function updateDepartmentStatus() {
        const now = new Date();
        const openDepartments = [];
        const closingSoonDepartments = [];
        const fullyOpenDepartments = [];

        departmentsList.innerHTML = ''; 

        // Reset the notified set to allow new notifications after the closing window has passed
        const currentlyClosingSoon = new Set();

        DEPARTMENTS.forEach(dept => {
            let statusClass = 'closed-tag';
            let statusText = 'CLOSED';

            const currentSchedule = getOperationTime(dept, now);
            const isCurrentlyOpen = isDepartmentOpen(dept, now);

            if (isCurrentlyOpen) {
                const closingTime = new Date(now);
                closingTime.setHours(currentSchedule.end.h, currentSchedule.end.m, 0, 0);

                const timeRemainingMs = closingTime - now;
                const timeRemainingMins = Math.floor(timeRemainingMs / 60000);

                if (timeRemainingMins <= CLOSING_SOON_THRESHOLD_MINUTES) {
                    statusClass = 'closing-soon-tag';
                    statusText = `CLOSES IN ${timeRemainingMins}m`;
                    closingSoonDepartments.push(dept.name);
                    
                    // =========================================================
                    // NEW FEATURE: Notification Trigger
                    // =========================================================
                    
                    currentlyClosingSoon.add(dept.name);
                    
                    // Trigger notification only if it hasn't been sent yet for this specific closing window
                    if (!NOTIFIED_DEPARTMENTS.has(dept.name)) {
                        sendNotification(
                            `${dept.name} Closing Soon!`, 
                            `It will close in ${timeRemainingMins} minutes. Be quick!`
                        );
                        // Mark as notified
                        NOTIFIED_DEPARTMENTS.add(dept.name);
                    }
                    // =========================================================

                } else {
                    statusClass = 'open-tag';
                    statusText = 'OPEN';
                    fullyOpenDepartments.push(dept.name);
                }

                openDepartments.push(dept.name);
            }
            
            // Clean up: If a department was closing soon but is now closed or fully open, remove it from the notified set.
            if (!currentlyClosingSoon.has(dept.name) && NOTIFIED_DEPARTMENTS.has(dept.name)) {
                NOTIFIED_DEPARTMENTS.delete(dept.name);
            }

            let subtitleContent = formatDaysDisplay(dept.schedule);

            if (!isCurrentlyOpen) {
                const nextOpenTime = getNextOpeningTime(dept, now);
                subtitleContent += `<br/>Next Opening: <strong>${nextOpenTime}</strong>`;
            }

            const card = document.createElement('div');
            card.className = `class-card ${isCurrentlyOpen ? 'today' : ''}`;

            const pillHtml = `<span class="pill ${statusClass}">${statusText}</span>`;

        card.innerHTML = `
        <div class="card-title">
            <span class="material-icons inperson-icon">business</span>
            <span class="dept-name">${dept.name}</span>

            ${dept.shop ? `<span class="pill shop-tag">SHOP</span>` : ""}

            <span class="status-wrapper" style="margin-left:auto;">
                ${pillHtml}
            </span>
        </div>

        <div class="card-subtitle">
            ${subtitleContent}
        </div>
        `;



            departmentsList.appendChild(card);
        });

        // ---------- HEADER SUMMARY ----------
        let headerHtml = '';
        const green = '#28a745';
        const red = '#dc3545';
        const yellow = 'var(--color-current)';

        const allOpen = openDepartments.length === DEPARTMENTS.length;
        const allClosed = openDepartments.length === 0;

        if (allOpen) {
            headerHtml = `
                <span class="material-icons" style="color:${green}">check_circle</span>
                <span style="color:${green};font-weight:700">All departments are available</span>
            `;
        } else if (allClosed) {
            headerHtml = `
                <span class="material-icons" style="color:${red}">lock_clock</span>
                <span style="color:${red};font-weight:700">All departments are currently closed</span>
            `;
        } else {
            const closingSoonList = closingSoonDepartments.length > 0
                ? `<br><strong> Closing Department(s) Soon:</strong> ${closingSoonDepartments.join(', ')}`
                : '';

            const stillOpenList = fullyOpenDepartments.length > 0
                ? `<br><strong> Department(s) Available:</strong> ${fullyOpenDepartments.join(', ')}`
                : '';

            headerHtml = `
                <span class="material-icons" style="color:${yellow}">schedule</span>
                <span style="color:${yellow};font-weight:700">Some department are opening / closing soon... | </span>
                 ${closingSoonList} & 
                 ${stillOpenList}
            `;
        }

        departmentStatusDisplay.innerHTML = headerHtml;
    }


    function updateClock() {
        const now = new Date();
        currentClock.textContent = now.toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
        });
    }

    // ---------------- FIXED TIMERS ----------------

    // Update clock every second
    setInterval(updateClock, 1000);

    // Update department status every 30 seconds (NO MORE FREEZING)
    setInterval(updateDepartmentStatus, 30000);

    // Initial load
    updateClock();
    updateDepartmentStatus();
    
    // Request permission when the page loads
    requestNotificationPermission(); 
});