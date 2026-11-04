/**
 * ============================================================================
 * Application of IoT in Motorsport: Real-Time Race Car Telemetry Monitoring
 * Telemetry Server & WebSocket Gateway (Node.js) 2.0
 * ============================================================================
 * Handles:
 *  1. Static web asset serving (Driver 3D Simulator & Pitwall Engineering Dashboard)
 *  2. Real-time bi-directional WebSocket telemetry stream (/telemetry-stream)
 *  3. REST endpoint for external telemetry ingest (POST /api/telemetry/ingest)
 *  4. Multi-client broadcast (allows driving on PC while engineer monitors on tablet)
 *  5. Network heartbeat ping/pong, RTT latency monitoring & telemetry packet ring buffer
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let express;
let WebSocket;

try {
  express = require('express');
} catch (e) {
  express = null;
}

try {
  WebSocket = require('ws');
} catch (e) {
  WebSocket = null;
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for standalone static server fallback
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json'
};

// Telemetry State Cache
let latestTelemetryPacket = null;
let telemetryHistoryBuffer = [];
const MAX_BUFFER_SIZE = 500;
let connectedClients = new Set();

let server;

if (express) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(PUBLIC_DIR));

  // REST ingest endpoint for telemetry packets
  app.post('/api/telemetry/ingest', (req, res) => {
    const packet = req.body;
    handleIncomingPacket(packet, 'rest_ingest');
    res.json({ status: 'ACK', timestamp: Date.now() });
  });

  // Query latest telemetry
  app.get('/api/telemetry/latest', (req, res) => {
    res.json(latestTelemetryPacket || { status: 'NO_DATA' });
  });

  // Query server network metrics
  app.get('/api/network/stats', (req, res) => {
    res.json({
      status: 'ONLINE',
      connected_clients: connectedClients.size,
      buffer_size: telemetryHistoryBuffer.length,
      server_time: Date.now()
    });
  });

  server = http.createServer(app);
} else {
  // Pure Node.js built-in HTTP server fallback
  server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = parsedUrl.pathname;

    if (pathname === '/api/telemetry/ingest' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const packet = JSON.parse(body);
          handleIncomingPacket(packet, 'rest_ingest');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ACK', timestamp: Date.now() }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    if (pathname === '/api/telemetry/latest') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(latestTelemetryPacket || { status: 'NO_DATA' }));
      return;
    }

    if (pathname === '/api/network/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ONLINE',
        connected_clients: connectedClients.size,
        buffer_size: telemetryHistoryBuffer.length,
        server_time: Date.now()
      }));
      return;
    }

    // Serve static files
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Server Error: ' + err.code);
        }
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(data);
    });
  });
}

// WebSocket Server initialization
if (WebSocket) {
  const wss = new WebSocket.Server({ server, path: '/telemetry-stream' });

  wss.on('connection', (ws, req) => {
    connectedClients.add(ws);
    console.log(`[WS] Client connected. Total dashboard clients: ${connectedClients.size}`);

    // Send latest known telemetry & client count upon connection
    ws.send(JSON.stringify({
      type: 'SERVER_HELLO',
      connected_clients: connectedClients.size,
      server_timestamp: Date.now(),
      data: latestTelemetryPacket
    }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'TELEMETRY_INGEST') {
          handleIncomingPacket(parsed.data, parsed.source || 'client_ws');
        } else if (parsed.type === 'PING') {
          ws.send(JSON.stringify({
            type: 'PONG',
            client_timestamp: parsed.timestamp || Date.now(),
            server_timestamp: Date.now(),
            client_count: connectedClients.size
          }));
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err.message);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log(`[WS] Client disconnected. Total: ${connectedClients.size}`);
    });
  });
}

function handleIncomingPacket(packet, source) {
  if (!packet) return;

  packet.server_received_at = Date.now();
  latestTelemetryPacket = packet;

  // Push to buffer
  telemetryHistoryBuffer.push(packet);
  if (telemetryHistoryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryHistoryBuffer.shift();
  }

  // Broadcast to all active browser dashboards
  const broadcastMsg = JSON.stringify({
    type: 'TELEMETRY_UPDATE',
    data: packet,
    client_count: connectedClients.size,
    server_timestamp: Date.now()
  });

  for (const client of connectedClients) {
    if (client.readyState === 1) { // OPEN
      client.send(broadcastMsg);
    }
  }
}

server.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`  FORMULA 1 IoT TELEMETRY & INTELLIGENT MONITORING SYSTEM 2.0`);
  console.log(`  Academic Capstone: Application of IoT in Motorsport`);
  console.log(`================================================================`);
  console.log(`  ✓ Web Application:   http://localhost:${PORT}`);
  console.log(`  ✓ WebSocket Gateway: ws://localhost:${PORT}/telemetry-stream`);
  console.log(`  ✓ REST Ingest API:   http://localhost:${PORT}/api/telemetry/ingest`);
  console.log(`  ✓ Network Stats:     http://localhost:${PORT}/api/network/stats`);
  console.log(`================================================================\n`);
});
