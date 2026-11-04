/**
 * ============================================================================
 * TELEMETRY ENGINE & RULE-BASED ENGINEERING ANALYTICS 2.0
 * Formula 1 IoT Telemetry & Intelligent Race Monitoring System
 * ============================================================================
 * Handles:
 *  - 20Hz synchronous telemetry sampling integrated with Virtual Sensor Registry
 *  - Versioned JSON Telemetry Frame serialization
 *  - Independent multi-car telemetry streaming pipeline (Cars 1 to 6)
 *  - Rule-based diagnostic decision support (Threshold, Trend, and Predictive)
 *  - Closed-loop feedback mechanism connecting pitwall actions to physics
 *  - Full multi-parameter CSV telemetry recording & export
 * ============================================================================
 */

class TelemetryEngine {
  constructor(vehiclePhysics, track) {
    this.physics = vehiclePhysics;
    this.track = track;
    this.config = window.F1_CONFIG;

    this.sampleRateHz = 20; // 20 Hz
    this.sampleIntervalMs = 50; // 50 ms
    this.lastSampleTimeMs = 0;
    this.masterSequence = 1000;
    this.targetCarIndex = 0;

    // Rolling Live Telemetry Buffer (for 60fps canvas wave charts)
    this.maxBufferSize = 400;
    this.rollingBuffer = [];

    // Lap Archive (stores full telemetry traces for completed laps)
    this.lapArchives = {}; // { 1: [samples], 2: [samples] }
    this.currentLapSamples = [];
    this.referenceLapNumber = null;

    // Diagnostic Decision Support State (Module 06)
    this.eventLog = [];
    this.maxEventLogs = 150;
    this.activeEvents = new Map(); // Key: eventId, Value: eventObj
    this.resolvedEvents = [];
    this.faultStats = {
      detected: 0,
      resolved: 0,
      activeWarnings: 0,
      activeCritical: 0
    };

    // Trend analysis trackers (for rate-of-change detection)
    this.lastTpmsCheck = { fl: 22.5, fr: 22.5, rl: 20.5, rr: 20.5, time: 0 };
    this.lastVibrationAlertTime = 0;
    this.lastEngineAlertTime = 0;
    this.lastTireAlertTime = 0;
    this.lastBrakeAlertTime = 0;
    this.lastSensorDisconnectAlertTime = new Map();
    this.brakePointTurn1 = null;

    // Current urgent banner alert for UI toast
    this.currentUrgentAlert = null;
  }

  setTargetPhysics(newPhysics, carIndex = 0) {
    if (!newPhysics) return;
    this.physics = newPhysics;
    this.targetCarIndex = carIndex;
    this.rollingBuffer = [];
    this.currentLapSamples = [];
    this.brakePointTurn1 = null;
  }

  update(currentSessionTimeMs) {
    if (currentSessionTimeMs - this.lastSampleTimeMs < this.sampleIntervalMs) {
      return null;
    }

    this.lastSampleTimeMs = currentSessionTimeMs;
    this.masterSequence++;

    // 1. Capture Raw Simulation Physics State into Telemetry Frame
    const packet = this.buildTelemetryPacket(this.physics, this.targetCarIndex, currentSessionTimeMs);

    // 2. Append to Rolling Live Buffer
    this.rollingBuffer.push(packet);
    if (this.rollingBuffer.length > this.maxBufferSize) {
      this.rollingBuffer.shift();
    }

    // 3. Append to Current Lap Archive
    this.currentLapSamples.push(packet);

    // 4. Run Rule-Based Engineering Diagnostics Engine
    this.evaluateDiagnosticRules(packet, currentSessionTimeMs);

    return packet;
  }

  // Multi-vehicle sampling for all 6 cars
  updateAllCars(allPhysicsList, currentSessionTimeMs) {
    const packets = [];
    allPhysicsList.forEach((phys, idx) => {
      const p = this.buildTelemetryPacket(phys, idx, currentSessionTimeMs);
      packets.push(p);
    });
    return packets;
  }

  buildTelemetryPacket(phys, carIdx, timestampMs) {
    const progress = phys.trackProgress || { distance: 0, u: 0, lateralOffset: 0, sector: 1, isOffTrack: false, isOnKerb: false };
    const deltaSeconds = this.calculateDeltaAtDistance(progress.distance, phys.currentLapTime);

    // Sample from formal Virtual Sensor Registry
    let sensorReadings = {};
    if (window.f1SensorRegistry) {
      sensorReadings = window.f1SensorRegistry.sampleCar(carIdx, phys, timestampMs);
    }

    const deviceId = `F1_CAR_${String(carIdx + 1).padStart(2, '0')}`;
    const driverCode = phys.driver ? phys.driver.code : `CAR_${carIdx + 1}`;
    const driverName = phys.driver ? phys.driver.name : `Driver ${carIdx + 1}`;
    const team = phys.driver ? phys.driver.team : 'F1 Team';

    // Build structured versioned IoT packet
    return {
      version: "2.0",
      device_id: deviceId,
      car_index: carIdx,
      driver_code: driverCode,
      driver_name: driverName,
      team: team,
      timestamp_ms: timestampMs,
      sequence: this.masterSequence,

      // Formal Sensor Subsystem Map
      sensors: sensorReadings,

      // Telemetry Kinematics & Powertrain Channels
      speed_kmh: Number(phys.speedKmh.toFixed(1)),
      engine_rpm: Math.round(phys.rpm),
      gear: phys.gear,
      throttle_pct: Math.round(phys.throttle * 100),
      brake_pct: Math.round(phys.brake * 100),
      steering_angle_deg: Number(THREE.MathUtils.radToDeg(phys.steerAngle).toFixed(2)),
      longitudinal_g: Number(phys.longitudinalG.toFixed(2)),
      lateral_g: Number(phys.lateralG.toFixed(2)),
      vibration_g: Number((phys.vibrationG !== undefined ? phys.vibrationG : 0.45).toFixed(2)),
      wheel_slip_pct: Number((phys.wheelSlip * 100).toFixed(1)),
      drs_status: phys.drsActive ? "OPEN" : "CLOSED",
      ers_soc_pct: Number((phys.ersBatterySoc * 100).toFixed(1)),
      fuel_remaining_kg: Number(phys.fuelRemaining_kg.toFixed(2)),

      // Thermal & Tire Pressure Channels
      engine_temp_c: Number(phys.engineTemp_C.toFixed(1)),
      tires: {
        fl_temp_c: Number(phys.tires.fl.temp.toFixed(1)),
        fr_temp_c: Number(phys.tires.fr.temp.toFixed(1)),
        rl_temp_c: Number(phys.tires.rl.temp.toFixed(1)),
        rr_temp_c: Number(phys.tires.rr.temp.toFixed(1)),
        fl_pressure_psi: Number(phys.tires.fl.pressure_psi.toFixed(2)),
        fr_pressure_psi: Number(phys.tires.fr.pressure_psi.toFixed(2)),
        rl_pressure_psi: Number(phys.tires.rl.pressure_psi.toFixed(2)),
        rr_pressure_psi: Number(phys.tires.rr.pressure_psi.toFixed(2)),
        fl_pressure_bar: Number((phys.tires.fl.pressure_psi / 14.5038).toFixed(2)),
        fr_pressure_bar: Number((phys.tires.fr.pressure_psi / 14.5038).toFixed(2)),
        rl_pressure_bar: Number((phys.tires.rl.pressure_psi / 14.5038).toFixed(2)),
        rr_pressure_bar: Number((phys.tires.rr.pressure_psi / 14.5038).toFixed(2)),
        avg_wear_pct: Number(((phys.tires.fl.wear + phys.tires.fr.wear + phys.tires.rl.wear + phys.tires.rr.wear) / 4).toFixed(1))
      },
      brakes: {
        fl_temp_c: Math.round(phys.brakes.fl.temp),
        fr_temp_c: Math.round(phys.brakes.fr.temp),
        rl_temp_c: Math.round(phys.brakes.rl.temp),
        rr_temp_c: Math.round(phys.brakes.rr.temp)
      },

      // Positioning & Timing Transponders
      lap_number: phys.lapCount,
      lap_time_s: Number(phys.currentLapTime.toFixed(3)),
      last_lap_time_s: Number(phys.lastLapTime.toFixed(3)),
      best_lap_time_s: Number(phys.bestLapTime.toFixed(3)),
      delta_s: Number(deltaSeconds.toFixed(3)),
      current_sector: progress.sector,
      sector_1_time_s: Number(phys.sector1Time.toFixed(3)),
      sector_2_time_s: Number(phys.sector2Time.toFixed(3)),
      track_distance_m: Math.round(progress.distance),
      track_progress_pct: Number((progress.u * 100).toFixed(2)),
      lateral_offset_m: Number(progress.lateralOffset.toFixed(2)),
      is_off_track: progress.isOffTrack,
      is_on_kerb: progress.isOnKerb,
      world_pos: {
        x: Number(phys.position.x.toFixed(1)),
        y: Number(phys.position.y.toFixed(1)),
        z: Number(phys.position.z.toFixed(1))
      },

      // Active Engineering Interventions
      interventions: {
        engine_cooling_mode: phys.engineCoolingMode,
        lift_and_coast: phys.liftAndCoastActive,
        brake_bias_rear_offset: phys.brakeBiasRearOffset,
        pit_stop_active: phys.isPitStopping
      },

      // Overall System Health Status
      status: this.getOverallVehicleStatus(phys, sensorReadings)
    };
  }

  getOverallVehicleStatus(phys, sensors) {
    // Check if any sensor is critical
    if (sensors) {
      for (const k in sensors) {
        if (sensors[k].status === 'CRITICAL') return 'CRITICAL';
      }
    }
    if (phys.engineTemp_C >= 114.0 || phys.brakes.fl.temp >= 980.0 || (phys.vibrationG && phys.vibrationG >= 3.2)) {
      return "CRITICAL";
    }
    if (phys.engineTemp_C >= 106.0 || phys.tires.fl.temp >= 112.0 || phys.tires.fr.temp >= 112.0 || phys.brakes.fl.temp >= 840.0) {
      return "WARNING";
    }
    return "ONLINE";
  }

  calculateDeltaAtDistance(currentDistance, currentLapTime) {
    if (!this.referenceLapNumber || !this.lapArchives[this.referenceLapNumber]) {
      return 0.0;
    }

    const refSamples = this.lapArchives[this.referenceLapNumber];
    let closestRef = refSamples[0];
    let minDiff = Infinity;
    for (let i = 0; i < refSamples.length; i++) {
      const diff = Math.abs(refSamples[i].track_distance_m - currentDistance);
      if (diff < minDiff) {
        minDiff = diff;
        closestRef = refSamples[i];
      }
    }

    if (closestRef) {
      return currentLapTime - closestRef.lap_time_s;
    }
    return 0.0;
  }

  onLapComplete(lapNumber) {
    if (this.currentLapSamples.length > 0) {
      this.lapArchives[lapNumber] = [...this.currentLapSamples];
      if (!this.referenceLapNumber || this.physics.lastLapTime <= this.physics.bestLapTime) {
        this.referenceLapNumber = lapNumber;
      }
      this.currentLapSamples = [];
      this.logEvent("INFO", "TIMING", `Lap ${lapNumber} completed: ${this.physics.lastLapTime.toFixed(3)}s. Sector Splits: S1 ${this.physics.sector1Time.toFixed(3)}s | S2 ${this.physics.sector2Time.toFixed(3)}s | S3 ${this.physics.sector3Time.toFixed(3)}s.`);
    }
  }

  // --------------------------------------------------------------------------
  // RULE-BASED DIAGNOSTIC DECISION SUPPORT ENGINE (MODULE 06)
  // --------------------------------------------------------------------------
  evaluateDiagnosticRules(packet, timestampMs) {
    const t = this.config.THRESHOLDS;
    const phys = this.physics;

    // Check sensor connectivity drops
    if (window.f1SensorRegistry) {
      const sensors = window.f1SensorRegistry.getCarSensors(this.targetCarIndex);
      sensors.forEach(s => {
        if (!s.connected) {
          const lastAlert = this.lastSensorDisconnectAlertTime.get(s.id) || 0;
          if (timestampMs - lastAlert > 8000) {
            this.lastSensorDisconnectAlertTime.set(s.id, timestampMs);
            this.raiseDiagnosticEvent({
              sensorId: s.id,
              sensorName: s.name,
              category: 'CONNECTIVITY',
              severity: 'CRITICAL',
              measuredValue: 'DISCONNECTED',
              threshold: 'CONNECTED',
              consequence: 'Telemetry packet gap on Edge bus. Safety transponder blind spot.',
              recommendation: 'Reboot CAN-FD bus channel & reconnect sensor.',
              actionType: 'RECONNECT_SENSOR',
              actionParam: s.id
            });
          }
        }
      });
    }

    // Rule 1: Engine Overheating (Threshold Based)
    if (packet.engine_temp_c >= t.ENGINE_TEMP.CRITICAL_C) {
      if (timestampMs - this.lastEngineAlertTime > 6000) {
        this.lastEngineAlertTime = timestampMs;
        this.raiseDiagnosticEvent({
          sensorId: 'ENG-T01',
          sensorName: 'ICE Coolant Radiator Thermistor',
          category: 'POWERTRAIN_THERMAL',
          severity: 'CRITICAL',
          measuredValue: `${packet.engine_temp_c}°C`,
          threshold: '114.0°C',
          consequence: 'Thermal cylinder head distortion & catastrophic blown head gasket risk.',
          recommendation: 'Command Engine Map 3 Cooling & enforce 90m Lift-and-Coast.',
          actionType: 'COOLING_MODE'
        });
      }
    } else if (packet.engine_temp_c >= t.ENGINE_TEMP.WARNING_C) {
      if (timestampMs - this.lastEngineAlertTime > 8000) {
        this.lastEngineAlertTime = timestampMs;
        this.raiseDiagnosticEvent({
          sensorId: 'ENG-T01',
          sensorName: 'ICE Coolant Radiator Thermistor',
          category: 'POWERTRAIN_THERMAL',
          severity: 'WARNING',
          measuredValue: `${packet.engine_temp_c}°C`,
          threshold: '106.0°C',
          consequence: 'Elevated coolant temperature under sustained 350 km/h aero load.',
          recommendation: 'Short-shift at 13,000 RPM on main straight to lower thermal flux.',
          actionType: 'LIFT_AND_COAST'
        });
      }
    }

    // Rule 2: Tire Pressure Decay / TPMS Micro-Leak (Trend Rate-of-Change Based)
    const tpmsNow = packet.tires.fl_pressure_psi;
    if (this.lastTpmsCheck.time > 0) {
      const dtSec = (timestampMs - this.lastTpmsCheck.time) / 1000;
      if (dtSec >= 1.0) {
        const decayRate = (this.lastTpmsCheck.fl - tpmsNow) / dtSec; // psi per second
        if (decayRate > 0.08 || tpmsNow < 18.0) {
          this.raiseDiagnosticEvent({
            sensorId: 'TPMS-01',
            sensorName: 'Front-Left TPMS Pressure Transducer',
            category: 'TIRE_PRESSURE',
            severity: tpmsNow < 18.0 ? 'CRITICAL' : 'WARNING',
            measuredValue: `${tpmsNow.toFixed(1)} psi (-${(decayRate * 60).toFixed(1)} psi/min)`,
            threshold: '21.0 psi nominal',
            consequence: 'Rapid rim carcass deflation. Sidewall blowout hazard into Parabolica.',
            recommendation: 'Box this lap: Execute immediate pit stop for fresh Pirelli soft slicks.',
            actionType: 'PIT_STOP'
          });
        }
        this.lastTpmsCheck.fl = tpmsNow;
        this.lastTpmsCheck.time = timestampMs;
      }
    } else {
      this.lastTpmsCheck.time = timestampMs;
      this.lastTpmsCheck.fl = tpmsNow;
    }

    // Rule 3: Carbon-Carbon Brake Overheating (Threshold Based)
    const maxBrakeTemp = Math.max(packet.brakes.fl_temp_c, packet.brakes.fr_temp_c);
    if (maxBrakeTemp >= t.BRAKE_TEMP.HOT_CRIT_C) {
      if (timestampMs - this.lastBrakeAlertTime > 6000) {
        this.lastBrakeAlertTime = timestampMs;
        this.raiseDiagnosticEvent({
          sensorId: 'BRK-T01',
          sensorName: 'Front Carbon Rotor Optical Sensor',
          category: 'BRAKE_THERMAL',
          severity: 'CRITICAL',
          measuredValue: `${maxBrakeTemp}°C`,
          threshold: '980°C',
          consequence: 'Hydraulic brake fluid boiling & structural carbon disc oxidation glazing.',
          recommendation: 'Shift brake bias +4% rearward and open brake cooling ducts.',
          actionType: 'BRAKE_BIAS_REAR',
          actionParam: 0.04
        });
      }
    } else if (maxBrakeTemp >= t.BRAKE_TEMP.HOT_WARN_C) {
      if (timestampMs - this.lastBrakeAlertTime > 8000) {
        this.lastBrakeAlertTime = timestampMs;
        this.raiseDiagnosticEvent({
          sensorId: 'BRK-T01',
          sensorName: 'Front Carbon Rotor Optical Sensor',
          category: 'BRAKE_THERMAL',
          severity: 'WARNING',
          measuredValue: `${maxBrakeTemp}°C`,
          threshold: '840°C',
          consequence: 'Severe rotor thermal spikes post-Turn 1 braking deceleration.',
          recommendation: 'Extend braking markers by 15 meters; engage lift-and-coast.',
          actionType: 'LIFT_AND_COAST'
        });
      }
    }

    // Rule 4: Mechanical Vibration Anomaly (Structural Health)
    if (packet.vibration_g >= 2.5) {
      if (timestampMs - this.lastVibrationAlertTime > 7000) {
        this.lastVibrationAlertTime = timestampMs;
        this.raiseDiagnosticEvent({
          sensorId: 'VIB-01',
          sensorName: 'Piezoelectric Bulkhead Vibration Accelerometer',
          category: 'STRUCTURAL_HEALTH',
          severity: packet.vibration_g >= 3.2 ? 'CRITICAL' : 'WARNING',
          measuredValue: `${packet.vibration_g.toFixed(2)}G RMS`,
          threshold: '1.80G RMS',
          consequence: 'Excessive high-frequency chatter. Suspension wishbone fastener play.',
          recommendation: 'Execute damper recalibration & inspect telemetry harmonic frequency.',
          actionType: 'RECALIBRATE_DAMPER'
        });
      }
    }
  }

  raiseDiagnosticEvent(evtData) {
    const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100)}`;
    const timeStr = new Date().toTimeString().split(' ')[0] + '.' + Math.floor((Date.now() % 1000) / 100);

    const event = {
      id: eventId,
      time: timeStr,
      timestamp_ms: Date.now(),
      vehicle_id: `F1_CAR_${String(this.targetCarIndex + 1).padStart(2, '0')}`,
      driver_name: this.physics.driver.name,
      sensor_id: evtData.sensorId,
      sensor_name: evtData.sensorName,
      category: evtData.category,
      severity: evtData.severity, // 'WARNING' | 'CRITICAL' | 'INFO'
      measured_value: evtData.measuredValue,
      threshold: evtData.threshold,
      consequence: evtData.consequence,
      recommendation: evtData.recommendation,
      action_type: evtData.actionType,
      action_param: evtData.actionParam,
      resolved: false
    };

    this.activeEvents.set(eventId, event);
    this.eventLog.unshift(event);
    if (this.eventLog.length > this.maxEventLogs) {
      this.eventLog.pop();
    }

    this.faultStats.detected++;
    if (event.severity === 'CRITICAL') this.faultStats.activeCritical++;
    else if (event.severity === 'WARNING') this.faultStats.activeWarnings++;

    // Urgent banner toast
    this.currentUrgentAlert = {
      id: eventId,
      type: event.severity,
      icon: event.severity === 'CRITICAL' ? '🚨' : '⚠️',
      title: `${event.severity}: ${event.sensor_id} (${event.category})`,
      desc: `${event.sensor_name}: ${event.measured_value} (Threshold: ${event.threshold}). ${event.consequence}`,
      action: event.recommendation,
      actionType: event.action_type,
      actionParam: event.action_param
    };

    if (window.f1Audio && window.f1Audio.playPitRadioAlert) {
      window.f1Audio.playPitRadioAlert();
    }

    return event;
  }

  // --------------------------------------------------------------------------
  // CLOSED-LOOP ENGINEERING ACTION EXECUTION
  // --------------------------------------------------------------------------
  executeEngineeringAction(actionType, param) {
    if (!this.physics) return;

    // Apply directly into vehicle physical dynamics
    this.physics.applyEngineeringAction(actionType, param);

    // If reconnecting a sensor
    if (actionType === 'RECONNECT_SENSOR' && window.f1SensorRegistry) {
      window.f1SensorRegistry.reconnectSensor(this.targetCarIndex, param);
    }

    // Resolve matching active events
    for (const [id, evt] of this.activeEvents.entries()) {
      if (evt.action_type === actionType || actionType === 'RESET_ALL') {
        evt.resolved = true;
        this.resolvedEvents.push(evt);
        this.activeEvents.delete(id);
        this.faultStats.resolved++;
        if (evt.severity === 'CRITICAL' && this.faultStats.activeCritical > 0) this.faultStats.activeCritical--;
        if (evt.severity === 'WARNING' && this.faultStats.activeWarnings > 0) this.faultStats.activeWarnings--;
      }
    }

    // Log resolution confirmation
    this.logEvent("SUCCESS", "INTERVENTION", `Action [${actionType}] executed by Race Engineer. Physics parameters restored.`);
    
    // Clear urgent alert banner
    this.currentUrgentAlert = null;
  }

  logEvent(severity, subsystem, message) {
    const timeStr = new Date().toTimeString().split(' ')[0] + '.' + Math.floor((Date.now() % 1000) / 100);
    const event = {
      id: `EVT-${Date.now().toString(36).toUpperCase()}`,
      time: timeStr,
      timestamp_ms: Date.now(),
      vehicle_id: `F1_CAR_${String(this.targetCarIndex + 1).padStart(2, '0')}`,
      severity: severity,
      subsystem: subsystem,
      message: message,
      resolved: true
    };

    this.eventLog.unshift(event);
    if (this.eventLog.length > this.maxEventLogs) {
      this.eventLog.pop();
    }
  }

  // --------------------------------------------------------------------------
  // FULL CSV TELEMETRY EXPORT (MODULE 02 / 10)
  // --------------------------------------------------------------------------
  exportFullCSV() {
    const headers = [
      "Timestamp_ms",
      "Sequence",
      "Car_ID",
      "Driver",
      "Lap",
      "Lap_Time_s",
      "Distance_m",
      "Sector",
      "Speed_kmh",
      "RPM",
      "Gear",
      "Throttle_pct",
      "Brake_pct",
      "Steer_deg",
      "Long_G",
      "Lat_G",
      "Vibration_G",
      "Engine_Temp_C",
      "Tire_FL_C",
      "Tire_FR_C",
      "Tire_RL_C",
      "Tire_RR_C",
      "TPMS_FL_psi",
      "TPMS_FR_psi",
      "TPMS_RL_psi",
      "TPMS_RR_psi",
      "Brake_FL_C",
      "Brake_FR_C",
      "Brake_RL_C",
      "Brake_RR_C",
      "Tire_Wear_pct",
      "ERS_SoC_pct",
      "Status"
    ];

    const rows = [headers.join(",")];
    const dataPool = this.rollingBuffer.length > 0 ? this.rollingBuffer : this.currentLapSamples;

    dataPool.forEach(p => {
      const row = [
        p.timestamp_ms,
        p.sequence,
        p.device_id,
        `"${p.driver_name}"`,
        p.lap_number,
        p.lap_time_s,
        p.track_distance_m,
        p.current_sector,
        p.speed_kmh,
        p.engine_rpm,
        p.gear,
        p.throttle_pct,
        p.brake_pct,
        p.steering_angle_deg,
        p.longitudinal_g,
        p.lateral_g,
        p.vibration_g,
        p.engine_temp_c,
        p.tires.fl_temp_c,
        p.tires.fr_temp_c,
        p.tires.rl_temp_c,
        p.tires.rr_temp_c,
        p.tires.fl_pressure_psi,
        p.tires.fr_pressure_psi,
        p.tires.rl_pressure_psi,
        p.tires.rr_pressure_psi,
        p.brakes.fl_temp_c,
        p.brakes.fr_temp_c,
        p.brakes.rl_temp_c,
        p.brakes.rr_temp_c,
        p.tires.avg_wear_pct,
        p.ers_soc_pct,
        p.status
      ];
      rows.push(row.join(","));
    });

    return rows.join("\n");
  }
}

window.TelemetryEngine = TelemetryEngine;
