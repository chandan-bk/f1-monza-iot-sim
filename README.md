# Monza Grand Prix: Formula 1 IoT Telemetry & Race Simulator

> **Engineering Capstone Project Presentation:**  
> *"Application of IoT in Motorsport: Real-Time Race Car Telemetry Monitoring, Edge Diagnostics, and Engineering Analytics"*  
> **Circuit:** Autodromo Nazionale Monza ("The Temple of Speed" — 5,793m, 11 Turns, 3 Sectors, 2 DRS Zones)  
> **Framework:** Three.js (WebGL), Curvilinear Dynamics Engine, Node.js WebSocket Gateway, REST Ingest, 20Hz Synchronous IoT Telemetry

---

## 🏎️ 1. Project Overview & Motivation

Formula 1 and modern top-tier motorsport represent the pinnacle of **Internet of Things (IoT) edge telemetry and stream analytics**. During a Grand Prix weekend, a modern Formula 1 car acts as a high-speed IoT sensor network, generating over **1.1 billion telemetry data points** (~3GB per car per race) streamed across ATLAS / MoTeC pitwall telemetry systems.

This project delivers a comprehensive, interactive software simulation of **IoT in Motorsport** for academic capstone presentation. It pairs a high-fidelity 3D racing simulation of the iconic **Autodromo Nazionale Monza** with a real-time **20 Hz IoT Telemetry Pipeline**, featuring:
- **Autonomous 6-Car Competitive AI Racing**: 6 independent vehicle physics instances with distinct team power/drag curves and driver racecraft profiles.
- **Six Simultaneous Telemetry Streams**: Streams all 6 cars concurrently across WebSockets, allowing the race engineer to inspect any car without restricting background transmission.
- **19-Channel Virtual Sensor Registry**: Dedicated virtual sensor layer with independent health states (`ONLINE`, `WARNING`, `CRITICAL`, `DISCONNECTED`, `STUCK`, `NOISY`).
- **Dual-Device Role Architecture**: Distinct `SIM` and `DASHBOARD` client registration with session-based command authentication.
- **Remote Interventions & Fault Injections**: Closed-loop control enabling the race engineer on the dashboard to execute cooling mode, pit stops, brake bias changes, or inject faults with real execution acknowledgements.
- **Measured vs. Injected Network Metrics**: Real continuous PING/PONG round-trip latency (RTT) tracking clearly distinguished from simulated latency and packet loss.

---

## 🎓 2. Professor Presentation Guide: Existing vs. Our Modifications

| Domain | Existing Real-World Motorsport IoT | Our Project Modification & Innovation |
|---|---|---|
| **Sensor Network Topology** | Centralized CAN-FD bus connected to McLaren Applied TAG-320 ECU; complex wired looms adding 1.5–2.5 kg weight. | **19-Channel Decoupled Virtual Sensor Layer**: Independent software sensors with individual health states (`DISCONNECTED`, `STUCK`, `NOISY`) decoupled from underlying vehicle physics. |
| **Telemetry Ingest & Latency** | Proprietary microwave radio burst telemetry (ATLAS) with 200–500ms delay to garage pitwalls. | **Dual-Role Web Gateway**: Bi-directional WebSockets streaming JSON telemetry frames for all 6 cars concurrently at 20 Hz, accessible concurrently on desktop and mobile. |
| **Driver Assistance & Autonomy** | Driver-in-the-Loop (DiL) proprietary simulators costing millions, restricted to factory supercomputers. | **Curvilinear Multi-Car AI**: Mathematically bounded track-spline physics with lookahead chicane braking, drafting, and overtaking—guaranteeing 100% collision-free, on-track realism. |
| **Edge Fault Detection & Action** | Post-lap telemetry analysis by human race engineers looking at historical charts. | **Real-Time Edge Rule Engine & Remote Interventions**: 20Hz automated anomaly detection paired with closed-loop dashboard intervention commands (`COOLING_MODE`, `PIT_STOP`, `BRAKE_BIAS`). |

---

## 📡 3. 20Hz IoT Telemetry Sensor Specification

Every 50ms (20 times per second), the simulation serializes a comprehensive 6-car telemetry packet:

```json
{
  "car_id": "LEC",
  "driver_name": "Charles Leclerc",
  "team": "Scuderia Ferrari HP",
  "car_index": 0,
  "timestamp_ms": 1729618000050,
  "sequence_number": 412,
  "speed": 348.6,
  "RPM": 14250,
  "gear": 8,
  "throttle": 1.00,
  "brake": 0.00,
  "steering": 0.012,
  "engine_temperature": 101.4,
  "tires": {
    "fl_temp_c": 94.2,
    "fr_temp_c": 93.8,
    "rl_temp_c": 96.1,
    "rr_temp_c": 95.8,
    "fl_pressure_bar": 1.55,
    "fr_pressure_bar": 1.55,
    "rl_pressure_bar": 1.41,
    "rr_pressure_bar": 1.41
  },
  "brakes": {
    "fl_temp_c": 412,
    "fr_temp_c": 415,
    "rl_temp_c": 320,
    "rr_temp_c": 322
  },
  "lap": 2,
  "sector": 1,
  "vehicle_status": "NORMAL",
  "sensor_health": { "online": 19, "warning": 0, "critical": 0, "disconnected": 0 }
}
```

---

## 🚀 4. Quick Start & Testing

### Running the Test Suite
```bash
# Runs Syntax Validation, WebSocket Integration Tests, and Headless Physics Simulation Tests
npm test
```

### Starting the Server
```bash
npm install
npm start
# Server listens at http://localhost:3000
# WebSocket Gateway at ws://localhost:3000/telemetry-stream
```

### Interactive Controls
| Key | Function |
|---|---|
| **`P`** | Toggle Autonomous AI Race |
| **`1` – `6`** | Switch Monitored Car Channel (LEC, VER, HAM, NOR, ALO, GAS) |
| **`C`** | Cycle Camera View (Cockpit, Chase, TV Broadcast) |
| **`T`** | Cycle View Layout (Split Screen, Driver Only, Pitwall Only) |
| **`W / A / S / D`** | Manual Driving Controls |
| **`M`** | Mute / Unmute Audio Synthesizer |

---

## ⚖️ 5. License
Academic Capstone Project & Open Source under the MIT License.
