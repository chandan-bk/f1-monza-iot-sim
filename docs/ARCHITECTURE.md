# Complete System Architecture & Engineering Specifications (System 2.0)
## Application of IoT in Motorsport: End-to-End Race Car Telemetry Pipeline, Virtual Sensor Network & Intelligent Race Monitoring

---

## 1. Executive System Overview

In contemporary professional motorsport (Formula 1, World Endurance Championship, Formula E), race outcomes are dictated by the speed, accuracy, and depth of real-time telemetry analytics. A modern Formula 1 single-seater acts as a distributed edge IoT platform equipped with over 300 discrete physical sensors wired to the Engine Control Unit (ECU) via CAN-FD and automotive Ethernet buses. Across a single Grand Prix distance, each car produces over 3 gigabytes of telemetry data streamed over trackside microwave links to garage pitwalls and mission control rooms.

This project delivers an end-to-end software simulation and telemetry ecosystem demonstrating the complete Formula 1 IoT lifecycle:

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

---

## 2. Multi-Tier System Architecture Diagram

```mermaid
flowchart TD
    subgraph M01 ["MODULE 01: Race Simulation (Virtual Physical Core)"]
        KINE["Vehicle Kinematics Core<br/>- 6-Car Curvilinear Spline Physics<br/>- Net Force: F_drive - F_brake - F_drag - F_rr<br/>- Lateral Lane Dynamics: Tarmac Boundary Clamping"]
        AERO["Aerodynamic Downforce & Drag<br/>- Ground Effect F_down = 1/2 * rho * Cl * A * v^2<br/>- DRS Flap Drag Reduction: Cd 0.68 -> 0.52<br/>- Slipstream Drafting Pocket (+22 km/h tow)"]
        POWER["1.6L V6 Turbo Hybrid Powertrain<br/>- 8-Speed Sequential Monza Gearbox<br/>- 135 Nm MGU-K Electric Motor Deploy & Harvesting<br/>- Authentic Torque Curve (4,000 - 15,000 RPM)"]
        THERMO["Multiphysics Thermal Subsystems<br/>- 4-Wheel Pirelli Tire Model (FL, FR, RL, RR)<br/>- Brembo Carbon-Carbon Rotor Discs (200 - 1,150°C)<br/>- Radiator Heat Flux vs Aero Dissipation"]
        CAM["6 Camera Perspectives<br/>Cockpit POV, Chase, TV Towers, Top-Down, Pitwall, 3D Orbit"]
        TWIN["3D Digital Twin Hotspots<br/>19 Glowing Component Beacons on Car Mesh"]

        KINE <--> AERO
        KINE <--> POWER
        KINE <--> THERMO
        KINE --> CAM
        KINE --> TWIN
    end

    subgraph M03 ["MODULE 03: Virtual Sensor Registry (Edge Acquisition)"]
        REG["19-Channel Sensor Registry<br/>- Unique Sensor IDs (SPD-01, RPM-01, ENG-T01, TPMS-01..04, etc.)<br/>- CAN-FD Bus #1 (Powertrain/Dynamics) & #2 (Tires/GNSS)<br/>- Calibrated Threshold Boundaries & Status Evaluation<br/>- Hardware Wire-Cut Simulation (Output: null / OFFLINE)"]
        KINE --> REG
        THERMO --> REG
        POWER --> REG
    end

    subgraph Transport ["Data Transmission & Ingest Gateway"]
        WS_STREAM["Bi-Directional WebSocket Gateway (Port 8080)<br/>ws://host:8080/telemetry-stream<br/>- 20Hz Synchronous JSON Telemetry Broadcast<br/>- Ping/Pong Heartbeat (Sub-5ms RTT Latency)<br/>- Packet Sequence Counter & Loss Tracker"]
        REST_HTTP["HTTP/1.1 REST Ingest API<br/>POST /api/telemetry/ingest<br/>GET /api/network/stats"]
        REG -->|CAN-FD Master Framing| WS_STREAM
        WS_STREAM <--> REST_HTTP
    end

    subgraph M04 ["MODULE 04: IoT Network Pipeline Monitor"]
        FLOW["Animated Architecture Flow Diagram"]
        METRICS["Real Network Metrics Grid<br/>Socket Status, Connected Clients, Sent/Received, Loss %, Latency ms, KB/s Throughput"]
        INSPECT["Live Raw JSON Packet Inspector (Schema 2.0)<br/>Freeze/Pause Buffer & Clipboard Export"]
        WS_STREAM --> FLOW
        WS_STREAM --> METRICS
        WS_STREAM --> INSPECT
    end

    subgraph M02 ["MODULE 02: Live Telemetry Dashboard"]
        GAUGES["Pitwall Digital Cluster<br/>Speed, RPM, Gear, Throttle, Brake, Delta, ICE Temp, G-Forces, ERS, Fuel"]
        MATRIX["4-Wheel Sensor & Thermal Matrix<br/>Tire Temp, Wear, Rotor Temp, TPMS Pressure for FL, FR, RL, RR"]
        CHARTS["60 FPS Rolling Canvas Waveforms<br/>Speed, Pedals, RPM, Thermals (Pause/Resume Toggle)"]
        RADAR["2D Vector GPS Track Radar & Session Timing Leaderboard"]
        WS_STREAM --> GAUGES
        WS_STREAM --> MATRIX
        WS_STREAM --> CHARTS
        WS_STREAM --> RADAR
    end

    subgraph M05 ["MODULE 05: Real-Time Fault Injection Simulator"]
        FAULTS["Interactive Fault Cockpit<br/>- Scenario A: Radiator Overheat Blockage<br/>- Scenario B: TPMS Puncture Micro-Leak<br/>- Scenario C: Brake Duct Rotor Overheat<br/>- Scenario D: Suspension Vibration Anomaly<br/>- Scenario E: Sensor Physical Disconnection<br/>- Scenario F: Microwave Network Degradation<br/>- Scenario G: Compound Multi-System Incident"]
    end

    subgraph M06 ["MODULE 06: Race Engineer Decision Support (Closed Feedback Loop)"]
        RULES["Automated Rule Engine<br/>Threshold Checks & Rate-of-Change Derivatives (dT/dt, dP/dt)"]
        ACTION["Closed Feedback Loop Action Execution<br/>COOLING_MODE | PIT_STOP | BRAKE_BIAS_REAR | RECALIBRATE_DAMPER | RESTORE_NETWORK"]
        RULES --> ACTION
    end

    M05 -->|Inject Faults| KINE
    M05 -->|Sever Lines| REG
    M05 -->|Attenuate Packets| WS_STREAM
    WS_STREAM --> RULES
    ACTION -.->|Direct Actuation Commands| KINE
    ACTION -.->|Re-align Packets| WS_STREAM
```

---

## 3. The Six Connected Modules

### Module 01: Race Simulation (3D Virtual Physical Environment)
- Authentic Autodromo Nazionale Monza circuit geometry (5,793 meters).
- Six competitive AI cars with driver personalities:
  - #16 Charles Leclerc (Scuderia Ferrari HP)
  - #1 Max Verstappen (Oracle Red Bull Racing)
  - #44 Lewis Hamilton (Mercedes-AMG PETRONAS)
  - #4 Lando Norris (McLaren Formula 1 Team)
  - #14 Fernando Alonso (Aston Martin Aramco)
  - #10 Pierre Gasly (BWT Alpine F1 Team)
- 6 Camera Perspectives:
  1. `COCKPIT`: Authentic Driver POV with dynamic G-force head sway, apex look-ahead, and speed FOV expansion.
  2. `CHASE`: Dynamic third-person chase camera with speed lag.
  3. `TV_BROADCAST`: Trackside telephoto camera towers panning across Monza curves.
  4. `TOP_DOWN`: Birds-eye overhead tracking view directly above the car.
  5. `PITWALL`: Fixed Monza pitwall gantry view overlooking the start/finish straight.
  6. `ORBIT`: 360-degree free orbit inspection with mouse drag and wheel zoom.
- 3D Digital Twin Component Highlighting on the car body for all 19 sensors.

### Module 02: Live IoT Telemetry Dashboard
- Gauges: Speed, RPM, Gear, Throttle, Brake, Delta, Coolant Temp, Longitudinal & Lateral G-forces, ERS SoC, DRS, Fuel.
- 4-Wheel Thermal Matrix: Surface temperatures, wear percentages, rotor temperatures, and TPMS pressures.
- 2D GPS Track Radar: Vector circuit map with live car transponder markers.
- Live Race Leaderboard: Transponder classification tracking intervals, gaps, and personal best times.
- 60fps Rolling Waveforms: Real-time speed profile, pedal traces, powertrain RPM, and thermal curves with Pause/Resume toggle.
- G-G Traction Circle: Live friction circle displaying lateral vs longitudinal acceleration within the 5G envelope.

### Module 03: Virtual Sensor Management
- 19-sensor hardware registry with unique sensor IDs, car assignments, subsystems, calibrated limits, and CAN-FD bus routing.
- Sensor status evaluation: `ONLINE`, `WARNING`, `CRITICAL`, and `OFFLINE`.
- Wire-Cut Hardware Simulation: Sever any sensor line; reading immediately cuts to `null` and displays `NO DATA (CUT)` — no stale data.
- 3D Twin Locate: Illuminates glowing beacon hotspot directly on the 3D car model.

### Module 04: IoT Network Pipeline Monitor
- Visual Architecture Pipeline showing data flow from Virtual Sensors &rarr; CAN-FD Framing &rarr; WebSocket Gateway &rarr; Telemetry Ingestion &rarr; Pitwall Dashboard.
- Socket Metrics: Status, Client Count, Packets Sent/Received, Master Sequence, Packet Loss %, RTT Latency ms, Sensor Hz, Throughput KB/s.
- Raw JSON Packet Inspector: Freeze stream and copy Schema 2.0 JSON packet.

### Module 05: Real-Time Fault Injection Simulator
- Scenarios A through G:
  - Scenario A: ICE Powertrain Overheat (Radiator blockage slider).
  - Scenario B: Tire Pressure Micro-Leak (Wheel selector + TPMS leak rate).
  - Scenario C: Carbon Rotor Overheat (Brake duct obstruction).
  - Scenario D: Mechanical Suspension Vibration Anomaly (Curb damage).
  - Scenario E: Sensor Physical Line Disconnection (Wiring sever).
  - Scenario F: Wireless Network Degradation (Packet loss + latency injection).
  - Scenario G: Compound Multi-System Crisis (Concurrent multi-faults).
- Master Reset: One-click restoration of all physical parameters to nominal.

### Module 06: Race Engineer Decision Support (Closed Feedback Loop)
- Automated rule engine with threshold and rate-of-change diagnostics.
- Diagnostic event cards displaying Root Cause, Threshold Comparison, Consequence, and Recommended Action.
- Closed Feedback Loop Action Execution: Buttons dispatch commands directly back into the vehicle physics model (`COOLING_MODE`, `PIT_STOP`, `BRAKE_BIAS_REAR`, `RECALIBRATE_DAMPER`, `RESTORE_NETWORK`, `RESET_ALL`).

---

## 4. Dual-Device / Multi-Monitor Presentation Architecture

The application supports running across two separate screens or devices simultaneously:
- **Device A (Screen 1)**: Driver POV / 3D Simulation (`http://localhost:8080/?mode=sim`)
- **Device B (Screen 2)**: Pitwall Telemetry Dashboard (`http://localhost:8080/?mode=dashboard`)
- Both devices communicate bidirectionally over the Node.js WebSocket gateway on port 8080 at 20Hz.
