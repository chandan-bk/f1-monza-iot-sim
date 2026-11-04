/**
 * ============================================================================
 * FORMULA 1 VEHICLE PHYSICS DYNAMICS ENGINE (MONZA HIGH-FIDELITY EDITION 2.0)
 * ============================================================================
 * Implements:
 *  - Dual-mode physics: Curvilinear track-anchored stability + 6-DOF sensor kinematics
 *  - Monza low-downforce aero trim (355+ km/h top speed, speed-squared drag/downforce)
 *  - 1.6L V6 Turbo Hybrid powertrain with seamless sequential 8-speed gearbox
 *  - 4-Wheel individual tire thermal and degradation dynamics
 *  - Carbon-carbon Brembo brake rotor thermal model (Turn 1 350->75 km/h heat spike)
 *  - Mechanical vibration modeling (G RMS) responding to RPM, kerbs, and damper faults
 *  - Closed-loop engineering interventions (Lift-and-Coast, Engine Cooling, Brake Bias, Pit Stops)
 *  - Physical fault simulation hooks (Radiator Blockage, TPMS Leaks, Brake Duct Blockage, Damper play)
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
    this.steerAngle = 0;          // Front wheel steering angle (rad)
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
    this.ersBatterySoc = 0.88;     // 88% starting charge
    
    // 4-Wheel Individual Subsystems: Front-Left, Front-Right, Rear-Left, Rear-Right
    this.tires = {
      fl: { temp: 88.0, wear: 0.0, pressure_psi: 22.5, pressure: 1.55, slipAngle: 0 },
      fr: { temp: 88.0, wear: 0.0, pressure_psi: 22.5, pressure: 1.55, slipAngle: 0 },
      rl: { temp: 92.0, wear: 0.0, pressure_psi: 20.5, pressure: 1.41, slipAngle: 0 },
      rr: { temp: 92.0, wear: 0.0, pressure_psi: 20.5, pressure: 1.41, slipAngle: 0 }
    };

    // Carbon-Carbon Brake Discs (operating range: 350°C to 1000°C)
    this.brakes = {
      fl: { temp: 360.0 },
      fr: { temp: 360.0 },
      rl: { temp: 310.0 },
      rr: { temp: 310.0 }
    };

    // Mechanical Vibration & Structural Health (G RMS)
    this.vibrationG = 0.45;
    this.vibrationAnomaly = false;

    // Closed-Loop Engineering Interventions
    this.engineCoolingMode = false;
    this.liftAndCoastActive = false;
    this.brakeBiasRearOffset = 0.0;
    this.pitStopTimer = 0;
    this.isPitStopping = false;

    // Physical Fault Simulation State Hooks
    this.radiatorBlockagePct = 0;    // 0 - 100%
    this.brakeDuctBlockagePct = 0;   // 0 - 100%
    this.tireLeakRate = { fl: 0, fr: 0, rl: 0, rr: 0 }; // psi / sec leak rate

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
    const slotDistance = 140 - (gridSlotIndex * 18);
    this.trackDistance = slotDistance;
    this.lateralOffset = (gridSlotIndex % 2 === 0) ? -2.4 : 2.4;
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
    this.vibrationG = 0.45;
    this.drsActive = false;
    this.crossedFinishCooldown = 4.0;

    if (this.carModel && this.carModel.root) {
      this.carModel.root.position.copy(this.position);
      this.carModel.root.rotation.set(0, this.heading, 0);
    }
  }

  update(dt, input) {
    if (dt <= 0 || dt > 0.1) dt = 0.016;

    // 1. Process Driver Inputs with Engineering Interventions
    let reqThrottle = THREE.MathUtils.clamp(input.throttle || 0, 0, 1);
    let reqBrake = THREE.MathUtils.clamp(input.brake || 0, 0, 1);

    // Engineering Intervention: Lift-and-Coast before heavy braking zones
    // Turn 1 (Variante del Rettifilo, ~850m-1050m) and Turn 4 (Variante della Roggia, ~2050m-2200m)
    if (this.liftAndCoastActive) {
      const d = this.trackDistance;
      if ((d >= 820 && d <= 1040) || (d >= 2000 && d <= 2180) || (d >= 4800 && d <= 5050)) {
        reqThrottle = Math.min(reqThrottle, 0.05); // Coasting under engine braking
      }
    }

    // Engineering Intervention: Engine Cooling Mode caps throttle at 82%
    if (this.engineCoolingMode) {
      reqThrottle = Math.min(reqThrottle, 0.82);
    }

    this.throttle = reqThrottle;
    this.brake = reqBrake;
    this.handbrake = !!input.handbrake;

    // 2. Monza DRS Zone Evaluation
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

    // 3. Longitudinal Forces
    const v = this.speed;
    const v2 = v * v;
    const rho = this.cfg.airDensity_kg_m3;
    const area = this.cfg.frontalArea_m2;
    const cd = this.drsActive ? this.cfg.dragCoefficient_DRS : this.cfg.dragCoefficient_Cd;

    const dragForce = 0.5 * rho * cd * area * v2;
    const downforce_N = 0.5 * rho * this.cfg.downforceCoeff_Cl * area * v2;
    const normalLoad_N = (this.cfg.mass_kg * 9.81) + downforce_N;

    this.updatePowertrain(dt);

    const currentGearRatio = this.cfg.gearRatios[this.gear] || 1.0;
    const totalDriveRatio = currentGearRatio * this.cfg.finalDrive;
    const tireRadius = 0.36;

    let ersBoostNm = 0;
    if (this.throttle > 0.85 && this.ersBatterySoc > 0.05) {
      ersBoostNm = 135;
      this.ersBatterySoc = Math.max(0, this.ersBatterySoc - (0.012 * dt));
    }

    const engineTorque = (this.cfg.peakTorqueNm * this.getTorqueCurve(this.rpm)) + ersBoostNm;
    let driveForce = 0;
    if (this.shiftTimer <= 0) {
      driveForce = (engineTorque * totalDriveRatio * this.throttle) / tireRadius;
    }

    let brakeForce = 0;
    if (this.brake > 0) {
      const maxDecel = Math.min(this.cfg.maxBrakingDecel_ms2, (normalLoad_N * this.cfg.tireGripPeakCoeff) / this.cfg.mass_kg);
      brakeForce = this.brake * maxDecel * this.cfg.mass_kg;

      if (this.ersBatterySoc < 0.99 && this.speed > 10) {
        this.ersBatterySoc = Math.min(1.0, this.ersBatterySoc + (0.024 * dt));
      }
    }

    const rollingRes = 0.012 * this.cfg.mass_kg * 9.81;
    const netForce = driveForce - brakeForce - dragForce - (rollingRes * Math.sign(this.speed));
    this.longitudinalAcc = netForce / this.cfg.mass_kg;
    this.longitudinalG = this.longitudinalAcc / 9.81;

    this.speed = Math.max(0, this.speed + (this.longitudinalAcc * dt));
    this.speedKmh = this.speed * 3.6;

    // 4. Curvilinear Spline & Lateral Dynamics
    this.trackDistance = (this.trackDistance + this.speed * dt) % trackLen;
    const halfWidth = (this.track.config.width_m / 2) - 1.2;

    if (input.targetOffset !== undefined) {
      const targetOff = THREE.MathUtils.clamp(input.targetOffset, -halfWidth, halfWidth);
      const offError = targetOff - this.lateralOffset;
      this.lateralVelocity = THREE.MathUtils.clamp(offError * 4.2, -5.5, 5.5);
      this.lateralOffset += this.lateralVelocity * dt;
      this.steerAngle = (this.lateralVelocity / Math.max(16, this.speed)) * 1.8;
    } else {
      const steerInput = THREE.MathUtils.clamp(input.steering || 0, -1, 1);
      const steerSpeedFactor = Math.min(1.0, this.speed / 12.0);
      this.lateralVelocity = steerInput * 6.2 * steerSpeedFactor;
      this.lateralOffset = THREE.MathUtils.clamp(this.lateralOffset + this.lateralVelocity * dt, -halfWidth, halfWidth);
      this.steerAngle = steerInput * THREE.MathUtils.degToRad(18.0);
    }

    const u = this.trackDistance / trackLen;
    const centerPt = this.track.curve.getPointAt(u);
    const tangent = this.track.curve.getTangentAt(u);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    this.position.copy(centerPt).add(normal.clone().multiplyScalar(this.lateralOffset));
    this.position.y = centerPt.y + 0.15;

    const trackHeading = Math.atan2(tangent.x, tangent.z);
    const yawSlip = Math.atan2(this.lateralVelocity, Math.max(14.0, this.speed));
    this.heading = trackHeading + (yawSlip * 0.85);
    this.velocity.set(Math.sin(this.heading) * this.speed, 0, Math.cos(this.heading) * this.speed);

    if (this.carModel && this.carModel.root) {
      this.carModel.root.position.copy(this.position);
      this.carModel.root.rotation.set(0, this.heading, 0);
    }

    // Curvature & Lateral G
    const nextU = (this.trackDistance + 8.0) % trackLen / trackLen;
    const nextTangent = this.track.curve.getTangentAt(nextU);
    const angleDelta = tangent.angleTo(nextTangent);
    const curvature = angleDelta / 8.0;
    const rawLatG = (v2 * curvature) / 9.81;
    const turnCross = tangent.x * nextTangent.z - tangent.z * nextTangent.x;
    const turnSign = turnCross >= 0 ? 1 : -1;
    this.lateralG = THREE.MathUtils.clamp(rawLatG * turnSign, -5.2, 5.2);
    this.lateralAcc = this.lateralG * 9.81;

    // 5. Progress, Thermals, Vibration & Pit Stop Handlers
    this.updateLapProgress(dt, u);
    this.updateThermalSubsystems(dt);
    this.updateVibration(dt);
    this.updatePitStop(dt);

    // 6. Update Visuals
    if (this.carModel && this.carModel.updateVisuals) {
      const discTemps = [this.brakes.fl.temp, this.brakes.fr.temp, this.brakes.rl.temp, this.brakes.rr.temp];
      this.carModel.updateVisuals(this.speed, this.steerAngle, this.brake > 0.1, this.drsActive, discTemps, this);
    }
  }

  updateThermalSubsystems(dt) {
    const v = this.speed;
    const absLatG = Math.abs(this.lateralG);

    // 1. Carbon-Carbon Brake Rotors
    // Impacted by brake bias adjustments and brake duct blockage
    const frontBias = Math.max(0.48, Math.min(0.62, this.cfg.brakeBiasFront - this.brakeBiasRearOffset));
    const rearBias = 1.0 - frontBias;

    const ductBlockMult = 1.0 + (this.brakeDuctBlockagePct / 100) * 1.7;
    const ductCoolMult = Math.max(0.25, 1.0 - (this.brakeDuctBlockagePct / 100) * 0.75);

    const brakeHeat = this.brake * (this.speedKmh / 350) * 280.0 * dt * ductBlockMult;
    const coolingRate = (0.28 + (v / 80) * 0.95) * dt * ductCoolMult;

    ['fl', 'fr', 'rl', 'rr'].forEach(wheel => {
      const isFront = wheel.startsWith('f');
      const b = this.brakes[wheel];
      const biasRatio = isFront ? (frontBias / 0.5) : (rearBias / 0.5);
      const heatInput = brakeHeat * biasRatio;
      b.temp += heatInput;
      b.temp = Math.max(320.0, b.temp - ((b.temp - 320.0) * coolingRate * 0.35));
    });

    // 2. 4-Wheel Tires: Temperature, Wear, and TPMS Pressures
    const turnRight = this.lateralG > 0;
    const tireFrictionHeat = (absLatG * 2.8 + (this.speedKmh / 350) * 1.4) * dt;

    this.tires.fl.temp += turnRight ? tireFrictionHeat * 1.45 : tireFrictionHeat * 0.65;
    this.tires.fr.temp += (!turnRight) ? tireFrictionHeat * 1.45 : tireFrictionHeat * 0.65;
    this.tires.rl.temp += turnRight ? tireFrictionHeat * 1.15 : tireFrictionHeat * 0.55;
    this.tires.rr.temp += (!turnRight) ? tireFrictionHeat * 1.15 : tireFrictionHeat * 0.55;

    this.tires.fl.temp += (this.brakes.fl.temp - 320) * 0.0003 * dt;
    this.tires.fr.temp += (this.brakes.fr.temp - 320) * 0.0003 * dt;

    const tireCooling = (0.04 + (v / 90) * 0.12) * dt;
    ['fl', 'fr', 'rl', 'rr'].forEach(w => {
      const t = this.tires[w];

      // Handle micro-leak TPMS decay
      if (this.tireLeakRate[w] > 0) {
        t.pressure_psi = Math.max(12.0, t.pressure_psi - (this.tireLeakRate[w] * dt));
        t.pressure = t.pressure_psi / 14.5038;
        // Under-inflated tire carcass scrub generates excess heat
        const deflDelta = Math.max(0, 22.0 - t.pressure_psi);
        t.temp += deflDelta * 0.14 * dt;
      }

      if (t.temp > this.cfg.tireOptimalTemp_C) {
        t.temp -= (t.temp - this.cfg.tireOptimalTemp_C) * tireCooling;
      }
      t.wear += (this.speedKmh / 350) * this.cfg.tireWearRatePerKm * (dt / 3.6);
    });

    // 3. ICE Powertrain Coolant Temperature
    const rpmFraction = (this.rpm - this.cfg.idleRpm) / (this.cfg.maxRpm - this.cfg.idleRpm);
    let engineHeat = (rpmFraction * this.throttle * 3.5) * dt;
    let radiatorCooling = (v / 80) * 2.8 * dt;

    // Apply radiator blockage scenario
    if (this.radiatorBlockagePct > 0) {
      engineHeat += (this.radiatorBlockagePct / 100) * 6.5 * dt;
      radiatorCooling *= Math.max(0.2, 1.0 - (this.radiatorBlockagePct / 100) * 0.8);
    }

    // Apply Engine Cooling Mode intervention
    if (this.engineCoolingMode) {
      engineHeat *= 0.65;
      radiatorCooling *= 1.45;
    }

    this.engineTemp_C = Math.max(95.0, Math.min(125.0, this.engineTemp_C + engineHeat - radiatorCooling));
  }

  updateVibration(dt) {
    // Baseline mechanical vibration: 0.35G + RPM contribution
    const baseVib = 0.32 + (this.rpm / 15000) * 0.38;

    // Kerb rumble strip contact
    const kerbVib = (this.trackProgress && this.trackProgress.isOnKerb) ? 1.45 : 0.0;

    // High tire wear contributes micro-oscillations
    const wearVib = (this.tires.fl.wear + this.tires.fr.wear) * 0.015;

    // Injected suspension / damper mechanical anomaly
    const faultVib = this.vibrationAnomaly ? (2.85 + Math.sin(Date.now() * 0.015) * 0.45) : 0.0;

    const targetVib = baseVib + kerbVib + wearVib + faultVib;
    this.vibrationG += (targetVib - this.vibrationG) * Math.min(1.0, dt * 5.0);
  }

  updatePitStop(dt) {
    if (!this.isPitStopping) return;

    this.pitStopTimer -= dt;
    if (this.pitStopTimer <= 0) {
      this.isPitStopping = false;
      // Complete tire change: fresh Pirelli rubber, full nominal pressure
      this.tires.fl.wear = 0.0;
      this.tires.fr.wear = 0.0;
      this.tires.rl.wear = 0.0;
      this.tires.rr.wear = 0.0;

      this.tires.fl.pressure_psi = 22.5;
      this.tires.fr.pressure_psi = 22.5;
      this.tires.rl.pressure_psi = 20.5;
      this.tires.rr.pressure_psi = 20.5;

      this.tires.fl.pressure = 1.55;
      this.tires.fr.pressure = 1.55;
      this.tires.rl.pressure = 1.41;
      this.tires.rr.pressure = 1.41;

      this.tires.fl.temp = 92.0;
      this.tires.fr.temp = 92.0;
      this.tires.rl.temp = 94.0;
      this.tires.rr.temp = 94.0;

      // Clear tire leak rates
      this.tireLeakRate = { fl: 0, fr: 0, rl: 0, rr: 0 };
    }
  }

  applyEngineeringAction(actionType, param) {
    switch (actionType) {
      case 'COOLING_MODE':
        this.engineCoolingMode = true;
        this.radiatorBlockagePct = 0; // Clear blockage via aerodynamic blowout
        break;
      case 'LIFT_AND_COAST':
        this.liftAndCoastActive = true;
        break;
      case 'BRAKE_BIAS_REAR':
        this.brakeBiasRearOffset = param !== undefined ? param : 0.04; // Shifts 4% to rear
        this.brakeDuctBlockagePct = 0; // Cleared debris
        break;
      case 'PIT_STOP':
        this.isPitStopping = true;
        this.pitStopTimer = 2.4; // 2.4s Formula 1 pit stop
        break;
      case 'RECALIBRATE_DAMPER':
        this.vibrationAnomaly = false;
        break;
      case 'RESET_ALL':
        this.engineCoolingMode = false;
        this.liftAndCoastActive = false;
        this.brakeBiasRearOffset = 0.0;
        this.vibrationAnomaly = false;
        this.radiatorBlockagePct = 0;
        this.brakeDuctBlockagePct = 0;
        this.tireLeakRate = { fl: 0, fr: 0, rl: 0, rr: 0 };
        this.engineTemp_C = this.cfg.engineNormalTemp_C;
        break;
    }
  }

  updateLapProgress(dt, u) {
    const curDist = this.trackDistance;
    this.currentLapTime += dt;

    if (this.crossedFinishCooldown > 0) {
      this.crossedFinishCooldown -= dt;
    }

    let curSector = 1;
    if (curDist >= 1850 && curDist < 3950) curSector = 2;
    else if (curDist >= 3950) curSector = 3;

    if (curSector === 2 && this.trackProgress.sector === 1) {
      this.sector1Time = this.currentLapTime;
    } else if (curSector === 3 && this.trackProgress.sector === 2) {
      this.sector2Time = this.currentLapTime - this.sector1Time;
    }

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
      this.crossedFinishCooldown = 15.0;
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

  updatePowertrain(dt) {
    if (this.shiftTimer > 0) {
      this.shiftTimer -= dt * 1000;
    }

    const currentGearRatio = this.cfg.gearRatios[this.gear] || 1.0;
    const totalDriveRatio = currentGearRatio * this.cfg.finalDrive;
    const tireRadius = 0.36;

    const calculatedRpm = (this.speed / tireRadius) * (totalDriveRatio / (2 * Math.PI)) * 60;
    this.rpm = Math.max(this.cfg.idleRpm, calculatedRpm);

    if (this.shiftTimer <= 0) {
      if (this.rpm >= 14800 && this.gear < 8) {
        this.gear++;
        this.shiftTimer = this.cfg.shiftDelayMs;
      } else if (this.rpm < 8400 && this.gear > 1 && this.speedKmh < (this.gear * 46)) {
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
