/**
 * ============================================================================
 * CONFIGURATION & ENGINEERING CONSTANTS: AUTODROMO NAZIONALE MONZA
 * Formula 1 IoT Telemetry & Race Simulator
 * ============================================================================
 */

window.F1_CONFIG = {
  // Vehicle Dynamics & Powertrain Constants
  VEHICLE: {
    mass_kg: 798,                  // FIA Formula 1 minimum regulation mass (car + driver)
    weightDistributionFront: 0.46, // 46% Front, 54% Rear
    wheelbase_m: 3.6,              // 3600 mm wheelbase
    trackWidth_m: 2.0,             // 2000 mm overall width
    centerOfGravityHeight_m: 0.32,
    
    // Aerodynamics (Monza Low-Downforce / Low-Drag Monza Package)
    dragCoefficient_Cd: 0.68,      // Monza ultra low-drag trim for 350+ km/h top speed
    dragCoefficient_DRS: 0.52,     // DRS open drag reduction
    frontalArea_m2: 1.42,          // m^2
    airDensity_kg_m3: 1.225,       // Sea level air density
    downforceCoeff_Cl: 2.65,       // Monza specific downforce coefficient
    
    // Powertrain: 1.6L V6 Turbocharged Hybrid (ICE + MGU-K + MGU-H)
    idleRpm: 4000,
    maxRpm: 15000,
    revLimiterRpm: 15200,
    peakTorqueNm: 440,
    peakPowerHp: 1040,             // ~780 hp ICE + 160 hp MGU-K electrical boost
    
    // 8-Speed Monza Tall-Ratio Gearbox
    finalDrive: 3.95,
    gearRatios: [
      0,      // Neutral
      3.10,   // 1st (0 - 110 km/h)
      2.35,   // 2nd (110 - 158 km/h)
      1.82,   // 3rd (158 - 205 km/h)
      1.46,   // 4th (205 - 248 km/h)
      1.22,   // 5th (248 - 288 km/h)
      1.02,   // 6th (288 - 322 km/h)
      0.88,   // 7th (322 - 348 km/h)
      0.76    // 8th (348 - 362+ km/h Monza top speed blast)
    ],
    shiftDelayMs: 60,             // Seamless shift dog-ring actuation delay

    // Braking System (Brembo Carbon-Carbon Discs & 6-Piston Calipers)
    maxBrakingDecel_ms2: 52.0,    // Peak braking decel (up to 5.3G at Turn 1)
    brakeBiasFront: 0.56,

    // Tire Model (Pirelli P-Zero Red Soft Compound)
    tireOptimalTemp_C: 98.0,
    tireMinTemp_C: 75.0,
    tireMaxTemp_C: 118.0,
    tireGripPeakCoeff: 1.76,      // Peak friction coefficient on clean dry racing tarmac
    tireGripKerbCoeff: 1.22,      // Kerb rumble strip friction
    tireGripGrassCoeff: 0.48,     // Off-track grass friction
    tireWearRatePerKm: 0.009,

    // Power Unit Thermal Model
    engineNormalTemp_C: 98.0,
    engineThermalMass: 180.0,
    radiatorCoolingCoeff: 0.08,
    ambientTemp_C: 28.0
  },

  // Engineering Alert Thresholds for the Race Engineer Pitwall Dashboard
  THRESHOLDS: {
    ENGINE_TEMP: {
      WARNING_C: 106.0,
      CRITICAL_C: 115.0,
      MESSAGE_WARN: "Elevated ICE coolant temperature under sustained 350 km/h load.",
      MESSAGE_CRIT: "CRITICAL: Engine overheating (>115°C)! Blown cylinder head risk. Lift-and-coast immediately.",
      SUBSYSTEM: "POWERTRAIN"
    },
    TIRE_TEMP: {
      COLD_C: 75.0,
      HOT_WARN_C: 112.0,
      HOT_CRIT_C: 122.0,
      MESSAGE_COLD: "Tires below operating window (<75°C). Reduced Turn 1 braking grip.",
      MESSAGE_HOT: "Tire blistering / thermal graining detected (>112°C). Grip loss ~20%.",
      SUBSYSTEM: "TIRES"
    },
    BRAKE_TEMP: {
      HOT_WARN_C: 840.0,
      HOT_CRIT_C: 1000.0,
      MESSAGE_WARN: "Brake disc temperature spike (>840°C) after Rettifilo deceleration.",
      MESSAGE_CRIT: "CRITICAL: Brake fluid boiling & rotor glazing hazard (>1000°C)!",
      SUBSYSTEM: "BRAKES"
    },
    WHEEL_SLIP: {
      TRACTION_ALERT: 0.22,
      MESSAGE: "Longitudinal wheel spin on chicane exit. High rear tire degradation.",
      SUBSYSTEM: "DYNAMICS"
    },
    LATERAL_G: {
      HIGH_G: 4.2,
      MESSAGE: "Sustained high lateral loading (>4.2G) in Curva Grande.",
      SUBSYSTEM: "AERODYNAMICS"
    }
  },

  // Driver Rosters & Team Liveries (Authentic Formula 1 Grid)
  DRIVERS: [
    {
      id: 'player',
      name: 'Charles Leclerc',
      code: 'LEC',
      number: 16,
      team: 'Scuderia Ferrari HP',
      country: 'MON',
      color: '#e10600',          // Racing Scarlet Red
      accentColor: '#ffffff',    // White
      haloColor: '#1a1a1a',
      gloveColor: '#e10600',
      isPlayer: true,
      aiProfile: {
        aggression: 0.94,
        brakingConsistency: 0.96,
        cornerSpeedFactor: 1.0,
        mistakeProbability: 0.005
      }
    },
    {
      id: 'ai_1',
      name: 'Max Verstappen',
      code: 'VER',
      number: 1,
      team: 'Oracle Red Bull Racing',
      country: 'NED',
      color: '#0c192c',          // Matte Navy Blue
      accentColor: '#f30018',    // Red Bull Red
      haloColor: '#f30018',
      gloveColor: '#0c192c',
      isPlayer: false,
      aiProfile: {
        aggression: 0.96,
        brakingConsistency: 0.97,
        cornerSpeedFactor: 1.002,
        mistakeProbability: 0.005
      }
    },
    {
      id: 'ai_2',
      name: 'Lewis Hamilton',
      code: 'HAM',
      number: 44,
      team: 'Mercedes-AMG PETRONAS',
      country: 'GBR',
      color: '#00a19c',          // Petronas Turquoise
      accentColor: '#c0c0c0',    // Silver Chrome
      haloColor: '#111111',
      gloveColor: '#00a19c',
      isPlayer: false,
      aiProfile: {
        aggression: 0.88,
        brakingConsistency: 0.98,
        cornerSpeedFactor: 0.996,
        mistakeProbability: 0.004
      }
    },
    {
      id: 'ai_3',
      name: 'Lando Norris',
      code: 'NOR',
      number: 4,
      team: 'McLaren Formula 1 Team',
      country: 'GBR',
      color: '#ff8000',          // Papaya Orange
      accentColor: '#16181d',    // Anthracite
      haloColor: '#ff8000',
      gloveColor: '#ff8000',
      isPlayer: false,
      aiProfile: {
        aggression: 0.90,
        brakingConsistency: 0.95,
        cornerSpeedFactor: 0.998,
        mistakeProbability: 0.006
      }
    },
    {
      id: 'ai_4',
      name: 'Fernando Alonso',
      code: 'ALO',
      number: 14,
      team: 'Aston Martin Aramco',
      country: 'ESP',
      color: '#00594f',          // British Racing Green
      accentColor: '#cedc00',    // Lime Accent
      haloColor: '#00594f',
      gloveColor: '#00594f',
      isPlayer: false,
      aiProfile: {
        aggression: 0.93,
        brakingConsistency: 0.96,
        cornerSpeedFactor: 0.994,
        mistakeProbability: 0.008
      }
    },
    {
      id: 'ai_5',
      name: 'Pierre Gasly',
      code: 'GAS',
      number: 10,
      team: 'BWT Alpine F1 Team',
      country: 'FRA',
      color: '#0090ff',          // Alpine Royal Blue
      accentColor: '#fd4bc7',    // BWT Pink
      haloColor: '#0090ff',
      gloveColor: '#0090ff',
      isPlayer: false,
      aiProfile: {
        aggression: 0.85,
        brakingConsistency: 0.94,
        cornerSpeedFactor: 0.988,
        mistakeProbability: 0.012
      }
    }
  ],

  // ==========================================================================
  // AUTODROMO NAZIONALE MONZA: OFFICIAL F1 WAYPOINT SPLINE DEFINITION
  // Exact 5,793m layout: Rettifilo -> Curva Grande -> Roggia -> Lesmo -> Ascari -> Parabolica
  // ==========================================================================
  CIRCUIT: {
    name: "Autodromo Nazionale Monza",
    country: "Italy",
    length_m: 5793,
    width_m: 14.5,
    sectors: [
      { name: "Sector 1", startDistance: 0, endDistance: 1850, color: "#e10600" },     // Pit Straight + T1/T2 Rettifilo Chicane + Curva Grande
      { name: "Sector 2", startDistance: 1850, endDistance: 3950, color: "#ffd600" },  // Roggia Chicane + Lesmo 1 & 2 + Serraglio Underpass
      { name: "Sector 3", startDistance: 3950, endDistance: 5793, color: "#00e5ff" }   // Variante Ascari + Back Straight + Curva Parabolica
    ],
    speedTrapDistance: 1100, // End of Rettifilo speed trap (355+ km/h)
    drsZones: [
      { startDistance: 150, endDistance: 950, name: "DRS Zone 1 (Rettifilo Straight)" },
      { startDistance: 4350, endDistance: 5150, name: "DRS Zone 2 (Rettifilo Rettilineo)" }
    ],
    drsZone: { startDistance: 150, endDistance: 950 }, // Primary DRS zone
    
    // Central Spline Control Points (X, Z coordinates in meters, Y is elevation)
    nodes: [
      // 1. Rettifilo (Main Pit Straight) - 1.1 km high-speed blast
      { x: 0,    y: 0.0, z: -400, desc: "Start / Finish Line (Monza Rettifilo)" },
      { x: 0,    y: 0.0, z: -150, desc: "DRS Zone 1 Activation Point" },
      { x: 0,    y: 0.0, z: 150,  desc: "Pit Exit Merge & Grandstand Mid" },
      { x: 0,    y: 0.0, z: 420,  desc: "Speed Trap (355 km/h) & 150m Brake Board" },
      
      // 2. Variante del Rettifilo (Turn 1 & 2 Chicane) - 355 km/h -> 75 km/h
      { x: 18,   y: 0.2, z: 520,  desc: "Turn 1 Chicane Entry (Tight Right, 75 km/h)" },
      { x: -12,  y: 0.3, z: 580,  desc: "Turn 2 Chicane Apex (Tight Left, 82 km/h)" },
      { x: 0,    y: 0.1, z: 660,  desc: "Chicane Exit & Full Throttle Traction" },
      
      // 3. Curva Grande (Curva Biassono) - Sweeping 290 km/h right curve
      { x: 80,   y: 0.3, z: 800,  desc: "Curva Grande Entry (Biassono, 240 km/h)" },
      { x: 200,  y: 0.8, z: 920,  desc: "Curva Grande Mid-Apex (Sustained 4.5G Lateral)" },
      { x: 330,  y: 1.2, z: 940,  desc: "Curva Grande Exit Arc (290 km/h)" },
      { x: 440,  y: 1.5, z: 860,  desc: "Biassono Exit onto Roggia Straight" },
      { x: 500,  y: 1.2, z: 700,  desc: "Straight to Variante della Roggia (325 km/h)" },
      { x: 530,  y: 0.8, z: 500,  desc: "Roggia 150m Heavy Braking Marker" },
      
      // 4. Variante della Roggia (Turns 4 & 5 Chicane) - 325 km/h -> 112 km/h
      { x: 505,  y: 0.5, z: 420,  desc: "Turn 4 Roggia Chicane Entry (Left, 112 km/h)" },
      { x: 540,  y: 0.3, z: 360,  desc: "Turn 5 Roggia Apex (Right, 120 km/h)" },
      { x: 545,  y: 0.2, z: 280,  desc: "Roggia Exit Acceleration" },
      
      // 5. Curve di Lesmo (Turns 6 & 7) - Historic Royal Park corners
      { x: 550,  y: 0.4, z: 120,  desc: "Curva di Lesmo 1 Entry (Right, 165 km/h)" },
      { x: 620,  y: 0.8, z: 40,   desc: "Lesmo 1 Apex & Kerb Rumble" },
      { x: 650,  y: 1.0, z: -40,  desc: "Lesmo Short Chute (Accelerating to 240 km/h)" },
      { x: 640,  y: 1.2, z: -140, desc: "Curva di Lesmo 2 Entry (Right, 155 km/h)" },
      { x: 580,  y: 1.4, z: -220, desc: "Lesmo 2 Apex & Traction Zone" },
      
      // 6. Curva del Serraglio & Historic Banking Underpass
      { x: 480,  y: 1.0, z: -360, desc: "Curva del Serraglio Entry (Gentle Left Kink)" },
      { x: 340,  y: 0.5, z: -520, desc: "Serraglio Underpass (Historic Oval Banking Bridge)" },
      { x: 180,  y: 0.2, z: -680, desc: "Serraglio Downhill Kink (320 km/h)" },
      { x: 20,   y: 0.0, z: -840, desc: "Approach to Variante Ascari (335 km/h)" },
      { x: -50,  y: 0.0, z: -940, desc: "Ascari 150m Braking Board" },
      
      // 7. Variante Ascari (Turns 8, 9, 10) - High-speed left-right-left chicane
      { x: -120, y: 0.2, z: -1010, desc: "Turn 8 Ascari Chicane Left Entry (205 km/h)" },
      { x: -170, y: 0.3, z: -980,  desc: "Turn 9 Ascari Chicane Right Flick (220 km/h)" },
      { x: -240, y: 0.2, z: -920,  desc: "Turn 10 Ascari Exit Left (235 km/h)" },
      
      // 8. Rettifilo Rettilineo (Back Straight) - 345 km/h DRS blast
      { x: -310, y: 0.4, z: -800, desc: "Back Straight DRS Zone 2 Activation" },
      { x: -350, y: 0.2, z: -600, desc: "Back Straight Full Throttle" },
      { x: -380, y: 0.0, z: -350, desc: "Back Straight Speed Trap (348 km/h)" },
      { x: -390, y: 0.0, z: -120, desc: "Curva Parabolica 150m Braking Marker" },
      
      // 9. Curva Parabolica (Curva Alboreto) - Legendary 180-degree sweeping right
      { x: -370, y: 0.2, z: 20,   desc: "Curva Parabolica Entry (175 km/h)" },
      { x: -280, y: 0.4, z: 120,  desc: "Parabolica Long Sweeping Apex (Sustained 3.8G)" },
      { x: -160, y: 0.2, z: 120,  desc: "Parabolica Exit Arc (Opening Steering, 255 km/h)" },
      { x: -60,  y: 0.1, z: 30,   desc: "Parabolica Exit onto Rettifilo Pit Straight" },
      { x: -15,  y: 0.0, z: -160, desc: "Main Straight Alignment toward Start/Finish Line" }
    ]
  },

  // IoT Hardware Schema & Mode Constants
  IOT: {
    SAMPLE_RATE_HZ: 20,           // 20 telemetry updates per second (50ms interval)
    ESP32_DEFAULT_PORT: 8080,
    WS_ENDPOINT: "/telemetry-stream",
    REST_INGEST_ENDPOINT: "/api/telemetry/ingest",
    SENSORS: {
      MPU6050: { bus: "I2C 0x68", rate: "100Hz", params: ["accel_x_g", "accel_y_g", "accel_z_g", "gyro_z_dps"] },
      TCRT5000_IR: { pin: "GPIO4 Interrupt", rate: "Edge-triggered", params: ["ir_beam_lap_trigger", "sector_beam_trigger"] },
      DS18B20: { bus: "OneWire GPIO18", rate: "2Hz", params: ["ambient_temp_c", "chassis_temp_c"] },
      HALL_EFFECT: { pin: "GPIO19/23", rate: "Pulses", params: ["wheel_speed_kmh", "engine_rpm"] },
      MLX90614_IR: { bus: "I2C 0x5A", rate: "10Hz", params: ["tire_fl_temp", "tire_fr_temp", "tire_rl_temp", "tire_rr_temp"] },
      K_THERMOCOUPLE: { bus: "SPI MAX6675", rate: "10Hz", params: ["brake_fl_rotor_temp", "brake_fr_rotor_temp"] }
    }
  }
};
