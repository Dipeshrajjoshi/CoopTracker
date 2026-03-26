const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const XLSX_FILE = path.join(__dirname, 'applications.xlsx');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Initialize Data File
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ applications: [], users: [] }, null, 2));
}

// Helper: Save to Excel
function saveToExcel(applications) {
    const ws = XLSX.utils.json_to_sheet(applications);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, XLSX_FILE);
}

// API: Get Data
app.get('/api/data', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

// API: Save Application
app.post('/api/applications', (req, res) => {
    const { application } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    
    // Check if updating or adding
    const index = data.applications.findIndex(a => a.id === application.id);
    if (index !== -1) {
        data.applications[index] = application;
    } else {
        data.applications.push(application);
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    saveToExcel(data.applications);
    res.json({ success: true, application });
});

// API: Delete Application
app.delete('/api/applications/:id', (req, res) => {
    const { id } = req.params;
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.applications = data.applications.filter(a => a.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    saveToExcel(data.applications);
    res.json({ success: true });
});

// API: Auth (Simple)
app.post('/api/auth/sync', (req, res) => {
    const { users } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.users = users; // Simple sync for now
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
    console.log(`Excel file: ${XLSX_FILE}`);
});
