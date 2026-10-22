/**
 * ============================================================================
 * FORMULA 1 VEHICLE PHYSICS DYNAMICS ENGINE (MONZA HIGH-FIDELITY EDITION)
 * ============================================================================
 * Implements:
 *  - Dual-mode physics: Curvilinear track-anchored stability + 6-DOF sensor kinematics
 *  - Monza low-downforce aero trim (355+ km/h top speed, speed-squared drag/downforce)
 *  - 1.6L V6 Turbo Hybrid powertrain with seamless sequential 8-speed gearbox
 *  - 4-Wheel individual tire thermal and degradation dynamics
 *  - Carbon-carbon Brembo brake rotor thermal model (Turn 1 350->75 km/h heat spike)
 *  - ERS hybrid battery energy recovery (MGU-K) under braking & high-speed deployment
 *  - Realistic longitudinal G (+accel, -braking up to 5.2G) & lateral G (Curva Grande 4.5G)
 * ============================================================================
 */

class VehiclePhysics {
  constructor(carModel, track, driverConfig) {
    this.carModel = carModel;
    this.track = track;
    this.driver = driverConfig;
    this.cfg = window.F1_CONFIG.VEHICLE;

    // Kinematic State
    this.position = new THREE.Vector3(0, 0.2, -400);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 0;               // Forward speed in m/s
    this.speedKmh = 0;            // Forward speed in km/h
    this.heading = 0;             // Yaw angle in radians
    this.steerAngle = 0;         // Front wheel steering angle (rad)
    this.angularVelocity = 0;     // Yaw rate (rad/s)

    // Curvilinear Track Coordinates (s = distance along centerline, d = lateral offset)
    this.trackDistance = 0;       // 0 to trackLength (m)
    this.lateralOffset = 0;       // -width/2 to +width/2 (m)
    this.lateralVelocity = 0;     // Rate of lateral change (m/s)

    // Accelerations & G-forces
    this.longitudinalAcc = 0;     // m/s^2 (+ accel, - braking)
    this.lateralAcc = 0;          // m/s^2 (+ right, - left)
    this.longitudinalG = 0;       // G-force
    this.lateralG = 0;            // G-force

    // Powertrain State
    this.throttle = 0;            // 0.0 to 1.0
    this.brake = 0;               // 0.0 to 1.0
    this.handbrake = false;
    this.drsActive = false;
    this.gear = 1;                // 1 to 8
    this.rpm = this.cfg.idleRpm;
    this.wheelSpeed = 0;
    this.wheelSlip = 0;
    this.shiftTimer = 0;

    // Thermal & Hybrid Degradation State
    this.engineTemp_C = this.cfg.engineNormalTemp_C;
    this.fuelRemaining_kg = 105.0; // Starting race fuel load
    this.ersBatterySoc = 0.88;      // 88% starting charge
    
    // 4-Wheel Individual Subsystems: Front-Left, Front-Right, Rear-Left, Rear-Right
    this.tires = {
      fl: { temp: 88.0, wear: 0.0, pressure_psi: 22.5, slipAngle: 0 },
      fr: { temp: 88.0, wear: 0.0, pressure_psi: 22.5, slipAngle: 0 },
      rl: { temp: 92.0, wear: 0.0, pressure_psi: 20.5, slipAngle: 0 },
      rr: { temp: 92.0, wear: 0.0, pressure_psi: 20.5, slipAngle: 0 }
    };

    // Carbon-Carbon Brake Discs (operating range: 350°C to 1000°C)
    this.brakes = {
      fl: { temp: 360.0 },
      fr: { temp: 360.0 },
      rl: { temp: 310.0 },
      rr: { temp: 310.0 }
    };

    // Lap & Track Progress State
    this.trackProgress = {
      distance: 0,
      u: 0,
      lateralOffset: 0,
      isOffTrack: false,
      isOnKerb: false,
      sector: 1
    };

    this.lapCount = 1;
    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.sectorTimes = [0, 0, 0];
    this.sector1Time = 0;
    this.sector2Time = 0;
    this.sector3Time = 0;
    this.lastLapTime = 0;
    this.bestLapTime = 0;
    this.completedLaps = [];
    this.crossedFinishCooldown = 0;

    // Safety and Warning State
    this.trackLimitsViolations = 0;
    this.lapInvalidated = false;
    this.trackLimitWarningTimer = 0;
    this.barrierImpactTimer = 0;
    this.hasBarrierImpact = false;

    // Reset to starting grid position
    this.resetToGrid(0);
  }

  resetToGrid(gridSlotIndex = 0) {
    const trackLen = this.track.trackLength;
    // Staggered grid slots on the Monza Rettifilo straight (12m longitudinal gap)
    const slotDistance = (trackLen - 25 - (gridSlotIndex * 12)) % trackLen;
    this.trackDistance = slotDistance;
    // Pole position on left (-2.8m), P2 on right (+2.8m)
    this.lateralOffset = (gridSlotIndex % 2 === 0) ? -2.6 : 2.6;
    this.lateralVelocity = 0;

    const u = slotDistance / trackLen;
    const pt = this.track.curve.getPointAt(u);
    const tangent = this.track.curve.getTangentAt(u);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    this.position.copy(pt).add(normal.multiplyScalar(this.lateralOffset));
    this.position.y = pt.y + 0.15;
    this.heading = Math.atan2(tangent.x, tangent.z);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.speedKmh = 0;
    this.rpm = this.cfg.idleRpm;
    this.gear = 1;
    this.steerAngle = 0;
    this.angularVelocity = 0;
    this.longitudinalG = 0;
    this.lateralG = 0;
    this.wheelSlip = 0;
    this.drsActive = false;
    this.crossedFinishCooldown = 4.0;

    if (this.carModel && this.carModel.root) {
      this.carModel.root.position.copy(this.position);
      this.carModel.root.rotation.set(0, this.heading, 0);
    }
  }

  update(dt, input) {
    if (dt <= 0 || dt > 0.1) dt = 0.016;

    // 1. Process Driver Inputs (Manual or Autonomous)
    this.throttle = THREE.MathUtils.clamp(input.throttle || 0, 0, 1);
    this.brake = THREE.MathUtils.clamp(input.brake || 0, 0, 1);
    this.handbrake = !!input.handbrake;

    // 2. Monza DRS Zone Evaluation (Main Straight & Back Straight)
    const trackLen = this.track.trackLength;
    const curDist = this.trackDistance;
    const drsZones = this.track.config.drsZones || [this.track.config.drsZone];
    let inDrs = false;
    for (const z of drsZones) {
      if (curDist >= z.startDistance && curDist <= z.endDistance) {
        inDrs = true;
        break;
      }
    }
    this.drsActive = inDrs && (input.drs || this.throttle > 0.85) && (this.brake < 0.1);

    // 3. Longitudinal Forces (Powertrain vs Aerodynamics vs Braking)
    const v = this.speed;
    const v2 = v * v;
    const rho = this.cfg.airDensity_kg_m3;
    const area = this.cfg.frontalArea_m2;
    const cd = this.drsActive ? this.cfg.dragCoefficient_DRS : this.cfg.dragCoefficient_Cd;

    // Aerodynamic Drag & Downforce at speed
    const dragForce = 0.5 * rho * cd * area * v2;
    const downforce_N = 0.5 * rho * this.cfg.downforceCoeff_Cl * area * v2;
    const normalLoad_N = (this.cfg.mass_kg * 9.81) + downforce_N;

    // Powertrain update (gear shifts, RPM, torque)
    this.updatePowertrain(dt);

    const currentGearRatio = this.cfg.gearRatios[this.gear] || 1.0;
    const totalDriveRatio = currentGearRatio * this.cfg.finalDrive;
    const tireRadius = 0.36; // 360mm rolling radius

    // Hybrid ERS-K deployment
    let ersBoostNm = 0;
    if (this.throttle > 0.85 && this.ersBatterySoc > 0.05) {
      ersBoostNm = 135; // 135 Nm electric boost
      this.ersBatterySoc = Math.max(0, this.ersBatterySoc - (0.012 * dt));
    }

    const engineTorque = (this.cfg.peakTorqueNm * this.getTorqueCurve(this.rpm)) + ersBoostNm;
    let driveForce = 0;
    if (this.shiftTimer <= 0) {
      driveForce = (engineTorque * totalDriveRatio * this.throttle) / tireRadius;
    }

    // Braking Force & ERS Harvesting (Monza Turn 1: 52 m/s² peak deceleration)
    let brakeForce = 0;
    if (this.brake > 0) {
      const maxDecel = Math.min(this.cfg.maxBrakingDecel_ms2, (normalLoad_N * this.cfg.tireGripPeakCoeff) / this.cfg.mass_kg);
      brakeForce = this.brake * maxDecel * this.cfg.mass_kg;

      // ERS MGU-K Kinetic energy recovery
      if (this.ersBatterySoc < 0.99 && this.speed > 10) {
        this.ersBatterySoc = Math.min(1.0, this.ersBatterySoc + (0.024 * dt));
      }
    }

    // Net Longitudinal Acceleration
    const rollingRes = 0.012 * this.cfg.mass_kg * 9.81;
    const netForce = driveForce - brakeForce - dragForce - (rollingRes * Math.sign(this.speed));
    this.longitudinalAcc = netForce / this.cfg.mass_kg;
    this.longitudinalG = this.longitudinalAcc / 9.81;

    // Forward speed integration (up to Monza top speed 362 km/h)
    const prevSpeed = this.speed;
    this.speed = Math.max(0, this.speed + (this.longitudinalAcc * dt));
    this.speedKmh = this.speed * 3.6;

    // 4. Curvilinear Spline-Coupled Movement & Dynamic Lateral Lane Control
    // Forward distance along track spline
    this.trackDistance = (this.trackDistance + this.speed * dt) % trackLen;

    // Lateral lane offset dynamics (smooth, realistic lane tracking)
    const halfWidth = (this.track.config.width_m / 2) - 1.2; // Safe track bounds (-6.0m to +6.0m)

    if (input.targetOffset !== undefined) {
      // Autonomous AI Lane Following: smoothly targets racing line / overtaking line
      const targetOff = THREE.MathUtils.clamp(input.targetOffset, -halfWidth, halfWidth);
      const offError = targetOff - this.lateralOffset;
      this.lateralVelocity = THREE.MathUtils.clamp(offError * 4.2, -5.5, 5.5);
      this.lateralOffset += this.lateralVelocity * dt;
      this.steerAngle = (this.lateralVelocity / Math.max(16, this.speed)) * 1.8;
    } else {
      // Manual Player Driving: steering changes lateral velocity across the track
      const steerInput = THREE.MathUtils.clamp(input.steering || 0, -1, 1);
      const steerSpeedFactor = Math.min(1.0, this.speed / 12.0);
      this.lateralVelocity = steerInput * 6.2 * steerSpeedFactor;
      this.lateralOffset = THREE.MathUtils.clamp(this.lateralOffset + this.lateralVelocity * dt, -halfWidth, halfWidth);
      this.steerAngle = steerInput * THREE.MathUtils.degToRad(18.0);
    }

    // Evaluate 3D Spline Coordinate at current distance
    const u = this.trackDistance / trackLen;
    const centerPt = this.track.curve.getPointAt(u);
    const tangent = this.track.curve.getTangentAt(u);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Position car firmly on the tarmac at lateral offset
    this.position.copy(centerPt).add(normal.clone().multiplyScalar(this.lateralOffset));
    this.position.y = centerPt.y + 0.15;

    // Realistic heading: aligns with track curvature + lateral yaw slip angle
    const trackHeading = Math.atan2(tangent.x, tangent.z);
    const yawSlip = Math.atan2(this.lateralVelocity, Math.max(14.0, this.speed));
    this.heading = trackHeading + (yawSlip * 0.85);

    this.velocity.set(Math.sin(this.heading) * this.speed, 0, Math.cos(this.heading) * this.speed);

    // Update 3D Visual Mesh Transform
    if (this.carModel && this.carModel.root) {
      this.carModel.root.position.copy(this.position);
      this.carModel.root.rotation.set(0, this.heading, 0);
    }

    // 5. Curvature & Lateral G-Force Calculation
    const nextU = (this.trackDistance + 8.0) % trackLen / trackLen;
    const nextTangent = this.track.curve.getTangentAt(nextU);
    const angleDelta = tangent.angleTo(nextTangent);
    const curvature = angleDelta / 8.0;
    const rawLatG = (v2 * curvature) / 9.81;
    // Determine sign of turn (cross product)
    const turnCross = tangent.x * nextTangent.z - tangent.z * nextTangent.x;
    const turnSign = turnCross >= 0 ? 1 : -1;
    this.lateralG = THREE.MathUtils.clamp(rawLatG * turnSign, -5.2, 5.2);
    this.lateralAcc = this.lateralG * 9.81;

    // 6. Update Lap Progress & Sector Splits
    this.updateLapProgress(dt, u);

    // 7. Physical Subsystems Simulation (Tires, Brakes, Powertrain Thermals)
    this.updateThermalSubsystems(dt);

    // 8. Update Visual Steering & Glow
    if (this.carModel && this.carModel.updateVisuals) {
      const discTemps = [this.brakes.fl.temp, this.brakes.fr.temp, this.brakes.rl.temp, this.brakes.rr.temp];
      this.carModel.updateVisuals(this.speed, this.steerAngle, this.brake > 0.1, this.drsActive, discTemps, this);
    }
  }

  updateLapProgress(dt, u) {
    const curDist = this.trackDistance;
    this.currentLapTime += dt;

    if (this.crossedFinishCooldown > 0) {
      this.crossedFinishCooldown -= dt;
    }

    // Sectors: S1 (0-1850m), S2 (1850-3950m), S3 (3950-5793m)
    let curSector = 1;
    if (curDist >= 1850 && curDist < 3950) curSector = 2;
    else if (curDist >= 3950) curSector = 3;

    if (curSector === 2 && this.trackProgress.sector === 1) {
      this.sector1Time = this.currentLapTime;
    } else if (curSector === 3 && this.trackProgress.sector === 2) {
      this.sector2Time = this.currentLapTime - this.sector1Time;
    }

    // Start/Finish Line Crossing (around distance 0)
    if (curDist < 80 && this.trackProgress.distance > 5600 && this.crossedFinishCooldown <= 0) {
      this.sector3Time = this.currentLapTime - this.sector1Time - this.sector2Time;
      this.lastLapTime = this.currentLapTime;

      if (this.bestLapTime === 0 || this.lastLapTime < this.bestLapTime) {
        this.bestLapTime = this.lastLapTime;
      }

      this.completedLaps.push({
        lap: this.lapCount,
        lapTime: this.lastLapTime,
        s1: this.sector1Time,
        s2: this.sector2Time,
        s3: this.sector3Time,
        invalidated: this.lapInvalidated
      });

      this.lapCount++;
      this.currentLapTime = 0;
      this.lapInvalidated = false;
      this.crossedFinishCooldown = 15.0; // Prevent duplicate trigger
    }

    this.trackProgress = {
      distance: curDist,
      u: u,
      lateralOffset: this.lateralOffset,
      isOffTrack: Math.abs(this.lateralOffset) > 6.8,
      isOnKerb: Math.abs(this.lateralOffset) >= 5.6 && Math.abs(this.lateralOffset) <= 7.2,
      sector: curSector
    };
  }

  updateThermalSubsystems(dt) {
    const v = this.speed;
    const absLatG = Math.abs(this.lateralG);
    const ambient = this.cfg.ambientTemp_C;

    // 1. Carbon-Carbon Brake Rotors (Brembo F1: Turn 1 spikes to 950°C, cooled by 350 km/h air ducts)
    const brakeHeat = this.brake * (this.speedKmh / 350) * 280.0 * dt;
    const coolingRate = (0.28 + (v / 80) * 0.95) * dt;

    ['fl', 'fr', 'rl', 'rr'].forEach(wheel => {
      const isFront = wheel.startsWith('f');
      const b = this.brakes[wheel];
      const heatInput = isFront ? brakeHeat * 1.15 : brakeHeat * 0.85;
      b.temp += heatInput;
      // Convective cooling back to baseline 320°C
      b.temp = Math.max(320.0, b.temp - ((b.temp - 320.0) * coolingRate * 0.35));
    });

    // 2. 4-Wheel Tire Thermal Dynamics (Pirelli P-Zero Red Soft)
    // Curva Grande (right turn): FL tire bears peak load; Ascari (left turn): FR bears load
    const turnRight = this.lateralG > 0;
    const tireFrictionHeat = (absLatG * 2.8 + (this.speedKmh / 350) * 1.4) * dt;

    this.tires.fl.temp += turnRight ? tireFrictionHeat * 1.45 : tireFrictionHeat * 0.65;
    this.tires.fr.temp += (!turnRight) ? tireFrictionHeat * 1.45 : tireFrictionHeat * 0.65;
    this.tires.rl.temp += turnRight ? tireFrictionHeat * 1.15 : tireFrictionHeat * 0.55;
    this.tires.rr.temp += (!turnRight) ? tireFrictionHeat * 1.15 : tireFrictionHeat * 0.55;

    // Heat transfer from glowing brake rotors into wheel rim & tire carcass
    this.tires.fl.temp += (this.brakes.fl.temp - 320) * 0.0003 * dt;
    this.tires.fr.temp += (this.brakes.fr.temp - 320) * 0.0003 * dt;

    // Tire convective cooling to optimal window (98°C)
    const tireCooling = (0.04 + (v / 90) * 0.12) * dt;
    ['fl', 'fr', 'rl', 'rr'].forEach(w => {
      const t = this.tires[w];
      if (t.temp > this.cfg.tireOptimalTemp_C) {
        t.temp -= (t.temp - this.cfg.tireOptimalTemp_C) * tireCooling;
      }
      t.wear += (this.speedKmh / 350) * this.cfg.tireWearRatePerKm * (dt / 3.6);
    });

    // 3. ICE Powertrain Coolant Temperature
    const rpmFraction = (this.rpm - this.cfg.idleRpm) / (this.cfg.maxRpm - this.cfg.idleRpm);
    const engineHeat = (rpmFraction * this.throttle * 3.5) * dt;
    const radiatorCooling = (v / 80) * 2.8 * dt;
    this.engineTemp_C = Math.max(95.0, Math.min(120.0, this.engineTemp_C + engineHeat - radiatorCooling));
  }

  updatePowertrain(dt) {
    if (this.shiftTimer > 0) {
      this.shiftTimer -= dt * 1000;
    }

    const currentGearRatio = this.cfg.gearRatios[this.gear] || 1.0;
    const totalDriveRatio = currentGearRatio * this.cfg.finalDrive;
    const tireRadius = 0.36;

    // Calculate RPM from road speed
    const calculatedRpm = (this.speed / tireRadius) * (totalDriveRatio / (2 * Math.PI)) * 60;
    this.rpm = Math.max(this.cfg.idleRpm, calculatedRpm);

    // Auto-Gear Shifting logic
    if (this.shiftTimer <= 0) {
      // Upshift at 14,800 RPM
      if (this.rpm >= 14800 && this.gear < 8) {
        this.gear++;
        this.shiftTimer = this.cfg.shiftDelayMs;
      }
      // Downshift under heavy braking
      else if (this.rpm < 8400 && this.gear > 1 && this.speedKmh < (this.gear * 46)) {
        this.gear--;
        this.shiftTimer = this.cfg.shiftDelayMs;
      }
    }

    if (this.rpm > this.cfg.revLimiterRpm) {
      this.rpm = this.cfg.revLimiterRpm;
    }
  }

  getTorqueCurve(rpm) {
    const norm = (rpm - 4000) / (15000 - 4000);
    return Math.sin(norm * Math.PI) * 0.45 + 0.55;
  }
}

window.VehiclePhysics = VehiclePhysics;
