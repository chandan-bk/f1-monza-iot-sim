# Formula 1 IoT Telemetry & Race Monitoring System 2.0
## Comprehensive College Faculty Demonstration & Viva Presentation Script

**Project Title:** Application of IoT in Motorsport: End-to-End Real-Time Race Car Telemetry Pipeline, Virtual Sensor Network, Edge Diagnostics, and Closed-Loop Race Engineering  
**Circuit:** Autodromo Nazionale Monza (5,793m Grand Prix Layout — "The Temple of Speed")  
**Grid:** 6-Car Competitive Grid (Ferrari, Red Bull, Mercedes, McLaren, Aston Martin, Alpine)  
**Engineering Domains:** Internet of Things (IoT), Real-Time Telemetry Streaming, Edge Computing, Sensor Networks, Multiphysics Modeling, Closed-Loop Control Systems

---

## 1. Quick Setup & Launch Options (1 Minute)

### Option A: Standard Single-Screen Mode
1. Open PowerShell or Terminal in the project root:
   ```powershell
   npm start
   ```
2. Navigate your web browser to:
   ```text
   http://localhost:8080
   ```
3. The platform opens into the Capstone Briefing Screen with one-click access to **Autonomous AI Race (IoT Pitwall Monitor)**.

### Option B: Dual-Device / Multi-Monitor Presentation Mode (Recommended for Examiners)
1. On **Screen 1 (Projector or Laptop Display)**:
   ```text
   http://localhost:8080/?mode=sim
   ```
   *(Launches directly into the 3D WebGL Driver POV Simulation with 6 cameras)*
2. On **Screen 2 (Second Monitor, Tablet, or Examiner Laptop)**:
   ```text
   http://localhost:8080/?mode=dashboard
   ```
   *(Launches directly into the Pitwall Race Engineer Dashboard)*
3. Both devices synchronize over the local WebSocket server at 20 Hz!

---

## 2. Step-by-Step Viva Presentation Walkthrough

### Step 1: Project Objective & The Complete F1 IoT Lifecycle (2 Minutes)
- **Action:** Open the presentation view and show the top module navigation bar.
- **Talking Points for Professors:**
  > *"Respected professors, today we present our capstone project: **'Application of IoT in Motorsport: End-to-End Telemetry Pipeline & Intelligent Race Monitoring System.'**  
  > In Formula 1, each car operates as a mobile high-density IoT edge network, generating over 1.1 billion telemetry points per Grand Prix. Our objective is to demonstrate the **complete IoT lifecycle in motorsport**, consisting of eight connected stages:  
  > 1. **Virtual Physical Environment** (Monza dynamics core)  
  > 2. **Sensor Acquisition** (19 calibrated edge sensors)  
  > 3. **Data Framing & Transmission** (CAN-FD bus & sequence numbering)  
  > 4. **IoT Gateway** (Node.js WebSocket & REST server on port 8080)  
  > 5. **Stream Processing & Ingestion** (Schema 2.0 ring buffers & trend derivatives)  
  > 6. **Real-Time Monitoring** (60fps rolling waveforms & 4-wheel matrix)  
  > 7. **Automated Fault Detection** (Rule-based boundary & rate-of-change alerts)  
  > 8. **Race Engineering Decision** (Closed feedback loop interventions modifying vehicle physics).  
  > Rather than disconnected numbers or a simple racing game, every telemetry value originates from physical equations, flows through a real network pipeline, and responds to real engineering actions."*

---

### Step 2: Module 01 — 3D Race Simulation & Camera Perspectives (2 Minutes)
- **Action:** Click **[01 RACE SIM]** or press <kbd>C</kbd> to cycle camera modes.
- **What to Demonstrate:**
  1. **Monza Circuit Geometry:** Point out iconic landmarks: Variante del Rettifilo chicane, Curva Grande, Lesmo corners, Serraglio straight, Variante Ascari, Parabolica, and the historic 1955 banked oval bridge.
  2. **6 Camera Perspectives:** Show professors the 6 authentic camera modes:
     - **Cockpit POV:** Authentic Halo structure view with dynamic G-force driver head sway and high-speed chassis vibration.
     - **Chase Camera:** Third-person trailing camera with speed lag.
     - **TV Broadcast:** Trackside telephoto camera towers panning across the track.
     - **Top-Down:** High-altitude birds-eye view tracking the car from above.
     - **Pitwall Overview:** Fixed gantry perspective overlooking the main straight.
     - **3D Orbit:** Free inspection camera orbiting the 3D car model with mouse drag and wheel zoom.
  3. **Multi-Car Competitive AI:** Point out that all 6 cars race with genuine competitive physics (slipstream drafting, tow boost, and chicane braking).

---

### Step 3: Module 02 — Live IoT Telemetry Dashboard (2 Minutes)
- **Action:** Click **[02 LIVE TELEMETRY]**.
- **What to Demonstrate:**
  1. **Synchronous 20Hz Sampling Rate:** Point out the ingest rate indicator (`20 Hz`).
  2. **Multi-Car Telemetry Switching:** Click through the driver pills (`#16 Leclerc`, `#1 Verstappen`, `#44 Hamilton`, `#4 Norris`, `#14 Alonso`, `#10 Gasly`). Observe how all gauges, the 4-wheel matrix, the rolling waveforms, and the G-G traction circle instantly switch to monitor that driver's telemetry.
  3. **4-Wheel Thermal Matrix:** Independent surface temperatures, wear rates, carbon-carbon rotor temperatures, and internal TPMS pressures for FL, FR, RL, RR.
  4. **60 FPS Rolling Waveforms:** Speed trace (up to 355 km/h), pedal traces, engine RPM (up to 15,000), and coolant vs tire temperatures. Click **"PAUSE CHARTS"** to freeze the waveform for closer inspection, then click **"RESUME CHARTS"**.
  5. **G-G Traction Circle:** Demonstrates combined lateral and longitudinal acceleration forces within the 5G friction limit.

---

### Step 4: Module 03 — Virtual Sensor Registry & Wire-Cut Hardware Simulation (3 Minutes)
- **Action:** Click **[03 VIRTUAL SENSORS]**.
- **What to Demonstrate:**
  1. **19-Sensor Hardware Registry:** Explain that each sensor has a unique ID (`SPD-01`, `RPM-01`, `ENG-T01`, `TIRE-FL-01`, `TPMS-01`, `BRK-T01`, `ACC-01`, `VIB-01`, `GPS-01`), subsystem tag, calibrated limits, sampling frequency, and CAN-FD bus routing.
  2. **Subsystem Filters:** Click `POWERTRAIN`, `TIRES & TPMS`, `BRAKES`, `KINEMATICS`, and `CHASSIS`.
  3. **Wire-Cut Disconnection (Crucial Examiner Point):**
     - Click **"Cut Wire"** on `ENG-T01` (Coolant Thermistor) or `TPMS-01` (FL Pressure).
     - Point out that the sensor reading immediately cuts to `null` and displays **`NO DATA (CUT)`** with an `OFFLINE` status.
     - **Talking Point:** *"Notice that our virtual sensor registry strictly refuses to display stale data as current. When the physical CAN-FD line is severed, the system marks the sensor OFFLINE and passes null, exactly mirroring automotive safety standards."*
     - Click **"Reconnect"** to restore nominal CAN-FD streaming.
  4. **3D Digital Twin Highlighting:**
     - Click **"3D Twin"** on any sensor (e.g. `BRK-T01` or `ENG-T01`).
     - The camera automatically transitions to 3D Orbit mode, and a glowing visual beacon lights up directly at that sensor's physical component location on the car body!

---

### Step 5: Module 04 — IoT Network Pipeline Monitor (2 Minutes)
- **Action:** Click **[04 NETWORK MONITOR]**.
- **What to Demonstrate:**
  1. **Animated Pipeline Diagram:** Follow data from Edge Sensors &rarr; CAN-FD Framing &rarr; WebSocket Gateway (Port 8080) &rarr; Telemetry Ingestion Engine &rarr; Pitwall Dashboard.
  2. **Live Socket Metrics:**
     - **Connected Clients:** Shows the number of connected monitors (e.g., 2 during dual-device testing).
     - **Packets Sent & Received:** Exact packet counters.
     - **Master Sequence ID:** Incremental master frame number.
     - **Packet Loss %:** Detected gaps in the sequence counter.
     - **Real RTT Latency:** Live ping-pong round-trip time in milliseconds (sub-5ms on local loopback).
     - **Throughput:** Live bandwidth consumed in KB/s.
  3. **Raw JSON Packet Inspector:**
     - Show professors the live Schema 2.0 JSON packet.
     - Click **"PAUSE / FREEZE"** to freeze the incoming buffer.
     - Click **"COPY JSON"** to demonstrate clipboard export.

---

### Step 6: Modules 05 & 06 — Real-Time Fault Injection & Closed-Loop Recovery (4 Minutes)
- **Action:** Click **[05 FAULT SIMULATOR]**, then switch to **[06 DECISION SUPPORT]**.
- **What to Demonstrate:**
  1. **Inject Scenario A (ICE Powertrain Overheat):**
     - Set Radiator Blockage to 85% and click **"INJECT OVERHEAT"**.
     - An urgent toast banner appears on screen: *`CRITICAL ALERT: ENG-T01 Coolant Overheating (>114°C)`*.
     - Switch to **[06 DECISION SUPPORT]**: Show the active diagnostic card displaying:
       - Sensor: `ENG-T01` (ICE Coolant Radiator Thermistor)
       - Measured: `116.4°C` vs Threshold: `114.0°C`
       - Consequence: Severe cylinder head gasket warp hazard.
       - Recommendation: Command Engine Map 3 Cooling & engage 90m Lift-and-Coast.
  2. **Demonstrate Closed Feedback Loop Intervention (The Climax of the Presentation):**
     - Click the blue action button: **`EXECUTE: COOLING MODE`**.
     - Point out the confirmation alert and switch back to **[02 LIVE TELEMETRY]**.
     - Observe how the engine coolant temperature on the rolling waveform chart actively cools down from 116°C back to 101°C, demonstrating a **closed-loop feedback intervention** that directly modifies underlying vehicle physics!
  3. **Inject Scenario B (TPMS Slow Puncture):**
     - Select Front-Left (FL) and click **"INJECT PUNCTURE"**.
     - Pressure decays at -0.55 psi/sec. Once pressure drops below 17.5 psi, the rule engine raises a critical puncture alarm.
     - In Module 06, click **`EXECUTE: PIT STOP`**.
     - The car enters the pit box, fresh Pirelli tires are fitted, wear is zeroed, and tire pressure returns to nominal 21.0 psi!
  4. **Master Reset:** Click **"RESET ALL SCENARIOS & RESTORE NOMINAL VEHICLE PHYSICS"** to restore factory baselines.

---

### Step 7: Dual-Device Multi-Monitor Demonstration (Optional 2 Minutes)
- **Action:** Click **"DUAL-DEVICE"** in the top header.
- **Talking Points for Professors:**
  > *"To demonstrate enterprise-grade distributed IoT architectures, we can run this across two machines or browser tabs simultaneously. Device A runs the 3D physics environment at `?mode=sim`, while Device B runs the pitwall dashboard at `?mode=dashboard`. When we inject a fault on Device B, Device A's vehicle physics immediately changes over the WebSocket connection without any manual synchronization."*

---

### Step 8: Post-Race Classification & CSV Export (1 Minute)
- **Action:** Complete a lap or trigger race completion, then click **"EXPORT CSV TELEMETRY"**.
- **What to Demonstrate:**
  - The browser downloads a timestamped multi-parameter CSV file containing all 20Hz telemetry channels (speed, RPM, gear, pedals, thermals, TPMS, G-forces, and sensor statuses) ready for offline engineering analytics in Python, MATLAB, or Excel.

---

## 3. Frequently Asked Faculty Questions & Model Answers

### Q1: "Are these telemetry numbers randomly generated or physically calculated?"
> **Answer:** *"Every number originates from our deterministic multipath physics engine. Vehicle speed is calculated by integrating net forces ($F_{\text{drive}} - F_{\text{brake}} - F_{\text{drag}} - F_{\text{rr}}$). Engine coolant temperature is governed by the thermal balance equation between combustion heat flux and radiator aerodynamic forced convection ($\dot{Q} = h \cdot A \cdot (1 - \text{blockage}) \cdot v \cdot \Delta T$). Brake rotor temperatures spike realistically during deceleration into Turn 1, converting kinetic energy into heat. There are zero disconnected random numbers in the pipeline."*

### Q2: "How is the IoT pipeline architected?"
> **Answer:** *"The pipeline follows modern industrial IoT edge architecture: 19 virtual sensors sample at 20Hz onto virtual CAN-FD buses, serialize into Schema 2.0 JSON packets with master sequence numbers and timestamps, stream over a full-duplex WebSocket connection to a Node.js gateway (Port 8080), and are ingested into rolling buffers on the pitwall dashboard for real-time monitoring and rule-based diagnostic evaluation."*

### Q3: "What happens if a sensor disconnects?"
> **Answer:** *"We implemented a dedicated hardware wire-cut simulation in Module 03. If a sensor line is severed, the registry sets `connected: false`, immediately drops the output to `null`, and marks the status `OFFLINE`. The pitwall UI displays `NO DATA (CUT)`. This is a critical safety principle in automotive IoT: a disconnected sensor must never report stale data as current."*

### Q4: "How does the closed-loop decision support work?"
> **Answer:** *"Most monitoring dashboards are read-only. In our system, Module 06 implements a closed feedback loop. When a fault is detected (e.g. engine overheating), clicking 'EXECUTE: COOLING MODE' dispatches an actuation command back into the `VehiclePhysics` instance, switching the ECU engine map and engaging 90m lift-and-coast, which physically drops thermal generation by 45% and brings temperatures back into the nominal operating window."*
