export enum DrivingStyle {
  ECO = "eco",
  NORMAL = "normal",
  AGGRESSIVE = "aggressive",
}

export interface EVClient {
  id: string;
  name: string;
  vehicleType: string;
  batteryCapKwh: number;
  routeName: string;
  iconType: string; // 'compact', 'truck', 'van', 'sedan'
  
  // Environment Characteristics
  avgSpeedKmh: number;
  ambientTempC: number;
  elevationChangeM: number; // Avg elevation gain per km
  drivingStyle: DrivingStyle;
  
  // Local Dataset Status
  dataPointsCount: number;
  localLoss: number;
  localR2: number;
  
  // Federated Learning weights/coefficients
  // Target equation: Wh/km = w0 (baseAux) + w1*speed + w2*speed^2 + w3*(temp-20)^2 + w4*elevation + w5*style
  localWeights: ModelWeights;
  
  // Status flags
  isParticipating: boolean;
  status: "idle" | "training" | "sending" | "updated";
}

export interface ModelWeights {
  w0: number; // auxiliary / base HVAC load (Wh/km)
  w1: number; // rolling friction coefficient (Wh/km per km/h)
  w2: number; // aerodynamic drag coefficient (Wh/km per (km/h)^2)
  w3: number; // temperature HVAC penalty (Wh/km per C dev from 20C)
  w4: number; // grade / potential energy coefficient (Wh/km per m gain)
  w5: number; // driving style aggressiveness penalty (Wh/km)
}

export interface SimulationConfig {
  learningRate: number;
  localEpochs: number;
  aggregationStrategy: "FedAvg" | "FedProx" | "FedMedian";
  differentialPrivacy: boolean;
  noiseMultiplier: number; // Epsilon parameter scaling
  clippingBound: number; // Max norm of updates
  nonIIDNess: number; // How distinct the local clients' driving patterns are
}

export interface SimulationMetrics {
  round: number;
  globalLoss: number;
  globalR2: number;
  privacySpentEpsilon: number;
  bytesSavedMb: number; // Federated learning saves network payload compared to centralized data transferring
  participantsCount: number;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  round: number;
  type: "info" | "success" | "warning" | "dp";
  message: string;
}

export interface TripPredictionInput {
  vehicleId: string;
  speedKmh: number;
  tempC: number;
  elevationGainM: number;
  drivingStyle: DrivingStyle;
}
