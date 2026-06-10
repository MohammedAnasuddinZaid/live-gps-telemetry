const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const HOME = { lat: 17.420511, lng: 78.457354 };
const OFFICE = { lat: 17.332454, lng: 77.897044 };
const MAX_STOP_TIME_MS = 10 * 60 * 1000; 
const MAX_ALLOWED_DEV_KM = 1.5;         

const ROUTE_CHECKPOINTS = [
    HOME,
    { lat: 17.394000, lng: 78.345000 }, 
    { lat: 17.310000, lng: 78.130000 }, 
    { lat: 17.330000, lng: 77.980000 }, 
    OFFICE
];

let stopTimerStart = null;
let latestData = null;

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function isOffRoute(currentLat, currentLng) {
    let shortestDistance = Infinity;
    for (let cp of ROUTE_CHECKPOINTS) {
        let dist = getDistance(currentLat, currentLng, cp.lat, cp.lng);
        if (dist < shortestDistance) shortestDistance = dist;
    }
    return shortestDistance > MAX_ALLOWED_DEV_KM;
}

// Serve a direct HTML Map page to your browser when you open http://localhost:5000
app.get('/dashboard', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mom Live Tracker</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { margin: 0; display: flex; font-family: Arial; height: 100vh; }
            #sidebar { width: 300px; background: #222; color: white; padding: 20px; box-sizing: border-box; }
            #map { flex: 1; }
            .alert { background: red; color: white; padding: 15px; margin-top: 20px; font-weight: bold; border-radius: 5px; animation: blink 1s infinite; }
            @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        </style>
    </head>
    <body>
        <div id="sidebar">
            <h2>Mom's Commute</h2>
            <hr>
            <div id="stats"><p>Waiting for GPS ping...</p></div>
            <div id="alert-box"></div>
        </div>
        <div id="map"></div>

        <audio id="siren" src="https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" loop></audio>

        <script>
            const socket = io();
            const map = L.map('map').setView([17.4205, 78.4573], 11);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            let marker = null;
            const siren = document.getElementById('siren');

            socket.on('dashboard_update', (data) => {
                const speedKm = (data.speed).toFixed(1);
                document.getElementById('stats').innerHTML = \`
                    <p><b>Speed:</b> \${speedKm} km/h</p>
                    <p><b>Last Update:</b> \${new Date(data.timestamp).toLocaleTimeString()}</p>
                \`;

                if (marker) map.removeLayer(marker);
                marker = L.marker([data.lat, data.lng]).addTo(map).bindPopup("Mom's Car").openPopup();
                map.setView([data.lat, data.lng]);

                if (data.alertTriggered) {
                    document.getElementById('alert-box').innerHTML = \`<div class="alert">\${data.alertReason}</div>\`;
                    siren.play().catch(e => console.log("Click the map to allow audio alarm"));
                } else {
                    document.getElementById('alert-box').innerHTML = '';
                    siren.pause();
                }
            });
        </script>
    </body>
    </html>
    `);
});

// Endpoint for Mom's Traccar app
app.get('/', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lon);
    const speed = parseFloat(req.query.speed) || 0;
    const deviceId = req.query.id; // Reads the Device ID directly from her phone!
    const timestamp = Date.now();

    if (!lat || !lng) return res.status(400).send('No GPS');

    let alertTriggered = false;
    let alertReason = "";

    const distToHome = getDistance(lat, lng, HOME.lat, HOME.lng);
    const distToOffice = getDistance(lat, lng, OFFICE.lat, OFFICE.lng);

    if (speed < 0.5 && distToHome > 0.5 && distToOffice > 0.5) {
        if (!stopTimerStart) stopTimerStart = timestamp;
        if (timestamp - stopTimerStart > MAX_STOP_TIME_MS) {
            alertTriggered = true;
            alertReason = "🚨 Unusual Long Stop Detected!";
        }
    } else {
        stopTimerStart = null;
    }

    if (isOffRoute(lat, lng) && distToHome > 1.0 && distToOffice > 1.0) {
        alertTriggered = true;
        alertReason = "⚠️ ROUTE DEVIATION DETECTED!";
    }

    latestData = { lat, lng, speed: speed * 1.852, timestamp, alertTriggered, alertReason, deviceId };
    io.emit('dashboard_update', latestData);
    
    res.send('OK');
});

server.listen(5000, () => console.log('Server active on port 5000'));