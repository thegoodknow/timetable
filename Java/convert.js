 // Global utility functions for the UI
        const jsonOutput = document.getElementById('jsonOutput');
        const downloadButton = document.getElementById('downloadButton');
        const messageBox = document.getElementById('messageBox');
        const fileInput = document.getElementById('fileInput');
        const convertButton = document.getElementById('convertButton');

        // Login/View Elements
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');
        const loginMessage = document.getElementById('login-message');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const mobileWarning = document.getElementById('mobile-warning');

        // Store the file content globally after selection
        let fileContent = null; 

        // --- AUTHENTICATION CONSTANTS ---
        const CORRECT_USERNAME = 'admin';
        const CORRECT_PASSWORD = 'admin123';
        // ---------------------------------


        // MAPPING: Used to look up module name based on the module code prefix.
        const MODULE_MAPPING = {
            'AAQS038': 'MATHEMATICS AND STATISTICS FOR COMPUTING',
            'ABUS007': 'ACADEMIC RESEARCH SKILLS',
            'AICT023': 'COMPUTER ARCHITECTURE',
            'MPU2132': 'BAHASA MELAYU KOMUNIKASI 1',
            'AICT016': 'DIGITAL THINKING AND INNOVATION',
            'MPU2112': 'APPRECIATION OF ETHICS AND CIVILIZATIONS'
            // Add more module codes and names here
        };

        // --- LOGIN/VIEW MANAGEMENT FUNCTIONS (MODIFIED FOR MOBILE SUPPORT) ---

        function showLoginMessage(text, type = 'error') {
            loginMessage.textContent = text;
            loginMessage.classList.remove('hidden', 'error', 'success');
            loginMessage.classList.add(type);
            loginMessage.style.display = 'block'; // Ensure visibility
            
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 3000);
        }

        function isMobile() {
            // MODIFIED: Always return false to bypass the device size restriction
            return false; 
        }

        function showApp() {
            // 1. Hide the login container completely
            loginContainer.style.display = 'none'; 
            loginContainer.classList.add('hidden'); 

            // 2. Hide the mobile warning
            mobileWarning.style.display = 'none';

            // 3. Show the app container unconditionally
            appContainer.classList.remove('hidden');
            appContainer.style.display = 'flex'; // Use flex for column layout
            appContainer.classList.add('show-app'); 
            
            // 4. Adjust body classes for the full app view
            document.body.classList.remove('min-h-screen-center'); 
            document.body.style.padding = '0'; // Remove centering padding
        }

        function handleLogin(event) {
            event.preventDefault();
    
            // ADD THIS LINE: Clear any previous message when the user attempts a new login
            loginMessage.style.display = 'none'; 
    
        const user = usernameInput.value;
        const pass = passwordInput.value;

        if (user === CORRECT_USERNAME && pass === CORRECT_PASSWORD) {
                showApp();
            } else {
                showLoginMessage('Invalid username or password.', 'error');
                passwordInput.value = '';
            }
        }
        
        // --- Initialize view on page load ---
        function initializeView() {
            // Since we are no longer restricting by size, just show the login container.
            loginContainer.style.display = 'flex'; // Use flex for centering
            mobileWarning.style.display = 'none';
            document.body.classList.add('min-h-screen-center');
        }

        // Run initialization function when the script loads
        window.addEventListener('load', initializeView);
        // Note: The 'resize' listener is effectively irrelevant now, but can be kept
        // window.addEventListener('resize', initializeView);


        // --- FILE HANDLING AND CONVERSION FUNCTIONS ---

        // Step 1: Store the file content when a file is selected
        function storeFile(event) {
            const file = event.target.files[0];
            fileContent = null; // Clear previous content
            convertButton.disabled = true;

            // Clear output and disable download button on new file selection
            jsonOutput.value = ''; 
            downloadButton.disabled = true;

            if (!file) {
                 showMessage("File selection cancelled.", 'error');
                 return;
            }

            // Simple check based on extension/type
            if (file.type !== 'text/html' && !file.name.toLowerCase().endsWith('.html')) {
                showMessage("Please select a valid HTML file.", 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                fileContent = e.target.result;
                convertButton.disabled = false; // Enable conversion button
                showMessage(`File selected: ${file.name}. Click 'Convert to JSON' to process.`, 'success');
            };
            reader.onerror = function(e) {
                showMessage("Error reading file.", 'error');
                console.error("File reading error:", e);
            };
            reader.readAsText(file);
        }

        // Step 2: Trigger conversion when the button is pressed
        function triggerConversion() {
            if (fileContent) {
                convertHtmlToJson(fileContent);
            } else {
                showMessage("Please select an HTML file first.", 'error');
            }
        }

        function showMessage(text, type = 'success') {
            const currentMessageBox = document.getElementById('messageBox');
            currentMessageBox.innerHTML = text; // Use innerHTML for potential bolding
            currentMessageBox.classList.remove('hidden', 'error', 'success');
            currentMessageBox.classList.add('message-box', type);
            currentMessageBox.style.display = 'block';
            
            setTimeout(() => {
                currentMessageBox.style.display = 'none';
            }, 5000);
        }

        /**
         * Converts a date string like "Mon, 08-Dec-2025" to a Date object representing the
         * previous Sunday (the start of the week).
         */
        function calculateWeekStart(dateStr) {
            const parts = dateStr.split(', ')[1];
            if (!parts) return null;

            const [dayStr, monthName, yearStr] = parts.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthIndex = monthNames.indexOf(monthName);

            if (monthIndex === -1) return null;

            // Create a Date object for the extracted date (e.g., Monday, 08 Dec 2025)
            const day = parseInt(dayStr, 10);
            const year = parseInt(yearStr, 10);
            const extractedDate = new Date(year, monthIndex, day);
            
            if (isNaN(extractedDate.getTime())) return null;

            // Calculate the preceding Sunday (dayOfWeek=0 for Sunday)
            const dayOfWeek = extractedDate.getDay(); 
            const sundayDate = new Date(extractedDate);
            // Subtract (dayOfWeek - 0) days. If Monday (1), subtract 1. If Sunday (0), subtract 0.
            sundayDate.setDate(extractedDate.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek - 0)); 
            
            return sundayDate;
        }

        /**
         * Formats a Date object into "YYYY-MM-DD".
         */
        function formatDateToISO(dateObj) {
            if (!dateObj) return 'N/A';
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        /**
         * Extracts the module code prefix (e.g., 'AAQS038') from the full subject string.
         */
        function getModuleCodePrefix(subject) {
            // Look for any combination of uppercase letters and numbers at the start
            const match = subject.match(/^([A-Z0-9]+)/); 
            return match ? match[1] : null;
        }

        /**
         * Parses the raw HTML content and converts it into the desired JSON format.
         */
        function convertHtmlToJson(htmlContent) {
            htmlContent = htmlContent.trim();
            jsonOutput.value = '';
            downloadButton.disabled = true;
            convertButton.disabled = true; // Disable button while processing

            if (!htmlContent) {
                showMessage("No HTML content loaded.", 'error');
                convertButton.disabled = false;
                return;
            }

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');

                // 1. Extract Header Information
                let weekStartDate = 'N/A';
                
                // Find the cell containing the first day's date (e.g., "Mon, 08-Dec-2025")
                const firstDayCell = doc.querySelector('table.table tbody tr:not(.thead-dark) td:first-child');
                if (firstDayCell) {
                    const firstDateStr = firstDayCell.textContent.trim();
                    const sundayDateObj = calculateWeekStart(firstDateStr);
                    
                    if (sundayDateObj) {
                        weekStartDate = formatDateToISO(sundayDateObj);
                    }
                }
                
                // 2. Extract Timetable Rows
                const rows = doc.querySelectorAll('table.table tbody tr');
                
                let days = [];
                let currentDay = null;

                // 3. Process Data Rows
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');

                    // Check for minimum cell count and skip header rows
                    if (cells.length < 6 || row.classList.contains('thead-dark')) {
                        return; 
                    }
                    
                    const dayData = cells[0].textContent.trim(); 
                    const time = cells[1].textContent.trim();
                    const location = cells[2].textContent.trim(); 
                    const campus = cells[3].textContent.trim(); 
                    let subject = cells[4].textContent.trim();
                    const lecturer = cells[5].textContent.trim();

                    if (!subject || subject.toUpperCase() === 'BREAK' || !time) {
                        return;
                    }

                    // Derived Fields Logic
                    
                    // 1. Module Code and Name
                    const moduleCodeMatch = subject.match(/^([A-Z0-9-]+)/);
                    let moduleCode = moduleCodeMatch ? moduleCodeMatch[1] : subject;
                    
                    const moduleCodePrefix = getModuleCodePrefix(moduleCode);
                    const moduleName = MODULE_MAPPING[moduleCodePrefix] || 'UNKNOWN MODULE NAME';

                    // 2. isOnline
                    const isOnline = subject.toLowerCase().includes('(online)') || location.toLowerCase().startsWith('onl');
                    
                    // Clean up module code (remove the redundant (Online) suffix)
                    let finalModuleCode = moduleCode.replace(' (Online)', '').trim();
                    
                    // 3. Class Type
                    let classType = 'Lecture';
                    const typeMatch = finalModuleCode.match(/-([LT]|LAB)-/i);
                    if (typeMatch) {
                        const typeChar = typeMatch[1].toUpperCase();
                        if (typeChar === 'L') classType = 'Lecture';
                        else if (typeChar === 'T') classType = 'Tutorial';
                        else if (typeChar === 'LAB') classType = 'Lab';
                    } else if (location.toLowerCase().includes('lab')) {
                        classType = 'Lab';
                    }

                    // 4. Replacement Fields (Assuming all are false/empty for standard timetable)
                    const isReplacement = false;
                    const replacementType = "";
                    const isTest = false;
                    const testType = "";

                    const newClass = {
                        moduleCode: finalModuleCode,
                        moduleName: moduleName,
                        time: time,
                        location: location,
                        campus: campus,
                        lecturer: lecturer,
                        isOnline: isOnline,
                        classType: classType,
                        isReplacement: isReplacement,
                        replacementType: replacementType,
                        isTest: isTest,
                        testType: testType
                    };

                    // Group classes by day
                    if (currentDay !== dayData) {
                        days.push({
                            date: dayData,
                            classes: [newClass]
                        });
                        currentDay = dayData;
                    } else if (days.length > 0) {
                        days[days.length - 1].classes.push(newClass);
                    }
                });

                // 4. Construct the Final JSON Object
                const finalJson = {
                    weekStartDate: weekStartDate,
                    days: days
                };

                // 5. Display the output
                const jsonString = JSON.stringify(finalJson, null, 2);
                jsonOutput.value = jsonString;
                downloadButton.disabled = days.length === 0;
                convertButton.disabled = false; // Re-enable button after processing
                showMessage("Conversion successful! JSON data is ready to download.", 'success');

            } catch (e) {
                console.error("Parsing error:", e);
                convertButton.disabled = false; // Re-enable button on error
                showMessage(`Error parsing HTML. Details: ${e.message}`, 'error');
            }
        }

        // --- DOWNLOAD JSON FUNCTION ---

        function downloadJson() {
            const jsonString = jsonOutput.value;
            if (!jsonString) {
                showMessage("No JSON output available to download.", 'error');
                return;
            }

            try {
                const jsonObject = JSON.parse(jsonString);
                const weekDate = jsonObject.weekStartDate;
                
                // Filename uses the Sunday date
                let filename = "timetable_converted.json";
                if (weekDate && weekDate !== 'N/A') {
                    filename = `timetable_${weekDate}.json`;
                }

                // Create a Blob from the JSON string
                const blob = new Blob([jsonString], { type: 'application/json' });
                
                // Create a temporary link element for the download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                
                // Programmatically click the link to trigger the download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Clean up the URL object

                showMessage(`Successfully downloaded as <b>${filename}</b>!`, 'success');

            } catch (e) {
                console.error("Download error:", e);
                showMessage("Error during JSON download or filename parsing.", 'error');
            }
        }