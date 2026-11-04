# Motorsport Telemetry Dictionary & Alert Rule Specifications (Schema 2.0)

## 1. 19-Channel Virtual Sensor Registry

All sensors are sampled at **20 Hz synchronous frequency** (50 ms frame epoch) and routed over virtual CAN-FD buses.

| Sensor ID | Sensor Name | Subsystem | Unit | Nominal Range | Warning Limit | Critical Limit | Bus ID |
|---|---|---|---|---|---|---|---|
| `SPD-01` | Front Wheel Hall Speed Sensor | Kinematics | km/h | 0.0 - 365.0 | > 355.0 km/h | > 362.0 km/h | CAN-FD #1 |
| `RPM-01` | Crankshaft Magnetic Reluctor | Powertrain | RPM | 4,000 - 15,200 | > 14,800 RPM | > 15,200 RPM | CAN-FD #1 |
| `ENG-T01` | ICE Coolant Radiator Thermistor | Powertrain | °C | 85.0 - 105.0 | &ge; 106.0°C | &ge; 114.0°C | CAN-FD #1 |
| `TIRE-FL-01` | Front-Left Infrared Tire Pyrometer | Tires | °C | 80.0 - 105.0 | &ge; 112.0°C | &ge; 122.0°C | CAN-FD #2 |
| `TIRE-FR-01` | Front-Right Infrared Tire Pyrometer | Tires | °C | 80.0 - 105.0 | &ge; 112.0°C | &ge; 122.0°C | CAN-FD #2 |
| `TIRE-RL-01` | Rear-Left Infrared Tire Pyrometer | Tires | °C | 85.0 - 108.0 | &ge; 112.0°C | &ge; 122.0°C | CAN-FD #2 |
| `TIRE-RR-01` | Rear-Right Infrared Tire Pyrometer | Tires | °C | 85.0 - 108.0 | &ge; 112.0°C | &ge; 122.0°C | CAN-FD #2 |
| `TPMS-01` | Front-Left Rim Valve Pressure Transducer | Tires | psi | 20.0 - 23.0 | &le; 19.0 psi | &le; 17.5 psi | CAN-FD #2 |
| `TPMS-02` | Front-Right Rim Valve Pressure Transducer| Tires | psi | 20.0 - 23.0 | &le; 19.0 psi | &le; 17.5 psi | CAN-FD #2 |
| `TPMS-03` | Rear-Left Rim Valve Pressure Transducer | Tires | psi | 19.5 - 22.5 | &le; 18.5 psi | &le; 17.0 psi | CAN-FD #2 |
| `TPMS-04` | Rear-Right Rim Valve Pressure Transducer| Tires | psi | 19.5 - 22.5 | &le; 18.5 psi | &le; 17.0 psi | CAN-FD #2 |
| `BRK-T01` | Front-Left Carbon Rotor Optical Pyrometer| Brakes | °C | 300 - 850 | &ge; 880°C | &ge; 980°C | CAN-FD #1 |
| `BRK-T02` | Front-Right Carbon Rotor Optical Pyrometer| Brakes| °C | 300 - 850 | &ge; 880°C | &ge; 980°C | CAN-FD #1 |
| `BRK-T03` | Rear-Left Carbon Rotor Optical Pyrometer | Brakes | °C | 280 - 800 | &ge; 850°C | &ge; 950°C | CAN-FD #1 |
| `BRK-T04` | Rear-Right Carbon Rotor Optical Pyrometer| Brakes | °C | 280 - 800 | &ge; 850°C | &ge; 950°C | CAN-FD #1 |
| `ACC-01` | 3-Axis Bulkhead Accelerometer | Kinematics | G | -5.2G to +2.2G Long | Long < -4.8G | Long < -5.4G | CAN-FD #1 |
| `GYR-01` | Solid-State Angular Rate Gyroscope | Kinematics | deg/s | -120 to +120 | > 95 deg/s | > 115 deg/s | CAN-FD #1 |
| `VIB-01` | Piezoelectric Bulkhead Vibration Sensor | Chassis Health | G RMS | 0.2 - 1.2 | &ge; 1.8G RMS | &ge; 2.8G RMS | CAN-FD #1 |
| `GPS-01` | Differential GNSS Transponder | Navigation | Coordinates | 0 - 5,793m | Off-track > 1.5m | Off-track > 3.0m | CAN-FD #2 |

---

## 2. Telemetry Packet Specification: Schema 2.0

The system streams packets complying with JSON Schema 2.0:

```json
{
  "version": "2.0.0",
  "master_seq": 10582,
  "timestamp_ms": 1729618052900,
  "car_id": "LEC_16",
  "driver": "Charles Leclerc",
  "team": "Scuderia Ferrari HP",
  "session": {
    "mode": "AUTONOMOUS_RACE",
    "state": "RUNNING",
    "lap_number": 2,
    "lap_time_s": 52.840,
    "delta_s": -0.420,
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

## 3. Automated Rule-Based Diagnostic Threshold Matrix

| Subsystem | Sensor ID | Trigger Condition | Severity | Consequence | Recommended Action | Feedback Action Type |
|---|---|---|---|---|---|---|
| **Powertrain Thermal** | `ENG-T01` | $T_{\text{ice}} \ge 114.0^\circ\text{C}$ | `CRITICAL` | Severe cylinder head gasket warp hazard from radiator blockage. | Command Engine Map 3 Cooling & engage 90m Lift-and-Coast. | `COOLING_MODE` |
| **Powertrain Thermal** | `ENG-T01` | $T_{\text{ice}} \ge 106.0^\circ\text{C}$ | `WARNING` | Elevated engine thermal strain; elevated cylinder pressure. | Short-shift at 13,500 RPM to lower heat rejection. | `SHORT_SHIFT` |
| **Tire Pressure** | `TPMS-01..04`| $P_{\text{tire}} \le 17.5\text{ psi}$ or $\frac{dP}{dt} < -0.3\text{ psi/s}$ | `CRITICAL` | Micro-leak puncture. High risk of catastrophic tread carcass blowout. | Box This Lap: Call car in for mandatory emergency pit stop. | `PIT_STOP` |
| **Tire Pressure** | `TPMS-01..04`| $P_{\text{tire}} \le 19.0\text{ psi}$ | `WARNING` | Sub-optimal tire carcass inflation; sidewall flexing and overheating. | Monitor pressure trend; prepare pit crew for tire change window. | `MONITOR_TIRE` |
| **Brake Thermal** | `BRK-T01..04`| $T_{\text{rotor}} \ge 980.0^\circ\text{C}$ | `CRITICAL` | Brake fluid boiling vaporization & carbon-carbon oxidation disc failure. | Shift brake bias +4% rearward and back off Turn 1 braking mark by 20m. | `BRAKE_BIAS_REAR` |
| **Brake Thermal** | `BRK-T01..04`| $T_{\text{rotor}} \ge 880.0^\circ\text{C}$ | `WARNING` | Elevated rotor temperature; potential pad glazing on heavy decelerations. | Instruct driver to optimize brake duct management in dirty air. | `BRAKE_MGMT` |
| **Chassis Health** | `VIB-01` | $V_{\text{rms}} \ge 2.8\text{G RMS}$ | `CRITICAL` | Severe high-frequency mechanical vibration. Front suspension upright play. | Execute electronic damper recalibration & inspect harmonics. | `RECALIBRATE_DAMPER` |
| **Sensor Link** | Any | Line Disconnected | `CRITICAL` | Complete telemetry dropout. Channel blind to safety telemetry. | Reconnect physical wiring harness to restore nominal CAN-FD streaming. | `RECONNECT_SENSOR` |
| **Network Link** | `RF-TEL-01` | Packet Loss $\ge 25\%$ or RTT $\ge 100\text{ms}$ | `WARNING` | Microwave RF signal multipath attenuation through trackside tree canopy. | Re-align Wi-Fi telemetry repeater & re-sync WebSocket buffer. | `RESTORE_NETWORK` |

---

## 4. Rate-of-Change Trend Diagnostics

In addition to static threshold checks, the rule engine computes finite-difference derivatives:

$$\frac{dT_{\text{ice}}}{dt} = \frac{T(t) - T(t - \Delta t)}{\Delta t}$$

$$\frac{dP_{\text{tire}}}{dt} = \frac{P(t) - P(t - \Delta t)}{\Delta t}$$

- If $\frac{dT_{\text{ice}}}{dt} > +0.8^\circ\text{C/s}$, an **Accelerated Thermal Buildup** warning is raised before the static 114°C limit is reached.
- If $\frac{dP_{\text{tire}}}{dt} < -0.3\text{ psi/s}$, a **Rapid Puncture Decompression** alert is raised before tire pressure collapses below 17.5 psi.
