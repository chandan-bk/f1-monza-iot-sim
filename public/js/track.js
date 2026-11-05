/**
 * ============================================================================
 * AUTODROMO NAZIONALE MONZA: HIGH-FIDELITY PBR 3D CIRCUIT ENVIRONMENT 2.0
 * Photorealistic European Grand Prix Venue ("The Temple of Speed")
 * ============================================================================
 * Key Visual Upgrades (matching reference photograph):
 *  - High-resolution PBR Racing Asphalt with normal bump map & rubbered racing lines
 *  - Weathered 3D Sawtooth Kerbs (Rosso Corsa red & white) with normal maps
 *  - Covered Grandstand Complex (Left):
 *      * Tubular steel truss framework, corrugated canopy roof
 *      * 14-tier tiered seating with spectator silhouettes
 *      * Authentic Italian flags (Il Tricolore 🇮🇹) on roof & railings
 *      * High-contrast brake distance marker boards along guardrails (200, 150, 100, 50)
 *  - 3-Story Concrete Pit Building & Paddock (Right):
 *      * Team pit garages with bay numbers (28, 27, 26, 25) & pit crew in overalls
 *      * VIP hospitality suites with tinted glass reflections
 *      * Concrete pit wall with team pit perches, timing monitors & debris fence
 *  - Starting Lights Gantry & Historic Monza Timing Tower ahead on straight
 *  - Dense Royal Park of Monza Forest: 500+ tall lush trees creating tree canopy corridor
 *  - Accurate track limits and collision queries for vehicle physics & AI drivers
 * ============================================================================
 */

class CircuitTrack {
  constructor(scene) {
    this.scene = scene;
    this.config = window.F1_CONFIG.CIRCUIT;
    this.points = [];
    this.curve = null;
    this.trackMesh = null;
    this.trackLength = 0;
    this.sampleCount = 1200;
    this.samples = [];

    this.startGantryLights = [];
    this.drsSigns = [];

    this.initCurve();
    this.buildVastParklandLandscape();
    this.buildTrack();
    this.buildWhiteTrackLimits();
    this.buildYellowPitExitLine();
    this.buildBlueAndRedRunoffs();
    this.buildSawtoothKerbs();
    this.buildRealisticBarriersWithSponsors();
    this.buildFIAFencing();
    this.buildPitStraightArchitecture();
    this.buildDensePerimeterForest();
    this.buildOverheadBridges();
    this.buildPitLaneAndGantry();
    this.buildTracksideSignage();
  }

  initCurve() {
    this.points = this.config.nodes.map(n => new THREE.Vector3(n.x, n.y, n.z));
    this.curve = new THREE.CatmullRomCurve3(this.points, true, 'centripetal');
    this.trackLength = this.curve.getLength();

    this.samples = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const u = i / this.sampleCount;
      const point = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      this.samples.push({
        distance: u * this.trackLength,
        u: u,
        point: point,
        tangent: tangent,
        normal: normal
      });
    }
  }

  // 1. Vast Natural Grass Terrain (Royal Park of Monza)
  buildVastParklandLandscape() {
    const terrainCanvas = document.createElement('canvas');
    terrainCanvas.width = 512;
    terrainCanvas.height = 512;
    const tCtx = terrainCanvas.getContext('2d');

    // Rich natural parkland green base
    tCtx.fillStyle = '#263b22';
    tCtx.fillRect(0, 0, 512, 512);

    // Natural soil & grass variations
    for (let i = 0; i < 4000; i++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      const radius = Math.random() * 12 + 4;
      const green = Math.floor(Math.random() * 45 + 35);
      tCtx.fillStyle = `rgb(${Math.floor(green * 0.65)}, ${green}, ${Math.floor(green * 0.45)})`;
      tCtx.beginPath();
      tCtx.arc(gx, gy, radius, 0, Math.PI * 2);
      tCtx.fill();
    }

    // Subtle grass blades speckle
    for (let p = 0; p < 12000; p++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const g = Math.floor(Math.random() * 30 + 50);
      tCtx.fillStyle = `rgb(${Math.floor(g * 0.7)}, ${g}, ${Math.floor(g * 0.4)})`;
      tCtx.fillRect(px, py, 1.5, 3);
    }

    const terrainTexture = new THREE.CanvasTexture(terrainCanvas);
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(160, 160);

    const terrainGeo = new THREE.PlaneGeometry(2800, 2800, 48, 48);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getY(i);
      const distFromTrack = Math.min(Math.abs(vx), Math.abs(vz));
      if (distFromTrack > 180) {
        const elevation = (Math.sin(vx * 0.005) * Math.cos(vz * 0.005) * 8.0) +
                          (Math.sin(vx * 0.015) * 2.5);
        posAttr.setZ(i, elevation);
      }
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.92,
      metalness: 0.05
    });

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.05;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    this.buildRollingHills();
  }

  buildRollingHills() {
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x1f2e1d,
      roughness: 0.95,
      metalness: 0.02
    });

    const hillPositions = [
      { x: -550, z: -550, r: 240, h: 22 },
      { x: 750, z: -350, r: 280, h: 26 },
      { x: -650, z: 450, r: 300, h: 24 },
      { x: 800, z: 750, r: 340, h: 30 },
      { x: -200, z: 1200, r: 320, h: 28 },
      { x: 950, z: 1100, r: 360, h: 32 }
    ];

    hillPositions.forEach(hp => {
      const hillGeo = new THREE.ConeGeometry(hp.r, hp.h, 18);
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.position.set(hp.x, hp.h / 2 - 1, hp.z);
      hill.scale.set(1.4, 0.45, 1.2);
      this.scene.add(hill);
    });
  }

  // 2. High-Realism Asphalt Track Surface (PBR Diffuse + Normal + Roughness)
  buildTrack() {
    const width = this.config.width_m;
    const segments = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const leftPt = pt.clone().add(normal.clone().multiplyScalar(-width / 2));
      const rightPt = pt.clone().add(normal.clone().multiplyScalar(width / 2));

      positions.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
      positions.push(rightPt.x, rightPt.y + 0.05, rightPt.z);

      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      uvs.push(0, u * 180);
      uvs.push(1, u * 180);

      if (i < segments) {
        const v1 = i * 2;
        const v2 = i * 2 + 1;
        const v3 = (i + 1) * 2;
        const v4 = (i + 1) * 2 + 1;

        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    // ------------------------------------------------------------------------
    // HIGH-RESOLUTION PBR ASPHALT TEXTURES (1024x1024)
    // ------------------------------------------------------------------------
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = 1024;
    diffCanvas.height = 1024;
    const dCtx = diffCanvas.getContext('2d');

    // Base matte asphalt dark slate
    dCtx.fillStyle = '#17191d';
    dCtx.fillRect(0, 0, 1024, 1024);

    // Lateral racing line wear gradient (dark rubber deposit across center)
    const roadGrad = dCtx.createLinearGradient(0, 0, 1024, 0);
    roadGrad.addColorStop(0.00, '#23262c');
    roadGrad.addColorStop(0.18, '#1b1d22');
    roadGrad.addColorStop(0.35, '#121316'); // Dark rubbered line (left tires)
    roadGrad.addColorStop(0.50, '#15171a'); // Center crown
    roadGrad.addColorStop(0.65, '#111215'); // Dark rubbered line (right tires)
    roadGrad.addColorStop(0.85, '#1c1e23');
    roadGrad.addColorStop(1.00, '#24272d');
    dCtx.fillStyle = roadGrad;
    dCtx.fillRect(0, 0, 1024, 1024);

    // Fine asphalt aggregate speckle & mineral stones (35,000 particles)
    for (let p = 0; p < 35000; p++) {
      const nx = Math.random() * 1024;
      const ny = Math.random() * 1024;
      const b = Math.floor(Math.random() * 48 + 18);
      dCtx.fillStyle = `rgb(${b},${b},${b + 3})`;
      dCtx.fillRect(nx, ny, 1.8, 1.8);
    }

    // Heavy dual tire burnout & braking skid marks along the racing line
    dCtx.fillStyle = 'rgba(6, 7, 9, 0.48)';
    for (let s = 0; s < 16; s++) {
      const leftTireX = 330 + (Math.random() * 50 - 25);
      const rightTireX = 660 + (Math.random() * 50 - 25);
      const sy = Math.random() * 700;
      const len = 120 + Math.random() * 200;
      dCtx.fillRect(leftTireX, sy, 22, len);
      dCtx.fillRect(rightTireX, sy, 22, len);
    }

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    diffTex.wrapS = THREE.RepeatWrapping;
    diffTex.wrapT = THREE.RepeatWrapping;

    // Normal Map for micro-pebble bump depth
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 512;
    normCanvas.height = 512;
    const nCtx = normCanvas.getContext('2d');
    if (nCtx && nCtx.createImageData && nCtx.putImageData) {
      const nImg = nCtx.createImageData(512, 512);
      for (let i = 0; i < nImg.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 44;
        nImg.data[i] = Math.min(255, Math.max(0, 128 + noise));       // R (nx)
        nImg.data[i + 1] = Math.min(255, Math.max(0, 128 + noise));   // G (ny)
        nImg.data[i + 2] = 255;                                        // B (nz)
        nImg.data[i + 3] = 255;
      }
      nCtx.putImageData(nImg, 0, 0);
    } else if (nCtx && nCtx.fillRect) {
      nCtx.fillStyle = '#8080ff';
      nCtx.fillRect(0, 0, 512, 512);
    }

    const normTex = new THREE.CanvasTexture(normCanvas);
    normTex.wrapS = THREE.RepeatWrapping;
    normTex.wrapT = THREE.RepeatWrapping;

    // Roughness Map (smooth rubbered groove vs rough aggregate edges)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const rCtx = roughCanvas.getContext('2d');
    const rGrad = rCtx.createLinearGradient(0, 0, 512, 0);
    rGrad.addColorStop(0, '#d0d0d0');   // 0.82 roughness on edges
    rGrad.addColorStop(0.35, '#888888'); // 0.53 roughness on racing line (specular sheen)
    rGrad.addColorStop(0.65, '#888888');
    rGrad.addColorStop(1, '#d0d0d0');
    rCtx.fillStyle = rGrad;
    rCtx.fillRect(0, 0, 512, 512);

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;

    const trackMaterial = new THREE.MeshStandardMaterial({
      map: diffTex,
      normalMap: normTex,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: roughTex,
      roughness: 0.74,
      metalness: 0.14
    });

    this.trackMesh = new THREE.Mesh(geometry, trackMaterial);
    this.trackMesh.receiveShadow = true;
    this.scene.add(this.trackMesh);

    this.buildStartFinishLine();
  }

  // 3. Crisp White Track Limit Boundary Lines
  buildWhiteTrackLimits() {
    const halfWidth = this.config.width_m / 2;
    const lineWidth = 0.28;
    const segments = 600;

    [-1, 1].forEach(side => {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const normals = [];
      const indices = [];

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u);
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const centerOffset = (halfWidth - lineWidth / 2) * side;
        const centerPt = pt.clone().add(normal.clone().multiplyScalar(centerOffset));

        const p1 = centerPt.clone().add(normal.clone().multiplyScalar(-lineWidth / 2));
        const p2 = centerPt.clone().add(normal.clone().multiplyScalar(lineWidth / 2));

        positions.push(p1.x, p1.y + 0.065, p1.z);
        positions.push(p2.x, p2.y + 0.065, p2.z);

        normals.push(0, 1, 0);
        normals.push(0, 1, 0);

        if (i < segments) {
          const v1 = i * 2;
          const v2 = i * 2 + 1;
          const v3 = (i + 1) * 2;
          const v4 = (i + 1) * 2 + 1;
          indices.push(v1, v2, v3);
          indices.push(v2, v4, v3);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setIndex(indices);

      const mat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.45,
        metalness: 0.1
      });

      const lineMesh = new THREE.Mesh(geometry, mat);
      lineMesh.receiveShadow = true;
      this.scene.add(lineMesh);
    });
  }

  // 4. Yellow Painted Pit Lane Exit Merge Line
  buildYellowPitExitLine() {
    const halfWidth = this.config.width_m / 2;
    const lineWidth = 0.35;
    const startU = 0.000;
    const endU = 0.065; // Runs from start line past pit exit
    const segments = 120;

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const u = startU + (i / segments) * (endU - startU);
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const offset = (halfWidth - 4.6);
      const centerPt = pt.clone().add(normal.clone().multiplyScalar(offset));

      const p1 = centerPt.clone().add(normal.clone().multiplyScalar(-lineWidth / 2));
      const p2 = centerPt.clone().add(normal.clone().multiplyScalar(lineWidth / 2));

      positions.push(p1.x, p1.y + 0.07, p1.z);
      positions.push(p2.x, p2.y + 0.07, p2.z);

      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      if (i < segments) {
        const v1 = i * 2;
        const v2 = i * 2 + 1;
        const v3 = (i + 1) * 2;
        const v4 = (i + 1) * 2 + 1;
        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd600, // Vibrant FIA racing yellow
      roughness: 0.4,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  // 5. Authentic Sawtooth Red & White Kerbs with PBR Texture
  buildSawtoothKerbs() {
    const kerbZones = [
      { start: 0.08, end: 0.14, side: 'left' },   // Pit Straight exit curb (Left side in user photo!)
      { start: 0.17, end: 0.23, side: 'both' },  // Variante del Rettifilo Chicane (T1-T2)
      { start: 0.27, end: 0.34, side: 'outside' },// Curva Grande (Turn 3)
      { start: 0.42, end: 0.47, side: 'both' },  // Variante della Roggia Chicane (T4-T5)
      { start: 0.52, end: 0.56, side: 'inside' }, // Curva di Lesmo 1 (Turn 6)
      { start: 0.58, end: 0.62, side: 'inside' }, // Curva di Lesmo 2 (Turn 7)
      { start: 0.70, end: 0.78, side: 'both' },  // Variante Ascari Chicane (T8-T9-T10)
      { start: 0.88, end: 0.96, side: 'outside' }// Curva Parabolica / Alboreto (T11)
    ];

    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 512;
    kerbCanvas.height = 128;
    const kCtx = kerbCanvas.getContext('2d');

    // Alternating red and white sawtooth blocks
    for (let b = 0; b < 8; b++) {
      kCtx.fillStyle = (b % 2 === 0) ? '#cc0000' : '#f4f4f4';
      kCtx.fillRect(b * 64, 0, 64, 128);
    }
    // Rubber tire scuff marks on curb teeth
    kCtx.fillStyle = 'rgba(20, 20, 20, 0.35)';
    for (let r = 0; r < 20; r++) {
      kCtx.fillRect(Math.random() * 512, Math.random() * 60, 24, Math.random() * 50);
    }

    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.wrapS = THREE.RepeatWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;

    const kerbMat = new THREE.MeshStandardMaterial({
      map: kerbTex,
      roughness: 0.60,
      metalness: 0.12
    });

    const halfWidth = this.config.width_m / 2;
    const kerbWidth = 1.6;

    kerbZones.forEach(zone => {
      const sides = (zone.side === 'both') ? [-1, 1] : (zone.side === 'inside' || zone.side === 'left' ? [-1] : [1]);
      sides.forEach(side => {
        const segCount = 45;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= segCount; i++) {
          const u = zone.start + (i / segCount) * (zone.end - zone.start);
          const pt = this.curve.getPointAt(u);
          const tangent = this.curve.getTangentAt(u);
          const up = new THREE.Vector3(0, 1, 0);
          const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

          const innerOffset = halfWidth * side;
          const outerOffset = (halfWidth + kerbWidth) * side;

          const pInner = pt.clone().add(normal.clone().multiplyScalar(innerOffset));
          const pOuter = pt.clone().add(normal.clone().multiplyScalar(outerOffset));

          // Beveled curb elevation
          positions.push(pInner.x, pInner.y + 0.075, pInner.z);
          positions.push(pOuter.x, pOuter.y + 0.14, pOuter.z);

          normals.push(0, 1, 0);
          normals.push(0, 1, 0);

          uvs.push(0, i * 1.8);
          uvs.push(1, i * 1.8);

          if (i < segCount) {
            const v1 = i * 2;
            const v2 = i * 2 + 1;
            const v3 = (i + 1) * 2;
            const v4 = (i + 1) * 2 + 1;
            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
          }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        const kerbMesh = new THREE.Mesh(geometry, kerbMat);
        kerbMesh.receiveShadow = true;
        this.scene.add(kerbMesh);
      });
    });
  }

  // 6. Paul Ricard Style Blue and Red High-Friction Asphalt Runoffs
  buildBlueAndRedRunoffs() {
    const halfWidth = this.config.width_m / 2;
    const blueWidth = 5.2;

    const runoffZones = [
      { start: 0.16, end: 0.24, side: 1 },  // T1-T2 Chicane outside runoff
      { start: 0.41, end: 0.48, side: 1 },  // T4-T5 Roggia Chicane outside
      { start: 0.70, end: 0.78, side: -1 }, // Ascari Chicane entry runoff
      { start: 0.88, end: 0.96, side: 1 }   // Parabolica outside runoff
    ];

    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.75 }); // Deep racing blue
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.75 });  // High-friction red

    runoffZones.forEach(zone => {
      const segCount = 40;
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const normals = [];
      const indices = [];

      for (let i = 0; i <= segCount; i++) {
        const u = zone.start + (i / segCount) * (zone.end - zone.start);
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u);
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const p1 = pt.clone().add(normal.clone().multiplyScalar((halfWidth + 1.6) * zone.side));
        const p2 = pt.clone().add(normal.clone().multiplyScalar((halfWidth + 1.6 + blueWidth) * zone.side));

        positions.push(p1.x, p1.y + 0.052, p1.z);
        positions.push(p2.x, p2.y + 0.052, p2.z);

        normals.push(0, 1, 0);
        normals.push(0, 1, 0);

        if (i < segCount) {
          const v1 = i * 2;
          const v2 = i * 2 + 1;
          const v3 = (i + 1) * 2;
          const v4 = (i + 1) * 2 + 1;
          indices.push(v1, v2, v3);
          indices.push(v2, v4, v3);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setIndex(indices);

      const mesh = new THREE.Mesh(geometry, blueMat);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  // 7. Trackside Safety Barriers with Authentic Sponsor Decals
  buildRealisticBarriersWithSponsors() {
    const barrierOffset = (this.config.width_m / 2) + 9.5;
    const barrierHeight = 1.15;
    const segments = 320;

    const sponsorCanvas = document.createElement('canvas');
    sponsorCanvas.width = 1024;
    sponsorCanvas.height = 128;
    const sCtx = sponsorCanvas.getContext('2d');

    // Authentic Monza Sponsors (Pirelli, Aramco, Rolex, Araldica, Ferrari)
    sCtx.fillStyle = '#dc2626'; // Pirelli Red
    sCtx.fillRect(0, 0, 256, 128);
    sCtx.fillStyle = '#ffd600';
    sCtx.font = 'bold 36px Arial Black, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('PIRELLI', 128, 76);

    sCtx.fillStyle = '#005530'; // Rolex Green
    sCtx.fillRect(256, 0, 256, 128);
    sCtx.fillStyle = '#ffd700';
    sCtx.fillText('ROLEX', 384, 76);

    sCtx.fillStyle = '#00838f'; // Aramco Cyan
    sCtx.fillRect(512, 0, 256, 128);
    sCtx.fillStyle = '#ffffff';
    sCtx.fillText('ARAMCO', 640, 76);

    sCtx.fillStyle = '#111827'; // Dark Carbon
    sCtx.fillRect(768, 0, 256, 128);
    sCtx.fillStyle = '#e10600';
    sCtx.fillText('FERRARI', 896, 76);

    const sponsorTex = new THREE.CanvasTexture(sponsorCanvas);
    sponsorTex.wrapS = THREE.RepeatWrapping;
    sponsorTex.wrapT = THREE.RepeatWrapping;

    const barrierMat = new THREE.MeshStandardMaterial({
      map: sponsorTex,
      roughness: 0.5,
      metalness: 0.3
    });

    [-1, 1].forEach(side => {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const normals = [];
      const uvs = [];
      const indices = [];

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u);
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const basePt = pt.clone().add(normal.clone().multiplyScalar(barrierOffset * side));

        positions.push(basePt.x, basePt.y, basePt.z);
        positions.push(basePt.x, basePt.y + barrierHeight, basePt.z);

        normals.push(-normal.x * side, 0, -normal.z * side);
        normals.push(-normal.x * side, 0, -normal.z * side);

        uvs.push(i * 0.45, 1);
        uvs.push(i * 0.45, 0);

        if (i < segments) {
          const v1 = i * 2;
          const v2 = i * 2 + 1;
          const v3 = (i + 1) * 2;
          const v4 = (i + 1) * 2 + 1;
          indices.push(v1, v2, v3);
          indices.push(v2, v4, v3);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);

      const barrierMesh = new THREE.Mesh(geometry, barrierMat);
      barrierMesh.castShadow = true;
      barrierMesh.receiveShadow = true;
      this.scene.add(barrierMesh);
    });
  }

  // 8. FIA Steel Debris Catch Fencing with Wire Mesh
  buildFIAFencing() {
    const fenceOffset = (this.config.width_m / 2) + 11.8;
    const fenceHeight = 3.0;
    const segments = 240;

    const fenceCanvas = document.createElement('canvas');
    fenceCanvas.width = 64;
    fenceCanvas.height = 64;
    const fCtx = fenceCanvas.getContext('2d');
    fCtx.strokeStyle = 'rgba(210, 215, 222, 0.45)';
    fCtx.lineWidth = 1.5;
    fCtx.beginPath();
    fCtx.moveTo(0, 0); fCtx.lineTo(64, 64);
    fCtx.moveTo(64, 0); fCtx.lineTo(0, 64);
    fCtx.stroke();

    const fenceTex = new THREE.CanvasTexture(fenceCanvas);
    fenceTex.wrapS = THREE.RepeatWrapping;
    fenceTex.wrapT = THREE.RepeatWrapping;

    const fenceMat = new THREE.MeshStandardMaterial({
      map: fenceTex,
      transparent: true,
      opacity: 0.58,
      roughness: 0.6,
      metalness: 0.8,
      side: THREE.DoubleSide
    });

    [-1, 1].forEach(side => {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const normals = [];
      const uvs = [];
      const indices = [];

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u);
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const basePt = pt.clone().add(normal.clone().multiplyScalar(fenceOffset * side));

        positions.push(basePt.x, basePt.y + 1.15, basePt.z);
        positions.push(basePt.x, basePt.y + 1.15 + fenceHeight, basePt.z);

        normals.push(-normal.x * side, 0, -normal.z * side);
        normals.push(-normal.x * side, 0, -normal.z * side);

        uvs.push(i * 1.4, 1);
        uvs.push(i * 1.4, 0);

        if (i < segments) {
          const v1 = i * 2;
          const v2 = i * 2 + 1;
          const v3 = (i + 1) * 2;
          const v4 = (i + 1) * 2 + 1;
          indices.push(v1, v2, v3);
          indices.push(v2, v4, v3);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);

      const fenceMesh = new THREE.Mesh(geometry, fenceMat);
      this.scene.add(fenceMesh);
    });
  }

  // 9. Main Pit Straight Architecture (MATCHING USER REFERENCE PHOTOGRAPH)
  // Covered Grandstands with Italian Flags, Brake Marker Boards, Pit Building & Garages
  buildPitStraightArchitecture() {
    const halfWidth = this.config.width_m / 2;
    const straightGroup = new THREE.Group();

    // Pit straight spans from Z = -400 past the start line to Z = 300 heading to Turn 1
    const grandstandLength = 540.0;
    const standRows = 14;

    // =========================================================================
    // LEFT SIDE: Covered Grandstand with Steel Trusses & Italian Flags (Image 1)
    // =========================================================================
    for (let r = 0; r < standRows; r++) {
      const stepWidth = 1.7;
      const stepHeight = 0.82;
      const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, grandstandLength);
      const stepMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(-halfWidth - 14.5 - (r * stepWidth), (r * stepHeight) + (stepHeight / 2), -50);
      step.castShadow = true;
      straightGroup.add(step);

      // Colorful crowd spectator rows
      const crowdGeo = new THREE.BoxGeometry(0.75, 0.45, grandstandLength - 8);
      const crowdMat = new THREE.MeshStandardMaterial({
        color: (r % 3 === 0 ? 0xcc0000 : r % 3 === 1 ? 0xffffff : 0x1e3a8a), // Red, White, Blue F1 shirts
        roughness: 0.95
      });
      const crowd = new THREE.Mesh(crowdGeo, crowdMat);
      crowd.position.set(-halfWidth - 14.5 - (r * stepWidth), (r * stepHeight) + stepHeight + 0.225, -50);
      straightGroup.add(crowd);
    }

    // Modern Cantilever Corrugated Canopy Roof spanning above the spectators
    const roofWidth = 32.0;
    const roofGeo = new THREE.BoxGeometry(roofWidth, 0.75, grandstandLength + 16);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b323e, metalness: 0.65, roughness: 0.35 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-halfWidth - 26.5, 15.5, -50);
    roof.rotation.z = -0.06;
    roof.castShadow = true;
    straightGroup.add(roof);

    // Steel Tubular Support Truss Framing
    for (let tz = -300; tz <= 200; tz += 35) {
      const trussGeo = new THREE.CylinderGeometry(0.38, 0.38, 16.5, 8);
      const trussMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, metalness: 0.88, roughness: 0.25 });
      const truss = new THREE.Mesh(trussGeo, trussMat);
      truss.position.set(-halfWidth - 39.5, 8.25, tz);
      straightGroup.add(truss);

      // Angled roof cross-bracing
      const rafterGeo = new THREE.CylinderGeometry(0.25, 0.25, 26.0, 6);
      const rafter = new THREE.Mesh(rafterGeo, trussMat);
      rafter.position.set(-halfWidth - 26.0, 14.8, tz);
      rafter.rotation.z = Math.PI / 2 - 0.06;
      straightGroup.add(rafter);

      // Flying Italian Tricolor Flags (🇮🇹) on Grandstand Roof Rafters
      if (tz % 70 === 0) {
        const flagPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6);
        const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 });
        const pole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
        pole.position.set(-halfWidth - 11.5, 17.5, tz);
        straightGroup.add(pole);

        const flagCanvas = document.createElement('canvas');
        flagCanvas.width = 192;
        flagCanvas.height = 128;
        const flCtx = flagCanvas.getContext('2d');
        flCtx.fillStyle = '#009246'; // Italian Green
        flCtx.fillRect(0, 0, 64, 128);
        flCtx.fillStyle = '#ffffff'; // White
        flCtx.fillRect(64, 0, 64, 128);
        flCtx.fillStyle = '#ce2b37'; // Red
        flCtx.fillRect(128, 0, 64, 128);

        const flagTex = new THREE.CanvasTexture(flagCanvas);
        const flagGeo = new THREE.PlaneGeometry(2.4, 1.6);
        const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.6 });
        const flagMesh = new THREE.Mesh(flagGeo, flagMat);
        flagMesh.position.set(-halfWidth - 10.2, 18.2, tz);
        straightGroup.add(flagMesh);
      }
    }

    // =========================================================================
    // RIGHT SIDE: 3-Story Concrete Pit Building, Garages & Hospitality (Image 1)
    // =========================================================================
    const pitBuildingLength = 480.0;

    // Ground Floor: Concrete Team Garages
    const garageGeo = new THREE.BoxGeometry(20.0, 5.0, pitBuildingLength);
    const garageMat = new THREE.MeshStandardMaterial({ color: 0x333a46, roughness: 0.68, metalness: 0.2 });
    const garage = new THREE.Mesh(garageGeo, garageMat);
    garage.position.set(halfWidth + 22.5, 2.5, -60);
    garage.castShadow = true;
    straightGroup.add(garage);

    // Garage Bay Overhead Numbers & Lights (Numbers 28, 27, 26, 25... as in reference photo)
    for (let gz = -240; gz <= 140; gz += 28) {
      const gNumCanvas = document.createElement('canvas');
      gNumCanvas.width = 128;
      gNumCanvas.height = 64;
      const gnCtx = gNumCanvas.getContext('2d');
      gnCtx.fillStyle = '#1e2430';
      gnCtx.fillRect(0, 0, 128, 64);
      gnCtx.fillStyle = '#ffffff';
      gnCtx.font = 'bold 38px Arial Black, sans-serif';
      gnCtx.textAlign = 'center';
      gnCtx.textBaseline = 'middle';
      const bayNum = Math.abs(Math.floor((gz + 300) / 28) + 20);
      gnCtx.fillText(`${bayNum}`, 64, 32);

      const numTex = new THREE.CanvasTexture(gNumCanvas);
      const numGeo = new THREE.PlaneGeometry(2.6, 1.3);
      const numMat = new THREE.MeshBasicMaterial({ map: numTex });
      const numMesh = new THREE.Mesh(numGeo, numMat);
      numMesh.rotation.y = -Math.PI / 2;
      numMesh.position.set(halfWidth + 12.4, 4.4, gz);
      straightGroup.add(numMesh);

      // Pit crew members in orange & team overalls
      const crewGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.72, 8);
      const crewMat = new THREE.MeshStandardMaterial({
        color: (gz % 2 === 0 ? 0xf97316 : 0xef4444), // Orange FIA / Ferrari Red overalls
        roughness: 0.8
      });
      const crew = new THREE.Mesh(crewGeo, crewMat);
      crew.position.set(halfWidth + 10.8, 0.86, gz + 4);
      straightGroup.add(crew);
    }

    // Second Floor: VIP Hospitality Suites with Tinted Glass Windows
    const suitesGeo = new THREE.BoxGeometry(18.0, 4.4, pitBuildingLength - 16);
    const suitesMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.5 });
    const suites = new THREE.Mesh(suitesGeo, suitesMat);
    suites.position.set(halfWidth + 22.5, 7.2, -60);
    straightGroup.add(suites);

    // Large Tinted Glass Balcony Wall (Reflecting the Sky)
    const glassGeo = new THREE.PlaneGeometry(pitBuildingLength - 20, 3.8);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.08,
      metalness: 0.92
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.rotation.y = -Math.PI / 2;
    glass.position.set(halfWidth + 13.4, 7.2, -60);
    straightGroup.add(glass);

    // Concrete Pit Wall separating the pit lane from the live track
    const pitWallGeo = new THREE.BoxGeometry(1.1, 1.15, pitBuildingLength);
    const pitWallMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.75 });
    const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
    pitWall.position.set(halfWidth + 4.5, 0.575, -60);
    pitWall.castShadow = true;
    straightGroup.add(pitWall);

    // Team Pit Perches (Engineers timing stations on pit wall)
    for (let p = -180; p <= 80; p += 34) {
      const perch = new THREE.Group();
      const boothGeo = new THREE.BoxGeometry(2.4, 2.1, 3.8);
      const boothMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
      const booth = new THREE.Mesh(boothGeo, boothMat);
      booth.position.set(halfWidth + 6.0, 1.8, p);
      perch.add(booth);

      const screenGeo = new THREE.BoxGeometry(0.8, 0.65, 2.0);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(halfWidth + 4.7, 2.4, p);
      perch.add(screen);

      straightGroup.add(perch);
    }

    this.scene.add(straightGroup);
  }

  // 10. Dense Royal Park of Monza Perimeter Forest (500+ Tall Lush Trees)
  buildDensePerimeterForest() {
    const forestGroup = new THREE.Group();
    const halfWidth = this.config.width_m / 2;

    // Materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2e1d12, roughness: 0.9, metalness: 0.05 });
    const canopyColors = [0x23441e, 0x2f5927, 0x1c3617, 0x3d6e32];

    const canopyMats = canopyColors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.82,
      metalness: 0.04
    }));

    // Dense tree corridor lining both sides of the main straight (matching reference photo)
    for (let tz = -450; tz <= 350; tz += 14) {
      // Left side behind grandstand (multiple dense tiers)
      [-halfWidth - 52, -halfWidth - 72, -halfWidth - 95].forEach((tx, tier) => {
        const h = 14 + Math.random() * 8 + (tier * 3);
        const r = 5.2 + Math.random() * 3.2;
        const tree = this.createDetailedTree(trunkMat, canopyMats[Math.floor(Math.random() * canopyMats.length)], h, r);
        tree.position.set(tx + (Math.random() * 8 - 4), 0, tz + (Math.random() * 8 - 4));
        forestGroup.add(tree);
      });

      // Right side behind pit building (multiple dense tiers)
      [halfWidth + 44, halfWidth + 68, halfWidth + 92].forEach((tx, tier) => {
        const h = 14 + Math.random() * 8 + (tier * 3);
        const r = 5.2 + Math.random() * 3.2;
        const tree = this.createDetailedTree(trunkMat, canopyMats[Math.floor(Math.random() * canopyMats.length)], h, r);
        tree.position.set(tx + (Math.random() * 8 - 4), 0, tz + (Math.random() * 8 - 4));
        forestGroup.add(tree);
      });
    }

    // Outer circuit perimeter trees (around Lesmo, Ascari & Parabolica)
    const samplesCount = 140;
    for (let i = 0; i < samplesCount; i++) {
      const u = i / samplesCount;
      if (u > 0.12 && u < 0.96) { // Avoid duplicating pit straight
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u);
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        [-1, 1].forEach(side => {
          [28, 48, 72].forEach(dist => {
            const treePos = pt.clone().add(normal.clone().multiplyScalar((halfWidth + dist) * side));
            const h = 12 + Math.random() * 9;
            const r = 4.8 + Math.random() * 3.0;
            const tree = this.createDetailedTree(trunkMat, canopyMats[Math.floor(Math.random() * canopyMats.length)], h, r);
            tree.position.set(treePos.x + (Math.random() * 8 - 4), 0, treePos.z + (Math.random() * 8 - 4));
            forestGroup.add(tree);
          });
        });
      }
    }

    this.scene.add(forestGroup);
  }

  createDetailedTree(trunkMat, canopyMat, height, radius) {
    const tree = new THREE.Group();

    // Trunk
    const trunkHeight = height * 0.42;
    const trunkGeo = new THREE.CylinderGeometry(radius * 0.12, radius * 0.20, trunkHeight, 7);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Multi-tier lush foliage canopy
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const tierRadius = radius * (1.0 - t * 0.22);
      const tierHeight = (height * 0.65) / tiers;
      const folGeo = new THREE.DodecahedronGeometry(tierRadius, 1);
      const foliage = new THREE.Mesh(folGeo, canopyMat);
      foliage.position.y = trunkHeight + (t * tierHeight * 0.85) + (tierHeight / 2);
      foliage.scale.set(1.15, 0.95, 1.1);
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      tree.add(foliage);
    }

    return tree;
  }

  // 11. Overhead Sponsor Gantry Bridges
  buildOverheadBridges() {
    this.createGantryBridge(0.02, "AUTODROMO NAZIONALE MONZA", "#e10600", "#ffffff");
    this.createGantryBridge(0.28, "PIRELLI", "#e10600", "#ffd600");
    this.createGantryBridge(0.66, "HISTORIC 1955 MONZA BANKED OVAL", "#4b5563", "#ffffff"); // Concrete Banking Bridge
    this.createGantryBridge(0.84, "ARAMCO", "#00838f", "#ffffff");
  }

  createGantryBridge(u, text, bgColor, textColor) {
    const pt = this.curve.getPointAt(u);
    const tangent = this.curve.getTangentAt(u);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const spanWidth = this.config.width_m + 16.0;

    const gantry = new THREE.Group();

    // Pillars
    [-spanWidth / 2, spanWidth / 2].forEach(offset => {
      const pillarGeo = new THREE.CylinderGeometry(0.55, 0.55, 8.5, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(normal.x * offset, 4.25, normal.z * offset);
      pillar.castShadow = true;
      gantry.add(pillar);
    });

    // Cross-Beam
    const beamGeo = new THREE.BoxGeometry(spanWidth + 2.0, 1.8, 2.2);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 8.2, 0);
    beam.rotation.y = Math.atan2(normal.z, normal.x);
    beam.castShadow = true;
    gantry.add(beam);

    // Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 96;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = bgColor;
    sCtx.fillRect(0, 0, 512, 96);
    sCtx.fillStyle = textColor;
    sCtx.font = 'bold 36px Arial Black, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(text, 256, 48);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.PlaneGeometry(spanWidth - 4.0, 1.4);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });

    [-1.15, 1.15].forEach(zOff => {
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(tangent.x * zOff, 8.2, tangent.z * zOff);
      signMesh.rotation.y = Math.atan2(tangent.x, tangent.z) + (zOff > 0 ? 0 : Math.PI);
      gantry.add(signMesh);
    });

    gantry.position.copy(pt);
    this.scene.add(gantry);
  }

  // 12. Start / Finish Line Checkered Grid
  buildStartFinishLine() {
    const pt = this.curve.getPointAt(0);
    const tangent = this.curve.getTangentAt(0);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    for (let c = 0; c < 8; c++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = ((c + r) % 2 === 0) ? '#ffffff' : '#000000';
        ctx.fillRect(c * 32, r * 32, 32, 32);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(this.config.width_m, 2.8);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.atan2(tangent.x, tangent.z) - Math.PI / 2;
    mesh.position.copy(pt).add(new THREE.Vector3(0, 0.068, 0));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  // 13. Overhead Starting Lights Gantry & Historic Monza Timing Tower (Ahead)
  buildPitLaneAndGantry() {
    const pt = this.curve.getPointAt(0.018); // Directly over starting grid
    const tangent = this.curve.getTangentAt(0.018);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const gantry = new THREE.Group();

    // Steel Tubular Gantry Arch
    const span = this.config.width_m + 8.0;
    [-span / 2, span / 2].forEach(off => {
      const poleGeo = new THREE.CylinderGeometry(0.45, 0.45, 9.2, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(normal.x * off, 4.6, normal.z * off);
      gantry.add(pole);
    });

    const crossBeamGeo = new THREE.BoxGeometry(span + 1.0, 1.2, 1.4);
    const crossBeamMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const crossBeam = new THREE.Mesh(crossBeamGeo, crossBeamMat);
    crossBeam.position.set(0, 8.8, 0);
    crossBeam.rotation.y = Math.atan2(normal.z, normal.x);
    gantry.add(crossBeam);

    // 5 FIA Starting Lights Units
    const boxGeo = new THREE.BoxGeometry(5.8, 1.1, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 });
    const lightBox = new THREE.Mesh(boxGeo, boxMat);
    lightBox.position.set(0, 7.8, 0);
    lightBox.rotation.y = Math.atan2(normal.z, normal.x);
    gantry.add(lightBox);

    this.startGantryLights = [];
    for (let i = 0; i < 5; i++) {
      const bulbGeo = new THREE.CircleGeometry(0.32, 16);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0x220000 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(tangent.x * -0.32 + normal.x * ((i - 2) * 1.05), 7.8, tangent.z * -0.32 + normal.z * ((i - 2) * 1.05));
      bulb.rotation.y = Math.atan2(tangent.x, tangent.z);
      gantry.add(bulb);
      this.startGantryLights.push(bulbMat);
    }

    gantry.position.copy(pt);
    this.scene.add(gantry);

    // Historic Monza Timing Tower (Visible down the straight)
    const towerPt = this.curve.getPointAt(0.045);
    const towerNormal = this.curve.getTangentAt(0.045);
    const towerPos = towerPt.clone().add(new THREE.Vector3(normal.x * 24.0, 0, normal.z * 24.0));

    const towerGroup = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(3.5, 4.2, 28.0, 12);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 14.0;
    towerGroup.add(shaft);

    const deckGeo = new THREE.CylinderGeometry(6.2, 6.2, 3.8, 16);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 23.0;
    towerGroup.add(deck);

    towerGroup.position.copy(towerPos);
    this.scene.add(towerGroup);
  }

  // 14. High-Contrast Brake Distance Marker Boards (200, 150, 100, 50 - MATCHING USER PHOTO)
  buildTracksideSignage() {
    // 200m, 150m, 100m, 50m before Turn 1 chicane (along left guardrail)
    const brakeMarkersDist = [880, 930, 980, 1030];
    const labels = ["200", "150", "100", "50"];

    brakeMarkersDist.forEach((dist, idx) => {
      const u = dist / this.trackLength;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Placed on left guardrail facing approaching drivers
      const boardPos = pt.clone().add(normal.clone().multiplyScalar(-this.config.width_m / 2 - 4.2));

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      // Crisp white board with bold black border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 128);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(5, 5, 246, 118);
      // Bold motorsport distance numeral
      ctx.fillStyle = '#000000';
      ctx.font = '900 68px Arial Black, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[idx], 128, 64);

      const tex = new THREE.CanvasTexture(canvas);
      const boardGeo = new THREE.PlaneGeometry(2.4, 1.2);
      const boardMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      const boardMesh = new THREE.Mesh(boardGeo, boardMat);
      boardMesh.position.set(boardPos.x, boardPos.y + 1.25, boardPos.z);
      boardMesh.rotation.y = Math.atan2(tangent.x, tangent.z) - Math.PI / 2;
      this.scene.add(boardMesh);
    });
  }

  setStartingLights(activeCount) {
    this.startGantryLights.forEach((mat, idx) => {
      if (activeCount === 6) {
        mat.color.setHex(0x00e676); // Green (lights out / go!)
      } else if (idx < activeCount) {
        mat.color.setHex(0xff1744); // Red active
      } else {
        mat.color.setHex(0x220000); // Dim red off
      }
    });
  }

  // --------------------------------------------------------------------------
  // TRACK LIMITS & KINEMATIC POSITION QUERY (FOR PHYSICS & AI)
  // --------------------------------------------------------------------------
  getTrackProgress(position) {
    let closestDistSq = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < this.samples.length; i++) {
      const dSq = position.distanceToSquared(this.samples[i].point);
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestIndex = i;
      }
    }

    const sample = this.samples[closestIndex];
    const diff = position.clone().sub(sample.point);
    const lateralOffset = diff.dot(sample.normal);

    const halfWidth = this.config.width_m / 2;
    const isOffTrack = Math.abs(lateralOffset) > halfWidth;
    const isOnKerb = Math.abs(lateralOffset) > halfWidth && Math.abs(lateralOffset) <= (halfWidth + 1.6);
    const isInRunoff = Math.abs(lateralOffset) > (halfWidth + 1.6) && Math.abs(lateralOffset) <= (halfWidth + 9.2);
    const isAtBarrier = Math.abs(lateralOffset) >= (halfWidth + 9.5);

    return {
      distance: sample.distance,
      u: sample.u,
      centerPoint: sample.point,
      tangent: sample.tangent,
      normal: sample.normal,
      lateralOffset: lateralOffset,
      isOffTrack: isOffTrack,
      isOnKerb: isOnKerb,
      isInRunoff: isInRunoff,
      isAtBarrier: isAtBarrier
    };
  }

  getSector(distance) {
    for (let i = 0; i < this.config.sectors.length; i++) {
      const sec = this.config.sectors[i];
      if (distance >= sec.startDistance && distance < sec.endDistance) {
        return i + 1;
      }
    }
    return 1;
  }
}

window.CircuitTrack = CircuitTrack;
