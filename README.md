# Autodromo Nazionale Monza: Formula 1 IoT Telemetry & Race Monitoring System 2.0

> **Engineering Capstone Project Presentation:**  
> *"Application of IoT in Motorsport: End-to-End Real-Time Race Car Telemetry Pipeline, Virtual Sensor Network, Edge Diagnostics, and Closed-Loop Race Engineering"*  
> **Circuit:** Autodromo Nazionale Monza ("The Temple of Speed" — 5,793m, 11 Turns, 3 Sectors, 2 DRS Zones)  
> **Architecture:** Three.js (WebGL 3D Engine), Curvilinear Dynamics Core, 19-Channel Virtual Sensor Registry, Node.js WebSocket Gateway, REST Ingest, 20Hz Synchronous IoT Telemetry, Automated Rule-Based Diagnostics, Closed-Loop Action Feedback.

---

## 🏎️ 1. Executive Summary & IoT Lifecycle in Formula 1

Formula 1 represents the highest-velocity application of **Internet of Things (IoT) edge telemetry and distributed stream processing** on the planet. During a Grand Prix weekend, each Formula 1 car acts as a mobile high-density IoT sensor network, generating over **1.1 billion telemetry data points** (~3GB per car per race) streamed across ATLAS / MoTeC pitwall telemetry systems.

The primary academic objective of this project is to demonstrate the **complete IoT lifecycle in Formula 1 motorsport**:

```
Virtual Physical Environment
       ↓
Sensor Acquisition (19 Calibrated Edge Sensors)
       ↓
Data Transmission (CAN-FD Framing & Master Sequence)
       ↓
IoT Gateway (Node.js WebSocket Server & REST Ingest)
       ↓
Stream Ingestion & Processing (Schema 2.0 Ring Buffers)
       ↓
Real-Time Monitoring (60fps Rolling Waveforms & Gauges)
       ↓
Fault Detection (Rule-Based Thresholds & Trend Derivation)
       ↓
Race Engineering Decision (Closed Feedback Loop Interventions)
```

This platform demonstrates these concepts through an interactive, software-based simulation designed for presentation to university faculty and engineering examiners.

---

## 🏛️ 2. Six Connected System Modules

The application is structured into six interconnected modules accessible via the top navigation bar:

```
[01 RACE SIM] [02 LIVE TELEMETRY] [03 VIRTUAL SENSORS] [04 NETWORK MONITOR] [05 FAULT SIMULATOR] [06 DECISION SUPPORT]
```

### Module 01: Race Simulation (Virtual Physical Environment)
- **Monza Circuit**: Exact 5,793-meter circuit spline modeling iconic landmarks: Variante del Rettifilo (Turn 1/2), Curva Grande, Variante della Roggia, Curva di Lesmo 1 & 2, Serraglio Straight, Variante Ascari, Curva Parabolica / Alboreto, and the historic 1955 banked oval overpass bridge.
- **6-Car Competitive Grid**: Autonomous AI drivers for Charles Leclerc (#16 Ferrari), Max Verstappen (#1 Red Bull), Lewis Hamilton (#44 Mercedes), Lando Norris (#4 McLaren), Fernando Alonso (#14 Aston Martin), and Pierre Gasly (#10 Alpine).
- **Physical Dynamics**: 1.6L V6 Turbo Hybrid Powertrain with 8-speed sequential gearbox, Pacejka-derived tire friction envelope, ground-effect downforce ($F_{\text{down}} = \frac{1}{2}\rho C_l A v^2$), DRS wing actuation, aerodynamic slipstream drafting (+22 km/h tow boost), and brake thermal dissipation.
- **6 Camera Perspectives**: Cockpit Driver POV (with G-force driver head sway & vibration), Dynamic Chase Camera, Trackside TV Broadcast Towers, High-Altitude Top-Down View, Fixed Monza Pitwall Gantry Overview, and 360° Free Orbit Inspection with mouse drag and wheel zoom.
- **3D Digital Twin Highlighting**: Glowing beacon hotspots placed at actual component coordinates on the 3D car model for all 19 sensors.

### Module 02: Live IoT Telemetry Dashboard
- **Real-Time Gauges**: Vehicle Speed (0–360 km/h), Engine RPM (4,000–15,000), 8-Speed Sequential Gear, Throttle & Brake Pedals (0–100%), Lap Delta vs Reference, ICE Coolant Temperature, Longitudinal & Lateral G-forces ($\pm 5\text{G}$), Hybrid ERS Battery SoC (%), and Fuel Mass (kg).
- **4-Wheel Thermal & Sensor Matrix**: Surface bulk temperature (°C), tire wear degradation (%), carbon-carbon rotor disc temperature (°C), and internal tire pressure (psi/bar) for FL, FR, RL, RR.
- **2D GPS Track Radar**: Live vector radar displaying sector splits, braking marks, and current GPS coordinates of all 6 cars.
- **Live Leaderboard**: Official session timing transponder classification tracking intervals, gaps, and personal best lap times.
- **60fps Rolling Waveforms**: Real-time canvas graphs with Pause/Resume toggle for speed, pedal telemetry, engine RPM, and coolant vs front tire temperatures.
- **G-G Traction Circle**: Live friction circle plotting lateral vs longitudinal tire acceleration against the 5G friction limit.

### Module 03: Virtual Sensor Management
- **19-Sensor Registry**: Formal hardware registry mapping unique sensor IDs to physical car locations, measurement types, units, and CAN-FD bus channels.
- **Sensor Health States**: `ONLINE`, `WARNING`, `CRITICAL`, and `OFFLINE`.
- **Wire-Cut Hardware Simulation**: Disconnect any sensor line in real time; the value immediately cuts to `null` and displays `NO DATA (CUT)` — strictly preventing stale data from masquerading as fresh telemetry.
- **3D Digital Twin Inspection**: One-click locate button focuses the camera and illuminates the 3D sensor beacon directly on the car model.
- **Subsystem Filtering**: Filter registry by ALL, POWERTRAIN, TIRES & TPMS, BRAKES, KINEMATICS, and CHASSIS.

### Module 04: IoT Network Pipeline Monitor
- **Visual Architecture Flow**: Animated pipeline showing data travel from Edge Sensors &rarr; CAN-FD Framing &rarr; WebSocket Gateway (Port 8080) &rarr; Telemetry Ingestion Engine &rarr; Pitwall Dashboard UI.
- **Real Socket Metrics**:
  - Socket Link State (`ONLINE` / `LOCAL`)
  - Connected Client Count (multi-device monitoring)
  - Transmitted & Received Packet Counters
  - Master Packet Sequence ID
  - Packet Loss Percentage (sequence gap detection)
  - Real Ping-Pong RTT Latency in milliseconds
  - Measured Sensor Sampling Frequency (20.0 Hz)
  - Network Throughput in KB/s
- **Live Raw JSON Packet Inspector**: Freeze/Pause streaming and copy raw Schema 2.0 telemetry JSON directly to the clipboard.

### Module 05: Real-Time Fault Injection Simulator
- **Scenario A: ICE Powertrain Overheat**: Injects aerodynamic radiator blockage (50–100%). Coolant temperature climbs past 114°C, triggering engine overheat alerts.
- **Scenario B: Tire Micro-Leak (TPMS)**: Injects slow air leakage (-0.55 psi/sec) on selected tire. Pressure falls below 18.0 psi, risking tread carcass blowout.
- **Scenario C: Carbon Rotor Overheat**: Injects 90% brake duct tape blockage. Rotor pyrometer spikes past 1,020°C into Variante del Rettifilo.
- **Scenario D: Mechanical Vibration Anomaly**: Simulates curb impact damage inducing front suspension chatter (> 3.5G RMS on bulkhead accelerometer VIB-01).
- **Scenario E: Sensor Physical Line Disconnection**: Sever CAN-FD wiring to any sensor; value drops to null and status turns OFFLINE.
- **Scenario F: Wireless Network Degradation**: Simulates microwave multipath interference through Ascari trees (40% packet loss, 140ms RTT delay).
- **Scenario G: Compound Multi-System Crisis**: Triggers simultaneous engine overheating, tire puncture, and brake fade for high-stress race engineer triage.
- **Master Scenario Reset**: One-click restoration of all physical parameters and sensor statuses to nominal operating conditions.

### Module 06: Race Engineer Decision Support (Closed Feedback Loop)
- **Automated Rule Engine**: Evaluates telemetry against safety boundaries and computes rates of change ($dT/dt$, $dP/dt$).
- **Structured Diagnostics**: Displays Sensor ID, Sensor Name, Measured Value vs Calibrated Threshold, Operational Consequence, and Recommended Action.
- **Closed Feedback Loop**: Clicking an intervention button dispatches commands back into the vehicle physics engine:
  - `COOLING_MODE`: Switches ECU engine map and engages 90m Lift-and-Coast, reducing thermal generation by 45%.
  - `PIT_STOP`: Commands vehicle into pit lane for fresh Pirelli tires and pressure restoration to 21.0 psi.
  - `BRAKE_BIAS_REAR`: Adjusts brake bias +4% rearward and moves Turn 1 braking mark back by 20m.
  - `RECALIBRATE_DAMPER`: Electronically retunes active damper valving to dampen suspension oscillation below 1.2G RMS.
  - `RESTORE_NETWORK`: Re-aligns Wi-Fi telemetry repeaters and flushes packet buffers.

---

## 📡 3. 19-Channel Virtual Sensor Registry

| Sensor ID | Sensor Name | Subsystem | Measurement Unit | Calibrated Limits | CAN-FD Bus |
|---|---|---|---|---|---|
| `SPD-01` | Front Wheel Hall Speed Sensor | Kinematics | km/h | 0.0 - 365.0 | CAN-FD #1 |
| `RPM-01` | Crankshaft Magnetic Reluctor | Powertrain | RPM | 4,000 - 15,200 | CAN-FD #1 |
| `ENG-T01` | ICE Coolant Radiator Thermistor | Powertrain | °C | Warn: 106°C / Crit: 114°C | CAN-FD #1 |
| `TIRE-FL-01` | Front-Left Infrared Tire Pyrometer | Tires | °C | Warn: 112°C / Crit: 122°C | CAN-FD #2 |
| `TIRE-FR-01` | Front-Right Infrared Tire Pyrometer | Tires | °C | Warn: 112°C / Crit: 122°C | CAN-FD #2 |
| `TIRE-RL-01` | Rear-Left Infrared Tire Pyrometer | Tires | °C | Warn: 112°C / Crit: 122°C | CAN-FD #2 |
| `TIRE-RR-01` | Rear-Right Infrared Tire Pyrometer | Tires | °C | Warn: 112°C / Crit: 122°C | CAN-FD #2 |
| `TPMS-01` | Front-Left Rim TPMS Transducer | Tires | psi | Warn: 19.0 psi / Crit: 17.5 psi | CAN-FD #2 |
| `TPMS-02` | Front-Right Rim TPMS Transducer | Tires | psi | Warn: 19.0 psi / Crit: 17.5 psi | CAN-FD #2 |
| `TPMS-03` | Rear-Left Rim TPMS Transducer | Tires | psi | Warn: 19.0 psi / Crit: 17.5 psi | CAN-FD #2 |
| `TPMS-04` | Rear-Right Rim TPMS Transducer | Tires | psi | Warn: 19.0 psi / Crit: 17.5 psi | CAN-FD #2 |
| `BRK-T01` | Front-Left Carbon Rotor Optical Sensor | Brakes | °C | Warn: 880°C / Crit: 980°C | CAN-FD #1 |
| `BRK-T02` | Front-Right Carbon Rotor Optical Sensor | Brakes | °C | Warn: 880°C / Crit: 980°C | CAN-FD #1 |
| `BRK-T03` | Rear-Left Carbon Rotor Optical Sensor | Brakes | °C | Warn: 850°C / Crit: 950°C | CAN-FD #1 |
| `BRK-T04` | Rear-Right Carbon Rotor Optical Sensor | Brakes | °C | Warn: 850°C / Crit: 950°C | CAN-FD #1 |
| `ACC-01` | 3-Axis Bulkhead Accelerometer | IMU / Dynamics | G | $\pm 5.5\text{G}$ Long / $\pm 4.8\text{G}$ Lat | CAN-FD #1 |
| `GYR-01` | Solid-State Angular Rate Gyroscope | IMU / Dynamics | deg/s | $\pm 120^\circ/\text{s}$ Yaw Rate | CAN-FD #1 |
| `VIB-01` | Piezoelectric Chassis Vibration Sensor | Chassis Health | G RMS | Warn: 1.8G / Crit: 2.8G | CAN-FD #1 |
| `GPS-01` | Differential GNSS Track Transponder | Navigation | Coordinates | 5,793m Monza Spline | CAN-FD #2 |

---

## 💻 4. Dual-Device / Multi-Monitor Presentation Architecture

For academic examinations and university laboratory presentations, the application supports running the **3D Physics Environment** and the **Pitwall Telemetry Dashboard** across two separate screens or devices simultaneously:

```
┌───────────────────────────────────────┐         ┌───────────────────────────────────────┐
│     DEVICE A: DRIVER POV / 3D SIM     │         │      DEVICE B: PITWALL DASHBOARD      │
│  http://localhost:8080/?mode=sim      │         │  http://localhost:8080/?mode=dashboard│
│                                       │         │                                       │
│  - Full 3D WebGL Scene & Track        │         │  - 20Hz Rolling Canvas Waveforms      │
│  - 6 Camera Perspectives              │         │  - 4-Wheel Thermal Matrix             │
│  - Cockpit Steering Wheel HUD         │         │  - Virtual Sensor Registry Monitor    │
│  - Starting Lights Gantry             │         │  - Real-Time Fault Injection Cockpit  │
└──────────────────┬────────────────────┘         └───────────────────▲───────────────────┘
                   │                                                  │
                   │ WebSocket 20Hz Stream (ws://localhost:8080)      │
                   └───────────────────────►┌─────────────────────────┴───────────────────┐
                                            │      NODE.JS TELEMETRY GATEWAY (PORT 8080)  │
                                            │  - Ingest Dispatcher & Rolling Buffer Cache │
                                            │  - Ping/Pong Heartbeat (RTT Latency)        │
                                            │  - REST Ingest (/api/telemetry/ingest)      │
                                            └─────────────────────────────────────────────┘
```

- **Device A (Screen 1)**: Driver POV / 3D Simulation (`?mode=sim`)
- **Device B (Screen 2)**: Pitwall Race Engineer Dashboard (`?mode=dashboard`)
- Injected faults on Device B immediately propagate to Device A over WebSocket, altering vehicle physics in real time.

---

## 🚀 5. Installation & Execution Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended)
- Any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox)

### Quick Start (Local Server Mode)
```bash
# Clone the repository
git clone https://github.com/chandan-bk/f1-monza-iot-sim.git
cd f1-monza-iot-sim

# Install dependencies (Express 4.19.2 & ws 8.18.0)
npm install

# Start the Telemetry Bridge Server & Static Web Host
npm start
```

Open your browser to:
- **Full Unified Platform**: `http://localhost:8080`
- **Driver Simulation Only (Device A)**: `http://localhost:8080/?mode=sim`
- **Pitwall Dashboard Only (Device B)**: `http://localhost:8080/?mode=dashboard`

### Verification Test Suite
Run the automated validation tests:
```bash
# Validate syntax across all 13 JavaScript frontend modules
node test-syntax.js

# Run 200-step headless Monza physics and telemetry simulation test
node test_monza_simulation.js
```

---

## 📊 6. Telemetry JSON Packet Schema 2.0

Sample 20Hz JSON frame generated by the edge serialization engine:

```json
{
  "version": "2.0.0",
  "master_seq": 1420,
  "timestamp_ms": 1729618000050,
  "car_id": "LEC_16",
  "driver": "Charles Leclerc",
  "team": "Scuderia Ferrari HP",
  "session": {
    "mode": "AUTONOMOUS_RACE",
    "state": "RUNNING",
    "lap_number": 2,
    "lap_time_s": 48.240,
    "delta_s": -0.320,
    "sector": 2
  },
  "kinematics": {
    "speed_kmh": 348.6,
    "engine_rpm": 14250,
    "gear": 8,
    "throttle_pct": 100.0,
    "brake_pct": 0.0,
    "steering_angle_deg": -1.2,
    "longitudinal_g": 0.42,
    "lateral_g": 0.15,
    "yaw_rate_dps": 0.8,
    "vibration_g": 0.38
  },
  "powertrain": {
    "engine_temp_c": 101.4,
    "ers_soc_pct": 82.5,
    "fuel_remaining_kg": 102.3,
    "radiator_blockage_pct": 0.0
  },
  "tires": {
    "fl": { "temp_c": 92.4, "pressure_psi": 21.2, "wear_pct": 2.1 },
    "fr": { "temp_c": 92.4, "pressure_psi": 21.2, "wear_pct": 2.1 },
    "rl": { "temp_c": 95.8, "pressure_psi": 20.8, "wear_pct": 3.4 },
    "rr": { "temp_c": 95.8, "pressure_psi": 20.8, "wear_pct": 3.4 }
  },
  "brakes": {
    "fl_temp_c": 380.0,
    "fr_temp_c": 380.0,
    "rl_temp_c": 310.0,
    "rr_temp_c": 310.0
  },
  "active_alerts": []
}
```

---

## 🎓 7. Academic Viva / Faculty Presentation Checklist

When demonstrating this project to university professors or examiners:
1. **Explain the 8-Stage IoT Pipeline**: Walk through Edge Physical Acquisition &rarr; CAN-FD Framing &rarr; WebSocket Gateway &rarr; Telemetry Ingestion &rarr; Dashboard &rarr; Diagnostics &rarr; Closed-Loop Intervention.
2. **Demonstrate 6 Cameras**: Switch between Cockpit, Chase, TV Broadcast, Top-Down, Pitwall, and 3D Orbit.
3. **Show Module 03 (Virtual Sensor Registry)**:
   - Click **"Cut Wire"** on `ENG-T01` or `TPMS-01`.
   - Point out that the sensor reading becomes `null` and displays `NO DATA (CUT)` — no stale data.
   - Click **"3D Twin"** to illuminate the glowing beacon directly on the car model.
4. **Show Module 04 (Network Monitor)**: Point out live ping-pong RTT latency (sub-5ms) and the sequence loss tracker.
5. **Show Module 05 & 06 (Fault Injection & Closed-Loop Recovery)**:
   - Trigger **Scenario A (Engine Overheat)**.
   - Show the toast alert and the decision support card in Module 06.
   - Click **"EXECUTE: COOLING MODE"** and watch engine coolant temperature drop in real time on the rolling waveform charts!
6. **Export CSV**: Click **"EXPORT CSV TELEMETRY"** to download the complete multi-parameter dataset for post-race engineering analysis.

---

## 📜 8. Documentation Index

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Comprehensive technical architecture & multi-tier specifications.
- [docs/IOT_ARCHITECTURE.md](docs/IOT_ARCHITECTURE.md) — IoT edge telemetry pipeline, network protocols, and sequence gap detection.
- [docs/TELEMETRY_DICTIONARY.md](docs/TELEMETRY_DICTIONARY.md) — Complete 19-sensor data dictionary and diagnostic rule matrices.
- [docs/PHYSICS_MODEL.md](docs/PHYSICS_MODEL.md) — Vehicle kinematics, aerodynamics, Pacejka tire models, and thermal dissipation mathematics.
- [docs/FACULTY_DEMO_SCRIPT.md](docs/FACULTY_DEMO_SCRIPT.md) — Step-by-step viva presentation script and faculty talking points.
- [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) — Academic capstone project report and evaluation results.
