const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvhQrZqeN0Ljvj73GaGLJ4HqzobhqyGkKwsHwMs7ZxbnylFHQZpWi-0sYr3XwNF4zWVw/exec";

        function showPreview() {
            document.getElementById('preview-text').innerText = document.getElementById('item').value;
            document.getElementById('preview-modal').style.display = 'flex';
        }

        function hidePreview() {
            document.getElementById('preview-modal').style.display = 'none';
        }

        function sendData() {
            const itemValue = document.getElementById('item').value;
            const confirmBtn = document.getElementById('confirmBtn');
            const errorDisplay = document.getElementById('error-display');
            
            confirmBtn.disabled = true;
            confirmBtn.innerText = "Saving...";
            errorDisplay.style.display = "none";

            // Using fetch with the Proxy or direct GAS URL
            // Note: Directly hitting GAS from browser can trigger CORS. 
            // We use a simple trick: send data, and if the response is JSON, we read it.
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ "selection": itemValue }),
                mode: 'no-cors' // This allows the request to clear CORS, but limits response reading.
            })
            .then(() => {
                // Because 'no-cors' hides the actual JSON response body, 
                // we treat a completed request as success. 
                // To get EXACT error reasons, you'd need a backend proxy, 
                // but for GitHub-to-Google, this is the most stable flow:
                hidePreview();
                document.getElementById('form-container').style.display = "none";
                document.getElementById('success-display').style.display = "block";
            })
            .catch(err => {
                hidePreview();
                errorDisplay.style.display = "block";
                errorDisplay.innerText = "Network Error: " + err.message;
                confirmBtn.disabled = false;
            });
        }