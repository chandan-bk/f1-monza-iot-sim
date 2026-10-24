# Monza Grand Prix: Formula 1 IoT Telemetry & Race Simulator

> **Engineering Capstone Project Presentation:**  
> *"Application of IoT in Motorsport: Real-Time Race Car Telemetry Monitoring, Edge Diagnostics, and Engineering Analytics"*  
> **Circuit:** Autodromo Nazionale Monza ("The Temple of Speed" — 5,793m, 11 Turns, 3 Sectors, 2 DRS Zones)  
> **Framework:** Three.js (WebGL), Curvilinear Dynamics Engine, Node.js WebSocket Gateway, REST Ingest, 20Hz Synchronous IoT Telemetry

---

## 🏎️ 1. Project Overview & Motivation

Formula 1 and modern top-tier motorsport represent the pinnacle of **Internet of Things (IoT) edge telemetry and stream analytics**. During a Grand Prix weekend, a modern Formula 1 car acts as a high-speed IoT sensor network, generating over **1.1 billion telemetry data points** (~3GB per car per race) streamed across ATLAS / MoTeC pitwall telemetry systems.

This project was built to deliver a comprehensive, interactive demonstration of **IoT in Motorsport** for academic capstone presentation. It pairs a high-fidelity 3D racing simulation of the iconic **Autodromo Nazionale Monza** with a real-time **20 Hz IoT Telemetry Pipeline**, featuring:
- Autonomous 6-Car Competitive AI Racing with Curvilinear Track Stabilization (Zero off-track anomalies).
- Multi-Car Telemetry Channel Selector (Switch real-time sensor streams across Charles Leclerc, Max Verstappen, Lewis Hamilton, Lando Norris, Fernando Alonso, and Pierre Gasly).
- Real-Time Telemetry Pipeline (20Hz Synchronous Streaming over WebSockets & REST Gateway).
- Live Race Engineer Diagnostics Engine (Brake fade detection, Pirelli tire thermal degradation, DRS activation verification, MGU-K energy harvesting).

---

## 🎓 2. Professor Presentation Guide: Existing vs. Our Modifications

| Domain | Existing Real-World Motorsport IoT | Our Project Modification & Innovation |
|---|---|---|
| **Sensor Network Topology** | Centralized CAN-FD bus connected to McLaren Applied TAG-320 ECU; complex wired looms adding 1.5–2.5 kg weight. | **Dual-Gateway Hybrid IoT Architecture**: Modular edge telemetry nodes with synchronous 20Hz WebSocket streaming + REST fallback ingest. |
| **Telemetry Ingest & Latency** | Proprietary microwave radio burst telemetry (ATLAS) with 200–500ms delay to garage pitwalls. | **Sub-50ms Real-Time Web Telemetry**: Bi-directional WebSockets streaming JSON telemetry frames at 20 Hz, accessible concurrently by race engineers on any browser/tablet. |
| **Driver Assistance & Autonomy** | Driver-in-the-Loop (DiL) proprietary simulators costing millions, restricted to factory supercomputers. | **Browser-Native Curvilinear Autonomous AI**: Mathematically bounded track-spline physics with lookahead chicane braking, drafting, and overtaking—guaranteeing 100% collision-free, on-track realism. |
| **Edge Fault Detection** | Post-lap telemetry analysis by human race engineers looking at historical telemetry charts. | **Automated Real-Time Rule Engine**: Continuous edge anomaly detection running at 20Hz, instantly generating race engineer alerts (e.g. *Brake Disc Temp > 850°C*, *Pirelli Tire Blistering Hazard*, *DRS Gap < 1.0s*). |
| **Telemetry Accessibility** | Multi-million dollar proprietary setups (McLaren ATLAS, MoTeC). | **Browser-Native IoT Simulation**: Open web-standard WebSocket and REST pipeline streaming real physics telemetry at 20Hz without proprietary hardware. |

---

## 🌟 3. Circuit Geometry: Autodromo Nazionale Monza

The simulation models the authentic 5,793-meter Monza layout:
1. **Rettifilo Straight**: Flat-out 350+ km/h blast down the pit straight with DRS Zone 1.
2. **Variante del Rettifilo (Turns 1 & 2)**: Violent 5.2G deceleration zone from 352 km/h down to 78 km/h. Brakes heat up to 950°C!
3. **Curva Grande (Turn 3)**: High-speed sweeping right-hander taken at 285 km/h.
4. **Variante della Roggia (Turns 4 & 5)**: Sharp chicane braking down to 114 km/h with high red/white kerb bounding.
5. **Curva di Lesmo 1 & 2 (Turns 6 & 7)**: Double right-handers testing lateral tire grip ($G_y > 3.8\text{G}$).
6. **Serraglio Straight & Historic 1955 Banking Overpass Bridge**: Speed build-up to 335 km/h passing beneath the legendary concrete banked oval bridge.
7. **Variante Ascari (Turns 8, 9 & 10)**: Rapid left-right-left chicane taken at 225 km/h with aggressive kerb clipping.
8. **Curva Parabolica / Curva Alboreto (Turn 11)**: Iconic long sweeping 180° turn feeding onto the main straight with DRS Zone 2.

---

## 📡 4. 20Hz IoT Telemetry Sensor Specification

Every 50ms (20 times per second), the simulation serializes a comprehensive IoT telemetry packet:

```json
{
  "timestamp": 1729618000050,
  "car_id": "LEC_16",
  "driver": "Charles Leclerc",
  "team": "Scuderia Ferrari HP",
  "speed_kmh": 348.6,
  "engine_rpm": 14250,
  "gear": 8,
  "throttle_pct": 100.0,
  "brake_pct": 0.0,
  "drs_status": "OPEN",
  "imu": {
    "longitudinal_g": 0.42,
    "lateral_g": -0.15,
    "vertical_g": 1.02,
    "yaw_rate_rads": 0.012
  },
  "thermals": {
    "engine_coolant_c": 102.4,
    "brake_rotors_c": { "fl": 412, "fr": 415, "rl": 320, "rr": 322 },
    "tire_surface_c": { "fl": 104.2, "fr": 105.1, "rl": 108.3, "rr": 107.9 }
  },
  "hybrid_powertrain": {
    "ers_soc_pct": 78.4,
    "mgu_k_kw": -120.0,
    "mgu_h_rpm": 98500
  },
  "track_position": {
    "sector": 1,
    "distance_m": 840.5,
    "lap_number": 2,
    "lap_time_s": 24.320
  }
}
```

---

## 🚀 5. Quick Start Instructions

### Option A: Local Node.js Telemetry Server (Full WebSocket + Ingest)
```bash
# 1. Clone repository
git clone https://github.com/chandan-bk/f1-monza-iot-sim.git
cd f1-monza-iot-sim

# 2. Install dependencies (express, ws)
npm install

# 3. Start Telemetry Server & WebSocket Gateway
npm start
# (Server runs at http://localhost:3000)
```

### Option B: Zero-Install Static Browser Mode
The simulation can be launched without installing any dependencies:
- Simply open `index.html` or `public/index.html` in Google Chrome, Edge, Firefox, or Brave.
- Also live on GitHub Pages!

---

## 🎮 6. Interactive Controls & Hotkeys

| Key | Function | Presentation Value |
|---|---|---|
| **`P`** | **Toggle Autonomous AI Race** | Lets professor watch hands-free multi-car AI racing while you present telemetry charts. |
| **`1` – `6`** | **Switch Monitored Car Channel** | Switch live IoT telemetry between Leclerc (1), Verstappen (2), Hamilton (3), Norris (4), Alonso (5), Gasly (6). |
| **`C`** | **Cycle Camera View** | Cockpit Driver POV (behind Halo) ⟷ Dynamic Chase Cam ⟷ Trackside TV Camera Towers. |
| **`T`** | **Cycle View Layout** | Split Screen (3D + Pitwall) ⟷ Driver Focused ⟷ Pitwall Dashboard. |
| **`W / A / S / D`** | **Manual Driving** | Take over manual control anytime to demonstrate driver-induced sensor variations. |
| **`M`** | **Mute / Unmute Audio** | Procedural Web Audio V6 Turbo engine synthesizer with kerb rumble and turbo spool. |
| **`CSV Button`** | **Export Telemetry** | Export all 20Hz samples into CSV for external analysis in Python, MATLAB, or Excel. |

---

## ⚖️ 7. License
Academic Capstone Project & Open Source under the MIT License.
