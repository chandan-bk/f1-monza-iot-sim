/**
 * ============================================================================
 * RACE ENGINEER PITWALL & IoT MONITORING DASHBOARD UI 2.0
 * Formula 1 IoT Telemetry & Intelligent Race Monitoring System
 * ============================================================================
 * Implements the 6 Connected Modules:
 *  - Module 01: Race Simulation Navigation & View Synchronization
 *  - Module 02: Live Telemetry Dashboard (Gauges, Matrix, 60fps Rolling Waveforms)
 *  - Module 03: Virtual Sensor Management (Registry, Disconnect/Reconnect, 3D Twin)
 *  - Module 04: IoT Network Monitor (Animated Architecture Flow, Stats, Packet Inspector)
 *  - Module 05: Fault Simulator (Scenarios A through G & Scenario Reset)
 *  - Module 06: Race Engineer Decision Support (Diagnostics, Consequence, Action Feedback Loop)
 * ============================================================================
 */

class DashboardUI {
  constructor(telemetryEngine, iotBridge, track) {
    this.engine = telemetryEngine;
    this.bridge = iotBridge;
    this.track = track;

    this.activeModule = 'live-telemetry'; // 'race-sim' | 'live-telemetry' | 'sensor-mgmt' | 'network-monitor' | 'fault-sim' | 'decision-support'
    this.monitoredCarIndex = 0;
    this.allCars = [];
    this.onSelectCarCallback = null;
    this.selectedSubsystemFilter = 'ALL';

    // Canvas Chart Elements (Module 02)
    this.chartSpeedCanvas = document.getElementById('chart-speed');
    this.chartPedalsCanvas = document.getElementById('chart-pedals');
    this.chartRpmCanvas = document.getElementById('chart-rpm');
    this.chartTempsCanvas = document.getElementById('chart-temps');
    this.chartGgCanvas = document.getElementById('chart-gg');

    this.ctxSpeed = this.chartSpeedCanvas ? this.chartSpeedCanvas.getContext('2d') : null;
    this.ctxPedals = this.chartPedalsCanvas ? this.chartPedalsCanvas.getContext('2d') : null;
    this.ctxRpm = this.chartRpmCanvas ? this.chartRpmCanvas.getContext('2d') : null;
    this.ctxTemps = this.chartTempsCanvas ? this.chartTempsCanvas.getContext('2d') : null;
    this.ctxGg = this.chartGgCanvas ? this.chartGgCanvas.getContext('2d') : null;

    this.lastRenderTime = 0;
    this.lastStatsRenderTime = 0;
    this.isChartsPaused = false;

    // Initialize UI Handlers
    this.setupModuleNavigation();
    this.setupScenarioControls();
    this.setupNetworkMonitorControls();
    this.setupPresenterModal();
    this.setupSensorFilters();
  }

  // --------------------------------------------------------------------------
  // MASTER NAVIGATION & MODULE SWITCHER
  // --------------------------------------------------------------------------
  setupModuleNavigation() {
    const tabs = document.querySelectorAll('.mod-tab');
    tabs.forEach(tab => {
      tab.onclick = () => {
        const mod = tab.getAttribute('data-module');
        if (mod) this.switchModule(mod);
      };
    });

    // Pause/Resume charts toggle button
    const btnPauseCharts = document.getElementById('btn-pause-charts');
    if (btnPauseCharts) {
      btnPauseCharts.onclick = () => {
        this.isChartsPaused = !this.isChartsPaused;
        btnPauseCharts.textContent = this.isChartsPaused ? "▶ RESUME CHARTS" : "⏸ PAUSE CHARTS";
        btnPauseCharts.classList.toggle('active', this.isChartsPaused);
      };
    }
  }

  switchModule(moduleName) {
    this.activeModule = moduleName;

    // Update Tab UI
    document.querySelectorAll('.mod-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-module') === moduleName);
    });

    // Update Module Panels in Pitwall wrapper
    const panelIds = {
      'live-telemetry': 'mod-panel-telemetry',
      'sensor-mgmt': 'mod-panel-sensors',
      'network-monitor': 'mod-panel-network',
      'fault-sim': 'mod-panel-faults',
      'decision-support': 'mod-panel-decisions'
    };

    // If 'race-sim' is clicked, switch view to full 3D simulation
    if (moduleName === 'race-sim') {
      if (window.f1App) window.f1App.setViewLayout('DRIVER_ONLY');
      return;
    }

    // Switch view layout if currently in DRIVER_ONLY mode
    if (window.f1App && window.f1App.activeViewLayout === 'DRIVER_ONLY') {
      window.f1App.setViewLayout('SPLIT');
    }

    for (const [key, id] of Object.entries(panelIds)) {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.toggle('active', key === moduleName);
      }
    }

    // Immediate render of targeted module
    if (moduleName === 'sensor-mgmt') this.renderSensorManagement();
    else if (moduleName === 'network-monitor') this.renderNetworkMonitor();
    else if (moduleName === 'decision-support') this.renderDecisionSupport();
  }

  setupCarSelector(allCars, onSelectCar) {
    this.allCars = allCars;
    this.onSelectCarCallback = onSelectCar;
    const container = document.getElementById('driver-pills-row');
    if (!container) return;

    let html = '';
    allCars.forEach((car, idx) => {
      const d = car.driver || (car.physics ? car.physics.driver : car);
      const isLead = idx === 0 ? ' [LEAD]' : '';
      html += `
        <button class="driver-pill ${idx === this.monitoredCarIndex ? 'active' : ''}" data-car-idx="${idx}" style="--driver-color:${d.color};">
          <span class="pill-color-bar" style="background:${d.color};"></span>
          <span class="pill-num">#${d.number}</span>
          <span class="pill-code">${d.code}${isLead}</span>
        </button>
      `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.driver-pill').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-car-idx'), 10);
        if (this.onSelectCarCallback) {
          this.onSelectCarCallback(idx);
        }
      };
    });

    // Leaderboard Row Clicks
    const tbody = document.getElementById('leaderboard-body');
    if (tbody && !this.leaderboardClickBound) {
      this.leaderboardClickBound = true;
      tbody.onclick = (e) => {
        const row = e.target.closest('tr[data-car-idx]');
        if (row) {
          const idx = parseInt(row.getAttribute('data-car-idx'), 10);
          if (!isNaN(idx) && this.onSelectCarCallback) {
            this.onSelectCarCallback(idx);
          }
        }
      };
    }
  }

  setMonitoredCarIndex(idx, driverInfo) {
    this.monitoredCarIndex = idx;
    const badge = document.getElementById('active-driver-badge');
    if (badge && driverInfo) {
      badge.textContent = `#${driverInfo.number} ${driverInfo.name.toUpperCase()} (${driverInfo.team.toUpperCase()})`;
      badge.style.borderColor = driverInfo.color;
      badge.style.color = driverInfo.color;
    }
    const pills = document.querySelectorAll('.driver-pill');
    pills.forEach((p, i) => {
      p.classList.toggle('active', i === idx);
    });

    if (this.activeModule === 'sensor-mgmt') this.renderSensorManagement();
    if (this.activeModule === 'decision-support') this.renderDecisionSupport();
  }

  // --------------------------------------------------------------------------
  // MAIN UPDATE HOOK (CALLED AT 20HZ SAMPLING RATE)
  // --------------------------------------------------------------------------
  update(packet, playerPhysics, aiPhysicsList, monitoredPhysics, sessionState) {
    if (!packet) return;

    // 1. Status Bar Update
    this.updateStatusBar(packet, sessionState);

    // 2. Urgent Alert Toast (Faculty Banner)
    if (this.engine.currentUrgentAlert && !this._urgentToastShowing) {
      this.showUrgentToast(this.engine.currentUrgentAlert);
    }

    // 3. Module-specific rendering
    if (this.activeModule === 'live-telemetry') {
      this.updateMetricsPanel(packet);
      this.updateTiresAndBrakes(packet);
      this.updateLeaderboard(playerPhysics, aiPhysicsList, monitoredPhysics);
      this.updateEventLog();
      this.updateRecommendations(packet);

      // 60fps Rolling Charts (if not paused)
      if (!this.isChartsPaused) {
        const now = performance.now();
        if (now - this.lastRenderTime > 25) {
          this.lastRenderTime = now;
          this.renderCharts();
        }
      }
    } else if (this.activeModule === 'sensor-mgmt') {
      this.renderSensorManagement();
    } else if (this.activeModule === 'network-monitor') {
      this.renderNetworkMonitor();
    } else if (this.activeModule === 'decision-support') {
      this.renderDecisionSupport();
    }
  }

  updateStatusBar(packet, sessionState) {
    const elState = document.getElementById('dash-session-state');
    const elPacketRate = document.getElementById('dash-packet-rate');
    const elPing = document.getElementById('dash-ping');
    const elLap = document.getElementById('dash-lap');
    const elClock = document.getElementById('dash-session-clock');

    if (elState) {
      elState.textContent = sessionState.state;
      elState.className = `status-pill state-${sessionState.state.toLowerCase()}`;
    }

    if (elPacketRate) elPacketRate.textContent = `${this.bridge.measuredHz || 20} Hz`;
    if (elPing) elPing.textContent = this.bridge.isConnected ? `${this.bridge.pingMs || 4} ms` : "LOCAL";
    if (elLap) elLap.textContent = `LAP ${packet.lap_number} / ${sessionState.totalLaps || 2}`;
    
    if (elClock) {
      const totalSec = Math.floor(sessionState.sessionTime || 0);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      elClock.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
  }

  showUrgentToast(alertObj) {
    if (!alertObj) return;
    const toast = document.getElementById('iot-urgent-toast');
    if (!toast) return;

    this._urgentToastShowing = true;
    const elIcon = document.getElementById('toast-icon');
    const elTitle = document.getElementById('toast-title');
    const elDesc = document.getElementById('toast-desc');
    const elAction = document.getElementById('toast-action');

    if (elIcon) elIcon.textContent = alertObj.icon || '🚨';
    if (elTitle) elTitle.textContent = alertObj.title || 'CRITICAL IOT ALERT';
    if (elDesc) elDesc.textContent = alertObj.desc || '';
    if (elAction) elAction.textContent = alertObj.action ? `ACTION: ${alertObj.action}` : '';

    toast.className = `iot-urgent-toast toast-${(alertObj.type || 'critical').toLowerCase()}`;
    toast.style.display = 'flex';

    if (window.f1Audio && window.f1Audio.playPitRadioAlert) {
      window.f1Audio.playPitRadioAlert();
    }

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.display = 'none';
      this._urgentToastShowing = false;
    }, 8500);
  }

  // --------------------------------------------------------------------------
  // MODULE 03: VIRTUAL SENSOR MANAGEMENT
  // --------------------------------------------------------------------------
  
  setupSensorFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        const filter = btn.getAttribute('data-filter') || 'ALL';
        this.setSubsystemFilter(filter);
      };
    });
  }

  setSubsystemFilter(filter) {
    this.selectedSubsystemFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
    this.renderSensorManagement();
  }
  renderSensorManagement() {
    const container = document.getElementById('sensor-registry-grid');
    if (!container || !window.f1SensorRegistry) return;

    const sensors = window.f1SensorRegistry.getCarSensors(this.monitoredCarIndex);
    
    // Stats Summary
    let countOnline = 0, countWarning = 0, countCritical = 0, countOffline = 0;
    sensors.forEach(s => {
      if (!s.connected || s.status === 'OFFLINE') countOffline++;
      else if (s.status === 'CRITICAL') countCritical++;
      else if (s.status === 'WARNING') countWarning++;
      else countOnline++;
    });

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('sensor-stat-total', sensors.length);
    setEl('sensor-stat-online', countOnline);
    setEl('sensor-stat-warning', countWarning);
    setEl('sensor-stat-critical', countCritical);
    setEl('sensor-stat-offline', countOffline);

    // Filter sensors
    const filtered = sensors.filter(s => {
      if (this.selectedSubsystemFilter === 'ALL') return true;
      return s.subsystem.includes(this.selectedSubsystemFilter);
    });

    let html = '';
    filtered.forEach(s => {
      const isOff = !s.connected || s.status === 'OFFLINE';
      const statusClass = s.status.toLowerCase();
      const valDisplay = isOff ? 'NO DATA (CUT)' : (typeof s.currentReading === 'object' && s.currentReading !== null ? `${s.currentReading.distance_m || s.currentReading.y || 'OK'}` : `${s.currentReading !== null && s.currentReading !== undefined ? s.currentReading : '--'}`);

      html += `
        <div class="sensor-card card-${statusClass}">
          <div class="sensor-card-top">
            <div>
              <span class="sensor-id-tag">${s.id}</span>
              <div class="sensor-name-label">${s.name}</div>
              <div class="sensor-location-sub">📍 ${s.location.component}</div>
            </div>
            <span class="sensor-status-badge badge-${statusClass}">${s.status}</span>
          </div>

          <div class="sensor-reading-row">
            <span class="sensor-value-large" style="color:${isOff ? '#94a3b8' : '#fff'};">${valDisplay}</span>
            <span class="sensor-unit-label">${s.unit}</span>
          </div>

          <div class="sensor-meta-grid">
            <div>FREQ: ${s.configuredHz} Hz</div>
            <div>SEQ: #${s.packetSequence}</div>
            <div>BUS: CAN-FD #1</div>
            <div>STATUS: ${s.connected ? 'HARDWARE OK' : 'BUS OFFLINE'}</div>
          </div>

          <div class="sensor-action-buttons">
            <button class="btn-sensor-action ${s.connected ? 'btn-sensor-disconnect' : 'btn-sensor-reconnect'}" 
                    onclick="f1App.dashboard.toggleSensorConnection('${s.id}')">
              ${s.connected ? '🔌 Cut Wire' : '⚡ Reconnect'}
            </button>
            <button class="btn-sensor-action btn-sensor-twin" 
                    onclick="f1App.highlightDigitalTwinSensor('${s.id}', '${s.status}')">
              🎯 3D Twin
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  toggleSensorConnection(sensorId) {
    if (!window.f1SensorRegistry) return;
    const s = window.f1SensorRegistry.getSensor(this.monitoredCarIndex, sensorId);
    if (!s) return;

    if (s.connected) {
      window.f1SensorRegistry.disconnectSensor(this.monitoredCarIndex, sensorId);
      this.engine.logEvent("CRITICAL", "SENSOR", `Hardware disconnect: ${sensorId} (${s.name}) line severed. Ingest packet dropped.`);
    } else {
      window.f1SensorRegistry.reconnectSensor(this.monitoredCarIndex, sensorId);
      this.engine.logEvent("SUCCESS", "SENSOR", `Hardware reconnect: ${sensorId} restored to CAN-FD bus. Streaming nominal.`);
    }
    this.renderSensorManagement();
  }

  // --------------------------------------------------------------------------
  // MODULE 04: IoT NETWORK MONITOR
  // --------------------------------------------------------------------------
  setupNetworkMonitorControls() {
    const btnPauseInsp = document.getElementById('btn-pause-inspector');
    if (btnPauseInsp) {
      btnPauseInsp.onclick = () => {
        const isPaused = this.bridge.togglePacketInspectorPause();
        btnPauseInsp.textContent = isPaused ? "▶ RESUME STREAM" : "⏸ PAUSE / FREEZE";
        btnPauseInsp.classList.toggle('active', isPaused);
      };
    }

    const btnCopyJson = document.getElementById('btn-copy-packet');
    if (btnCopyJson) {
      btnCopyJson.onclick = () => {
        if (this.bridge.latestRawPacket) {
          navigator.clipboard.writeText(JSON.stringify(this.bridge.latestRawPacket, null, 2))
            .then(() => alert("✓ Latest Telemetry JSON packet copied to clipboard!"))
            .catch(() => {});
        }
      };
    }
  }

  renderNetworkMonitor() {
    const stats = this.bridge.getNetworkStats();

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('net-metric-status', stats.connected ? "ONLINE (CONNECTED)" : "OFFLINE / LOCAL");
    setTxt('net-metric-clients', `${stats.connectedClients} Connected`);
    setTxt('net-metric-sent', stats.packetsSent.toLocaleString());
    setTxt('net-metric-received', stats.packetsReceived.toLocaleString());
    setTxt('net-metric-seq', `#${this.engine.masterSequence}`);
    setTxt('net-metric-loss', `${stats.packetLossPct}%`);
    setTxt('net-metric-latency', `${stats.latencyMs} ms`);
    setTxt('net-metric-throughput', `${stats.throughputKbps} KB/s`);
    setTxt('net-metric-hz', `${stats.measuredHz} Hz`);

    // Render Raw JSON Telemetry Packet Inspector
    const inspectorEl = document.getElementById('raw-packet-code');
    if (inspectorEl && this.bridge.latestRawPacket) {
      inspectorEl.textContent = JSON.stringify(this.bridge.latestRawPacket, null, 2);
    }
  }

  // --------------------------------------------------------------------------
  // MODULE 05: FAULT SIMULATOR COCKPIT
  // --------------------------------------------------------------------------
  setupScenarioControls() {
    // Scenario A: Engine Overheating
    const btnFaultEngine = document.getElementById('btn-trigger-fault-engine');
    const rangeEngine = document.getElementById('range-radiator-blockage');
    if (btnFaultEngine) {
      btnFaultEngine.onclick = () => {
        const pct = rangeEngine ? parseInt(rangeEngine.value, 10) : 85;
        const phys = window.f1App.getMonitoredPhysics();
        if (phys) phys.radiatorBlockagePct = pct;
        this.engine.raiseDiagnosticEvent({
          sensorId: 'ENG-T01',
          sensorName: 'ICE Coolant Radiator Thermistor',
          category: 'POWERTRAIN_THERMAL',
          severity: 'CRITICAL',
          measuredValue: '116.4°C',
          threshold: '114.0°C',
          consequence: 'Severe cylinder head gasket warp hazard from 85% radiator aero blockage.',
          recommendation: 'Command Engine Map 3 Cooling & engage 90m Lift-and-Coast.',
          actionType: 'COOLING_MODE'
        });
        this.showUrgentToast(this.engine.currentUrgentAlert);
      };
    }

    // Scenario B: Tire Pressure Leakage (TPMS)
    const btnFaultTpms = document.getElementById('btn-trigger-fault-tpms');
    const selectTire = document.getElementById('select-puncture-wheel');
    if (btnFaultTpms) {
      btnFaultTpms.onclick = () => {
        const wheel = selectTire ? selectTire.value : 'fl';
        const phys = window.f1App.getMonitoredPhysics();
        if (phys) {
          phys.tireLeakRate[wheel] = 0.55; // 0.55 psi / sec decay
        }
        this.engine.raiseDiagnosticEvent({
          sensorId: `TPMS-0${wheel === 'fl' ? 1 : wheel === 'fr' ? 2 : wheel === 'rl' ? 3 : 4}`,
          sensorName: `${wheel.toUpperCase()} Rim TPMS Pressure Transducer`,
          category: 'TIRE_PRESSURE',
          severity: 'CRITICAL',
          measuredValue: '16.8 psi (Leaking)',
          threshold: '21.0 psi nominal',
          consequence: 'Micro-leak puncture. High risk of catastrophic tread carcass blowout.',
          recommendation: 'Box This Lap: Call car in for mandatory emergency pit stop.',
          actionType: 'PIT_STOP'
        });
        this.showUrgentToast(this.engine.currentUrgentAlert);
      };
    }

    // Scenario C: Carbon Rotor Overheating
    const btnFaultBrake = document.getElementById('btn-trigger-fault-brake');
    if (btnFaultBrake) {
      btnFaultBrake.onclick = () => {
        const phys = window.f1App.getMonitoredPhysics();
        if (phys) {
          phys.brakeDuctBlockagePct = 90;
          phys.brakes.fl.temp = 1040.0;
        }
        this.engine.raiseDiagnosticEvent({
          sensorId: 'BRK-T01',
          sensorName: 'Front-Left Carbon Rotor Optical Sensor',
          category: 'BRAKE_THERMAL',
          severity: 'CRITICAL',
          measuredValue: '1,040°C',
          threshold: '980°C',
          consequence: 'Brake fluid boiling vaporization & carbon-carbon oxidation disc failure.',
          recommendation: 'Shift brake bias +4% rearward and back off Turn 1 braking mark by 20m.',
          actionType: 'BRAKE_BIAS_REAR',
          actionParam: 0.04
        });
        this.showUrgentToast(this.engine.currentUrgentAlert);
      };
    }

    // Scenario D: Mechanical Vibration Anomaly
    const btnFaultVib = document.getElementById('btn-trigger-fault-vibration');
    if (btnFaultVib) {
      btnFaultVib.onclick = () => {
        const phys = window.f1App.getMonitoredPhysics();
        if (phys) phys.vibrationAnomaly = true;
        this.engine.raiseDiagnosticEvent({
          sensorId: 'VIB-01',
          sensorName: 'Piezoelectric Bulkhead Vibration Accelerometer',
          category: 'STRUCTURAL_HEALTH',
          severity: 'CRITICAL',
          measuredValue: '3.65G RMS',
          threshold: '1.80G RMS',
          consequence: 'Severe high-frequency mechanical vibration. Front suspension play.',
          recommendation: 'Execute electronic damper recalibration & inspect telemetry harmonics.',
          actionType: 'RECALIBRATE_DAMPER'
        });
        this.showUrgentToast(this.engine.currentUrgentAlert);
      };
    }

    // Scenario E: Sensor Physical Disconnection
    const btnFaultDisconnect = document.getElementById('btn-trigger-fault-disconnect');
    const selectSensor = document.getElementById('select-disconnect-sensor');
    if (btnFaultDisconnect) {
      btnFaultDisconnect.onclick = () => {
        const sId = selectSensor ? selectSensor.value : 'ENG-T01';
        this.toggleSensorConnection(sId);
      };
    }

    // Scenario F: Wireless Network Degradation
    const btnFaultNet = document.getElementById('btn-trigger-fault-network');
    if (btnFaultNet) {
      btnFaultNet.onclick = () => {
        this.bridge.injectNetworkFailure({ packetLossPct: 40, latencyMs: 140 });
        this.engine.raiseDiagnosticEvent({
          sensorId: 'RF-TEL-01',
          sensorName: 'Trackside Microwave Telemetry Transceiver',
          category: 'NETWORK_LINK',
          severity: 'WARNING',
          measuredValue: '40% Packet Loss / 140ms RTT',
          threshold: '< 2% Packet Loss',
          consequence: 'Severe RF multipath interference around Curva Grande trees.',
          recommendation: 'Restore Wi-Fi telemetry repeater & re-sync WebSocket packet buffer.',
          actionType: 'RESTORE_NETWORK'
        });
        this.showUrgentToast(this.engine.currentUrgentAlert);
      };
    }

    // Scenario G: Multi-Fault Incident
    const btnFaultMulti = document.getElementById('btn-trigger-fault-multi');
    if (btnFaultMulti) {
      btnFaultMulti.onclick = () => {
        const phys = window.f1App.getMonitoredPhysics();
        if (phys) {
          phys.radiatorBlockagePct = 85;
          phys.tireLeakRate.fl = 0.55;
          phys.brakes.fl.temp = 1010.0;
        }
        this.engine.raiseDiagnosticEvent({
          sensorId: 'ENG-T01',
          sensorName: 'ICE Coolant Radiator Thermistor',
          category: 'POWERTRAIN_THERMAL',
          severity: 'CRITICAL',
          measuredValue: '118.2°C',
          threshold: '114.0°C',
          consequence: 'Engine overheating simultaneously with tire micro-leak!',
          recommendation: 'Command Engine Cooling Map & Box This Lap for Pit Stop.',
          actionType: 'COOLING_MODE'
        });
        this.showUrgentToast(this.engine.currentUrgentAlert);
      };
    }

    // Master Reset All Faults Button
    const btnResetAll = document.getElementById('btn-reset-all-scenarios');
    if (btnResetAll) {
      btnResetAll.onclick = () => {
        const phys = window.f1App.getMonitoredPhysics();
        if (phys) phys.applyEngineeringAction('RESET_ALL');
        if (window.f1SensorRegistry) window.f1SensorRegistry.resetAll(this.monitoredCarIndex);
        this.bridge.restoreNetwork();
        this.engine.executeEngineeringAction('RESET_ALL');
        alert("✓ All scenarios reset! Vehicle physics and virtual sensors restored to nominal operating conditions.");
      };
    }
  }

  // --------------------------------------------------------------------------
  // MODULE 06: RACE ENGINEER DECISION SUPPORT & FEEDBACK LOOP
  // --------------------------------------------------------------------------
  renderDecisionSupport() {
    const listEl = document.getElementById('decision-active-events-list');
    if (!listEl) return;

    const stats = this.engine.faultStats;
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('dec-stat-detected', stats.detected);
    setTxt('dec-stat-resolved', stats.resolved);
    setTxt('dec-stat-active-crit', stats.activeCritical);
    setTxt('dec-stat-active-warn', stats.activeWarnings);

    const activeList = Array.from(this.engine.activeEvents.values());

    if (activeList.length === 0) {
      listEl.innerHTML = `
        <div style="background:#0e1420; border:1px solid #1e293b; border-radius:6px; padding:20px; text-align:center; color:#94a3b8;">
          <div style="font-size:24px; margin-bottom:8px;">✅</div>
          <div style="font-weight:700; color:#00e676;">ALL EDGE SENSORS & POWER UNITS NOMINAL</div>
          <div style="font-size:11px; margin-top:4px;">No threshold breaches or trend anomalies detected on Channel #${this.monitoredCarIndex + 1}.</div>
        </div>
      `;
      return;
    }

    let html = '';
    activeList.forEach(evt => {
      const isCrit = evt.severity === 'CRITICAL';
      html += `
        <div class="decision-card ${isCrit ? 'card-crit' : 'card-warn'}">
          <div class="decision-event-header">
            <span class="decision-event-id">${evt.id} &bull; ${evt.time}</span>
            <span class="sensor-status-badge badge-${evt.severity.toLowerCase()}">${evt.severity}</span>
          </div>

          <div class="decision-sensor-name">${evt.sensor_id}: ${evt.sensor_name} (${evt.vehicle_id})</div>

          <div class="decision-comparison-box">
            <div>MEASURED: <span style="color:${isCrit ? '#ff1744' : '#ffab00'}; font-weight:800;">${evt.measured_value}</span></div>
            <div>REFERENCE THRESHOLD: <span style="color:#94a3b8;">${evt.threshold}</span></div>
          </div>

          <div class="decision-consequence-text">
            <strong>CONSEQUENCE:</strong> ${evt.consequence}
          </div>

          <div class="decision-action-text">
            <strong>RECOMMENDED INTERVENTION:</strong> ${evt.recommendation}
          </div>

          <button class="btn-apply-intervention" onclick="f1App.dashboard.executeIntervention('${evt.action_type}', '${evt.action_param || ''}')">
            ⚡ EXECUTE: ${evt.action_type.replace(/_/g, ' ')}
          </button>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  executeIntervention(actionType, param) {
    if (actionType === 'RESTORE_NETWORK') {
      this.bridge.restoreNetwork();
      this.engine.executeEngineeringAction('RESET_ALL');
    } else {
      this.engine.executeEngineeringAction(actionType, param);
    }
    this.renderDecisionSupport();
    alert(`✓ Engineering Command [${actionType}] applied to car model. Telemetry recovery in progress.`);
  }

  // --------------------------------------------------------------------------
  // PRESENTER & MULTI-DEVICE MODAL
  // --------------------------------------------------------------------------
  setupPresenterModal() {
    const btnOpen = document.getElementById('btn-open-presenter-modal');
    const modal = document.getElementById('modal-presenter');
    const btnClose = document.getElementById('btn-close-presenter-modal');
    const btnLaunchDash = document.getElementById('btn-launch-separate-dash');

    if (btnOpen && modal) {
      btnOpen.onclick = () => { modal.style.display = 'flex'; };
    }
    if (btnClose && modal) {
      btnClose.onclick = () => { modal.style.display = 'none'; };
    }
    if (btnLaunchDash) {
      btnLaunchDash.onclick = () => {
        window.open(window.location.origin + '/?mode=dashboard', '_blank');
      };
    }
  }

  // --------------------------------------------------------------------------
  // MODULE 02 EXISTING HELPERS (METRICS, TIRES, LEADERBOARD, CHARTS)
  // --------------------------------------------------------------------------
  updateMetricsPanel(packet) {
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('metric-speed', Math.round(packet.speed_kmh));
    setTxt('metric-rpm', packet.engine_rpm);
    setTxt('metric-gear', packet.gear === 0 ? 'N' : packet.gear);
    setTxt('metric-throttle', `${packet.throttle_pct}%`);
    setTxt('metric-brake', `${packet.brake_pct}%`);
    setTxt('metric-vibration', `${packet.vibration_g || 0.45}G`);
    setTxt('metric-g-long', `${packet.longitudinal_g > 0 ? '+' : ''}${packet.longitudinal_g}G`);
    setTxt('metric-g-lat', `${packet.lateral_g > 0 ? '+' : ''}${packet.lateral_g}G`);
    setTxt('metric-fuel', `${packet.fuel_remaining_kg} kg`);
    setTxt('metric-ers', `${packet.ers_soc_pct}%`);
    setTxt('metric-drs', packet.drs_status);

    const elThrotBar = document.getElementById('bar-throttle');
    const elBrakeBar = document.getElementById('bar-brake');
    const elRpmBar = document.getElementById('bar-rpm');

    if (elThrotBar) elThrotBar.style.width = `${packet.throttle_pct}%`;
    if (elBrakeBar) elBrakeBar.style.width = `${packet.brake_pct}%`;
    if (elRpmBar) {
      const pct = Math.min(100, Math.max(0, ((packet.engine_rpm - 4000) / 11000) * 100));
      elRpmBar.style.width = `${pct}%`;
    }

    const elDelta = document.getElementById('metric-delta');
    if (elDelta) {
      const d = packet.delta_s;
      elDelta.textContent = `${d > 0 ? '+' : ''}${d.toFixed(3)}s`;
      elDelta.className = `metric-val ${d <= 0 ? 'delta-green' : 'delta-red'}`;
    }

    const elEngine = document.getElementById('metric-engine-temp');
    if (elEngine) {
      elEngine.textContent = `${packet.engine_temp_c.toFixed(1)}°C`;
      if (packet.engine_temp_c > 114) elEngine.className = 'metric-val temp-crit';
      else if (packet.engine_temp_c > 106) elEngine.className = 'metric-val temp-warn';
      else elEngine.className = 'metric-val temp-norm';
    }
  }

  updateTiresAndBrakes(packet) {
    const wheels = ['fl', 'fr', 'rl', 'rr'];
    wheels.forEach(w => {
      const tempEl = document.getElementById(`tire-temp-${w}`);
      const wearEl = document.getElementById(`tire-wear-${w}`);
      const discEl = document.getElementById(`brake-temp-${w}`);
      const pressEl = document.getElementById(`tire-press-${w}`);
      const boxEl = document.getElementById(`tire-box-${w}`);

      const tTemp = packet.tires[`${w}_temp_c`];
      const tPress = packet.tires[`${w}_pressure_psi`] || (packet.tires[`${w}_pressure_bar`] * 14.5038);
      const bTemp = packet.brakes[`${w}_temp_c`];
      const wear = packet.tires.avg_wear_pct;

      if (tempEl) tempEl.textContent = `${tTemp.toFixed(1)}°C`;
      if (wearEl) wearEl.textContent = `Wear: ${wear.toFixed(1)}%`;
      if (discEl) discEl.textContent = `Disc: ${bTemp}°C`;
      if (pressEl) pressEl.textContent = `TPMS: ${tPress.toFixed(1)} psi`;

      if (boxEl) {
        if (tTemp > 112 || bTemp > 900 || tPress < 18.0) {
          boxEl.className = 'tire-matrix-box tire-crit';
        } else if (tTemp > 106 || bTemp > 820 || tPress < 20.0) {
          boxEl.className = 'tire-matrix-box tire-warn';
        } else {
          boxEl.className = 'tire-matrix-box';
        }
      }
    });
  }

  updateLeaderboard(playerPhysics, aiPhysicsList, monitoredPhysics) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    const allCars = [playerPhysics, ...(aiPhysicsList || [])];
    allCars.sort((a, b) => {
      if (b.lapCount !== a.lapCount) return b.lapCount - a.lapCount;
      return b.trackDistance - a.trackDistance;
    });

    const leadDist = allCars[0].trackDistance + (allCars[0].lapCount * 5793);

    let html = '';
    allCars.forEach((c, idx) => {
      const d = c.driver;
      const isMonitored = (c === monitoredPhysics);
      const totalCarDist = c.trackDistance + (c.lapCount * 5793);
      const gapMeters = Math.max(0, leadDist - totalCarDist);
      const gapSec = gapMeters > 0 ? (gapMeters / Math.max(20, c.speed)).toFixed(1) : 'LEAD';

      html += `
        <tr class="${isMonitored ? 'row-monitored' : ''}" data-car-idx="${d.id === 'player' ? 0 : parseInt(d.id.replace('ai_', ''), 10)}">
          <td style="font-weight:bold; color:${idx === 0 ? '#ffd600' : '#fff'};">P${idx + 1}</td>
          <td>
            <span class="driver-team-dot" style="background:${d.color};"></span>
            #${d.number} ${d.code} (${d.team})
          </td>
          <td>${c.lapCount}</td>
          <td>${idx === 0 ? 'INTERVAL' : `+${gapSec}s`}</td>
          <td>${c.lastLapTime > 0 ? c.lastLapTime.toFixed(3) : '--.---'}</td>
          <td style="color:#00e676;">${c.bestLapTime > 0 ? c.bestLapTime.toFixed(3) : '--.---'}</td>
          <td>${c.sector1Time > 0 ? c.sector1Time.toFixed(1) : '--'} / ${c.sector2Time > 0 ? c.sector2Time.toFixed(1) : '--'}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  updateEventLog() {
    const listEl = document.getElementById('engineer-event-list');
    if (!listEl) return;

    const logs = this.engine.eventLog.slice(0, 8);
    let html = '';
    for (let i = 0; i < logs.length; i++) {
      const e = logs[i];
      html += `
        <div class="event-item event-${e.severity.toLowerCase()}">
          <span class="event-time">${e.time}</span>
          <span class="event-badge badge-${e.severity.toLowerCase()}">${e.severity}</span>
          <span class="event-msg">${e.message}</span>
        </div>
      `;
    }
    if (logs.length === 0) {
      html = '<div class="event-empty">● Telemetry stream active (20Hz). All subsystems nominal.</div>';
    }
    listEl.innerHTML = html;
  }

  updateRecommendations(packet) {
    const recEl = document.getElementById('engineer-recommendations');
    if (!recEl) return;

    let items = [];

    if (packet.tires && packet.tires.fl_pressure_psi < 18.5) {
      items.push({
        title: "CRITICAL: TPMS Micro-Leak / Carcass Depressurization",
        sub: `Measured: ${packet.tires.fl_pressure_psi} psi | Nominal: 22.5 psi`,
        rule: "Rule: TPMS < 18.5 psi. Catastrophic delamination risk at 350 km/h.",
        action: "ACTION: Mandatory BOX THIS LAP! Fresh Pirelli soft set standing by."
      });
    }

    if (packet.brakes && packet.brakes.fl_temp_c > 950) {
      items.push({
        title: `CRITICAL: Front Brake Rotor Overheat (${packet.brakes.fl_temp_c}°C)`,
        sub: `Front Rotor: ${packet.brakes.fl_temp_c}°C | Limit: 980°C`,
        rule: "Rule: T_rotor >= 980°C. Vapor lock brake failure imminent.",
        action: "ACTION: Shift brake bias +4% rearward. Lift-and-coast 100m into chicanes."
      });
    }

    if (packet.engine_temp_c > 114) {
      items.push({
        title: `CRITICAL: Engine Thermal Overload (${packet.engine_temp_c}°C)`,
        sub: `Coolant: ${packet.engine_temp_c}°C | Safe Limit: 106°C`,
        rule: "Rule: T_ice >= 114.0°C. Immediate risk of cylinder head warp.",
        action: "ACTION: Engage Engine Map 3 Cooling. Enforce 90m Lift-and-Coast."
      });
    }

    if (items.length === 0) {
      items.push({
        title: "SUBSYSTEM HEALTH: OPTIMAL",
        sub: "All powertrain, aerodynamic, and brake sensors within nominal tolerances.",
        rule: "Rule: Edge telemetry channels within 3-sigma tolerance bounds.",
        action: "ACTION: Push for optimal lap time. Full ERS deployment permitted."
      });
    }

    let html = '';
    items.forEach(it => {
      html += `
        <div class="rec-card">
          <div class="rec-title">${it.title}</div>
          <div class="rec-sub">${it.sub}</div>
          <div class="rec-rule">${it.rule}</div>
          <div class="rec-action">${it.action}</div>
        </div>
      `;
    });
    recEl.innerHTML = html;
  }

  // Rolling Canvas Charts (Module 02)
  renderCharts() {
    const buf = this.engine.rollingBuffer;
    if (buf.length < 2) return;

    this.drawTraceChart(this.ctxSpeed, this.chartSpeedCanvas, buf.map(s => s.speed_kmh), 0, 360, '#00e5ff', 'Speed (km/h)', [100, 200, 300]);
    this.drawDualPedalChart(this.ctxPedals, this.chartPedalsCanvas, buf);
    this.drawRpmChart(this.ctxRpm, this.chartRpmCanvas, buf);
    this.drawTempsChart(this.ctxTemps, this.chartTempsCanvas, buf);
    this.drawGgDiagram(this.ctxGg, this.chartGgCanvas, buf);
  }

  drawTraceChart(ctx, canvas, data, minY, maxY, color, label, gridLines = []) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    gridLines.forEach(val => {
      const y = h - ((val - minY) / (maxY - minY)) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const len = data.length;
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - ((data[i] - minY) / (maxY - minY)) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawDualPedalChart(ctx, canvas, buf) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const len = buf.length;
    // Throttle (Green)
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - (buf[i].throttle_pct / 100) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Brake (Red)
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - (buf[i].brake_pct / 100) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawRpmChart(ctx, canvas, buf) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const len = buf.length;
    ctx.strokeStyle = '#ffd600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - ((buf[i].engine_rpm - 4000) / 11000) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawTempsChart(ctx, canvas, buf) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const len = buf.length;
    // Engine Temp (Cyan)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - ((buf[i].engine_temp_c - 80) / 45) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Tire FL Temp (Yellow/Orange)
    ctx.strokeStyle = '#ff9100';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h - ((buf[i].tires.fl_temp_c - 80) / 45) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawGgDiagram(ctx, canvas, buf) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080b11';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxG = 5.5;
    const scale = Math.min(cx, cy) / maxG;

    // Rings
    ctx.strokeStyle = '#1e293b';
    [1, 2, 3, 4, 5].forEach(g => {
      ctx.beginPath();
      ctx.arc(cx, cy, g * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Recent samples
    const samples = buf.slice(-60);
    samples.forEach((s, idx) => {
      const x = cx + (s.lateral_g * scale);
      const y = cy - (s.longitudinal_g * scale);
      const alpha = (idx / samples.length);
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

window.DashboardUI = DashboardUI;
