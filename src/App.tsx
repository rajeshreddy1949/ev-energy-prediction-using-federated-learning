import React, { useState, useEffect, useRef } from "react";
import { 
  EVClient, 
  ModelWeights, 
  SimulationConfig, 
  SimulationLog, 
  SimulationMetrics, 
  DrivingStyle, 
  TripPredictionInput 
} from "./types";
import { 
  INITIAL_CLIENTS, 
  INITIAL_GLOBAL_WEIGHTS, 
  DEFAULT_CONFIG, 
  trainLocalModel, 
  aggregateWeights, 
  calculateEpsilon, 
  predictEnergy, 
  VEHICLE_PRESETS 
} from "./simulationEngine";
import NetworkVisualization from "./components/NetworkVisualization";
import ClientInspector from "./components/ClientInspector";
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  ShieldAlert, 
  HelpCircle, 
  Send, 
  BookOpen, 
  Layers, 
  Brain, 
  Info,
  Sliders,
  TrendingUp,
  Signal,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity
} from "lucide-react";

export default function App() {
  // --- STATE ---
  const [clients, setClients] = useState<EVClient[]>(() => {
    // Make a deep clone of the initial clients so we can edit
    return JSON.parse(JSON.stringify(INITIAL_CLIENTS));
  });
  const [globalWeights, setGlobalWeights] = useState<ModelWeights>({ ...INITIAL_GLOBAL_WEIGHTS });
  const [prevGlobalWeights, setPrevGlobalWeights] = useState<ModelWeights>({ ...INITIAL_GLOBAL_WEIGHTS });
  const [config, setConfig] = useState<SimulationConfig>({ ...DEFAULT_CONFIG });
  
  const [round, setRound] = useState<number>(0);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("ev-1");
  
  const [metricsHistory, setMetricsHistory] = useState<SimulationMetrics[]>([
    {
      round: 0,
      globalLoss: 5542.0, // High starting error before alignment
      globalR2: -1.25, // Terrible negative starting fit before alignment
      privacySpentEpsilon: 0,
      bytesSavedMb: 0,
      participantsCount: 4,
    }
  ]);

  const [logs, setLogs] = useState<SimulationLog[]>([
    {
      id: "log-initial",
      timestamp: new Date().toLocaleTimeString(),
      round: 0,
      type: "info",
      message: "Decentralized Federated Network registered. 4 simulated edge clients configured.",
    },
    {
      id: "log-weights",
      timestamp: new Date().toLocaleTimeString(),
      round: 0,
      type: "warning",
      message: "Initial Global Model initialized with uncalibrated parameters. Prediction error is high.",
    }
  ]);

  // Real-time trip predictor states
  const [playgroundVehicle, setPlaygroundVehicle] = useState<string>("sedan");
  const [playgroundSpeed, setPlaygroundSpeed] = useState<number>(75);
  const [playgroundTemp, setPlaygroundTemp] = useState<number>(12);
  const [playgroundElevation, setPlaygroundElevation] = useState<number>(15);
  const [playgroundStyle, setPlaygroundStyle] = useState<DrivingStyle>(DrivingStyle.NORMAL);

  // Gemini expert integrations state
  const [aiInput, setAiInput] = useState<string>("");
  const [aiOutput, setAiOutput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Auto-query clean advice on start
  useEffect(() => {
    getAIExpertAdvice("What are the advantages of Federated Learning for energy prediction?");
  }, []);

  // --- ACTIONS ---

  const handleUpdateClient = (updatedClient: EVClient) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    addLog("info", `Re-simulated synthetic telemetry profiles for client '${updatedClient.name}' based on physical factors.`);
  };

  const addLog = (type: "info" | "success" | "warning" | "dp", message: string, roundNum = round) => {
    const newLog: SimulationLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      round: roundNum,
      type,
      message,
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleReset = () => {
    setClients(JSON.parse(JSON.stringify(INITIAL_CLIENTS)));
    setGlobalWeights({ ...INITIAL_GLOBAL_WEIGHTS });
    setPrevGlobalWeights({ ...INITIAL_GLOBAL_WEIGHTS });
    setRound(0);
    setIsTraining(false);
    setMetricsHistory([
      {
        round: 0,
        globalLoss: 5542.0,
        globalR2: -1.25,
        privacySpentEpsilon: 0,
        bytesSavedMb: 0,
        participantsCount: 4,
      }
    ]);
    setLogs([
      {
        id: `log-reset-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        round: 0,
        type: "info",
        message: "Simulation state reset. Global weights restored to random uncalibrated physics coefficients.",
      }
    ]);
  };

  // Run 1 Single Round of FL
  const handleTrainOneRound = async () => {
    if (isTraining) return;
    setIsTraining(true);
    const nextRound = round + 1;
    addLog("info", `Initiating Federated Learning Round ${nextRound}...`, nextRound);

    // 1. Mark active participating clients as "training"
    setClients(prev => prev.map(c => c.isParticipating ? { ...c, status: "training" } : c));
    await sleep(700);

    // 2. Perform on-device local training for participating nodes
    const activeClientsList = clients.filter(c => c.isParticipating);
    if (activeClientsList.length === 0) {
      addLog("warning", "No participating edge clients enabled. Aggregated server cancelled.", nextRound);
      setIsTraining(false);
      return;
    }

    const trainedClients = clients.map((client) => {
      if (!client.isParticipating) return client;
      
      const { weights, loss, r2 } = trainLocalModel(globalWeights, client, config);
      return {
        ...client,
        localWeights: weights,
        localLoss: loss,
        localR2: r2,
        status: "sending" as const
      };
    });

    setClients(trainedClients);
    addLog("info", `On-device micro-epochs completed. Uploading updated parameters θ directly via cryptographic sockets.`, nextRound);
    await sleep(800);

    // 3. SECURE AGGREGATION on the Central Server
    const nextGlobalWeights = aggregateWeights(trainedClients, globalWeights, config.aggregationStrategy);
    setPrevGlobalWeights(globalWeights);
    setGlobalWeights(nextGlobalWeights);

    // Update clients status to updated
    setClients(prev => prev.map(c => c.isParticipating ? { ...c, status: "updated" } : c));

    // 4. Calculate composite scoring metrics
    // Calculate global loss & R^2 using weighted metrics of participating nodes
    const activeTrained = trainedClients.filter(c => c.isParticipating);
    const totalDataCount = activeTrained.reduce((sum, c) => sum + c.dataPointsCount, 0);
    
    let avgLoss = 0;
    let avgR2 = 0;
    activeTrained.forEach((c) => {
      const weight = c.dataPointsCount / totalDataCount;
      avgLoss += c.localLoss * weight;
      avgR2 += c.localR2 * weight;
    });

    // Compute differential privacy budget leakage
    const epsilonAccumulated = config.differentialPrivacy 
      ? calculateEpsilon(nextRound, config.noiseMultiplier)
      : Infinity;

    // Bytes transferred calculation:
    // A standard centralized system uploads high frequency logs (Speed GPS Temp at 10Hz) over 3 trips:
    // ~120 bytes per record. Over hundreds of trips, telemetry grows to Gigabytes.
    // In Federated learning we send 6 floats (48 bytes) per client per round!
    // We compute savings compared to full telemetry streaming:
    const prevMetrics = metricsHistory[metricsHistory.length - 1] || { bytesSavedMb: 0 };
    const savedInThisRoundMb = parseFloat((totalDataCount * 0.12 - activeTrained.length * 0.000048).toFixed(4));
    const cumulativeBytesSaved = parseFloat((prevMetrics.bytesSavedMb + savedInThisRoundMb).toFixed(2));

    const roundMetrics: SimulationMetrics = {
      round: nextRound,
      globalLoss: avgLoss,
      globalR2: Math.max(-2, avgR2),
      privacySpentEpsilon: epsilonAccumulated,
      bytesSavedMb: cumulativeBytesSaved,
      participantsCount: activeTrained.length,
    };

    setMetricsHistory(prev => [...prev, roundMetrics]);
    setRound(nextRound);

    addLog("success", `Secure Parameter Aggregation complete. Computed average MSE loss: ${avgLoss.toFixed(1)}, Global R² accuracy: ${avgR2.toFixed(4)}.`, nextRound);

    if (config.differentialPrivacy) {
      addLog("dp", `Differential Privacy noise addition completed. Epsilon budget expended: ε = ${epsilonAccumulated.toFixed(2)}. Guarding membership exposure!`, nextRound);
    }

    setIsTraining(false);
  };

  // Run 10 Consecutive Rounds
  const handleTrainTenRounds = async () => {
    if (isTraining) return;
    setIsTraining(true);
    addLog("info", "Starting accelerated pipeline: training 5 continuous rounds natively...");

    let tempGlobalWeights = { ...globalWeights };
    let currentRound = round;
    let tempHistory = [...metricsHistory];
    
    for (let loop = 1; loop <= 5; loop++) {
      const nextRound = currentRound + loop;
      
      // Perform local updates in sequence
      const trained = clients.map((client) => {
        if (!client.isParticipating) return client;
        const { weights, loss, r2 } = trainLocalModel(tempGlobalWeights, client, config);
        return {
          ...client,
          localWeights: weights,
          localLoss: loss,
          localR2: r2,
          status: "updated" as const
        };
      });

      // Secure Aggregator updates weights
      tempGlobalWeights = aggregateWeights(trained, tempGlobalWeights, config.aggregationStrategy);
      
      // Calculate evaluation metric averages
      const activeTrained = trained.filter(c => c.isParticipating);
      const totalDataCount = activeTrained.reduce((sum, c) => sum + c.dataPointsCount, 0);
      
      let avgLoss = 0;
      let avgR2 = 0;
      activeTrained.forEach((c) => {
        const weight = c.dataPointsCount / totalDataCount;
        avgLoss += c.localLoss * weight;
        avgR2 += c.localR2 * weight;
      });

      const epsilon = config.differentialPrivacy
        ? calculateEpsilon(nextRound, config.noiseMultiplier)
        : Infinity;

      const prevSaved = tempHistory[tempHistory.length - 1]?.bytesSavedMb || 0;
      const roundSavings = parseFloat((totalDataCount * 0.12 - activeTrained.length * 0.000048).toFixed(4));
      
      tempHistory.push({
        round: nextRound,
        globalLoss: avgLoss,
        globalR2: Math.max(-2, avgR2),
        privacySpentEpsilon: epsilon,
        bytesSavedMb: parseFloat((prevSaved + roundSavings).toFixed(2)),
        participantsCount: activeTrained.length,
      });

      // Update clients representation
      setClients(trained);
    }

    setMetricsHistory(tempHistory);
    setGlobalWeights(tempGlobalWeights);
    setRound(currentRound + 5);
    addLog("success", `Accelerated pipeline complete. Trained 5 rounds. Current R²: ${tempHistory[tempHistory.length - 1].globalR2.toFixed(3)}.`);
    setIsTraining(false);
  };

  // Chat with the Gemini AI Expert
  const getAIExpertAdvice = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiInput;
    if (!promptToSend.trim()) return;

    setAiLoading(true);
    if (!customPrompt) setAiInput("");

    try {
      const metricsContext = {
        round,
        currentGlobalWeights: globalWeights,
        config,
        activeClients: clients.filter(c => c.isParticipating).length,
        metricsHistory: metricsHistory.slice(-5), // Send last 5 points
      };

      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          context: metricsContext
        })
      });

      const data = await res.json();
      if (data.error) {
        setAiOutput(`Advisor encountered an error: ${data.error}`);
      } else {
        setAiOutput(data.response);
      }
    } catch (e: any) {
      console.error(e);
      setAiOutput("Failed to communicate with FedCharge AI Advisor. Verify your dev server is active or check environment configurations.");
    } finally {
      setAiLoading(false);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- TRIPS CALCULATOR ENGINE ---
  const selectedPreset = VEHICLE_PRESETS[playgroundVehicle as keyof typeof VEHICLE_PRESETS] || VEHICLE_PRESETS.sedan;
  
  // Real prediction model with current global parameters
  const predictionWhKm = predictEnergy(globalWeights, {
    vehicleId: playgroundVehicle,
    speedKmh: playgroundSpeed,
    tempC: playgroundTemp,
    elevationGainM: playgroundElevation,
    drivingStyle: playgroundStyle,
  }, playgroundVehicle);

  // GROUND TRUTH PHYSICAL VALUE: Using the vehicle presets physical constants directly!
  // This validates model convergence.
  const idealWeights: ModelWeights = {
    w0: selectedPreset.baseAux,
    w1: selectedPreset.rolling,
    w2: selectedPreset.drag,
    w3: selectedPreset.tempAux,
    w4: selectedPreset.gravity,
    w5: selectedPreset.styleFactor,
  };
  const groundTruthEnergy = predictEnergy(idealWeights, {
    vehicleId: playgroundVehicle,
    speedKmh: playgroundSpeed,
    tempC: playgroundTemp,
    elevationGainM: playgroundElevation,
    drivingStyle: playgroundStyle,
  }, playgroundVehicle);

  const modelAccuracyPct = groundTruthEnergy > 0 
    ? Math.max(0, Math.min(100, 100 - (Math.abs(predictionWhKm - groundTruthEnergy) / groundTruthEnergy) * 100))
    : 0;

  // Running total calculation
  const totalTripEnergyKwh = (predictionWhKm * 150) / 1000; // Sample trip of 150 km
  const chargesNeeded = Math.ceil(totalTripEnergyKwh / selectedPreset.batteryCapKwh);
  const estimatedMaxRangeRange = predictionWhKm > 0 
    ? parseFloat((selectedPreset.batteryCapKwh * 1000 / predictionWhKm).toFixed(0))
    : 0;

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A] font-sans antialiased relative selection:bg-[#1A1A1A] selection:text-[#F9F7F2]">
      {/* Background Accent Element */}
      <div className="absolute -top-32 -right-32 w-[550px] h-[550px] border-[50px] border-[#E8E4D8]/30 rounded-full opacity-60 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] border-[30px] border-[#E8E4D8]/20 rounded-full opacity-40 pointer-events-none" />

      {/* Decorative Stamp Tag */}
      <div className="absolute top-6 right-6 hidden md:flex flex-col items-end opacity-20 hover:opacity-90 transition-opacity pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono leading-none border-b border-[#1A1A1A] pb-1">
          LAB ARCHIVAL REPORT
        </span>
        <span className="text-[9px] font-mono leading-tight mt-1 font-bold">
          REF: ML-FEDERATED-EV-V1
        </span>
      </div>

      <div className="max-w-[1300px] mx-auto p-4 md:p-8 xl:p-10 relative z-10">
        
        {/* ================= HEADER SECTION ================= */}
        <header className="border-b-4 border-[#1A1A1A] pb-8 mb-8 relative">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="md:w-3/4">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.85] tracking-tighter uppercase mb-4 text-[#1A1A1A]">
                EV Energy<br className="hidden sm:inline" /> Consumption Prediction
              </h1>
              <div className="flex flex-wrap gap-2.5 items-center mt-6">
                <span className="bg-[#1A1A1A] text-[#F9F7F2] px-3.5 py-1 text-xs font-black uppercase tracking-wider">
                  FEDERATED LEARNING ARCHITECTURE
                </span>
                <span className="border border-[#1A1A1A] px-3 py-1 text-[11px] font-bold uppercase tracking-widest bg-[#E8E4D8]/30">
                  DECENTRALIZED WORKFLOW SIMULATOR
                </span>
                <span className="border-2 border-dashed border-[#1A1A1A]/50 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/80">
                  SECURE MEMBERSHIP PRIVACY
                </span>
              </div>
            </div>
            <div className="md:w-1/3 md:text-right flex flex-col md:justify-between h-full pt-1">
              <p className="text-xs sm:text-sm font-bold leading-relaxed text-[#1A1A1A] italic opacity-85 uppercase tracking-wide md:max-w-xs ml-auto">
                "Preserving mobility telemetry privacy while scaling localized consumption estimators."
              </p>
              <div className="mt-8 border-t border-[#1A1A1A]/30 pt-3 text-[10px] font-mono text-[#1A1A1A]/60 flex justify-start md:justify-end gap-3 font-semibold">
                <span>ESTABLISHED: 2026</span>
                <span>STATUS: STABLE-RUNNING</span>
              </div>
            </div>
          </div>
        </header>

        {/* ================= TELEMETRY SCOREBOARD ROW ================= */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          
          <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#1A1A1A] h-28 transform transition-transform hover:-translate-y-0.5">
            <div className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A]/60 leading-none">
              Federated Rounds
            </div>
            <div className="text-4xl font-black font-sans my-1 leading-none text-[#1A1A1A]">
              {round}
            </div>
            <div className="text-[9px] font-mono font-bold leading-none uppercase tracking-wide text-sky-800">
              {round === 0 ? "INIT STATE" : "PARAMETER CONVERGENCE"}
            </div>
          </div>

          <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#1A1A1A] h-28 transform transition-transform hover:-translate-y-0.5">
            <div className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A]/60 leading-none">
              Client Average Loss
            </div>
            <div className="text-4xl font-black font-sans my-1 leading-none text-[#1A1A1A]">
              {metricsHistory[metricsHistory.length - 1]?.globalLoss.toFixed(1)}
            </div>
            <div className="text-[9px] font-mono font-bold leading-none uppercase tracking-wide text-amber-800">
              {round === 0 ? "No updates yet" : `MSE Loss (Down ${(5542.0 - metricsHistory[metricsHistory.length-1].globalLoss > 0 ? ((5542.0 - metricsHistory[metricsHistory.length-1].globalLoss)/5542.0 * 100) : 0).toFixed(0)}%)`}
            </div>
          </div>

          <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#1A1A1A] h-28 transform transition-transform hover:-translate-y-0.5">
            <div className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A]/60 leading-none">
              Global R² Fit
            </div>
            <div className="text-4xl font-black font-sans my-1 leading-none text-[#1A1A1A]">
              {metricsHistory[metricsHistory.length - 1]?.globalR2 < 0 ? "---" : metricsHistory[metricsHistory.length - 1]?.globalR2.toFixed(3)}
            </div>
            <div className="text-[9px] font-mono font-bold leading-none uppercase tracking-wide text-emerald-800">
              {metricsHistory[metricsHistory.length - 1]?.globalR2 < 0 ? "Awaiting training" : `PROPORTION METRIC: ${(metricsHistory[metricsHistory.length-1].globalR2 * 100).toFixed(1)}%`}
            </div>
          </div>

          <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#1A1A1A] h-28 transform transition-transform hover:-translate-y-0.5">
            <div className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A]/60 leading-none">
              Privacy Epsilon (ε)
            </div>
            <div className="text-4xl font-black font-sans my-1 leading-none text-[#1A1A1A] truncate">
              {config.differentialPrivacy ? `${metricsHistory[metricsHistory.length - 1]?.privacySpentEpsilon.toFixed(2)}` : "None"}
            </div>
            <div className="text-[9px] font-mono font-bold leading-none uppercase tracking-wide text-purple-800">
              {config.differentialPrivacy ? "DP Active (Gaussian)" : "No Privacy leakage bounds"}
            </div>
          </div>

          <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#1A1A1A] col-span-2 md:col-span-1 h-28 transform transition-transform hover:-translate-y-0.5">
            <div className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A]/60 leading-none">
              Bandwidth Saved
            </div>
            <div className="text-4xl font-black font-sans my-1 leading-none text-[#1A1A1A]">
              {metricsHistory[metricsHistory.length - 1]?.bytesSavedMb} <span className="text-sm font-medium">MB</span>
            </div>
            <div className="text-[9px] font-mono font-bold leading-none uppercase tracking-wide text-rose-800">
              {round === 0 ? "0 Saved" : `Trained strictly on-edge`}
            </div>
          </div>

        </section>

        {/* ================= PRIMARY GRID (TOPOLOGY & CLIENT PROFILERS) ================= */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* Left Block: Topology Connection Graph + Training Settings Config */}
          <div className="flex flex-col gap-8">
            <NetworkVisualization 
              clients={clients}
              globalWeights={globalWeights}
              isTraining={isTraining}
              round={round}
              selectedClientId={selectedClientId}
              onSelectClient={(id) => setSelectedClientId(id)}
            />

            {/* FL Controls Center */}
            <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_#1A1A1A] relative">
              <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#1A1A1A]/30" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#1A1A1A]/30" />
              
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1A1A1A]" />
                Federated Parameter Regulations
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                {/* Agg Strategy */}
                <div>
                  <label className="block text-[10px] mb-1 opacity-70">Aggregation Alg:</label>
                  <select
                    value={config.aggregationStrategy}
                    onChange={(e) => setConfig(prev => ({ ...prev, aggregationStrategy: e.target.value as any }))}
                    className="w-full bg-[#E8E4D8]/30 border-2 border-[#1A1A1A] px-2 py-1.5 font-mono text-xs focus:outline-none focus:bg-[#E8E4D8] cursor-pointer"
                  >
                    <option value="FedAvg">FedAvg (Standard Averaging)</option>
                    <option value="FedProx">FedProx (Aggressive Regularization)</option>
                    <option value="FedMedian">FedMedian (High-Noise Robust)</option>
                  </select>
                </div>

                {/* Local Epochs */}
                <div>
                  <label className="block text-[10px] mb-1 opacity-70">Epochs per round ({config.localEpochs}):</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.localEpochs}
                    onChange={(e) => setConfig(prev => ({ ...prev, localEpochs: parseInt(e.target.value) }))}
                    className="w-full accent-[#1A1A1A] cursor-pointer"
                  />
                </div>

                {/* Local Learing Rate */}
                <div>
                  <label className="block text-[10px] mb-1 opacity-70">Local Learn Rate ({config.learningRate}):</label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.010"
                    step="0.001"
                    value={config.learningRate}
                    onChange={(e) => setConfig(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                    className="w-full accent-[#1A1A1A] cursor-pointer"
                  />
                </div>
              </div>

              {/* Privacy protection panel */}
              <div className="bg-[#E8E4D8]/20 border border-[#1A1A1A] p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="privacy-toggle"
                    checked={config.differentialPrivacy}
                    onChange={(e) => setConfig(prev => ({ ...prev, differentialPrivacy: e.target.checked }))}
                    className="w-4 h-4 accent-[#1A1A1A] cursor-pointer"
                  />
                  <label htmlFor="privacy-toggle" className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] cursor-pointer">
                    Enable Differential Privacy
                  </label>
                </div>

                {config.differentialPrivacy && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider">
                      <label className="block text-[9px] opacity-70 mb-1">Noise Scale G(0, σ²): {config.noiseMultiplier}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.5"
                        step="0.1"
                        value={config.noiseMultiplier}
                        onChange={(e) => setConfig(prev => ({ ...prev, noiseMultiplier: parseFloat(e.target.value) }))}
                        className="w-full accent-[#1A1A1A] cursor-pointer"
                      />
                    </div>

                    <div className="text-xs font-bold uppercase tracking-wider">
                      <label className="block text-[9px] opacity-70 mb-1">Clipped L2 Norm Bound: {config.clippingBound}</label>
                      <input
                        type="range"
                        min="5.0"
                        max="30.0"
                        step="1.0"
                        value={config.clippingBound}
                        onChange={(e) => setConfig(prev => ({ ...prev, clippingBound: parseFloat(e.target.value) }))}
                        className="w-full accent-[#1A1A1A] cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Simulation Operation Suite Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleTrainOneRound}
                  disabled={isTraining}
                  className="flex-1 bg-[#1A1A1A] text-[#F9F7F2] font-black uppercase tracking-wider text-xs py-3 rounded-none outline-none transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute 1 Round</span>
                </button>
                
                <button
                  onClick={handleTrainTenRounds}
                  disabled={isTraining}
                  className="flex-1 bg-[#E8E4D8]/45 border-2 border-[#1A1A1A] text-[#1A1A1A] font-black uppercase tracking-wider text-xs py-3 rounded-none outline-none transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Train 5 Rounds Accelerated</span>
                </button>
                
                <button
                  onClick={handleReset}
                  className="bg-transparent border border-red-650 hover:bg-red-50 text-red-700 font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Model</span>
                </button>
              </div>

            </div>
          </div>

          {/* Right Block: On-Device Client Profiler */}
          <div className="h-full">
            <ClientInspector 
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={(id) => setSelectedClientId(id)}
              onUpdateClient={handleUpdateClient}
            />
          </div>

        </section>

        {/* ================= SECONDARY ROW (LOGS, STATIC PLOTS, PREDICTOR PLAYGROUND) ================= */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* Charts & Interactive Simulator */}
          <div className="flex flex-col gap-8">
            
            {/* Visual Model Convergence Plots */}
            <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_#1A1A1A] relative">
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1A1A1A]" />
                TRAINING CONVERGENCE DIAGRAMS (SECURE EVALUATION)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Loss & R2 Plot */}
                <div className="flex flex-col justify-between">
                  <div className="text-xs uppercase font-bold tracking-wider mb-2 text-[#1A1A1A]">
                    Global MSE Residual Error Progression:
                  </div>
                  
                  {/* Custom beautiful SVG Line Plot */}
                  <div className="h-44 bg-[#E8E4D8]/20 border border-[#1A1A1A] relative p-1">
                    {metricsHistory.length < 2 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/50">
                        Pending convergence updates...
                      </div>
                    ) : (
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Grids */}
                        <line x1="0" y1="20" x2="100" y2="20" stroke="#1A1A1A" strokeWidth="0.1" strokeDasharray="2,2" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#1A1A1A" strokeWidth="0.1" strokeDasharray="2,2" />
                        <line x1="0" y1="80" x2="100" y2="80" stroke="#1A1A1A" strokeWidth="0.1" strokeDasharray="2,2" />
                        
                        {/* Line calculation */}
                        {(() => {
                          const maxRound = Math.max(...metricsHistory.map(h => h.round));
                          const points = metricsHistory.map((h) => {
                            const x = maxRound > 0 ? (h.round / maxRound) * 100 : 0;
                            // Scale loss from 0 to 5600 -> inverted so smaller error is higher or standard math
                            const y = 90 - (h.globalLoss / 5600) * 80;
                            return `${x},${y}`;
                          }).join(" ");

                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="#1A1A1A"
                                strokeWidth="2"
                                points={points}
                              />
                              {metricsHistory.map((h, i) => {
                                const x = maxRound > 0 ? (h.round / maxRound) * 100 : 0;
                                const y = 90 - (h.globalLoss / 5600) * 80;
                                return (
                                  <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="2.5"
                                    fill="#1A1A1A"
                                    stroke="#F9F7F2"
                                    strokeWidth="0.5"
                                  />
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 text-[8px] font-mono font-bold uppercase bg-[#F9F7F2] border border-[#1A1A1A] px-1.5 py-0.5">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full self-center" />
                      <span>MSE Loss Progress</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono uppercase font-bold mt-1 text-[#1A1A1A]/70">
                    <span>Round 0 (Rand Init)</span>
                    <span>Round {round}</span>
                  </div>
                </div>

                {/* 2. Model Accuracy Match Plot */}
                <div className="flex flex-col justify-between">
                  <div className="text-xs uppercase font-bold tracking-wider mb-2 text-[#1A1A1A]">
                    Global Fit Convergence Match (R² score):
                  </div>
                  
                  {/* Custom beautiful SVG Area Plot */}
                  <div className="h-44 bg-[#E8E4D8]/20 border border-[#1A1A1A] relative p-1">
                    {metricsHistory.length < 2 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/50">
                        Awaiting global aggregates...
                      </div>
                    ) : (
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Grids */}
                        <line x1="0" y1="10" x2="100" y2="10" stroke="#1A1A1A" strokeWidth="0.1" strokeDasharray="2,2" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#1A1A1A" strokeWidth="0.1" strokeDasharray="2,2" />
                        <line x1="0" y1="90" x2="100" y2="90" stroke="#1A1A1A" strokeWidth="0.1" strokeDasharray="2,2" />
                        
                        {/* Line calculation */}
                        {(() => {
                          const maxRound = Math.max(...metricsHistory.map(h => h.round));
                          // Map R2 from -1 to 1 into y [10, 90]
                          const points = metricsHistory.map((h) => {
                            const x = maxRound > 0 ? (h.round / maxRound) * 100 : 0;
                            const clampedR2 = Math.max(-0.5, Math.min(1.0, h.globalR2));
                            const y = 90 - ((clampedR2 + 0.5) / 1.5) * 80;
                            return `${x},${y}`;
                          });

                          const completeAreaPoints = `0,90 ${points.join(" ")} 100,90`;

                          return (
                            <>
                              <polygon
                                fill="#1A1A1A"
                                fillOpacity="0.1"
                                points={completeAreaPoints}
                              />
                              <polyline
                                fill="none"
                                stroke="#1A1A1A"
                                strokeWidth="2"
                                points={points.join(" ")}
                              />
                              {metricsHistory.map((h, i) => {
                                const x = maxRound > 0 ? (h.round / maxRound) * 100 : 0;
                                const clampedR2 = Math.max(-0.5, Math.min(1.0, h.globalR2));
                                const y = 90 - ((clampedR2 + 0.5) / 1.5) * 80;
                                return (
                                  <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="2.5"
                                    fill="#F9F7F2"
                                    stroke="#1A1A1A"
                                    strokeWidth="1.5"
                                  />
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 text-[8px] font-mono font-bold uppercase bg-[#F9F7F2] border border-[#1A1A1A] px-1.5 py-0.5">
                      <span className="w-1.5 h-1.5 bg-[#E8E4D8] border border-[#1A1A1A] rounded-full self-center" />
                      <span>R² Fit Score</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono uppercase font-bold mt-1 text-[#1A1A1A]/70">
                    <span>Round 0 (Terrible)</span>
                    <span>Round {round} ({roundMetricsDescription(metricsHistory[metricsHistory.length-1]?.globalR2)})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated EV Trip Predictor Playground */}
            <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_#1A1A1A] relative">
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#1A1A1A]" />
                Trip Predictor Validation (Testing Global model vs Physics baseline)
              </h2>

              <p className="text-xs text-[#1A1A1A]/85 mb-5 leading-relaxed font-semibold">
                ℹ️ Test the accuracy of the current aggregated Global Weights under virtual trips. As you run more rounds of federated aggregation, the prediction will align closer to physical Ground Truth!
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]/90">
                {/* Car type */}
                <div>
                  <label className="block mb-1 font-mono">Vehicle Preset:</label>
                  <select
                    value={playgroundVehicle}
                    onChange={(e) => setPlaygroundVehicle(e.target.value)}
                    className="w-full bg-[#E8E4D8]/20 border border-[#1A1A1A] px-1.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="compact">Compact Hatch (Pres: 40 kWh)</option>
                    <option value="sedan">Sport Sedan (Pres: 82 kWh)</option>
                    <option value="van">Delivery Van (Pres: 65 kWh)</option>
                    <option value="truck">Pickup Truck (Pres: 131 kWh)</option>
                  </select>
                </div>

                {/* Speed */}
                <div>
                  <label className="block mb-1 font-mono">Speed: {playgroundSpeed} kph</label>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    value={playgroundSpeed}
                    onChange={(e) => setPlaygroundSpeed(parseInt(e.target.value))}
                    className="w-full accent-[#1A1A1A] cursor-pointer"
                  />
                </div>

                {/* Temp */}
                <div>
                  <label className="block mb-1 font-mono">Temp: {playgroundTemp}°C</label>
                  <input
                    type="range"
                    min="-10"
                    max="40"
                    value={playgroundTemp}
                    onChange={(e) => setPlaygroundTemp(parseInt(e.target.value))}
                    className="w-full accent-[#1A1A1A] cursor-pointer"
                  />
                </div>

                {/* Grade */}
                <div>
                  <label className="block mb-1 font-mono">Grade Gain: {playgroundElevation} m/km</label>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={playgroundElevation}
                    onChange={(e) => setPlaygroundElevation(parseInt(e.target.value))}
                    className="w-full accent-[#1A1A1A] cursor-pointer"
                  />
                </div>
              </div>

              {/* Outcomes comparisons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#1A1A1A] pt-4 items-center">
                
                {/* Predictions side by side */}
                <div className="bg-[#E8E4D8]/30 border border-[#1A1A1A] p-3 text-center">
                  <div className="text-[9px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1">
                    Global Federated Estimate
                  </div>
                  <div className="text-2xl font-black text-[#1A1A1A]">
                    {predictionWhKm.toFixed(0)} <span className="text-xs">Wh/km</span>
                  </div>
                  <span className="text-[8px] font-mono font-black opacity-60">
                    BASED ON θ WEIGHTS
                  </span>
                </div>

                <div className="bg-[#E8E4D8]/35 border border-[#1A1A1A] p-3 text-center">
                  <div className="text-[9px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1">
                    Physical Ground Truth Base
                  </div>
                  <div className="text-2xl font-black text-[#1A1A1A]">
                    {groundTruthEnergy.toFixed(0)} <span className="text-xs">Wh/km</span>
                  </div>
                  <span className="text-[8px] font-mono font-black opacity-60">
                    REAL PHYSICS MODEL
                  </span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500 p-3 text-center flex flex-col justify-between h-full">
                  <div className="text-[9px] uppercase font-semibold text-emerald-900 mb-1">
                    Predictive Accuracy Fit
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {modelAccuracyPct.toFixed(1)}%
                  </div>
                  <span className="text-[8px] font-mono font-bold text-emerald-800">
                    {modelAccuracyPct > 90 ? "OPTIMIZED CONVERGED" : "CALIBRATING PARAMETERS"}
                  </span>
                </div>

              </div>
              
              {/* Secondary calculations */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-4 text-[10px] font-mono tracking-wider font-bold uppercase text-[#1A1A1A]/85">
                <div className="bg-[#E8E4D8]/10 p-2 border border-[#1A1A1A]/40 flex justify-between">
                  <span>Sustained Range:</span>
                  <span className="font-sans font-black text-xs text-[#1A1A1A]">
                    {estimatedMaxRangeRange} km
                  </span>
                </div>
                <div className="bg-[#E8E4D8]/10 p-2 border border-[#1A1A1A]/40 flex justify-between">
                  <span>Est 150km Cost:</span>
                  <span className="font-sans font-black text-xs text-[#1A1A1A]">
                    {totalTripEnergyKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="bg-[#E8E4D8]/10 p-2 border border-[#1A1A1A]/40 col-span-2 md:col-span-1 flex justify-between">
                  <span>Battery Charges:</span>
                  <span className="font-sans font-black text-xs text-[#1A1A1A]">
                    {chargesNeeded} Pack(s)
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: AI Co-Pilot Expert Chat Panel + Real-time activity log */}
          <div className="flex flex-col gap-8 h-full">
            
            {/* Real-time system log feed */}
            <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_#1A1A1A] flex-1 flex flex-col justify-between max-h-[350px]">
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-3 flex items-center gap-2">
                  <Signal className="w-4 h-4 text-[#1A1A1A]" />
                  SECURE GLOBAL AGGREGATION SYSTEM LOGS
                </h2>

                <div 
                  className="bg-[#E8E4D8]/20 border border-[#1A1A1A]/80 p-3 h-44 overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col gap-2"
                  id="logs-display"
                >
                  {logs.map((log) => {
                    let textClass = "text-slate-700";
                    let prefix = "•";
                    if (log.type === "success") {
                      textClass = "text-emerald-900 font-bold bg-emerald-100/50 p-1 border border-emerald-500/20";
                      prefix = "▣ SUCCESS:";
                    } else if (log.type === "warning") {
                      textClass = "text-amber-900 font-bold bg-amber-50 rounded-none p-1 border border-amber-500/20";
                      prefix = "▲ UNTRAINED:";
                    } else if (log.type === "dp") {
                      textClass = "text-purple-900 font-bold bg-purple-50 p-1 border border-purple-500/30";
                      prefix = "◆ PRIVACY GUARANTEE:";
                    }
                    
                    return (
                      <div key={log.id} className={`${textClass} transition-all`}>
                        <span className="opacity-55 mr-1.5">[{log.timestamp}]</span>
                        <span className="font-semibold mr-1">R{log.round}:</span>
                        <span>{prefix} {log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </div>

              <div className="text-[9px] font-mono text-[#1A1A1A]/70 uppercase tracking-widest mt-2 font-bold flex justify-between">
                <span>SYSTEM MEMORY STATUS: OK</span>
                <span>SECURED AES-256 AGGR</span>
              </div>
            </div>

            {/* AI Advisor intercom widget card */}
            <div className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_#1A1A1A] relative flex flex-col justify-between flex-1 min-h-[400px]">
              <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#1A1A1A]/30" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#1A1A1A]/30" />

              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1A1A1A]" />
                    FEDCHARGE AI EXPERT CO-PILOT
                  </span>
                  <span className="text-[8px] font-mono uppercase bg-[#1A1A1A] text-[#F9F7F2] font-black leading-none px-2 py-1">
                    GEMINI FLASH LATEST
                  </span>
                </h2>

                {/* Assistant Output Markdown render box */}
                <div className="bg-[#F9F7F2] border border-[#1A1A1A] p-4 text-[11px] leading-relaxed overflow-y-auto max-h-[300px] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.02)] min-h-[160px] text-justify select-text">
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center h-28 gap-2">
                      <div className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]/60">
                        Querying Neural Network Nodes...
                      </span>
                    </div>
                  ) : aiOutput ? (
                    <div className="prose prose-sm text-[#1A1A1A] max-w-none">
                      {/* Very simple parse list/headers */}
                      {aiOutput.split("\n").map((line, idx) => {
                        if (line.startsWith("###")) {
                          return <h4 key={idx} className="font-sans font-black uppercase mt-3 mb-1.5 text-xs text-[#1A1A1A]">{line.replace("###", "")}</h4>;
                        }
                        if (line.startsWith("##")) {
                          return <h3 key={idx} className="font-sans font-black uppercase mt-4 mb-2 text-sm text-[#1A1A1A] border-b border-[#1A1A1A]/20 pb-0.5">{line.replace("##", "")}</h3>;
                        }
                        if (line.startsWith("-") || line.startsWith("*")) {
                          return <li key={idx} className="ml-3 list-disc my-1 pl-1 font-semibold">{line.substring(2)}</li>;
                        }
                        return <p key={idx} className="my-1.5 leading-relaxed font-semibold text-[#1a1a1a]/95">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-[#1A1A1A]/55 italic">
                      Ask any question about model convergence, Secure Aggregation strategies, or how Differential Privacy guarantees on-device client profiles.
                    </p>
                  )}
                </div>
              </div>

              {/* Input forms with typical quick action queries */}
              <div className="mt-4 border-t border-[#1A1A1A]/30 pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask Advisor (e.g. 'How does FedProx handle skewed Non-IID drivers?')"
                    className="flex-1 bg-[#F9F7F2] border-2 border-[#1A1A1A] py-2 px-3 font-semibold text-xs text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && getAIExpertAdvice()}
                  />
                  <button
                    onClick={() => getAIExpertAdvice()}
                    className="bg-[#1A1A1A] border-2 border-[#1A1A1A] hover:bg-neutral-800 text-[#F9F7F2] px-4 py-2 cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Micro prompt recommendations badges */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <button
                    onClick={() => getAIExpertAdvice("How does Differential Privacy inject noise during decentralized aggregation?")}
                    className="text-[9px] uppercase font-bold text-[#1A1A1A] border border-[#1A1A1A]/60 bg-[#E8E4D8]/20 px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#F9F7F2] rounded-none cursor-pointer transition-colors"
                  >
                    What is DP Noise?
                  </button>
                  <button
                    onClick={() => getAIExpertAdvice("Compare FedAvg vs FedProx performance with non-IID client distributions.")}
                    className="text-[9px] uppercase font-bold text-[#1A1A1A] border border-[#1A1A1A]/60 bg-[#E8E4D8]/20 px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#F9F7F2] rounded-none cursor-pointer transition-colors"
                  >
                    FedAvg vs FedProx
                  </button>
                  <button
                    onClick={() => getAIExpertAdvice("How does on-device gradient descent protect my private raw location telemetry?")}
                    className="text-[9px] uppercase font-bold text-[#1A1A1A] border border-[#1A1A1A]/60 bg-[#E8E4D8]/20 px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#F9F7F2] rounded-none cursor-pointer transition-colors"
                  >
                    Telemetry Privacy
                  </button>
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* ================= EDITORIAL FOOTER SECTION ================= */}
        <footer className="mt-12 pt-6 border-t border-[#1A1A1A]/60 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-[#1A1A1A]/60 uppercase font-bold tracking-wider gap-4">
          <div className="flex gap-8">
            <div>
              <span className="block text-[8px] opacity-70">Simulation Node</span>
              <span>SECURE-RUNNING_NODE-v2.4.0</span>
            </div>
            <div>
              <span className="block text-[8px] opacity-70">Client Encryption Code</span>
              <span>AES-256-GCM Secure Channel</span>
            </div>
          </div>
          <div className="text-right">
            <span>Google AI Studio &copy; {new Date().getFullYear()} — EV Privacy Mobility Lab</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Helpers for descriptive strings
function roundMetricsDescription(r2: number | undefined): string {
  if (r2 === undefined) return "Rand State";
  if (r2 < 0) return "Incorrect Match";
  if (r2 < 0.4) return "Weak Alignment";
  if (r2 < 0.7) return "Moderate Fit";
  if (r2 < 0.9) return "High Accuracy";
  return "Optimal Convergence";
}
