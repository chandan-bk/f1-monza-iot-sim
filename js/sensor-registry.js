/**
 * ============================================================================
 * IoT SENSOR REGISTRY & VIRTUAL HARDWARE ACQUISITION LAYER
 * Formula 1 IoT Telemetry & Intelligent Race Monitoring System 2.0
 * ============================================================================
 * Formally models all onboard Formula 1 sensors as individual IoT Edge devices:
 *  - Unique sensor IDs (SPD-01, RPM-01, ENG-T01, TPMS-01..04, BRK-T01..04, etc.)
 *  - Configured vs measured sampling frequencies
 *  - Connection state (ONLINE, WARNING, CRITICAL, OFFLINE)
 *  - Interactive disconnect / reconnect / fault injection controls
 *  - No stale data masquerading as valid when disconnected
 * ============================================================================
 */

(function(global) {
  'use strict';

  // Standard Sensor Template Definitions
  const SENSOR_DEFINITIONS = [
    {
      id: 'SPD-01',
      name: 'Hall Effect Wheel & Pitot Speed Sensor',
      subsystem: 'KINEMATICS',
      unit: 'km/h',
      configuredHz: 20,
      nominalMin: 0,
      nominalMax: 360,
      warnHigh: 355,
      critHigh: 365,
      location: { x: 0.0, y: 0.42, z: 2.1, component: 'Chassis Nosecone / Pitot Tube' },
      extract: (phys) => Number(phys.speedKmh.toFixed(1))
    },
    {
      id: 'RPM-01',
      name: 'Crankshaft Optical Encoder Tachometer',
      subsystem: 'POWERTRAIN',
      unit: 'RPM',
      configuredHz: 20,
      nominalMin: 4000,
      nominalMax: 15000,
      warnHigh: 14800,
      critHigh: 15200,
      location: { x: 0.0, y: 0.45, z: -0.5, component: 'ICE Crankcase Internal' },
      extract: (phys) => Math.round(phys.rpm)
    },
    {
      id: 'ENG-T01',
      name: 'ICE Coolant Radiator Thermistor',
      subsystem: 'POWERTRAIN_THERMAL',
      unit: '°C',
      configuredHz: 10,
      nominalMin: 95.0,
      nominalMax: 105.0,
      warnHigh: 106.0,
      critHigh: 114.0,
      location: { x: 0.4, y: 0.5, z: -0.7, component: 'Right Sidepod Radiator Core' },
      extract: (phys) => Number(phys.engineTemp_C.toFixed(1))
    },
    {
      id: 'TIRE-FL-01',
      name: 'Front-Left Optical Infrared Tire Pyrometer',
      subsystem: 'TIRE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 80.0,
      nominalMax: 105.0,
      warnLow: 75.0,
      warnHigh: 112.0,
      critHigh: 122.0,
      location: { x: -0.95, y: 0.35, z: 1.6, component: 'Front-Left Wheel Upright' },
      extract: (phys) => Number(phys.tires.fl.temp.toFixed(1))
    },
    {
      id: 'TIRE-FR-01',
      name: 'Front-Right Optical Infrared Tire Pyrometer',
      subsystem: 'TIRE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 80.0,
      nominalMax: 105.0,
      warnLow: 75.0,
      warnHigh: 112.0,
      critHigh: 122.0,
      location: { x: 0.95, y: 0.35, z: 1.6, component: 'Front-Right Wheel Upright' },
      extract: (phys) => Number(phys.tires.fr.temp.toFixed(1))
    },
    {
      id: 'TIRE-RL-01',
      name: 'Rear-Left Optical Infrared Tire Pyrometer',
      subsystem: 'TIRE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 85.0,
      nominalMax: 108.0,
      warnLow: 75.0,
      warnHigh: 114.0,
      critHigh: 124.0,
      location: { x: -0.95, y: 0.35, z: -1.6, component: 'Rear-Left Wheel Upright' },
      extract: (phys) => Number(phys.tires.rl.temp.toFixed(1))
    },
    {
      id: 'TIRE-RR-01',
      name: 'Rear-Right Optical Infrared Tire Pyrometer',
      subsystem: 'TIRE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 85.0,
      nominalMax: 108.0,
      warnLow: 75.0,
      warnHigh: 114.0,
      critHigh: 124.0,
      location: { x: 0.95, y: 0.35, z: -1.6, component: 'Rear-Right Wheel Upright' },
      extract: (phys) => Number(phys.tires.rr.temp.toFixed(1))
    },
    {
      id: 'TPMS-01',
      name: 'Front-Left Rim Rim-Mounted TPMS Transducer',
      subsystem: 'TIRE_PRESSURE',
      unit: 'psi',
      configuredHz: 5,
      nominalMin: 21.0,
      nominalMax: 23.5,
      warnLow: 20.0,
      critLow: 18.0,
      location: { x: -0.92, y: 0.35, z: 1.6, component: 'Front-Left Wheel Rim' },
      extract: (phys) => Number((phys.tires.fl.pressure_psi !== undefined ? phys.tires.fl.pressure_psi : (phys.tires.fl.pressure * 14.5038)).toFixed(2))
    },
    {
      id: 'TPMS-02',
      name: 'Front-Right Rim Rim-Mounted TPMS Transducer',
      subsystem: 'TIRE_PRESSURE',
      unit: 'psi',
      configuredHz: 5,
      nominalMin: 21.0,
      nominalMax: 23.5,
      warnLow: 20.0,
      critLow: 18.0,
      location: { x: 0.92, y: 0.35, z: 1.6, component: 'Front-Right Wheel Rim' },
      extract: (phys) => Number((phys.tires.fr.pressure_psi !== undefined ? phys.tires.fr.pressure_psi : (phys.tires.fr.pressure * 14.5038)).toFixed(2))
    },
    {
      id: 'TPMS-03',
      name: 'Rear-Left Rim Rim-Mounted TPMS Transducer',
      subsystem: 'TIRE_PRESSURE',
      unit: 'psi',
      configuredHz: 5,
      nominalMin: 19.5,
      nominalMax: 21.5,
      warnLow: 18.5,
      critLow: 16.5,
      location: { x: -0.92, y: 0.35, z: -1.6, component: 'Rear-Left Wheel Rim' },
      extract: (phys) => Number((phys.tires.rl.pressure_psi !== undefined ? phys.tires.rl.pressure_psi : (phys.tires.rl.pressure * 14.5038)).toFixed(2))
    },
    {
      id: 'TPMS-04',
      name: 'Rear-Right Rim Rim-Mounted TPMS Transducer',
      subsystem: 'TIRE_PRESSURE',
      unit: 'psi',
      configuredHz: 5,
      nominalMin: 19.5,
      nominalMax: 21.5,
      warnLow: 18.5,
      critLow: 16.5,
      location: { x: 0.92, y: 0.35, z: -1.6, component: 'Rear-Right Wheel Rim' },
      extract: (phys) => Number((phys.tires.rr.pressure_psi !== undefined ? phys.tires.rr.pressure_psi : (phys.tires.rr.pressure * 14.5038)).toFixed(2))
    },
    {
      id: 'BRK-T01',
      name: 'Front-Left Carbon Rotor Infrared Sensor',
      subsystem: 'BRAKE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 320,
      nominalMax: 820,
      warnHigh: 840,
      critHigh: 980,
      location: { x: -0.88, y: 0.35, z: 1.6, component: 'Front-Left Carbon Disc Caliper' },
      extract: (phys) => Math.round(phys.brakes.fl.temp)
    },
    {
      id: 'BRK-T02',
      name: 'Front-Right Carbon Rotor Infrared Sensor',
      subsystem: 'BRAKE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 320,
      nominalMax: 820,
      warnHigh: 840,
      critHigh: 980,
      location: { x: 0.88, y: 0.35, z: 1.6, component: 'Front-Right Carbon Disc Caliper' },
      extract: (phys) => Math.round(phys.brakes.fr.temp)
    },
    {
      id: 'BRK-T03',
      name: 'Rear-Left Carbon Rotor Infrared Sensor',
      subsystem: 'BRAKE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 300,
      nominalMax: 780,
      warnHigh: 820,
      critHigh: 950,
      location: { x: -0.88, y: 0.35, z: -1.6, component: 'Rear-Left Carbon Disc Caliper' },
      extract: (phys) => Math.round(phys.brakes.rl.temp)
    },
    {
      id: 'BRK-T04',
      name: 'Rear-Right Carbon Rotor Infrared Sensor',
      subsystem: 'BRAKE_THERMAL',
      unit: '°C',
      configuredHz: 20,
      nominalMin: 300,
      nominalMax: 780,
      warnHigh: 820,
      critHigh: 950,
      location: { x: 0.88, y: 0.35, z: -1.6, component: 'Rear-Right Carbon Disc Caliper' },
      extract: (phys) => Math.round(phys.brakes.rr.temp)
    },
    {
      id: 'ACC-01',
      name: 'Tri-Axial MEMS Accelerometer (X/Y/Z G)',
      subsystem: 'INERTIAL_DYNAMICS',
      unit: 'G',
      configuredHz: 20,
      nominalMin: -5.5,
      nominalMax: 5.5,
      warnHigh: 5.0,
      critHigh: 5.8,
      location: { x: 0.0, y: 0.28, z: 0.0, component: 'Center of Gravity / Chassis ECU' },
      extract: (phys) => ({
        x: Number((phys.lateralG || 0).toFixed(2)),
        y: Number((phys.longitudinalG || 0).toFixed(2)),
        z: Number((1.0 + (Math.abs(phys.lateralG) * 0.1)).toFixed(2))
      })
    },
    {
      id: 'GYR-01',
      name: 'Coriolis MEMS Yaw Gyroscope',
      subsystem: 'INERTIAL_DYNAMICS',
      unit: 'deg/s',
      configuredHz: 20,
      nominalMin: -120.0,
      nominalMax: 120.0,
      warnHigh: 90.0,
      critHigh: 110.0,
      location: { x: 0.0, y: 0.3, z: 0.0, component: 'Inertial Measurement Unit (IMU)' },
      extract: (phys) => Number(((phys.angularVelocity || (phys.steerAngle * 45)) * (180 / Math.PI)).toFixed(1))
    },
    {
      id: 'VIB-01',
      name: 'Piezoelectric High-Frequency Vibration Sensor',
      subsystem: 'STRUCTURAL_HEALTH',
      unit: 'G RMS',
      configuredHz: 20,
      nominalMin: 0.2,
      nominalMax: 1.5,
      warnHigh: 2.2,
      critHigh: 3.5,
      location: { x: 0.0, y: 0.22, z: 0.8, component: 'Front Suspension Bulkhead' },
      extract: (phys) => Number((phys.vibrationG !== undefined ? phys.vibrationG : 0.65).toFixed(2))
    },
    {
      id: 'GPS-01',
      name: 'Centimeter RTK GNSS & Spline Tracker',
      subsystem: 'POSITIONING',
      unit: 'meters',
      configuredHz: 10,
      nominalMin: 0,
      nominalMax: 5793,
      location: { x: 0.0, y: 0.96, z: -0.15, component: 'Roll-Hoop T-Cam Antenna' },
      extract: (phys) => ({
        distance_m: Number(phys.trackDistance.toFixed(1)),
        lateral_offset_m: Number(phys.lateralOffset.toFixed(2)),
        sector: phys.trackProgress ? phys.trackProgress.sector : 1,
        lap: phys.lapCount
      })
    }
  ];

  class VirtualSensor {
    constructor(definition, carIndex, driverConfig) {
      this.def = definition;
      this.id = definition.id;
      this.name = definition.name;
      this.subsystem = definition.subsystem;
      this.unit = definition.unit;
      this.configuredHz = definition.configuredHz;
      this.location = definition.location;
      this.carIndex = carIndex;
      this.driverCode = driverConfig.code || `CAR_${carIndex + 1}`;
      this.carName = driverConfig.name;

      // State
      this.connected = true;
      this.enabled = true;
      this.status = 'ONLINE'; // 'ONLINE' | 'WARNING' | 'CRITICAL' | 'OFFLINE'
      this.currentReading = null;
      this.lastRawReading = null;
      this.lastUpdatedTimestamp = 0;
      this.packetSequence = 0;

      // Fault injection override
      this.fault = null; // null | { mode: 'OVERRIDE' | 'OFFSET' | 'DRIFT' | 'NOISE', value, offset }

      // History buffer for time-series charts (last 60 samples)
      this.history = [];
      this.maxHistory = 60;
    }

    sample(phys, nowTimestampMs) {
      // If sensor is disconnected or disabled, produce NO valid readings
      if (!this.connected || !this.enabled) {
        this.status = 'OFFLINE';
        this.currentReading = null;
        this.lastUpdatedTimestamp = nowTimestampMs;
        return null;
      }

      // Check sampling interval
      const intervalMs = 1000 / this.configuredHz;
      if (nowTimestampMs - this.lastUpdatedTimestamp < intervalMs && this.currentReading !== null) {
        return this.currentReading;
      }

      this.packetSequence++;
      this.lastUpdatedTimestamp = nowTimestampMs;

      // 1. Extract physical value from vehicle model
      let rawVal = null;
      try {
        rawVal = this.def.extract(phys);
      } catch (e) {
        rawVal = 0;
      }
      this.lastRawReading = rawVal;

      // 2. Apply fault overrides if active
      let processedVal = rawVal;
      if (this.fault) {
        if (this.fault.mode === 'OVERRIDE') {
          processedVal = this.fault.value;
        } else if (this.fault.mode === 'OFFSET' && typeof rawVal === 'number') {
          processedVal = Number((rawVal + this.fault.offset).toFixed(2));
        } else if (this.fault.mode === 'NOISE' && typeof rawVal === 'number') {
          const noise = (Math.random() - 0.5) * (this.fault.amplitude || 5);
          processedVal = Number((rawVal + noise).toFixed(2));
        }
      }

      this.currentReading = processedVal;

      // 3. Determine Health Status against engineering thresholds
      this.status = this.evaluateStatus(processedVal);

      // 4. Record to rolling history
      this.history.push({
        t: nowTimestampMs,
        seq: this.packetSequence,
        v: typeof processedVal === 'number' ? processedVal : (processedVal ? processedVal.distance_m || processedVal.y || 0 : 0),
        status: this.status
      });
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      return processedVal;
    }

    evaluateStatus(val) {
      if (!this.connected || !this.enabled) return 'OFFLINE';
      if (val === null || val === undefined) return 'OFFLINE';

      const d = this.def;
      let numVal = val;
      if (typeof val === 'object') {
        if (val.y !== undefined) numVal = Math.abs(val.y); // Accel G
        else if (val.distance_m !== undefined) return 'ONLINE';
      }

      if (typeof numVal !== 'number' || isNaN(numVal)) return 'ONLINE';

      // Check Critical High
      if (d.critHigh !== undefined && numVal >= d.critHigh) return 'CRITICAL';
      // Check Critical Low
      if (d.critLow !== undefined && numVal <= d.critLow) return 'CRITICAL';
      // Check Warning High
      if (d.warnHigh !== undefined && numVal >= d.warnHigh) return 'WARNING';
      // Check Warning Low
      if (d.warnLow !== undefined && numVal <= d.warnLow) return 'WARNING';

      return 'ONLINE';
    }

    disconnect() {
      this.connected = false;
      this.status = 'OFFLINE';
      this.currentReading = null;
    }

    reconnect() {
      this.connected = true;
      this.status = 'ONLINE';
    }

    injectFault(faultConfig) {
      // e.g. { mode: 'OVERRIDE', value: 118.5 }
      this.fault = faultConfig;
    }

    clearFault() {
      this.fault = null;
    }

    toJSONPacket() {
      return {
        device_id: `F1_CAR_${String(this.carIndex + 1).padStart(2, '0')}`,
        driver_code: this.driverCode,
        sensor_id: this.id,
        sensor_name: this.name,
        timestamp: this.lastUpdatedTimestamp,
        sequence: this.packetSequence,
        value: this.currentReading,
        unit: this.unit,
        status: this.status,
        connected: this.connected,
        configured_hz: this.configuredHz
      };
    }
  }

  class SensorRegistry {
    constructor() {
      this.carSensors = new Map(); // carIndex -> Map(sensorId -> VirtualSensor)
      this.initAllCars();
    }

    initAllCars() {
      const drivers = (global.F1_CONFIG && global.F1_CONFIG.DRIVERS) || [
        { code: 'LEC', name: 'Charles Leclerc' },
        { code: 'VER', name: 'Max Verstappen' },
        { code: 'HAM', name: 'Lewis Hamilton' },
        { code: 'NOR', name: 'Lando Norris' },
        { code: 'ALO', name: 'Fernando Alonso' },
        { code: 'GAS', name: 'Pierre Gasly' }
      ];

      drivers.forEach((driver, idx) => {
        const sensorMap = new Map();
        SENSOR_DEFINITIONS.forEach(def => {
          const vs = new VirtualSensor(def, idx, driver);
          sensorMap.set(def.id, vs);
        });
        this.carSensors.set(idx, sensorMap);
      });
    }

    getSensor(carIndex, sensorId) {
      const map = this.carSensors.get(carIndex);
      return map ? map.get(sensorId) : null;
    }

    getCarSensors(carIndex) {
      const map = this.carSensors.get(carIndex);
      return map ? Array.from(map.values()) : [];
    }

    sampleCar(carIndex, phys, timestampMs) {
      const map = this.carSensors.get(carIndex);
      if (!map) return {};

      const results = {};
      for (const [id, sensor] of map.entries()) {
        const val = sensor.sample(phys, timestampMs);
        results[id] = {
          sensor_id: id,
          name: sensor.name,
          value: val,
          unit: sensor.unit,
          status: sensor.status,
          connected: sensor.connected,
          sequence: sensor.packetSequence
        };
      }
      return results;
    }

    disconnectSensor(carIndex, sensorId) {
      const s = this.getSensor(carIndex, sensorId);
      if (s) s.disconnect();
    }

    reconnectSensor(carIndex, sensorId) {
      const s = this.getSensor(carIndex, sensorId);
      if (s) s.reconnect();
    }

    injectFault(carIndex, sensorId, faultConfig) {
      const s = this.getSensor(carIndex, sensorId);
      if (s) s.injectFault(faultConfig);
    }

    clearFault(carIndex, sensorId) {
      const s = this.getSensor(carIndex, sensorId);
      if (s) s.clearFault();
    }

    resetAll(carIndex) {
      const list = this.getCarSensors(carIndex);
      list.forEach(s => {
        s.reconnect();
        s.clearFault();
      });
    }
  }

  // Export globally
  global.SENSOR_DEFINITIONS = SENSOR_DEFINITIONS;
  global.VirtualSensor = VirtualSensor;
  global.SensorRegistry = SensorRegistry;
  global.f1SensorRegistry = new SensorRegistry();

})(typeof window !== 'undefined' ? window : global);
