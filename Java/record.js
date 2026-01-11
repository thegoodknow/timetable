const SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE";

        function showPreview() {
            const val = document.getElementById('item').value;
            document.getElementById('preview-value').innerText = val;
            document.getElementById('preview-modal').style.display = 'flex';
        }

        function hidePreview() {
            document.getElementById('preview-modal').style.display = 'none';
        }

        async function sendData() {
            const item = document.getElementById('item').value;
            const confirmBtn = document.getElementById('confirmBtn');
            const statusDiv = document.getElementById('status-message');
            const formDiv = document.getElementById('form-container');
            
            confirmBtn.disabled = true;
            confirmBtn.innerText = "Processing...";

            try {
                // Use the POST method to send data to Google Apps Script
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Apps Script requires no-cors for simple redirects
                    body: JSON.stringify({ "selection": item })
                });

                // Since 'no-cors' doesn't let us read the response body, 
                // we assume success if no error is thrown.
                hidePreview();
                formDiv.style.display = "none";
                statusDiv.style.display = "block";
                document.getElementById('msg-text').innerText = "Recorded: " + item;
                
            } catch (error) {
                alert("Error sending data. Please try again.");
                confirmBtn.disabled = false;
                confirmBtn.innerText = "Confirm & Send";
            }
        }