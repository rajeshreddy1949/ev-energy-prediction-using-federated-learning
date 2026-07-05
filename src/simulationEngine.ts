import { EVClient, ModelWeights, SimulationConfig, DrivingStyle, TripPredictionInput } from "./types";

// Physical constraints/configurations for vehicle categories
export const VEHICLE_PRESETS = {
  compact: {
    vehicleType: "Compact Hatchback",
    batteryCapKwh: 40,
    baseAux: 110, // Wh/km
    rolling: 0.18, // Wh/km per km/h
    drag: 0.007, // Wh/km per (km/h)^2
    tempAux: 1.0, // Wh/km per Celsius dev squared
    gravity: 1.9, // Wh/km per meter of gain
    styleFactor: 18, // Wh/km penalty
  },
  sedan: {
    vehicleType: "Performance Sedan",
    batteryCapKwh: 82,
    baseAux: 140,
    rolling: 0.32,
    drag: 0.009,
    tempAux: 1.2,
    gravity: 2.3,
    styleFactor: 35,
  },
  van: {
    vehicleType: "Delivery Cargo Van",
    batteryCapKwh: 65,
    baseAux: 175,
    rolling: 0.44,
    drag: 0.019,
    tempAux: 1.8,
    gravity: 3.4,
    styleFactor: 30,
  },
  truck: {
    vehicleType: "Full-size Pickup Truck",
    batteryCapKwh: 131,
    baseAux: 220,
    rolling: 0.58,
    drag: 0.022,
    tempAux: 2.3,
    gravity: 4.2,
    styleFactor: 45,
  }
};

export interface DataPoint {
  speed: number;
  temp: number;
  elevation: number;
  styleScore: number; // 0 for Eco, 1 for Normal, 2 for Aggressive
  actualWhPerKm: number;
}

// Initial Global Model weights - deliberately uncalibrated/initialized randomly or roughly
export const INITIAL_GLOBAL_WEIGHTS: ModelWeights = {
  w0: 80,
  w1: 0.1,
  w2: 0.002,
  w3: 0.4,
  w4: 1.0,
  w5: 10,
};

// Help generate standard clients reflecting diverse local locations (Non-IID driving data)
export const INITIAL_CLIENTS: EVClient[] = [
  {
    id: "ev-1",
    name: "Downtown Commuter",
    vehicleType: "Compact Hatchback",
    batteryCapKwh: 40,
    routeName: "Urban Grid",
    iconType: "compact",
    avgSpeedKmh: 35, // Low speed stop & go
    ambientTempC: 38, // Extremely hot summer (AC active)
    elevationChangeM: 2, // Flat route
    drivingStyle: DrivingStyle.ECO,
    dataPointsCount: 75,
    localLoss: 0,
    localR2: 0,
    localWeights: { ...INITIAL_GLOBAL_WEIGHTS },
    isParticipating: true,
    status: "idle",
  },
  {
    id: "ev-2",
    name: "Alpine Explorer",
    vehicleType: "Full-size Pickup Truck",
    batteryCapKwh: 131,
    routeName: "Mountain Pass",
    iconType: "truck",
    avgSpeedKmh: 55, // Moderate mountain speeds
    ambientTempC: -5, // Freezing winter (Cabin heater running)
    elevationChangeM: 38, // Extreme steep terrain
    drivingStyle: DrivingStyle.NORMAL,
    dataPointsCount: 110,
    localLoss: 0,
    localR2: 0,
    localWeights: { ...INITIAL_GLOBAL_WEIGHTS },
    isParticipating: true,
    status: "idle",
  },
  {
    id: "ev-3",
    name: "Interstate Courier",
    vehicleType: "Delivery Cargo Van",
    batteryCapKwh: 65,
    routeName: "I-90 Highway Linear",
    iconType: "van",
    avgSpeedKmh: 105, // Sustained high speed aerodynamics
    ambientTempC: 22, // Nice pleasant autumn
    elevationChangeM: 5, // Light rolling hills
    drivingStyle: DrivingStyle.AGGRESSIVE, // Delivery schedules
    dataPointsCount: 95,
    localLoss: 0,
    localR2: 0,
    localWeights: { ...INITIAL_GLOBAL_WEIGHTS },
    isParticipating: true,
    status: "idle",
  },
  {
    id: "ev-4",
    name: "Suburban Transit",
    vehicleType: "Performance Sedan",
    batteryCapKwh: 82,
    routeName: "Outer Ring Expressway",
    iconType: "sedan",
    avgSpeedKmh: 75, // Standard commuter speeds
    ambientTempC: 15, // Smooth spring weather
    elevationChangeM: 10, // Moderate climbs
    drivingStyle: DrivingStyle.NORMAL,
    dataPointsCount: 85,
    localLoss: 0,
    localR2: 0,
    localWeights: { ...INITIAL_GLOBAL_WEIGHTS },
    isParticipating: true,
    status: "idle",
  }
];

export const DEFAULT_CONFIG: SimulationConfig = {
  learningRate: 0.002,
  localEpochs: 4,
  aggregationStrategy: "FedAvg",
  differentialPrivacy: false,
  noiseMultiplier: 0.3,
  clippingBound: 15.0,
  nonIIDNess: 0.8, // 0 = clients get generic data, 1 = clients get hyper-localized data
};

// Physics generator for creating client driving logs
export function generateLocalTripData(client: EVClient, size: number, nonIIDNess: number): DataPoint[] {
  const data: DataPoint[] = [];
  const preset = VEHICLE_PRESETS[client.iconType as keyof typeof VEHICLE_PRESETS] || VEHICLE_PRESETS.sedan;

  for (let i = 0; i < size; i++) {
    // Determine input factors with variance around client traits
    // If nonIIDNess is high, clients are locked in their route properties
    // If nonIIDNess is low, we blend properties to make data more similar (IID)
    const speedBase = nonIIDNess * client.avgSpeedKmh + (1 - nonIIDNess) * 65;
    const tempBase = nonIIDNess * client.ambientTempC + (1 - nonIIDNess) * 20;
    const elevBase = nonIIDNess * client.elevationChangeM + (1 - nonIIDNess) * 10;
    
    // Add realistic local trip variance (e.g. accelerating, cold snap, uphill parts)
    const speed = Math.max(10, Math.min(130, speedBase + (Math.random() - 0.5) * 20));
    const temp = Math.max(-15, Math.min(45, tempBase + (Math.random() - 0.5) * 8));
    const elevation = Math.max(-20, elevationChangeFactor(elevBase) + (Math.random() - 0.5) * 12);
    
    // Style factor mapper
    let styleScore = 1; // Normal
    if (client.drivingStyle === DrivingStyle.ECO) styleScore = 0;
    if (client.drivingStyle === DrivingStyle.AGGRESSIVE) styleScore = 2;
    
    // Physical formulation: Energy consumed per km
    // Wh/km = Aux + (Rolling * Speed) + (Drag * Speed^2) + (TempAux * TempDeviation^2) + (Gravity * elevationGain) + (DrivingStyle * styleCoef)
    const tempDev = temp - 20; // optimal EV battery cell climate is usually around ~20 Celsius
    const actualEnergy = 
      preset.baseAux + 
      (preset.rolling * speed) + 
      (preset.drag * speed * speed) + 
      (preset.tempAux * tempDev * tempDev) + 
      (preset.gravity * Math.max(0, elevation)) + // gravitational work (regenerative braking isn't 100% efficient)
      (styleScore * preset.styleFactor) + 
      (Math.random() * 15 - 7.5); // Add random physical environment noise (wind resistance, battery degradation, etc.)

    data.push({
      speed,
      temp,
      elevation,
      styleScore,
      actualWhPerKm: Math.max(80, actualEnergy) // guarantee physical energy can't drop to 0 or negative
    });
  }
  return data;
}

function elevationChangeFactor(base: number) {
  return base + (Math.random() - 0.5) * 5;
}

// Compute the prediction based on given coefficients
export function predictEnergy(
  weights: ModelWeights,
  input: TripPredictionInput,
  presetType: string
): number {
  const preset = VEHICLE_PRESETS[presetType as keyof typeof VEHICLE_PRESETS] || VEHICLE_PRESETS.sedan;
  
  let styleScore = 1;
  if (input.drivingStyle === DrivingStyle.ECO) styleScore = 0;
  if (input.drivingStyle === DrivingStyle.AGGRESSIVE) styleScore = 2;

  const speed = input.speedKmh;
  const tempDev = input.tempC - 20;
  const elevation = input.elevationGainM;

  // The model utilizes the standard coefficients:
  const prediction = 
    weights.w0 + 
    (weights.w1 * speed) + 
    (weights.w2 * speed * speed) + 
    (weights.w3 * tempDev * tempDev) + 
    (weights.w4 * elevation) + 
    (weights.w5 * styleScore);

  return Math.max(80, prediction);
}

// Client Side training: executes Local Gradient Descent steps
export function trainLocalModel(
  globalWeights: ModelWeights,
  client: EVClient,
  config: SimulationConfig
): { weights: ModelWeights; loss: number; r2: number } {
  // 1. Generate local trip samples
  const dataset = generateLocalTripData(client, client.dataPointsCount, config.nonIIDNess);
  
  // 2. Local weights cloning
  let w = { ...globalWeights };
  const lr = config.learningRate;
  const epochs = config.localEpochs;
  const size = dataset.length;

  // Run Stochastic Gradient Descent
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < size; i++) {
      const dp = dataset[i];
      const speed = dp.speed;
      const speedSq = speed * speed;
      const tempDevSq = (dp.temp - 20) * (dp.temp - 20);
      const elev = dp.elevation;
      const style = dp.styleScore;

      // Predict with current weights
      const pred = w.w0 + (w.w1 * speed) + (w.w2 * speedSq) + (w.w3 * tempDevSq) + (w.w4 * elev) + (w.w5 * style);
      const error = pred - dp.actualWhPerKm;

      // Compute partial derivatives (MSE loss gradient)
      // dL/dw0 = 2 * error * 1
      // dL/dw1 = 2 * error * speed
      // dL/dw2 = 2 * error * speedSq
      // dL/dw3 = 2 * error * tempDevSq
      // dL/dw4 = 2 * error * elev
      // dL/dw5 = 2 * error * style
      
      // Update weights using SGD + learning rate scaling to prevent exploding values
      w.w0 -= lr * error * 1.0;
      w.w1 -= lr * error * (speed / 100); // normalized gradient features for stability
      w.w2 -= lr * error * (speedSq / 10000);
      w.w3 -= lr * error * (tempDevSq / 400);
      w.w4 -= lr * error * (elev / 20);
      w.w5 -= lr * error * style;
    }
  }

  // Calculate final local loss & performance metric R2
  let squaredErrorSum = 0;
  let observedMean = 0;
  dataset.forEach((d) => (observedMean += d.actualWhPerKm));
  observedMean /= size;

  let totalSumSquares = 0;
  dataset.forEach((d) => {
    const pred = w.w0 + (w.w1 * d.speed) + (w.w2 * d.speed * d.speed) + (w.w3 * (d.temp - 20) * (d.temp - 20)) + (w.w4 * d.elevation) + (w.w5 * d.styleScore);
    squaredErrorSum += Math.pow(pred - d.actualWhPerKm, 2);
    totalSumSquares += Math.pow(d.actualWhPerKm - observedMean, 2);
  });

  const loss = squaredErrorSum / size;
  const r2 = totalSumSquares > 0 ? 1 - (squaredErrorSum / totalSumSquares) : 0;

  // Enforce bounds to prevent physical absurdity during initial training steps
  w.w0 = Math.max(20, Math.min(300, w.w0));
  w.w1 = Math.max(0, Math.min(2.0, w.w1));
  w.w2 = Math.max(0, Math.min(0.08, w.w2));
  w.w3 = Math.max(0, Math.min(5.0, w.w3));
  w.w4 = Math.max(0, Math.min(10.0, w.w4));
  w.w5 = Math.max(0, Math.min(100.0, w.w5));

  // Carry out Differential Privacy (Secure Aggregation)
  if (config.differentialPrivacy) {
    // 1. Client-side update clipping (limit distance to global weights inside bounding radius)
    const diff = {
      dw0: w.w0 - globalWeights.w0,
      dw1: w.w1 - globalWeights.w1,
      dw2: w.w2 - globalWeights.w2,
      dw3: w.w3 - globalWeights.w3,
      dw4: w.w4 - globalWeights.w4,
      dw5: w.w5 - globalWeights.w5,
    };

    const norm = Math.sqrt(
      diff.dw0 * diff.dw0 +
      diff.dw1 * diff.dw1 * 100 + // scaled norm for matching parameters magnitude
      diff.dw2 * diff.dw2 * 10000 +
      diff.dw3 * diff.dw3 * 100 +
      diff.dw4 * diff.dw4 * 100 +
      diff.dw5 * diff.dw5 * 10
    );

    if (norm > config.clippingBound) {
      const scale = config.clippingBound / norm;
      w.w0 = globalWeights.w0 + diff.dw0 * scale;
      w.w1 = globalWeights.w1 + diff.dw1 * scale;
      w.w2 = globalWeights.w2 + diff.dw2 * scale;
      w.w3 = globalWeights.w3 * scale * diff.dw3; // clipped
      w.w4 = globalWeights.w4 + diff.dw4 * scale;
      w.w5 = globalWeights.w5 + diff.dw5 * scale;
    }

    // 2. Gradient perturbation: Add Gaussian/Noise mechanism matching scaling factors
    const noiseScale = config.noiseMultiplier;
    w.w0 += randn() * noiseScale * 8.0;
    w.w1 += randn() * noiseScale * 0.05;
    w.w2 += randn() * noiseScale * 0.0005;
    w.w3 += randn() * noiseScale * 0.08;
    w.w4 += randn() * noiseScale * 0.12;
    w.w5 += randn() * noiseScale * 1.5;
  }

  return { weights: w, loss, r2 };
}

// Simple Box-Muller transform for standard normal distribution N(0, 1)
function randn() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); 
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Federated Aggregation Server logic
export function aggregateWeights(
  clients: EVClient[],
  currentGlobalWeights: ModelWeights,
  strategy: "FedAvg" | "FedProx" | "FedMedian"
): ModelWeights {
  const activeClients = clients.filter(c => c.isParticipating);
  if (activeClients.length === 0) return { ...currentGlobalWeights };

  const totalPoints = activeClients.reduce((sum, c) => sum + c.dataPointsCount, 0);

  if (strategy === "FedMedian") {
    // Collect weights to select median
    const w0s = activeClients.map(c => c.localWeights.w0).sort((a,b) => a-b);
    const w1s = activeClients.map(c => c.localWeights.w1).sort((a,b) => a-b);
    const w2s = activeClients.map(c => c.localWeights.w2).sort((a,b) => a-b);
    const w3s = activeClients.map(c => c.localWeights.w3).sort((a,b) => a-b);
    const w4s = activeClients.map(c => c.localWeights.w4).sort((a,b) => a-b);
    const w5s = activeClients.map(c => c.localWeights.w5).sort((a,b) => a-b);

    const mid = Math.floor(activeClients.length / 2);
    
    return {
      w0: w0s[mid],
      w1: w1s[mid],
      w2: w2s[mid],
      w3: w3s[mid],
      w4: w4s[mid],
      w5: w5s[mid],
    };
  }

  // Default: FedAvg and FedProx (conceptually, FedProx updates are computed locally with proximal regularization helper).
  // Weight averaging weighted by client dataset size
  let w0 = 0, w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0;
  
  activeClients.forEach((client) => {
    const fraction = client.dataPointsCount / totalPoints;
    w0 += client.localWeights.w0 * fraction;
    w1 += client.localWeights.w1 * fraction;
    w2 += client.localWeights.w2 * fraction;
    w3 += client.localWeights.w3 * fraction;
    w4 += client.localWeights.w4 * fraction;
    w5 += client.localWeights.w5 * fraction;
  });

  return { w0, w1, w2, w3, w4, w5 };
}

// Compute standard differential privacy privacy budget tracking bounds (Renyi / Advanced Composition approximation)
export function calculateEpsilon(round: number, noiseMultiplier: number): number {
  if (noiseMultiplier === 0 || round === 0) return 0;
  // Dynamic scaling representing composite noise leakage over rounds
  return parseFloat((2.5 * Math.sqrt(round) / noiseMultiplier).toFixed(2));
}
