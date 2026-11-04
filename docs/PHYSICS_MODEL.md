# Formula 1 Vehicle Dynamics & Multiphysics Modeling (System 2.0)

## 1. Mathematical Framework & Kinematics Core

The vehicle simulation implements a curvilinear coordinate system along the 5,793m Autodromo Nazionale Monza spline, tracking longitudinal distance $s(t)$, lateral displacement $n(t)$, and vehicle heading $\psi(t)$.

### 1.1 Longitudinal Force Balance
The net longitudinal acceleration of each vehicle is governed by Newton's Second Law:

$$m \frac{dv}{dt} = F_{\text{traction}} - F_{\text{braking}} - F_{\text{aero\_drag}} - F_{\text{rolling\_resistance}}$$

Where:
- $m = 798\text{ kg}$ (FIA minimum vehicle + driver mass)
- $F_{\text{traction}} = \min\left(\frac{\tau_{\text{engine}} \cdot r_{\text{gear}} \cdot r_{\text{final}}}{R_{\text{tire}}}, \mu_{\text{long}} \cdot F_{\text{normal}}\right)$
- $F_{\text{braking}} = \text{brake\_input} \cdot F_{\text{brake\_max}} \cdot \mu_{\text{pad\_friction}}(T_{\text{rotor}})$
- $F_{\text{aero\_drag}} = \frac{1}{2} \rho C_d A v^2$
- $F_{\text{rolling\_resistance}} = C_{\text{rr}} \cdot m \cdot g$

---

## 2. Aerodynamics & Drag Reduction System (DRS)

### 2.1 Ground-Effect Aerodynamic Downforce
Modern Formula 1 single-seaters utilize venturi tunnels and aerodynamic wings to generate downforce proportional to the square of velocity:

$$F_{\text{downforce}} = \frac{1}{2} \rho C_l A v^2$$

- Air density: $\rho = 1.205\text{ kg/m}^3$ (at Monza ambient $24^\circ\text{C}$)
- Frontal area: $A = 1.45\text{ m}^2$
- Lift coefficient: $C_l = 3.40$ (high-speed cornering trim)

### 2.2 DRS Wing Actuation
When DRS is deployed in the two designated Monza zones (Rettifilo Straight & Serraglio Straight):
- Drag coefficient drops from $C_d = 0.68$ down to $C_d = 0.52$ (-23.5% aerodynamic drag).
- Terminal velocity increases from $335\text{ km/h}$ to $355+\text{ km/h}$.

---

## 3. Powertrain & Hybrid Energy Recovery (ERS)

### 3.1 1.6L V6 Turbocharged Hybrid ICE
Engine torque is computed through bilinear interpolation across an authentic torque curve (4,000–15,000 RPM), delivering a peak of 780 BHP from the internal combustion unit plus 160 BHP from the MGU-K electric motor:

$$\tau_{\text{total}} = \tau_{\text{ICE}}(\text{RPM}) \cdot \text{throttle} + \tau_{\text{MGU-K}}(\text{SoC})$$

### 3.2 8-Speed Sequential Monza Gearbox
Gear ratios are calibrated specifically for Monza's low-downforce, high-speed profile:
- 1st: 3.18, 2nd: 2.45, 3rd: 1.95, 4th: 1.58, 5th: 1.32, 6th: 1.12, 7th: 0.96, 8th: 0.84, Final Drive: 3.42.

---

## 4. Multiphysics Thermodynamic Models

### 4.1 ICE Coolant Temperature & Radiator Blockage
Engine heat flux is modeled as a balance between combustion heat generation and aerodynamic forced convective heat dissipation:

$$\frac{dT_{\text{coolant}}}{dt} = \frac{\dot{Q}_{\text{combustion}} - \dot{Q}_{\text{radiator}}}{C_{\text{thermal\_engine}}}$$

Where:
$$\dot{Q}_{\text{combustion}} = k_{\text{combustion}} \cdot \left(\frac{\text{RPM}}{15000}\right) \cdot \text{throttle}$$

$$\dot{Q}_{\text{radiator}} = h_{\text{rad}} \cdot A_{\text{rad}} \cdot (1 - \text{BlockagePct}) \cdot v_{\text{car}} \cdot (T_{\text{coolant}} - T_{\text{ambient}})$$

Under normal clean-air running, $T_{\text{coolant}}$ stabilizes at $98^\circ\text{C} - 102^\circ\text{C}$.  
When **Scenario A (Radiator Blockage)** is injected at 85%, $\dot{Q}_{\text{radiator}}$ is throttled by 85%, causing $T_{\text{coolant}}$ to rapidly climb past $114.0^\circ\text{C}$.

### 4.2 Brembo Carbon-Carbon Rotor Dissipation
Brake kinetic energy converted into thermal flux during severe decelerations (such as Turn 1 braking from $352\text{ km/h}$ to $78\text{ km/h}$ in 2.6 seconds):

$$\dot{Q}_{\text{braking}} = F_{\text{braking}} \cdot v_{\text{car}}$$

$$\frac{dT_{\text{rotor}}}{dt} = \frac{\dot{Q}_{\text{braking}} - h_{\text{duct}} \cdot (1 - \text{DuctBlockage}) \cdot v_{\text{car}} \cdot (T_{\text{rotor}} - T_{\text{ambient}})}{m_{\text{rotor}} \cdot c_{\text{carbon}}}$$

Rotor surface temperature peaks at $950^\circ\text{C} - 1,020^\circ\text{C}$ on corner entry, radiating a realistic red-orange emissive glow on the 3D car model.

### 4.3 Pirelli P-Zero Tire Thermodynamics & Degradation
Tire bulk temperature is driven by frictional road contact slip, carcass deflection, and heat radiation:

$$\Delta T_{\text{tire}} = \left(k_{\text{friction}} \cdot |v_{\text{slip}}| + k_{\text{cornering}} \cdot |F_{\text{lateral}}| - k_{\text{cooling}} \cdot v_{\text{car}} \cdot (T_{\text{tire}} - T_{\text{ambient}})\right) \Delta t$$

Tire wear accumulates monotonically based on temperature and frictional energy:

$$\Delta \text{Wear} = k_{\text{wear}} \cdot \left(\frac{T_{\text{tire}}}{100}\right)^{1.8} \cdot |v_{\text{slip}}| \cdot \Delta t$$

---

## 5. Mechanical Vibration & TPMS Puncture Physics

### 5.1 Bulkhead Accelerometer Vibration Model ($V_{\text{rms}}$)
Mechanical vibration measured by piezoelectric sensor `VIB-01` incorporates four additive components:

$$V_{\text{rms}} = V_{\text{baseline}} + \left(\frac{v_{\text{car}}}{350}\right) \cdot V_{\text{speed}} + V_{\text{kerb\_impact}} + V_{\text{anomaly}}$$

- $V_{\text{baseline}} = 0.25\text{G RMS}$ (chassis baseline)
- $V_{\text{speed}} = 0.45\text{G RMS}$ (aerodynamic buffeting at 350 km/h)
- $V_{\text{kerb\_impact}} = 1.40\text{G RMS}$ (high red-and-white kerb strikes at Variante Ascari)
- $V_{\text{anomaly}} = 2.45\text{G RMS}$ (injected in Scenario D, representing front upright damper mechanical looseness)

### 5.2 Pneumatic TPMS Pressure Leak Decay
Under normal running, tire pressure expands with temperature:

$$P_{\text{tire}}(t) = P_{\text{cold}} \cdot \left(\frac{T_{\text{tire}}(t) + 273.15}{293.15}\right)$$

When **Scenario B (Slow Puncture)** is injected on wheel $w \in \{\text{FL, FR, RL, RR}\}$:

$$P_{\text{tire}}(t) = P_{\text{tire}}(t - \Delta t) - (\text{leakRate}_w \cdot \Delta t)$$

With $\text{leakRate} = 0.55\text{ psi/s}$, the tire pressure collapses below $17.5\text{ psi}$ within 12 seconds, increasing rolling resistance by +40% and decreasing cornering stiffness by -35%.

---

## 6. Closed-Loop Engineering Interventions

When race engineering decisions are executed in Module 06, they directly modify physics variables in `VehiclePhysics`:

```javascript
applyEngineeringAction(actionType, param) {
  switch (actionType) {
    case 'COOLING_MODE':
      // Engage Engine Map 3: reduces fuel flow and triggers 90m lift-and-coast
      this.coolingModeActive = true;
      this.radiatorBlockagePct = Math.max(0, this.radiatorBlockagePct - 50);
      break;

    case 'PIT_STOP':
      // Replace tires, zero wear, restore TPMS to 21.0 psi
      Object.keys(this.tireWear).forEach(w => this.tireWear[w] = 0.0);
      Object.keys(this.tirePressure).forEach(w => this.tirePressure[w] = 21.0);
      Object.keys(this.tireLeakRate).forEach(w => this.tireLeakRate[w] = 0.0);
      break;

    case 'BRAKE_BIAS_REAR':
      // Shift brake balance rearward to relieve overheated front carbon rotors
      this.brakeBiasRearward += (param || 0.04);
      this.brakeDuctBlockagePct = 0;
      break;

    case 'RECALIBRATE_DAMPER':
      // Reset active suspension dampers to resolve structural vibration
      this.vibrationAnomaly = false;
      break;

    case 'RESET_ALL':
      // Restore all subsystems to factory baseline
      this.radiatorBlockagePct = 0;
      this.brakeDuctBlockagePct = 0;
      this.vibrationAnomaly = false;
      this.coolingModeActive = false;
      this.brakeBiasRearward = 0.0;
      Object.keys(this.tireLeakRate).forEach(w => this.tireLeakRate[w] = 0.0);
      break;
  }
}
```
