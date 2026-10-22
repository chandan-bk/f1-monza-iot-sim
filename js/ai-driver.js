/**
 * ============================================================================
 * AI OPPONENT & AUTONOMOUS DRIVING CONTROLLER (MONZA GRAND PRIX INTELLIGENCE)
 * Formula 1 IoT Telemetry & Race Simulator
 * ============================================================================
 * Features:
 *  - Official Monza curvature-based speed profiling (352 km/h straights down to 78 km/h chicanes)
 *  - Lookahead trail-braking and anticipatory corner entry speed regulation
 *  - Dynamic multi-car slipstream drafting (>220 km/h) & lateral overtaking lane choice
 *  - Close-proximity collision avoidance (prevents clustering & maintains clean racing formation)
 *  - Clamped lateral lane stability (cars race competitively without ever leaving the track)
 * ============================================================================
 */

class AIDriverController {
  constructor(vehiclePhysics, driverConfig, track) {
    this.physics = vehiclePhysics;
    this.driver = driverConfig;
    this.track = track;
    this.profile = driverConfig.aiProfile || {
      aggression: 0.90,
      brakingConsistency: 0.96,
      cornerSpeedFactor: 1.0,
      mistakeProbability: 0.005
    };

    // Driver-specific natural lateral line preference (-1.6m to +1.6m)
    this.racingLineBias = (Math.random() - 0.5) * 2.2;
    this.overtakeOffset = 0.0;
    this.overtakeTimer = 0.0;
    this.targetSpeedKmh = 350.0;
  }

  update(dt, ...otherCarsArgs) {
    const curDist = this.physics.trackDistance;
    const trackLen = this.track.trackLength;

    // 1. Curvature-Based Monza Speed Profile & Lookahead Braking Zone
    // At 350 km/h (97 m/s), cars look ahead 180 meters to initiate braking for Turn 1
    const currentSpeedKmh = this.physics.speedKmh;
    const lookaheadMeters = Math.max(35.0, (currentSpeedKmh / 350.0) * 190.0);
    const lookaheadDist = (curDist + lookaheadMeters) % trackLen;

    // Speed target at immediate distance vs corner ahead
    const immediateTarget = this.calculateMonzaSpeed(curDist);
    const lookaheadTarget = this.calculateMonzaSpeed(lookaheadDist);
    
    // Choose the lower target to ensure smooth anticipatory braking into chicanes
    let targetSpeed = Math.min(immediateTarget, lookaheadTarget) * this.profile.cornerSpeedFactor;

    // 2. Multi-Car Overtaking, Slipstream & Collision Avoidance
    const otherCars = [];
    otherCarsArgs.forEach(arg => {
      if (Array.isArray(arg)) {
        arg.forEach(c => { if (c) otherCars.push(c.physics || c); });
      } else if (arg) {
        otherCars.push(arg.physics || arg);
      }
    });

    let slipstreamActive = false;
    let avoidanceOffset = 0;

    otherCars.forEach(other => {
      if (!other || other === this.physics) return;

      // Track distance delta
      let distDelta = (other.trackDistance - curDist);
      if (distDelta < -trackLen / 2) distDelta += trackLen;
      if (distDelta > trackLen / 2) distDelta -= trackLen;

      // Lateral distance delta
      const latDelta = (other.lateralOffset - this.physics.lateralOffset);

      // Car is directly ahead on the track within 28 meters
      if (distDelta > 0 && distDelta < 28.0) {
        // A. Slipstream Drafting on Straights (>220 km/h)
        if (distDelta > 6.0 && Math.abs(latDelta) < 2.5 && currentSpeedKmh > 210) {
          slipstreamActive = true;
          // Trigger lateral pullout to overtake if closing in
          if (this.overtakeTimer <= 0 && this.profile.aggression > 0.82) {
            // Pull to the open side (prefer left or right)
            this.overtakeOffset = latDelta >= 0 ? -2.8 : 2.8;
            this.overtakeTimer = 3.8; // Hold overtake line for 3.8s
          }
        }

        // B. Proximity Collision Avoidance (<8.5 meters directly ahead)
        if (distDelta < 8.5 && Math.abs(latDelta) < 2.2) {
          // Steer gently away to avoid rear-ending
          avoidanceOffset = latDelta >= 0 ? -1.8 : 1.8;
          // Match speed of leading car to prevent collision
          if (other.speedKmh < targetSpeed) {
            targetSpeed = Math.min(targetSpeed, other.speedKmh - 1.5);
          }
        }
      }
    });

    if (this.overtakeTimer > 0) {
      this.overtakeTimer -= dt;
      if (this.overtakeTimer <= 0) {
        this.overtakeOffset = 0;
      }
    }

    // Slipstream provides +12 km/h top end burst
    if (slipstreamActive) {
      targetSpeed += 12.0;
    }

    this.targetSpeedKmh = targetSpeed;

    // 3. Longitudinal Throttle vs Trail Braking Control
    let throttleInput = 0;
    let brakeInput = 0;

    const speedDiff = targetSpeed - currentSpeedKmh;

    if (speedDiff > 4.0) {
      // Full Acceleration
      throttleInput = 1.0;
      brakeInput = 0.0;
    } else if (speedDiff < -6.0) {
      // Deceleration / Hard Trail Braking into Chicanes
      throttleInput = 0.0;
      const decelDemand = Math.abs(speedDiff) / 28.0;
      brakeInput = THREE.MathUtils.clamp(decelDemand * this.profile.brakingConsistency, 0.45, 1.0);
    } else {
      // Maintaining cornering apex speed
      throttleInput = 0.48;
      brakeInput = 0.0;
    }

    // DRS on Straights
    const isDrs = (curDist >= 150 && curDist <= 950) || (curDist >= 4350 && curDist <= 5150);

    // 4. Lateral Lane Target on Track (combines base racing line + overtaking + avoidance)
    const baseApexLine = this.getMonzaApexLine(curDist);
    const targetOffset = THREE.MathUtils.clamp(
      baseApexLine + this.racingLineBias + this.overtakeOffset + avoidanceOffset,
      -5.2,
      5.2
    );

    // Feed controls directly into VehiclePhysics
    this.physics.update(dt, {
      throttle: throttleInput,
      brake: brakeInput,
      targetOffset: targetOffset,
      drs: isDrs && brakeInput < 0.05
    });
  }

  // Official Monza Speed Target Map (5,793 meters)
  calculateMonzaSpeed(dist) {
    const trackLen = this.track.trackLength || 5793;
    const d = ((dist % trackLen) + trackLen) % trackLen;

    // 1. Rettifilo Main Straight (0 - 920m): 352 km/h blast
    if (d < 920) return 352.0;

    // 2. Turn 1 Braking Zone (920 - 1100m): 352 -> 76 km/h (heavy braking)
    if (d >= 920 && d < 1100) {
      const t = (d - 920) / 180.0;
      return 352.0 - (t * (352.0 - 76.0));
    }

    // 3. Variante del Rettifilo Chicane (1100 - 1350m): 78 - 88 km/h
    if (d >= 1100 && d < 1350) return 82.0;

    // 4. Curva Grande (Biassono) (1350 - 2150m): 140 -> 285 km/h high-speed sweeper
    if (d >= 1350 && d < 2150) {
      const t = (d - 1350) / 800.0;
      return 140.0 + (t * (285.0 - 140.0));
    }

    // 5. Straight to Roggia (2150 - 2480m): 328 km/h
    if (d >= 2150 && d < 2480) return 328.0;

    // 6. Roggia Braking Zone (2480 - 2620m): 328 -> 114 km/h
    if (d >= 2480 && d < 2620) {
      const t = (d - 2480) / 140.0;
      return 328.0 - (t * (328.0 - 114.0));
    }

    // 7. Variante della Roggia Chicane (2620 - 2800m): 115 km/h
    if (d >= 2620 && d < 2800) return 116.0;

    // 8. Chute to Lesmo 1 (2800 - 3020m): 165 km/h
    if (d >= 2800 && d < 3020) return 165.0;

    // 9. Short link to Lesmo 2 (3020 - 3220m): 152 km/h
    if (d >= 3020 && d < 3220) return 154.0;

    // 10. Curva del Serraglio & Banking Underpass (3220 - 4180m): 180 -> 335 km/h
    if (d >= 3220 && d < 4180) {
      const t = (d - 3220) / 960.0;
      return 180.0 + (t * (335.0 - 180.0));
    }

    // 11. Braking for Variante Ascari (4180 - 4340m): 335 -> 215 km/h
    if (d >= 4180 && d < 4340) {
      const t = (d - 4180) / 160.0;
      return 335.0 - (t * (335.0 - 215.0));
    }

    // 12. Variante Ascari Chicane (4340 - 4600m): 220 km/h
    if (d >= 4340 && d < 4600) return 225.0;

    // 13. Rettifilo Rettilineo / Back Straight (4600 - 5180m): 348 km/h blast
    if (d >= 4600 && d < 5180) return 348.0;

    // 14. Braking for Curva Parabolica (5180 - 5340m): 348 -> 175 km/h
    if (d >= 5180 && d < 5340) {
      const t = (d - 5180) / 160.0;
      return 348.0 - (t * (348.0 - 175.0));
    }

    // 15. Curva Parabolica (Alboreto) (5340 - 5793m): 175 km/h apex -> 265 km/h exit onto straight
    const t = (d - 5340) / (5793 - 5340);
    return 175.0 + (t * (270.0 - 175.0));
  }

  // Base Racing Line Apex Offsets along Monza circuit (clipping curbs)
  getMonzaApexLine(dist) {
    const trackLen = this.track.trackLength || 5793;
    const d = ((dist % trackLen) + trackLen) % trackLen;

    // Turn 1 Chicane: entry hugs left (-3.5m), clips right apex (+3.5m), then left apex (-3.5m)
    if (d >= 900 && d < 1050) return -3.2;
    if (d >= 1050 && d < 1200) return 3.2;
    if (d >= 1200 && d < 1350) return -2.8;

    // Curva Grande: hugs right apex (+3.2m)
    if (d >= 1450 && d < 2050) return 2.6;

    // Roggia: entry right (+3.0m), clips left (-3.0m), clips right (+3.0m)
    if (d >= 2500 && d < 2650) return -3.0;
    if (d >= 2650 && d < 2800) return 3.0;

    // Lesmo 1 & 2: inside right apexes (+3.0m)
    if (d >= 2900 && d < 3100) return 2.8;
    if (d >= 3100 && d < 3300) return 2.8;

    // Ascari: clips left (-3.0m), flicks right (+3.0m), exits left (-3.0m)
    if (d >= 4250 && d < 4400) return -3.0;
    if (d >= 4400 && d < 4550) return 2.8;
    if (d >= 4550 && d < 4700) return -2.8;

    // Parabolica: hugs right inside apex (+3.2m) then drifts out to left curb on exit (-3.5m)
    if (d >= 5300 && d < 5550) return 2.8;
    if (d >= 5550 && d < 5793) return -3.2;

    return 0.0;
  }
}

window.AIDriverController = AIDriverController;
