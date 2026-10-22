/**
 * ============================================================================
 * HIGH-PERFORMANCE AI DRIVER & COMPETITIVE RACING ENGINE (AUTODROMO NAZIONALE MONZA)
 * Formula 1 IoT Telemetry & Race Simulator
 * ============================================================================
 * Dynamic Features:
 *  - Aggressive slipstream drafting wake model (+22 km/h tow boost)
 *  - Active DRS deployment on Rettifilo and Serraglio straights (>355 km/h)
 *  - Multi-lane lateral overtaking maneuvers (pulls out early, no checking up)
 *  - Late-braking chicane dive-bombs into Variante del Rettifilo & Roggia
 *  - Driver personality matrix (Verstappen dive-bomber, Leclerc traction specialist,
 *    Hamilton slipstream tactician, Alonso defensive maestro, Norris apex hunter)
 *  - Clamped lateral bounds to ensure cars race wheel-to-wheel safely on track
 * ============================================================================
 */

class AIDriverController {
  constructor(vehiclePhysics, driverConfig, track) {
    this.physics = vehiclePhysics;
    this.driver = driverConfig || {};
    this.track = track;

    // Driver-specific F1 Personality Matrix
    const code = (this.driver.code || 'DRV').toUpperCase();
    const PROFILES = {
      VER: { aggression: 0.99, diveBombBias: 26, slipstreamBoost: 25, cornerSpeed: 1.018, laneFlex: 3.4, consistency: 0.98 },
      LEC: { aggression: 0.97, diveBombBias: 23, slipstreamBoost: 24, cornerSpeed: 1.015, laneFlex: 3.2, consistency: 0.97 },
      HAM: { aggression: 0.94, diveBombBias: 18, slipstreamBoost: 26, cornerSpeed: 1.010, laneFlex: 3.1, consistency: 0.99 },
      NOR: { aggression: 0.95, diveBombBias: 21, slipstreamBoost: 23, cornerSpeed: 1.012, laneFlex: 3.2, consistency: 0.96 },
      ALO: { aggression: 0.98, diveBombBias: 28, slipstreamBoost: 22, cornerSpeed: 1.008, laneFlex: 3.5, consistency: 0.97 },
      GAS: { aggression: 0.92, diveBombBias: 16, slipstreamBoost: 21, cornerSpeed: 1.002, laneFlex: 2.9, consistency: 0.95 }
    };

    this.profile = PROFILES[code] || {
      aggression: 0.94,
      diveBombBias: 20,
      slipstreamBoost: 22,
      cornerSpeed: 1.005,
      laneFlex: 3.0,
      consistency: 0.96
    };

    // Driver-specific racing line bias and overtaking state
    this.racingLineBias = (Math.random() - 0.5) * 1.6;
    this.overtakeOffset = 0.0;
    this.overtakeHoldTimer = 0.0;
    this.targetSpeedKmh = 350.0;
    this.isSlipstreaming = false;
    this.isDiveBombing = false;

    // Small periodic rhythm variation for realistic lap time variance
    this.paceRhythm = 1.0 + ((Math.random() - 0.5) * 0.015);
  }

  update(dt, ...otherCarsArgs) {
    const curDist = this.physics.trackDistance;
    const trackLen = this.track.trackLength;
    const currentSpeedKmh = this.physics.speedKmh;

    // Collect all other active cars on track
    const otherCars = [];
    otherCarsArgs.forEach(arg => {
      if (Array.isArray(arg)) {
        arg.forEach(c => { if (c) otherCars.push(c.physics || c); });
      } else if (arg) {
        otherCars.push(arg.physics || arg);
      }
    });

    // 1. Dynamic Multi-Car Overtaking & Slipstream Analysis
    let slipstreamActive = false;
    let closestAheadDist = Infinity;
    let closestAheadCar = null;
    let lateralAvoidance = 0;

    otherCars.forEach(other => {
      if (!other || other === this.physics) return;

      let distDelta = (other.trackDistance - curDist);
      if (distDelta < -trackLen / 2) distDelta += trackLen;
      if (distDelta > trackLen / 2) distDelta -= trackLen;

      const latDelta = (other.lateralOffset - this.physics.lateralOffset);

      // Car directly ahead
      if (distDelta > 0 && distDelta < 48.0) {
        if (distDelta < closestAheadDist) {
          closestAheadDist = distDelta;
          closestAheadCar = other;
        }

        // A. Slipstream Tow Pocket (within 42m behind, within 3.5m lateral offset)
        if (distDelta > 4.0 && Math.abs(latDelta) < 3.2 && currentSpeedKmh > 200) {
          slipstreamActive = true;

          // B. Proactive Overtaking: Trailing car steps out into clear lane early
          if (distDelta < 34.0 && this.overtakeHoldTimer <= 0) {
            // Pick clear lane: if other car is on left/center, pull right (+3.0m); else pull left (-3.0m)
            const clearSide = other.lateralOffset <= 0 ? 3.0 : -3.0;
            this.overtakeOffset = clearSide;
            this.overtakeHoldTimer = 3.8; // Firmly commit to pass lane for 3.8s
          }
        }

        // C. Wheel-to-Wheel Lateral Separation (only when directly overlapping)
        // Never slam brakes! Maintain safe side-by-side track spacing
        if (distDelta < 5.0 && Math.abs(latDelta) < 1.6) {
          lateralAvoidance = latDelta >= 0 ? -1.6 : 1.6;
        }
      } else if (distDelta < -8.0 && this.overtakeHoldTimer > 0) {
        // Successfully completed pass and cleared the car behind
        this.overtakeHoldTimer = 0;
        this.overtakeOffset = 0;
      }
    });

    if (this.overtakeHoldTimer > 0) {
      this.overtakeHoldTimer -= dt;
      if (this.overtakeHoldTimer <= 0) {
        this.overtakeOffset *= 0.5; // Smooth return
      }
    }

    this.isSlipstreaming = slipstreamActive;

    // 2. Lookahead Anticipatory Braking & Late-Braking Chicane Battles
    // Scaled realistically so cars don't brake 400m before corners
    let lookaheadMeters = Math.max(22.0, (currentSpeedKmh / 350.0) * 115.0);

    // If chasing another car into a heavy braking zone, execute aggressive late-braking dive-bomb!
    this.isDiveBombing = false;
    if (closestAheadCar && closestAheadDist < 35.0 && currentSpeedKmh > 230) {
      lookaheadMeters = Math.max(18.0, lookaheadMeters - this.profile.diveBombBias);
      this.isDiveBombing = true;
    }

    const lookaheadDist = (curDist + lookaheadMeters) % trackLen;
    const immediateTarget = this.calculateMonzaSpeed(curDist);
    const lookaheadTarget = this.calculateMonzaSpeed(lookaheadDist);

    // Compute base target corner speed with driver personality factor
    let targetSpeed = Math.min(immediateTarget, lookaheadTarget) * this.profile.cornerSpeed * this.paceRhythm;

    // Slipstream provides massive top-end speed burst down straights
    if (slipstreamActive) {
      targetSpeed += this.profile.slipstreamBoost;
    }

    this.targetSpeedKmh = targetSpeed;

    // 3. Longitudinal Throttle & Aggressive Braking Mechanics
    let throttleInput = 0;
    let brakeInput = 0;
    const speedDiff = targetSpeed - currentSpeedKmh;

    if (speedDiff > 2.0) {
      // 100% Full Throttle acceleration down straights & out of chicanes
      throttleInput = 1.0;
      brakeInput = 0.0;
    } else if (speedDiff < -8.0) {
      // Hard Deceleration into chicanes (carbon brakes 5G threshold)
      throttleInput = 0.0;
      const decelDemand = Math.abs(speedDiff) / 22.0;
      brakeInput = THREE.MathUtils.clamp(decelDemand * this.profile.consistency, 0.40, 1.0);
    } else {
      // Maintaining high-speed apex velocity through Curva Grande & Parabolica
      throttleInput = 0.75;
      brakeInput = 0.0;
    }

    // DRS Activation on Rettifilo and Serraglio straights
    const isDrs = (curDist >= 120 && curDist <= 950) || (curDist >= 4400 && curDist <= 5180);

    // 4. Lateral Lane Target on Track (combines base racing line + overtaking + avoidance)
    const baseApexLine = this.getMonzaApexLine(curDist);
    const maxHalfWidth = (this.track.config.width_m / 2) - 1.2; // Safe tarmac bounds (approx 6.0m)
    const targetOffset = THREE.MathUtils.clamp(
      baseApexLine + this.racingLineBias + this.overtakeOffset + lateralAvoidance,
      -maxHalfWidth,
      maxHalfWidth
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

    // 1. Rettifilo Main Straight (0 - 950m): 355 km/h blast
    if (d < 950) return 355.0;

    // 2. Turn 1 Braking Zone (950 - 1100m): 355 -> 78 km/h (late braking down to T1 apex)
    if (d >= 950 && d < 1100) {
      const t = (d - 950) / 150.0;
      return 355.0 - (t * (355.0 - 78.0));
    }

    // 3. Variante del Rettifilo Chicane (1100 - 1350m): 80 - 95 km/h flick
    if (d >= 1100 && d < 1350) return 86.0;

    // 4. Curva Grande (Biassono) (1350 - 2150m): 150 -> 292 km/h high-speed sweeper
    if (d >= 1350 && d < 2150) {
      const t = (d - 1350) / 800.0;
      return 150.0 + (t * (292.0 - 150.0));
    }

    // 5. Straight to Roggia (2150 - 2500m): 332 km/h
    if (d >= 2150 && d < 2500) return 332.0;

    // 6. Roggia Braking Zone (2500 - 2640m): 332 -> 118 km/h
    if (d >= 2500 && d < 2640) {
      const t = (d - 2500) / 140.0;
      return 332.0 - (t * (332.0 - 118.0));
    }

    // 7. Variante della Roggia Chicane (2640 - 2800m): 120 km/h
    if (d >= 2640 && d < 2800) return 120.0;

    // 8. Chute to Lesmo 1 (2800 - 3020m): 172 km/h
    if (d >= 2800 && d < 3020) return 172.0;

    // 9. Short link to Lesmo 2 (3020 - 3220m): 160 km/h
    if (d >= 3020 && d < 3220) return 160.0;

    // 10. Curva del Serraglio & Banking Underpass (3220 - 4220m): 185 -> 340 km/h blast
    if (d >= 3220 && d < 4220) {
      const t = (d - 3220) / 1000.0;
      return 185.0 + (t * (340.0 - 185.0));
    }

    // 11. Braking for Variante Ascari (4220 - 4360m): 340 -> 220 km/h
    if (d >= 4220 && d < 4360) {
      const t = (d - 4220) / 140.0;
      return 340.0 - (t * (340.0 - 220.0));
    }

    // 12. Variante Ascari Chicane (4360 - 4600m): 228 km/h high-speed transition
    if (d >= 4360 && d < 4600) return 228.0;

    // 13. Rettifilo Rettilineo / Back Straight (4600 - 5220m): 352 km/h blast
    if (d >= 4600 && d < 5220) return 352.0;

    // 14. Braking for Curva Parabolica (5220 - 5360m): 352 -> 180 km/h
    if (d >= 5220 && d < 5360) {
      const t = (d - 5220) / 140.0;
      return 352.0 - (t * (352.0 - 180.0));
    }

    // 15. Curva Parabolica (Alboreto) (5360 - 5793m): 180 km/h apex -> 275 km/h exit onto straight
    const t = (d - 5360) / (5793 - 5360);
    return 180.0 + (t * (275.0 - 180.0));
  }

  // Base Racing Line Apex Offsets along Monza circuit (clipping curbs)
  getMonzaApexLine(dist) {
    const trackLen = this.track.trackLength || 5793;
    const d = ((dist % trackLen) + trackLen) % trackLen;

    // Turn 1 Chicane: entry hugs left (-3.2m), clips right apex (+3.0m), then left apex (-3.0m)
    if (d >= 900 && d < 1050) return -3.2;
    if (d >= 1050 && d < 1200) return 3.0;
    if (d >= 1200 && d < 1350) return -2.8;

    // Curva Grande: hugs right apex (+2.8m)
    if (d >= 1450 && d < 2050) return 2.6;

    // Roggia: entry right (+2.8m), clips left (-2.8m), clips right (+2.8m)
    if (d >= 2500 && d < 2650) return -2.8;
    if (d >= 2650 && d < 2800) return 2.8;

    // Lesmo 1 & 2: inside right apexes (+2.8m)
    if (d >= 2900 && d < 3100) return 2.6;
    if (d >= 3100 && d < 3300) return 2.6;

    // Ascari: clips left (-2.8m), flicks right (+2.8m), exits left (-2.8m)
    if (d >= 4250 && d < 4400) return -2.8;
    if (d >= 4400 && d < 4550) return 2.6;
    if (d >= 4550 && d < 4700) return -2.6;

    // Parabolica: hugs right inside apex (+2.8m) then drifts out to left curb on exit (-3.2m)
    if (d >= 5300 && d < 5550) return 2.8;
    if (d >= 5550 && d < 5793) return -3.0;

    return 0.0;
  }
}

window.AIDriverController = AIDriverController;
