/**
 * ============================================================================
 * HIGH-FIDELITY 3D FORMULA 1 CAR MODEL (SIMULATION-GRADE GLTF + HYBRID PBR 2.0)
 * ============================================================================
 * Loads authentic high-polygon modern Formula 1 chassis (models/f1.glb, 2.82 MB)
 * Features:
 *  - High-poly sculpted carbon-fiber bodywork, curved wings, and halo
 *  - Team livery dynamic PBR recoloring (Ferrari, Red Bull, Mercedes, McLaren, Aston, Alpine)
 *  - Interactive 3D Cockpit with functional LCD digital steering wheel display
 *  - Driver helmet and racing gloved hands gripping steering wheel
 *  - Glowing carbon-ceramic brake rotors (spiking to 980°C under heavy braking)
 *  - 3D Digital Twin Sensor Hotspots positioned at exact physical vehicle locations
 *  - Dynamic component highlighting when sensors trigger alerts or are inspected
 *  - Subtle tire smoke particle effects under heavy deceleration lockup
 * ============================================================================
 */

class F1CarModel {
  static baseGLTF = null;
  static isGlobalLoading = false;
  static pendingCallbacks = [];
  static _carbonTex = null;

  static getCarbonTexture() {
    if (F1CarModel._carbonTex) return F1CarModel._carbonTex;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#111316';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const isOdd = ((x / 4) + (y / 4)) % 2 === 0;
        ctx.fillStyle = isOdd ? '#1e2229' : '#0d0f12';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillStyle = isOdd ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.18)';
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    F1CarModel._carbonTex = tex;
    return tex;
  }

  constructor(driverConfig) {
    this.driver = driverConfig;
    this.root = new THREE.Group();
    this.isGLTFLoaded = false;

    // Node & Mesh References
    this.gltfInstance = null;
    this.bodyMeshes = [];
    this.steeringAssembly = new THREE.Group();
    this.helmetGroup = null;

    // 4 Corner Brake Rotor Meshes for Emissive Heat Glow
    this.brakeDiscs = { fl: null, fr: null, rl: null, rr: null };
    this.brakeMaterials = { fl: null, fr: null, rl: null, rr: null };

    // 3D Digital Twin Sensor Hotspots
    this.hotspotGroup = new THREE.Group();
    this.sensorHotspotMeshes = new Map();
    this.activeHighlightedSensorId = null;
    this.highlightPulsePhase = 0;

    // Steering Wheel LCD Display
    this.wheelLcdCanvas = document.createElement('canvas');
    this.wheelLcdCanvas.width = 256;
    this.wheelLcdCanvas.height = 160;
    this.wheelLcdCtx = this.wheelLcdCanvas.getContext('2d');
    this.wheelLcdTexture = new THREE.CanvasTexture(this.wheelLcdCanvas);
    this.wheelLcdTexture.wrapS = THREE.RepeatWrapping;
    this.wheelLcdTexture.repeat.x = -1;
    this.wheelLcdTexture.offset.x = 1;
    this.wheelLcdMaterial = new THREE.MeshBasicMaterial({ map: this.wheelLcdTexture });

    // Procedural Fallback Placeholder (shown while GLTF streams)
    this.fallbackGroup = new THREE.Group();
    this.buildHighDetailProceduralCar();
    this.root.add(this.fallbackGroup);

    // High-Intensity Formula 1 Rain Light (visible in reference photo under rear exhaust)
    const rainLightGeo = new THREE.BoxGeometry(0.09, 0.16, 0.04);
    this.rainLightMat = new THREE.MeshStandardMaterial({
      color: 0xff0022,
      emissive: 0xff0022,
      emissiveIntensity: 3.5,
      roughness: 0.2
    });
    this.rainLight = new THREE.Mesh(rainLightGeo, this.rainLightMat);
    this.rainLight.position.set(0, 0.22, -1.86);
    this.root.add(this.rainLight);

    // Build 3D Sensor Hotspots on vehicle
    this.buildSensorHotspots();
    this.root.add(this.hotspotGroup);

    // Build Tire Smoke Particle System
    this.buildSmokeParticleSystem();

    // Contact Ground Shadow Plane
    this.addContactShadow();

    // Load High-Poly GLB Model
    this.loadGLTFCar();
  }

  static loadMasterModel(onSuccess) {
    if (F1CarModel.baseGLTF) {
      onSuccess(F1CarModel.baseGLTF);
      return;
    }

    F1CarModel.pendingCallbacks.push(onSuccess);

    if (F1CarModel.isGlobalLoading) return;
    F1CarModel.isGlobalLoading = true;

    if (typeof THREE.GLTFLoader === 'undefined') {
      console.warn("THREE.GLTFLoader not found. Using procedural F1 model.");
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
      'models/f1.glb',
      (gltf) => {
        F1CarModel.baseGLTF = gltf;
        F1CarModel.isGlobalLoading = false;
        console.log("✓ Successfully loaded high-poly F1 GLB model (2.82 MB)");
        while (F1CarModel.pendingCallbacks.length > 0) {
          const cb = F1CarModel.pendingCallbacks.shift();
          cb(gltf);
        }
      },
      undefined,
      (err) => {
        console.warn("Could not load models/f1.glb:", err.message);
        F1CarModel.isGlobalLoading = false;
      }
    );
  }

  loadGLTFCar() {
    F1CarModel.loadMasterModel((gltf) => {
      this.initGLTFInstance(gltf);
    });
  }

  initGLTFInstance(masterGltf) {
    const clone = masterGltf.scene.clone(true);
    this.gltfInstance = clone;

    clone.scale.set(1.08, 1.08, 1.08);
    clone.position.set(-0.6966, 0.012, 0);

    const mainColor = new THREE.Color(this.driver.color);
    const accentColor = new THREE.Color(this.driver.accentColor || 0x111111);
    const carbonColor = new THREE.Color(0x16181d);
    const gloveColor = new THREE.Color(this.driver.gloveColor || this.driver.color);

    const teamLiveryMat = new THREE.MeshPhysicalMaterial({
      color: mainColor,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      roughness: 0.16,
      metalness: 0.22,
      reflectivity: 0.95
    });

    const carbonTex = F1CarModel.getCarbonTexture();
    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: carbonColor,
      map: carbonTex,
      roughness: 0.38,
      metalness: 0.40,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18
    });

    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x141517,
      roughness: 0.85,
      metalness: 0.06
    });

    const wheelParts = [];
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const matName = child.material && child.material.name ? child.material.name.toLowerCase() : '';

        if (matName.includes('main_body') || matName.includes('front_body') || 
            matName.includes('front_nose') || matName.includes('side_body') ||
            matName.includes('rear_wing') || matName.includes('halo') ||
            matName.includes('top_wings') || matName.includes('material.001')) {
          child.material = teamLiveryMat;
          this.bodyMeshes.push(child);
        } else if (matName.includes('tyre') || matName.includes('wheel_bar')) {
          child.material = tireRubberMat;
        } else if (matName.includes('screen')) {
          child.material = this.wheelLcdMaterial;
          wheelParts.push(child);
        } else if (matName.includes('steering') || matName.includes('dial')) {
          wheelParts.push(child);
        } else if (matName.includes('underbody') || matName.includes('intake') || matName.includes('wing_1')) {
          child.material = carbonMat;
        }
      }
    });

    // Setup Steering Wheel Pivot Group at F1 steering column coordinates
    this.steeringAssembly = new THREE.Group();
    this.steeringAssembly.position.set(0.643, 0.594, 0.390);
    clone.add(this.steeringAssembly);

    wheelParts.forEach(part => {
      this.steeringAssembly.attach(part);
    });

    this.addDriverAndGlovedHands(clone, accentColor, gloveColor);

    this.root.remove(this.fallbackGroup);
    this.root.add(clone);
    this.isGLTFLoaded = true;
  }

  addDriverAndGlovedHands(carScene, helmetColor, gloveColor) {
    this.helmetGroup = new THREE.Group();

    const helmetGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: helmetColor,
      roughness: 0.25,
      metalness: 0.65
    });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0.645, 0.62, 0.15);
    helmet.castShadow = true;
    this.helmetGroup.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.20, 0.08, 0.14);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.95 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0.645, 0.63, 0.28);
    this.helmetGroup.add(visor);

    carScene.add(this.helmetGroup);

    const gloveMat = new THREE.MeshStandardMaterial({ color: gloveColor, roughness: 0.65, metalness: 0.15 });
    const gloveBaseMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.7, metalness: 0.1 });

    [-0.13, 0.13].forEach((x, idx) => {
      const handGeo = new THREE.SphereGeometry(0.032, 16, 16);
      handGeo.scale(0.9, 1.2, 0.95);
      const hand = new THREE.Mesh(handGeo, gloveBaseMat);
      hand.position.set(x, 0.002, 0.010);
      this.steeringAssembly.add(hand);

      const knuckleGeo = new THREE.BoxGeometry(0.024, 0.012, 0.035);
      const knuckle = new THREE.Mesh(knuckleGeo, gloveMat);
      knuckle.position.set(x, 0.020, 0.008);
      this.steeringAssembly.add(knuckle);

      const thumbGeo = new THREE.CylinderGeometry(0.009, 0.011, 0.036, 10);
      thumbGeo.rotateZ(idx === 0 ? 0.5 : -0.5);
      thumbGeo.rotateX(0.3);
      const thumb = new THREE.Mesh(thumbGeo, gloveMat);
      thumb.position.set(x + (idx === 0 ? 0.018 : -0.018), 0.022, 0.018);
      this.steeringAssembly.add(thumb);
    });
  }

  setHelmetVisible(visible) {
    if (this.helmetGroup) {
      this.helmetGroup.visible = visible;
    }
  }

  // --------------------------------------------------------------------------
  // 3D DIGITAL TWIN SENSOR HOTSPOTS (MODULE 03 / 08)
  // --------------------------------------------------------------------------
  buildSensorHotspots() {
    const sensorList = [
      { id: 'SPD-01', x: 0.0, y: 0.38, z: 2.1, color: 0x00e5ff },
      { id: 'RPM-01', x: 0.0, y: 0.48, z: -0.5, color: 0xffd600 },
      { id: 'ENG-T01', x: 0.45, y: 0.48, z: -0.7, color: 0xff3d00 },
      { id: 'TIRE-FL-01', x: -0.95, y: 0.35, z: 1.6, color: 0x00e676 },
      { id: 'TIRE-FR-01', x: 0.95, y: 0.35, z: 1.6, color: 0x00e676 },
      { id: 'TIRE-RL-01', x: -0.95, y: 0.35, z: -1.6, color: 0x00e676 },
      { id: 'TIRE-RR-01', x: 0.95, y: 0.35, z: -1.6, color: 0x00e676 },
      { id: 'TPMS-01', x: -0.92, y: 0.28, z: 1.6, color: 0x2979ff },
      { id: 'TPMS-02', x: 0.92, y: 0.28, z: 1.6, color: 0x2979ff },
      { id: 'TPMS-03', x: -0.92, y: 0.28, z: -1.6, color: 0x2979ff },
      { id: 'TPMS-04', x: 0.92, y: 0.28, z: -1.6, color: 0x2979ff },
      { id: 'BRK-T01', x: -0.88, y: 0.35, z: 1.6, color: 0xff1744 },
      { id: 'BRK-T02', x: 0.88, y: 0.35, z: 1.6, color: 0xff1744 },
      { id: 'BRK-T03', x: -0.88, y: 0.35, z: -1.6, color: 0xff1744 },
      { id: 'BRK-T04', x: 0.88, y: 0.35, z: -1.6, color: 0xff1744 },
      { id: 'ACC-01', x: 0.0, y: 0.28, z: 0.0, color: 0x00e5ff },
      { id: 'GYR-01', x: 0.0, y: 0.32, z: 0.0, color: 0x00e5ff },
      { id: 'VIB-01', x: 0.0, y: 0.24, z: 0.8, color: 0xffab00 },
      { id: 'GPS-01', x: 0.0, y: 0.98, z: -0.15, color: 0x76ff03 }
    ];

    sensorList.forEach(s => {
      const group = new THREE.Group();
      group.position.set(s.x, s.y, s.z);

      // Core pulsating marker sphere
      const sphereGeo = new THREE.SphereGeometry(0.065, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.75
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);

      // Outer targeting ring
      const ringGeo = new THREE.RingGeometry(0.08, 0.11, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: s.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      group.visible = false; // Toggled via Digital Twin controls or when faulted

      this.hotspotGroup.add(group);
      this.sensorHotspotMeshes.set(s.id, {
        group: group,
        sphere: sphere,
        ring: ring,
        baseColor: s.color,
        basePos: { x: s.x, y: s.y, z: s.z }
      });
    });
  }

  setDigitalTwinHighlight(sensorId, status = 'ONLINE') {
    this.activeHighlightedSensorId = sensorId;

    // Reset all hotspots
    for (const [id, item] of this.sensorHotspotMeshes.entries()) {
      if (sensorId === id) {
        item.group.visible = true;
        let highlightColor = 0x00e5ff; // ONLINE
        if (status === 'CRITICAL') highlightColor = 0xff1744;
        else if (status === 'WARNING') highlightColor = 0xffab00;
        else if (status === 'OFFLINE') highlightColor = 0x64748b;

        item.sphere.material.color.setHex(highlightColor);
        item.ring.material.color.setHex(highlightColor);
      } else {
        item.group.visible = false;
      }
    }
  }

  setAllHotspotsVisible(visible) {
    for (const [id, item] of this.sensorHotspotMeshes.entries()) {
      item.group.visible = visible;
    }
  }

  // --------------------------------------------------------------------------
  // TIRE SMOKE PARTICLE SYSTEM
  // --------------------------------------------------------------------------
  buildSmokeParticleSystem() {
    this.smokeParticles = [];
    const smokeGeo = new THREE.PlaneGeometry(0.35, 0.35);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(smokeGeo, smokeMat.clone());
      p.rotation.x = -Math.PI / 2;
      p.visible = false;
      this.root.add(p);
      this.smokeParticles.push({
        mesh: p,
        life: 0,
        maxLife: 0.6,
        vx: 0,
        vy: 0,
        vz: 0
      });
    }
  }

  emitSmoke(wheelPos) {
    const p = this.smokeParticles.find(sp => sp.life <= 0);
    if (!p) return;

    p.mesh.position.copy(wheelPos);
    p.mesh.position.y += 0.05;
    p.mesh.visible = true;
    p.life = 0.6;
    p.mesh.material.opacity = 0.55;
    p.mesh.scale.set(1, 1, 1);
    p.vx = (Math.random() - 0.5) * 0.3;
    p.vy = 0.15 + Math.random() * 0.2;
    p.vz = -0.4 - Math.random() * 0.4;
  }

  updateSmokeParticles(dt) {
    this.smokeParticles.forEach(p => {
      if (p.life > 0) {
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const progress = 1 - (p.life / p.maxLife);
        p.mesh.scale.setScalar(1 + progress * 2.2);
        p.mesh.material.opacity = (1 - progress) * 0.45;
        if (p.life <= 0) p.mesh.visible = false;
      }
    });
  }

  // Procedural Fallback Geometry
  buildHighDetailProceduralCar() {
    const mainColor = new THREE.Color(this.driver.color);
    const accentColor = new THREE.Color(this.driver.accentColor || 0x111111);
    const carbonColor = new THREE.Color(0x181a1f);

    const bodyMat = new THREE.MeshStandardMaterial({ color: mainColor, metalness: 0.68, roughness: 0.24 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: carbonColor, roughness: 0.45, metalness: 0.8 });

    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.46, 2.7), bodyMat);
    tub.position.set(0, 0.34, 0);
    tub.castShadow = true;
    this.fallbackGroup.add(tub);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.40, 1.8, 5).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), bodyMat);
    nose.position.set(0, 0.28, 2.15);
    nose.scale.set(0.95, 0.52, 1.0);
    this.fallbackGroup.add(nose);

    const fwMain = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.035, 0.62), bodyMat);
    fwMain.position.set(0, 0.12, 2.75);
    this.fallbackGroup.add(fwMain);

    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.038, 12, 24, Math.PI).rotateX(Math.PI / 2), carbonMat);
    hoop.position.set(0, 0.82, 0.36);
    this.fallbackGroup.add(hoop);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.46, 12), carbonMat);
    pillar.position.set(0, 0.62, 0.65);
    this.fallbackGroup.add(pillar);

    [-0.58, 0.58].forEach(x => {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1.6), bodyMat);
      pod.position.set(x, 0.32, -0.2);
      this.fallbackGroup.add(pod);
    });

    const rwMain = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.04, 0.44), carbonMat);
    rwMain.position.set(0, 0.88, -2.12);
    this.fallbackGroup.add(rwMain);

    // 4 Procedural Brake Discs for Rotor Glow
    const wheelPositions = [
      { id: 'fl', x: -0.88, y: 0.35, z: 1.6 },
      { id: 'fr', x: 0.88, y: 0.35, z: 1.6 },
      { id: 'rl', x: -0.88, y: 0.35, z: -1.6 },
      { id: 'rr', x: 0.88, y: 0.35, z: -1.6 }
    ];

    wheelPositions.forEach(w => {
      const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.035, 16);
      discGeo.rotateZ(Math.PI / 2);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4,
        metalness: 0.9,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 1.0
      });
      const discMesh = new THREE.Mesh(discGeo, discMat);
      discMesh.position.set(w.x, w.y, w.z);
      this.fallbackGroup.add(discMesh);
      this.brakeDiscs[w.id] = discMesh;
      this.brakeMaterials[w.id] = discMat;
    });
  }

  // Update Visuals Every Frame
  updateVisuals(speedMps, steerAngleRad, isBraking, drsActive, brakeDiscTemps, physicsState) {
    if (this.steeringAssembly) {
      this.steeringAssembly.rotation.z = -steerAngleRad * 4.2;
    }

    // Dynamic Steering Wheel LCD Screen
    this.updateSteeringWheelLcd(physicsState);

    // Brake Disc Carbon-Carbon Thermal Glow
    if (brakeDiscTemps && Array.isArray(brakeDiscTemps)) {
      const keys = ['fl', 'fr', 'rl', 'rr'];
      keys.forEach((k, idx) => {
        const temp = brakeDiscTemps[idx] || 320;
        const mat = this.brakeMaterials[k];
        if (mat) {
          if (temp > 700) {
            // Emissive glowing red/orange transition
            const glowRatio = Math.min(1.0, (temp - 700) / 320);
            mat.emissive.setRGB(glowRatio * 1.0, glowRatio * 0.28, 0.0);
            mat.emissiveIntensity = 0.5 + (glowRatio * 1.5);
          } else {
            mat.emissive.setRGB(0, 0, 0);
          }
        }
      });
    }

    // Tire Smoke under extreme braking or wheel lockup
    if (isBraking && speedMps > 18.0) {
      if (Math.random() < 0.25) {
        this.emitSmoke(new THREE.Vector3(-0.95, 0.15, 1.6));
        this.emitSmoke(new THREE.Vector3(0.95, 0.15, 1.6));
      }
    }
    this.updateSmokeParticles(0.016);

    // Pulse high-intensity Formula 1 rear rain light LED
    if (this.rainLightMat) {
      const pulse = Math.sin(performance.now() * 0.012);
      this.rainLightMat.emissiveIntensity = 2.8 + pulse * 1.4;
    }

    // Pulse active Digital Twin hotspot
    if (this.activeHighlightedSensorId) {
      this.highlightPulsePhase += 0.08;
      const item = this.sensorHotspotMeshes.get(this.activeHighlightedSensorId);
      if (item) {
        const scale = 1.0 + Math.sin(this.highlightPulsePhase) * 0.28;
        item.ring.scale.set(scale, scale, scale);
      }
    }
  }

  updateSteeringWheelLcd(p) {
    if (!this.wheelLcdCtx || !p) return;
    const ctx = this.wheelLcdCtx;
    const w = this.wheelLcdCanvas.width;
    const h = this.wheelLcdCanvas.height;

    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, w, h);

    // Shift Lights
    const rpm = p.rpm || 4000;
    const rpmPct = Math.min(1.0, Math.max(0, (rpm - 8500) / 6500));
    const activeLeds = Math.floor(rpmPct * 15);
    const ledW = 12;
    const ledH = 10;
    const startX = (w - (15 * (ledW + 3))) / 2;

    for (let i = 0; i < 15; i++) {
      let color = '#1a2332';
      if (i < activeLeds) {
        if (i < 5) color = '#00e676';
        else if (i < 10) color = '#ff1744';
        else color = '#d500f9';
      }
      ctx.fillStyle = color;
      ctx.fillRect(startX + i * (ledW + 3), 6, ledW, ledH);
    }

    // Center Gear
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Consolas, monospace';
    ctx.textAlign = 'center';
    const gearText = p.gear === 0 ? 'N' : String(p.gear);
    ctx.fillText(gearText, w / 2, 88);

    // Digital Speedometer
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 26px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(p.speedKmh)}`, 16, 56);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('KM/H', 16, 72);

    // Engine RPM
    ctx.fillStyle = '#ffd600';
    ctx.font = 'bold 15px Consolas, monospace';
    ctx.fillText(`${Math.round(rpm)}`, 16, 108);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.fillText('RPM', 16, 120);

    // Delta / Lap Time
    ctx.textAlign = 'right';
    const delta = p.delta_s || 0;
    ctx.fillStyle = delta <= 0 ? '#00e676' : '#ff1744';
    ctx.font = 'bold 18px Consolas, monospace';
    ctx.fillText(`${delta > 0 ? '+' : ''}${delta.toFixed(3)}`, w - 16, 56);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.fillText(`LAP ${p.lapCount || 1}`, w - 16, 72);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 13px Consolas, monospace';
    ctx.fillText(`ERS ${Math.round((p.ersBatterySoc || 0.85) * 100)}%`, w - 16, 108);

    // Bottom Status Strip
    ctx.fillStyle = p.drsActive ? '#00e676' : '#1e293b';
    ctx.fillRect(16, h - 22, 60, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DRS', 46, h - 11);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(w - 76, h - 22, 60, 14);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('BAL 56%', w - 46, h - 11);

    this.wheelLcdTexture.needsUpdate = true;
  }

  addContactShadow() {
    const shadowGeo = new THREE.PlaneGeometry(2.3, 4.8);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 15, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.42)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.035, 0);
    this.root.add(shadowMesh);
  }
}

window.F1CarModel = F1CarModel;
