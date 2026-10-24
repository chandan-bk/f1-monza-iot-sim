# Motorsport Telemetry Dictionary & Alert Rule Specifications

## 1. Comprehensive Telemetry Parameters Dictionary

All telemetry is sampled at **20 Hz synchronous frequency** (50 ms frame duration).

| Parameter Field | JSON Key | Physical Unit | Range | Source Subsystem | Description |
|---|---|---|---|---|---|
| **Timestamp** | `timestamp_ms` | Milliseconds | Unix ms | Telemetry Clock | Master clock reference for time-series correlation |
| **Speed** | `speed_kmh` | $\text{km/h}$ | $0.0 - 365.0$ | Kinematics Core | Forward linear velocity |
| **Engine RPM** | `engine_rpm` | $\text{RPM}$ | $4,000 - 15,200$ | Powertrain Model | Crankshaft rotational speed |
| **Gear** | `gear` | Integer | $0 - 8$ | Gearbox Model | Transmission gear position ($0 = \text{Neutral}$) |
| **Throttle** | `throttle_pct` | $\%$ | $0 - 100$ | Driver Input / AI | Accelerator pedal position |
| **Brake Pressure** | `brake_pct` | $\%$ | $0 - 100$ | Driver Input / AI | Master cylinder hydraulic line pressure |
| **Steering Angle** | `steering_angle_deg`| Degrees ($^\circ$) | $-22.0^\circ \text{ to } +22.0^\circ$ | Driver Input / AI | Front steering rack displacement angle |
| **Longitudinal G** | `longitudinal_g` | $\text{G} \ (\times 9.81 \text{ m/s}^2)$ | $-5.5\text{G} \text{ to } +2.2\text{G}$ | Dynamics Core | Acceleration ($+$) and braking deceleration ($-$) |
| **Lateral G** | `lateral_g` | $\text{G} \ (\times 9.81 \text{ m/s}^2)$ | $-4.8\text{G} \text{ to } +4.8\text{G}$ | Dynamics Core | Centripetal cornering force ($+$ Right, $-$ Left) |
| **Gyro Yaw Rate** | `gyro_z_dps` | $\text{deg/s}$ | $-120 \text{ to } +120$ | Dynamics Core | Angular yaw velocity about vertical axis |
| **Wheel Slip** | `wheel_slip_pct` | $\%$ | $0.0 - 100.0\%$ | Tire Friction Model | Longitudinal wheelspin or braking lockup |
| **DRS Flap** | `drs_status` | String | `"OPEN"` / `"CLOSED"` | Aero Subsystem | Drag Reduction System flap status |
| **ERS Battery** | `ers_soc_pct` | $\%$ | $0.0 - 100.0\%$ | Hybrid MGU-K Model | Hybrid Energy Recovery System battery charge |
| **Fuel Mass** | `fuel_remaining_kg`| $\text{kg}$ | $0.0 - 110.0$ | Fuel Flow Model | Onboard remaining fuel mass |
| **Engine Temp** | `engine_temp_c` | $^\circ\text{C}$ | $60.0 - 130.0$ | Radiator Thermal Model| Internal combustion engine coolant fluid temp |
| **Tire Temp FL** | `tires.fl_temp_c`| $^\circ\text{C}$ | $60.0 - 135.0$ | Tire Pyro Model | Front-Left tire carcass/bulk temperature |
| **Tire Temp FR** | `tires.fr_temp_c`| $^\circ\text{C}$ | $60.0 - 135.0$ | Tire Pyro Model | Front-Right tire carcass/bulk temperature |
| **Tire Temp RL** | `tires.rl_temp_c`| $^\circ\text{C}$ | $60.0 - 135.0$ | Tire Pyro Model | Rear-Left tire carcass/bulk temperature |
| **Tire Temp RR** | `tires.rr_temp_c`| $^\circ\text{C}$ | $60.0 - 135.0$ | Tire Pyro Model | Rear-Right tire carcass/bulk temperature |
| **Tire Wear** | `tires.avg_wear_pct`| $\%$ | $0.0 - 100.0\%$ | Tire Degradation Model| Tread rubber wear degradation |
| **Brake Disc FL**| `brakes.fl_temp_c`| $^\circ\text{C}$ | $200 - 1,150$ | Brake Thermal Model | Front-Left carbon-carbon rotor temp |
| **Brake Disc FR**| `brakes.fr_temp_c`| $^\circ\text{C}$ | $200 - 1,150$ | Brake Thermal Model | Front-Right carbon-carbon rotor temp |
| **Lap Number** | `lap_number` | Count | $1 - N$ | Timing Transponder | Active lap number |
| **Lap Time** | `lap_time_s` | Seconds | $0.000 - 180.000$ | Timing Transponder | Elapsed lap time timer |
| **Lap Delta** | `delta_s` | Seconds ($\pm$) | $-9.999 \text{ to } +9.999$ | Benchmark Delta | Time difference vs personal best reference lap |
| **Sector** | `current_sector` | Integer | $1, 2, 3$ | Spline Sector Split | Current track sector position |
| **Track Distance**| `track_distance_m`| Meters | $0 - 5,793$ | Curvilinear Spline | Distance traveled along Monza spline centerline |
| **Vehicle Status**| `status` | Enum | `NORMAL, WARN, CRIT` | Diagnostic Rule Engine| Subsystem health state |

---

## 2. Rule-Based Engineering Thresholds & Alert Matrix

| Diagnostic Subsystem | Rule Condition | Severity | Log Message & Diagnostic Root Cause | Recommended Pitwall Engineering Action |
|---|---|---|---|---|
| **Powertrain Thermal** | $T_{\text{ice}} \ge 114.0^\circ\text{C}$ | `CRITICAL` | `CRITICAL: Engine overheating (>114°C)! Blown head gasket risk.` | Mandatory lift-and-coast before Turns 1 & 5. Pull out of dirty wake. |
| **Powertrain Thermal** | $T_{\text{ice}} \ge 106.0^\circ\text{C}$ | `WARNING` | `Elevated ICE coolant temperature. High thermal strain.` | Short-shift at 13,000 RPM on main straight to lower heat flux. |
| **Tire Degradation** | $T_{\text{tire}} \ge 112.0^\circ\text{C}$ | `WARNING` | `Tire blistering / thermal graining detected (>112°C). Grip loss ~20%.` | Reduce entry speed at high-speed sweeping corners. Avoid aggressive curbs. |
| **Tire Operating Window** | $T_{\text{tire}} < 75.0^\circ\text{C}$ | `INFO` | `Tires below operating window (<75°C). Reduced braking grip.` | Weave on out-lap and brake hard to build tire carcass pressure and temperature. |
| **Brake Rotors** | $T_{\text{rotor}} \ge 980.0^\circ\text{C}$ | `CRITICAL` | `CRITICAL: Brake fluid boiling & rotor glazing hazard (>980°C)!` | Move brake bias $2\%$ rearward; extend braking distance by $15\text{m}$. |
