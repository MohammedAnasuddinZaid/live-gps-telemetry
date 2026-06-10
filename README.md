# Telemetry Core: Lightweight Real-Time GPS Tracking Server

A highly optimized, zero-cost, single-instance Node.js architecture engineered to ingest live background telemetry data from mobile devices, stream coordinates via WebSockets, and run automated safety boundary algorithms.

## ⚡ Architecture & Optimization Highlights

* **Zero-RAM & Storage Overhead:** Designed without heavy frontend frameworks like React to eliminate compilation steps and minimize disk space. Runs entirely within a single lightweight Node.js runtime instance.
* **Low-Latency Data Pipeline:** Utilizes an Express backend for high-throughput HTTP telemetry ingestion, paired with Socket.io for immediate, bi-directional WebSocket client streaming.
* **Open-Source Geospatial Rendering:** Integrated Leaflet.js to render interactive map grids on the client dashboard without relying on commercial Google Maps API tokens.
* **Network Bridging:** Secured via Ngrok tunneling to safely bridge local socket instances to cellular networks over public internet protocols.

## 🚨 Automated Safety Algorithms

The backend runs real-time algorithmic coordinate and metrics validation in a persistent event loop:
1. **Unusual Stop Detection:** Automatically checks velocity packets. If the speed stays below 0.5 km/h for more than 10 consecutive minutes on an active highway route, the server fires a dashboard visual alarm and a local audible siren.
2. **Route Deviation Engine:** Maps incoming latitudinal and longitudinal coordinates against hardcoded geographical route checkpoints. If the tracking client drifts more than 1.5 km off-route, a high-priority deviation warning is triggered.

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Backend Framework:** Express.js
* **Real-Time Data Layer:** Socket.io
* **Frontend Visualization:** Leaflet.js (HTML5 / Vanilla JS CSS)
* **Tunneling Proxy:** Ngrok
