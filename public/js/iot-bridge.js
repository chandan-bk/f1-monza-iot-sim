/**
 * ============================================================================
 * IoT TELEMETRY BRIDGE & WEBSOCKET GATEWAY (DUAL-DEVICE ARCHITECTURE)
 * Formula 1 IoT Telemetry & Race Simulator
 * ============================================================================
 * Implements:
 *  - Full-duplex WebSocket connection with role registration ('SIM' or 'DASHBOARD')
 *  - Multi-car telemetry publication & batch streaming (20Hz)
 *  - Accurate packet transmission counters (only increments on actual send)
 *  - Continuous PING / PONG heartbeat for true measured round-trip time (RTT)
 *  - Remote command dispatch & execution acknowledgement loop
 * ============================================================================
 */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IoTTelemetryBridge = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {

  class IoTTelemetryBridge {
    constructor(options = {}) {
      // Determine Role: 'SIM' (Default Simulator) or 'DASHBOARD'
      let defaultRole = 'SIM';
      if (typeof window !== 'undefined' && window.location && typeof URLSearchParams !== 'undefined') {
        const params = new URLSearchParams(window.location.search || '');
        if (params.get('mode') === 'dashboard' || params.get('role') === 'dashboard') {
          defaultRole = 'DASHBOARD';
        }
      }

      this.role = options.role || defaultRole;
      this.clientId = options.clientId || `${this.role}_${Math.random().toString(36).substr(2, 6)}`;
      this.sessionId = null;
      this.isRegistered = false;

      this.ws = null;
      this.isConnected = false;
      this.packetsSent = 0;
      this.packetsReceived = 0;
      this.packetCount = 0; // Legacy accessor
      this.lastPacketTime = 0;
      this.currentHz = 20;

      // Network Metrics
      this.measuredRttMs = 0;
      this.pingMs = 0; // Legacy alias for measured RTT
      this.injectedLatencyMs = 0;
      this.injectedPacketLossRate = 0.0;
      this.droppedPacketsCount = 0;

      // Pending remote commands: command_id -> { resolve, reject, timer }
      this.pendingCommands = new Map();

      // Listeners
      this.onPacketReceivedCallbacks = [];
      this.onBatchReceivedCallbacks = [];
      this.onCommandHandler = null;

      // Ping Interval Timer
      this.pingInterval = null;

      // Initialize WebSocket connection
      this.initWebSocket(options.url);
    }

    initWebSocket(customUrl) {
      let wsUrl = customUrl;
      if (!wsUrl && typeof window !== 'undefined' && window.location) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = window.location.port || '3000';
        wsUrl = `${protocol}//${host}:${port}/telemetry-stream`;
      }

      if (!wsUrl) return;

      try {
        const WebSocketClass = (typeof WebSocket !== 'undefined') ? WebSocket : (typeof require !== 'undefined' ? require('ws') : null);
        if (!WebSocketClass) return;

        this.ws = new WebSocketClass(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          // Send registration handshake
          this.ws.send(JSON.stringify({
            type: 'REGISTER',
            role: this.role,
            clientId: this.clientId,
            timestamp: Date.now()
          }));

          // Start periodic PING loop for real measured RTT
          this.startPingLoop();
        };

        this.ws.onmessage = (event) => {
          try {
            const rawData = typeof event.data === 'string' ? event.data : event.data.toString();
            const msg = JSON.parse(rawData);

            if (msg.type === 'REGISTER_ACK') {
              this.sessionId = msg.session_id;
              this.isRegistered = true;
              return;
            }

            if (msg.type === 'PONG') {
              if (msg.timestamp) {
                this.measuredRttMs = Date.now() - msg.timestamp;
                this.pingMs = this.measuredRttMs;
              }
              return;
            }

            if (msg.type === 'TELEMETRY_BATCH') {
              this.packetsReceived += (msg.cars ? msg.cars.length : 1);
              this.updateStats();
              this.onBatchReceivedCallbacks.forEach(cb => cb(msg.cars, msg));
              return;
            }

            if (msg.type === 'TELEMETRY_UPDATE' || msg.type === 'TELEMETRY_SYNC') {
              this.packetsReceived++;
              this.updateStats();
              this.onPacketReceivedCallbacks.forEach(cb => cb(msg.data));
              return;
            }

            if (msg.type === 'SIM_EXECUTE_COMMAND') {
              if (this.onCommandHandler) {
                const result = this.onCommandHandler(msg.action, msg.payload, msg.command_id);
                // Return real execution acknowledgement
                this.sendCommandAck(msg.command_id, result);
              }
              return;
            }

            if (msg.type === 'COMMAND_ACK') {
              const pending = this.pendingCommands.get(msg.command_id);
              if (pending) {
                clearTimeout(pending.timer);
                this.pendingCommands.delete(msg.command_id);
                pending.resolve(msg);
              }
              return;
            }

            if (msg.type === 'COMMAND_REJECTED') {
              const pending = this.pendingCommands.get(msg.command_id);
              if (pending) {
                clearTimeout(pending.timer);
                this.pendingCommands.delete(msg.command_id);
                pending.reject(new Error(msg.reason || 'COMMAND_REJECTED'));
              }
              return;
            }

          } catch (err) {
            console.error('[IoT Bridge] Message parse error:', err.message);
          }
        };

        this.ws.onerror = () => {
          this.isConnected = false;
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.isRegistered = false;
          this.stopPingLoop();
          setTimeout(() => this.initWebSocket(wsUrl), 3000);
        };

      } catch (e) {
        this.isConnected = false;
      }
    }

    startPingLoop(intervalMs = 1500) {
      this.stopPingLoop();
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === 1) { // 1 = OPEN
          this.ws.send(JSON.stringify({
            type: 'PING',
            timestamp: Date.now()
          }));
        }
      }, intervalMs);
    }

    stopPingLoop() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    }

    sendVirtualTelemetry(packet) {
      if (!this.ws || this.ws.readyState !== 1) {
        return false; // Do not increment counter when no packet is sent
      }

      if (this.injectedPacketLossRate > 0 && Math.random() < this.injectedPacketLossRate) {
        this.droppedPacketsCount++;
        return false;
      }

      try {
        this.ws.send(JSON.stringify({
          type: 'TELEMETRY_INGEST',
          data: packet,
          source: this.clientId,
          timestamp: Date.now()
        }));

        this.packetsSent++;
        this.packetCount = this.packetsSent;
        this.updateStats();
        return true;
      } catch (e) {
        return false;
      }
    }

    sendVirtualTelemetryBatch(carsArray, sessionTimeMs) {
      if (!this.ws || this.ws.readyState !== 1) {
        return false;
      }

      if (this.injectedPacketLossRate > 0 && Math.random() < this.injectedPacketLossRate) {
        this.droppedPacketsCount += (carsArray ? carsArray.length : 1);
        return false;
      }

      try {
        this.ws.send(JSON.stringify({
          type: 'TELEMETRY_BATCH',
          cars: carsArray,
          timestamp_ms: sessionTimeMs || Date.now(),
          source: this.clientId,
          timestamp: Date.now()
        }));

        this.packetsSent += carsArray.length;
        this.packetCount = this.packetsSent;
        this.updateStats();
        return true;
      } catch (e) {
        return false;
      }
    }

    sendRemoteCommand(action, payload = {}) {
      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== 1) {
          return reject(new Error('WEBSOCKET_NOT_CONNECTED'));
        }

        const commandId = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const timer = setTimeout(() => {
          if (this.pendingCommands.has(commandId)) {
            this.pendingCommands.delete(commandId);
            reject(new Error('COMMAND_TIMEOUT: Simulator did not acknowledge within 4000ms'));
          }
        }, 4000);

        this.pendingCommands.set(commandId, { resolve, reject, timer });

        this.ws.send(JSON.stringify({
          type: 'REMOTE_COMMAND',
          action: action,
          payload: payload,
          command_id: commandId,
          session_id: this.sessionId,
          timestamp: Date.now()
        }));
      });
    }

    sendCommandAck(commandId, executionResult) {
      if (!this.ws || this.ws.readyState !== 1) return;

      this.ws.send(JSON.stringify({
        type: 'COMMAND_ACK',
        command_id: commandId,
        success: executionResult ? executionResult.success : false,
        target_car_id: executionResult ? executionResult.target_car_id : null,
        action: executionResult ? executionResult.action : null,
        result: executionResult ? executionResult.result : {},
        error: executionResult ? executionResult.error : null,
        timestamp: Date.now()
      }));
    }

    registerCommandHandler(handler) {
      this.onCommandHandler = handler;
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

    subscribeBatch(callback) {
      this.onBatchReceivedCallbacks.push(callback);
    }
  }

  return IoTTelemetryBridge;
}));
