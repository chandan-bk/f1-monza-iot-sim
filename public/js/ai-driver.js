/**
 * ============================================================================
 * HIGH-PERFORMANCE AI RACING ENGINE & RACE CRAFT CONTROLLER
 * Autodromo Nazionale Monza — Formula 1 IoT Telemetry & Race Simulator
 * ============================================================================
 * Features:
 *  - Single-file / 2-wide racecraft discipline (Strictly prevents 3-wide or 6-wide clumping)
 *  - Aerodynamic slipstream drafting wake model (+18 to +26 km/h tow boost)
 *  - Straightaway overtaking duels (Rettifilo, Serraglio, and Back straight)
 *  - Chicane apex discipline (Cars funnel cleanly into Turn 1, Roggia, and Ascari)
 *  - Dynamic following distance regulation (Smooth speed matching without conga-line braking)
 *  - Authentic F1 driver personality matrix (VER, LEC, HAM, NOR, ALO, GAS)
 * ============================================================================
 */

class AIDriverController {
  constructor(vehiclePhysics, driverConfig, track) {
    this.physics = vehiclePhysics;
    this.driver = driverConfig || {};
    this.track = track;
    const code = (this.driver.code || 'DRV').toUpperCase();

    // Authentic Formula 1 Performance & Racecraft Matrix
    const PROFILES = {
      VER: { topSpeedBias: 5.0, lateBraking: 26.0, slipstream: 26.0, cornerPace: 1.018, lineBias: -0.20, name: 'Max Verstappen' },
      LEC: { topSpeedBias: 3.0, lateBraking: 22.0, slipstream: 24.0, cornerPace: 1.016, lineBias: 0.20, name: 'Charles Leclerc' },
      HAM: { topSpeedBias: 0.0, lateBraking: 16.0, slipstream: 22.0, cornerPace: 1.012, lineBias: -0.30, name: 'Lewis Hamilton' },
      NOR: { topSpeedBias: -1.0, lateBraking: 18.0, slipstream: 22.0, cornerPace: 1.012, lineBias: 0.10, name: 'Lando Norris' },
      ALO: { topSpeedBias: -3.0, lateBraking: 24.0, slipstream: 20.0, cornerPace: 1.006, lineBias: -0.10, name: 'Fernando Alonso' },
      GAS: { topSpeedBias: -5.0, lateBraking: 14.0, slipstream: 18.0, cornerPace: 1.000, lineBias: 0.30, name: 'Pierre Gasly' }
    };

    this.profile = PROFILES[code] || PROFILES.LEC;
    this.overtakeOffset = 0.0;
    this.overtakeTimer = 0.0;
    this.isPassing = false;
    this.targetSpeedKmh = 350.0;
    this.smoothThrottle = 0.0;
    this.smoothBrake = 0.0;
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

    // 1. Scan for the immediate car directly ahead on track
    let aheadCar = null;
    let minAheadDist = Infinity;

    otherCars.forEach(other => {
      if (!other || other === this.physics) return;
      let d = other.trackDistance - curDist;
      if (d < -trackLen / 2) d += trackLen;
      if (d > trackLen / 2) d -= trackLen;

      if (d > 0 && d < minAheadDist) {
        minAheadDist = d;
        aheadCar = other;
      }
    });

    // 2. Identify track zone: Overtaking is strictly focused on passing straights
    // (Main Straight, Roggia chute, Serraglio underpass blast, and Back straight)
    const isPassingStraight = (curDist < 920) || 
                              (curDist >= 2100 && curDist <= 2450) || 
                              (curDist >= 3250 && curDist <= 4150) || 
                              (curDist >= 4600 && curDist <= 5150);

    // 3. Strict 2-Wide Rule: Check if the car ahead is ALREADY engaged in a side-by-side battle!
    // In real racing, trailing cars DO NOT go 3-wide or 6-wide; they stay tucked behind in the draft!
    let aheadAlreadyInBattle = false;
    if (aheadCar) {
      otherCars.forEach(o => {
        if (!o || o === this.physics || o === aheadCar) return;
        let d = Math.abs(o.trackDistance - aheadCar.trackDistance);
        if (d > trackLen / 2) d = trackLen - d;
        if (d < 7.0 && Math.abs(o.lateralOffset - aheadCar.lateralOffset) > 1.8) {
          aheadAlreadyInBattle = true;
        }
      });
    }

    // 4. Overtake Decision Engine
    // Only attempt an overtake if: on a straight, NOT already 2-wide ahead, within drafting range, and carrying speed
    const canOvertake = isPassingStraight && 
                        !aheadAlreadyInBattle && 
                        aheadCar && 
                        minAheadDist < 26.0 && 
                        minAheadDist > 5.0 && 
                        currentSpeedKmh > 210;

    if (canOvertake && this.overtakeTimer <= 0) {
      // Step out into the clear lane alongside the car ahead (inside or outside line)
      this.overtakeOffset = aheadCar.lateralOffset <= 0 ? 2.8 : -2.8;
      this.overtakeTimer = 3.5; // Commit to pass lane for 3.5s
      this.isPassing = true;
    }

    if (this.overtakeTimer > 0) {
      this.overtakeTimer -= dt;
      if (this.overtakeTimer <= 0 || !isPassingStraight) {
        this.overtakeOffset = 0;
        this.isPassing = false;
      }
    }

    // 5. Lookahead Anticipatory Braking & Late-Braking Dive-Bombs
    let lookaheadMeters = Math.max(16.0, (currentSpeedKmh / 350.0) * 62.0);
    if (this.isPassing && currentSpeedKmh > 240) {
      lookaheadMeters = Math.max(14.0, lookaheadMeters - (this.profile.lateBraking * 0.5));
    }

    const lookaheadDist = (curDist + lookaheadMeters) % trackLen;
    let targetSpeed = Math.min(this.calculateMonzaSpeed(curDist), this.calculateMonzaSpeed(lookaheadDist));
    targetSpeed *= this.profile.cornerPace;
    targetSpeed += this.profile.topSpeedBias;

    // Slipstream tow boost (+18 to +26 km/h)
    if (aheadCar && minAheadDist < 38.0 && currentSpeedKmh > 200) {
      targetSpeed += this.profile.slipstream;
    }

    // 6. Smooth Slipstream Queue Distance Regulation (Elastic Draft Following)
    if (aheadCar && !this.isPassing) {
      const desiredGap = Math.max(5.5, (currentSpeedKmh / 350.0) * 11.5);
      if (minAheadDist < desiredGap * 2.0) {
        const distRatio = minAheadDist / desiredGap;
        if (distRatio < 1.0) {
          // Gently match speed with smooth proportional reduction
          const followSpeed = aheadCar.speedKmh * (0.88 + distRatio * 0.12);
          targetSpeed = Math.min(targetSpeed, Math.max(68.0, followSpeed));
        } else {
          // In the prime slipstream tow window
          targetSpeed = Math.min(targetSpeed, aheadCar.speedKmh + 8.0);
        }
      }
    }

    this.targetSpeedKmh = targetSpeed;

    // 7. Lateral Target Tracking
    // Natural racing line + driver personal preference line + overtake lane
    const baseApex = this.getMonzaApexLine(curDist);
    let targetOffset = baseApex + this.profile.lineBias + this.overtakeOffset;

    // Wheel-to-wheel micro-separation (only if side by side within 5m)
    if (aheadCar && minAheadDist < 5.0) {
      const latDelta = aheadCar.lateralOffset - this.physics.lateralOffset;
      if (Math.abs(latDelta) < 1.8) {
        targetOffset += latDelta >= 0 ? -1.4 : 1.4;
      }
    }

    const maxHalfWidth = (this.track.config.width_m / 2) - 1.2;
    targetOffset = THREE.MathUtils.clamp(targetOffset, -maxHalfWidth, maxHalfWidth);

    // 8. Longitudinal Throttle vs. Trail Braking (Proportional & Progressive - Zero Glitch)
    const speedDiff = targetSpeed - currentSpeedKmh;
    let targetThrottle = 0;
    let targetBrake = 0;

    if (speedDiff >= 3.0) {
      // Full power acceleration
      targetThrottle = 1.0;
      targetBrake = 0.0;
    } else if (speedDiff >= 0.0) {
      // Proportional speed maintenance against aero drag and rolling resistance
      targetThrottle = 0.35 + (speedDiff / 3.0) * 0.65;
      targetBrake = 0.0;
    } else if (speedDiff >= -5.0) {
      // Smooth Lift-and-Coast: Aerodynamic drag (0.6G - 0.8G) trims 1-5 km/h naturally without friction braking!
      targetThrottle = 0.0;
      targetBrake = 0.0;
    } else if (speedDiff >= -15.0) {
      // Smooth, progressive trail-braking (NO harsh 40% jump)
      targetThrottle = 0.0;
      const decelFraction = (Math.abs(speedDiff) - 5.0) / 10.0;
      targetBrake = 0.04 + decelFraction * 0.26; // Smooth 0.04 to 0.30 brake
    } else {
      // Heavy braking for major chicane entries (Turn 1, Roggia, Ascari)
      targetThrottle = 0.0;
      const heavyDecel = (Math.abs(speedDiff) - 15.0) / 35.0;
      targetBrake = THREE.MathUtils.clamp(0.35 + heavyDecel * 0.65, 0.35, 1.0);
    }

    // Rate-limited pedal smoothing prevents 1-frame discontinuous jerk/lag
    this.smoothThrottle = THREE.MathUtils.lerp(this.smoothThrottle, targetThrottle, Math.min(1.0, dt * 14.0));
    this.smoothBrake = THREE.MathUtils.lerp(this.smoothBrake, targetBrake, Math.min(1.0, dt * 16.0));

    const isDrs = (curDist >= 120 && curDist <= 950) || (curDist >= 4400 && curDist <= 5180);

    // Feed controls directly into VehiclePhysics
    this.physics.update(dt, {
      throttle: this.smoothThrottle,
      brake: this.smoothBrake,
      targetOffset: targetOffset,
      drs: isDrs && this.smoothBrake < 0.05
    });
  }

  // Official Monza Speed Profile (5,793 meters)
  calculateMonzaSpeed(dist) {
    const trackLen = this.track.trackLength || 5793;
    const d = ((dist % trackLen) + trackLen) % trackLen;

    // 1. Rettifilo Main Straight (0 - 950m): 352 km/h
    if (d < 950) return 352.0;

    // 2. Turn 1 Braking Zone (950 - 1100m): 352 -> 78 km/h
    if (d >= 950 && d < 1100) {
      const t = (d - 950) / 150.0;
      return 352.0 - (t * (352.0 - 78.0));
    }

    // 3. Variante del Rettifilo Chicane (1100 - 1350m): 86 km/h
    if (d >= 1100 && d < 1350) return 86.0;

    // 4. Curva Grande (Biassono) (1350 - 2150m): 150 -> 292 km/h sweeper
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

    // 12. Variante Ascari Chicane (4360 - 4600m): 228 km/h transition
    if (d >= 4360 && d < 4600) return 228.0;

    // 13. Rettifilo Rettilineo / Back Straight (4600 - 5220m): 352 km/h blast
    if (d >= 4600 && d < 5220) return 352.0;

    // 14. Braking for Curva Parabolica (5220 - 5360m): 352 -> 180 km/h
    if (d >= 5220 && d < 5360) {
      const t = (d - 5220) / 140.0;
      return 352.0 - (t * (352.0 - 180.0));
    }

    // 15. Curva Parabolica (Alboreto) (5360 - 5793m): 180 km/h apex -> 275 km/h exit
    const t = (d - 5360) / (5793 - 5360);
    return 180.0 + (t * (275.0 - 180.0));
  }

  // Base Racing Line Apex Offsets along Monza circuit (clipping curbs)
  getMonzaApexLine(dist) {
    const trackLen = this.track.trackLength || 5793;
    const d = ((dist % trackLen) + trackLen) % trackLen;

    // Turn 1 Chicane: entry hugs left (-3.0m), clips right apex (+2.8m), then left apex (-2.6m)
    if (d >= 900 && d < 1050) return -3.0;
    if (d >= 1050 && d < 1200) return 2.8;
    if (d >= 1200 && d < 1350) return -2.6;

    // Curva Grande: hugs right apex (+2.4m)
    if (d >= 1450 && d < 2050) return 2.4;

    // Roggia: entry right (-2.6m), clips left (+2.6m)
    if (d >= 2500 && d < 2650) return -2.6;
    if (d >= 2650 && d < 2800) return 2.6;

    // Lesmo 1 & 2: inside right apexes (+2.4m)
    if (d >= 2900 && d < 3300) return 2.4;

    // Ascari: clips left (-2.6m), flicks right (+2.4m), exits left (-2.4m)
    if (d >= 4250 && d < 4400) return -2.6;
    if (d >= 4400 && d < 4550) return 2.4;
    if (d >= 4550 && d < 4700) return -2.4;

    // Parabolica: hugs right inside apex (+2.6m) then drifts out to left curb on exit (-2.8m)
    if (d >= 5300 && d < 5550) return 2.6;
    if (d >= 5550 && d < 5793) return -2.8;

    return 0.0;
  }
}

window.AIDriverController = AIDriverController;
