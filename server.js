const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // ✅ Use Render's dynamic port

const appointmentsFile = path.join(__dirname, 'appointments.json');
const complaintsFile = path.join(__dirname, 'complaints.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Basic Auth Middleware ---
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required.');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === 'hospital' && password === '1234') {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Invalid credentials.');
  }
}

// --- Routes ---

// Health check (for Render uptime checks)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root route → serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index1.html'));
});

// Serve hospital dashboard page
app.get('/hospital', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'hospital.html'));
});

// Get all appointments (hospital view, requires auth)
app.get('/appointments', auth, (req, res) => {
  try {
    const data = fs.existsSync(appointmentsFile)
      ? JSON.parse(fs.readFileSync(appointmentsFile))
      : [];
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read appointments.' });
  }
});

// Add new appointment (patient booking)
app.post('/appointments', (req, res) => {
  try {
    const data = fs.existsSync(appointmentsFile)
      ? JSON.parse(fs.readFileSync(appointmentsFile))
      : [];

    const { name, email, phone, doctor, date, message } = req.body;

    if (!name || !email || !phone || !doctor || !date) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }

    const todaysAppointments = data.filter(a => a.date === date && a.doctor === doctor);
    const queueNumber = todaysAppointments.length + 1;

    const newAppointment = { name, email, phone, doctor, date, message, queueNumber };
    data.push(newAppointment);

    fs.writeFileSync(appointmentsFile, JSON.stringify(data, null, 2));
    res.json({ success: true, queueNumber });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save appointment.' });
  }
});

// Add new complaint
app.post('/complaints', (req, res) => {
  try {
    let complaints = [];
    if (fs.existsSync(complaintsFile)) {
      complaints = JSON.parse(fs.readFileSync(complaintsFile));
    }

    complaints.push(req.body);
    fs.writeFileSync(complaintsFile, JSON.stringify(complaints, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save complaint.' });
  }
});

// ✅ Start server (with 0.0.0.0 for Render)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
