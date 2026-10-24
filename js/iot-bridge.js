/**
 * ============================================================================
 * IoT TELEMETRY BRIDGE & WEBSOCKET GATEWAY
 * Formula 1 IoT Telemetry & Race Simulator
 * ============================================================================
 * Handles:
 *  - Full-duplex WebSocket telemetry pipeline (/telemetry-stream)
 *  - Synchronous 20Hz telemetry stream transmission to pitwall server
 *  - Network latency (ping ms) and packet transmission rate monitoring (Hz)
 * ============================================================================
 */

class IoTTelemetryBridge {
  constructor() {
    this.mode = 'SIMULATION';
    this.ws = null;
    this.isConnected = false;
    this.packetCount = 0;
    this.lastPacketTime = 0;
    this.currentHz = 20;
    this.pingMs = 0;

    // Listeners
    this.onPacketReceivedCallbacks = [];

    // Attempt connecting to Node WebSocket server
    this.initWebSocket();
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '3000';
    const wsUrl = `${protocol}//${host}:${port}/telemetry-stream`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log(`[IoT Bridge] Connected to telemetry WebSocket server at ${wsUrl}`);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY_UPDATE' || msg.type === 'TELEMETRY_SYNC') {
            this.packetCount++;
            this.updateStats();
            this.onPacketReceivedCallbacks.forEach(cb => cb(msg.data));
          } else if (msg.type === 'PONG') {
            this.pingMs = Date.now() - msg.timestamp;
          }
        } catch (err) {
          console.error('[IoT Bridge] Message parse error:', err);
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this.initWebSocket(), 3000);
      };
    } catch (e) {
      this.isConnected = false;
    }
  }

  sendVirtualTelemetry(packet) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'TELEMETRY_INGEST',
        data: packet,
        timestamp: Date.now()
      }));
    }

    this.packetCount++;
    this.updateStats();
  }

  updateStats() {
    const now = Date.now();
    if (this.lastPacketTime > 0) {
      const delta = now - this.lastPacketTime;
      if (delta > 0) {
        const instantHz = 1000 / delta;
        this.currentHz = Math.round((this.currentHz * 0.8) + (instantHz * 0.2));
      }
    }
    this.lastPacketTime = now;
  }

  subscribe(callback) {
    this.onPacketReceivedCallbacks.push(callback);
  }
}

window.IoTTelemetryBridge = IoTTelemetryBridge;
