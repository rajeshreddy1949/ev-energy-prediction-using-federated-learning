import React from "react";
import { EVClient, DrivingStyle } from "../types";
import { Sliders, Thermometer, Gauge, ChevronUp, UserCheck, Shield, Car } from "lucide-react";

interface ClientInspectorProps {
  clients: EVClient[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  onUpdateClient: (updated: EVClient) => void;
}

export default function ClientInspector({
  clients,
  selectedClientId,
  onSelectClient,
  onUpdateClient,
}: ClientInspectorProps) {
  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  const handleToggleParticipation = () => {
    onUpdateClient({
      ...selectedClient,
      isParticipating: !selectedClient.isParticipating,
    });
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateClient({
      ...selectedClient,
      drivingStyle: e.target.value as DrivingStyle,
    });
  };

  const handleSliderChange = (field: keyof EVClient, value: number) => {
    onUpdateClient({
      ...selectedClient,
      [field]: value,
    });
  };

  return (
    <div 
      className="bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 shadow-[6px_6px_0px_0px_#1A1A1A] flex flex-col h-full relative transition-all" 
      id="client-inspector"
    >
      {/* Decorative Corner Accents */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#1A1A1A]/30" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#1A1A1A]/30" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-[#1A1A1A]/30" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-[#1A1A1A]/30" />

      <h2 className="text-lg font-black text-[#1A1A1A] flex items-center gap-2 mb-5 font-sans uppercase tracking-tight">
        <Car className="w-5 h-5 text-[#1A1A1A]" />
        ON-DEVICE EDGE CLIENT PROFILER
      </h2>

      {/* Select buttons for vehicles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {clients.map((client) => {
          const isSelected = client.id === selectedClientId;
          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className={`p-3.5 rounded-none border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "bg-[#1A1A1A] border-[#1A1A1A] text-[#F9F7F2] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.2)] md:scale-105 z-10"
                  : "bg-[#E8E4D8]/30 border-[#1A1A1A]/85 hover:bg-[#E8E4D8]/60 text-[#1A1A1A]"
              }`}
            >
              <div className={`text-[9px] uppercase tracking-wider font-extrabold font-mono mb-1 leading-none ${
                isSelected ? "text-[#E8E4D8]" : "text-[#1A1A1A]/60"
              }`}>
                {client.vehicleType.split(" ")[0]}
              </div>
              <div className="text-xs font-black font-sans uppercase tracking-tight truncate leading-tight">
                {client.name}
              </div>
              <div className={`flex items-center justify-between mt-3 text-[10px] font-mono leading-none ${
                isSelected ? "text-slate-300" : "text-[#1A1A1A]/80"
              }`}>
                <span className={`font-black ${
                  client.isParticipating 
                    ? isSelected 
                      ? "text-emerald-300" 
                      : "text-emerald-700" 
                    : "text-red-600"
                }`}>
                  {client.isParticipating ? "ACTIVE" : "EXCLUDED"}
                </span>
                <span className="opacity-70">N={client.dataPointsCount}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Inspector details panel */}
      <div className="p-5 rounded-none bg-[#F9F7F2] border border-[#1A1A1A] flex-1 flex flex-col justify-between shadow-[inset_2px_2px_4px_rgba(0,0,0,0.03)]">
        <div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-[#1A1A1A]/30 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-[#1A1A1A] flex items-center gap-1.5 uppercase font-sans tracking-tight">
                {selectedClient.name} TELEMETRY DEFINITION
              </h3>
              <p className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#1A1A1A]/70">
                Preset: {selectedClient.vehicleType} | Capacity: {selectedClient.batteryCapKwh} kWh
              </p>
            </div>
            
            <button
              onClick={handleToggleParticipation}
              className={`text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-none font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedClient.isParticipating
                  ? "bg-[#E8E4D8] hover:bg-red-200 border border-[#1A1A1A] text-[#1A1A1A]"
                  : "bg-[#1A1A1A] hover:bg-neutral-800 border border-[#1A1A1A] text-[#F9F7F2]"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{selectedClient.isParticipating ? "Exclude Client" : "Include Client"}</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* Driving Speed Control */}
            <div>
              <div className="flex justify-between items-center text-xs text-[#1A1A1A] font-bold mb-1">
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                  <Gauge className="w-4 h-4 text-[#1A1A1A]" />
                  Average Node Velocity:
                </span>
                <span className="font-mono text-sm bg-[#1A1A1A] text-[#F9F7F2] px-2 py-0.5 font-bold leading-none">
                  {selectedClient.avgSpeedKmh} KM/H
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                value={selectedClient.avgSpeedKmh}
                onChange={(e) => handleSliderChange("avgSpeedKmh", parseInt(e.target.value))}
                className="w-full accent-[#1A1A1A] h-1.5 bg-[#E8E4D8] rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] uppercase font-mono font-bold text-[#1A1A1A]/60 mt-1">
                <span>City Grid (30kph)</span>
                <span>Interstate (120kph)</span>
              </div>
            </div>

            {/* Ambient Temperature Control */}
            <div>
              <div className="flex justify-between items-center text-xs text-[#1A1A1A] font-bold mb-1">
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                  <Thermometer className="w-4 h-4 text-[#1A1A1A]" />
                  Ambient Temperature:
                </span>
                <span className="font-mono text-sm bg-[#1A1A1A] text-[#F9F7F2] px-2 py-0.5 font-bold leading-none">
                  {selectedClient.ambientTempC}°C
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="42"
                value={selectedClient.ambientTempC}
                onChange={(e) => handleSliderChange("ambientTempC", parseInt(e.target.value))}
                className="w-full accent-[#1A1A1A] h-1.5 bg-[#E8E4D8] rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] uppercase font-mono font-bold text-[#1A1A1A]/60 mt-1">
                <span>Winter Freeze (-10°C)</span>
                <span>Summer Peak (42°C)</span>
              </div>
            </div>

            {/* Elevation gain */}
            <div>
              <div className="flex justify-between items-center text-xs text-[#1A1A1A] font-bold mb-1">
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                  <ChevronUp className="w-4 h-4 text-[#1A1A1A]" />
                  Average Grade Elevation:
                </span>
                <span className="font-mono text-sm bg-[#1A1A1A] text-[#F9F7F2] px-2 py-0.5 font-bold leading-none">
                  {selectedClient.elevationChangeM} M/KM
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={selectedClient.elevationChangeM}
                onChange={(e) => handleSliderChange("elevationChangeM", parseInt(e.target.value))}
                className="w-full accent-[#1A1A1A] h-1.5 bg-[#E8E4D8] rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] uppercase font-mono font-bold text-[#1A1A1A]/60 mt-1">
                <span>Strictly Flat (0m)</span>
                <span>Mountain Ascent (50m/km)</span>
              </div>
            </div>

            {/* Driving Style Selector */}
            <div className="flex justify-between items-center bg-[#E8E4D8]/15 border border-[#1A1A1A] p-2">
              <label className="text-xs uppercase font-extrabold tracking-wide text-[#1A1A1A]">
                Driver Behavior Style:
              </label>
              <select
                value={selectedClient.drivingStyle}
                onChange={handleStyleChange}
                className="bg-[#F9F7F2] border border-[#1A1A1A] px-2 py-1 text-xs text-[#1A1A1A] font-mono font-bold focus:outline-none focus:bg-[#E8E4D8] cursor-pointer"
              >
                <option value={DrivingStyle.ECO}>ECO ECONOMY DRIVER</option>
                <option value={DrivingStyle.NORMAL}>REGULAR COMMUTER</option>
                <option value={DrivingStyle.AGGRESSIVE}>AGGRESSIVE DELIVERY</option>
              </select>
            </div>
          </div>
        </div>

        {/* Local weight weights report display */}
        <div className="mt-6 pt-4 border-t-2 border-[#1A1A1A]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Secure On-Device Model Parameter Weights
            </span>
            <span className="text-[9px] font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 border border-emerald-500/30">
              LOCAL ENCRYPTION ON
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#E8E4D8]/40 border border-[#1A1A1A] rounded-none p-2 text-center leading-none shadow-[2px_2px_0px_0px_#1A1A1A]/20">
              <div className="text-[8px] text-[#1A1A1A]/70 font-mono font-bold uppercase mb-1.5 truncate">
                Aux Base (w0)
              </div>
              <div className="text-xs font-mono text-[#1A1A1A] font-black">
                {selectedClient.localLoss > 0 ? `${selectedClient.localWeights.w0.toFixed(0)} Wh` : "PENDING"}
              </div>
            </div>
            
            <div className="bg-[#E8E4D8]/40 border border-[#1A1A1A] rounded-none p-2 text-center leading-none shadow-[2px_2px_0px_0px_#1A1A1A]/20">
              <div className="text-[8px] text-[#1A1A1A]/70 font-mono font-bold uppercase mb-1.5 truncate">
                Gravity (w4)
              </div>
              <div className="text-xs font-mono text-[#1A1A1A] font-black">
                {selectedClient.localLoss > 0 ? `${selectedClient.localWeights.w4.toFixed(1)} Wh` : "PENDING"}
              </div>
            </div>

            <div className="bg-[#E8E4D8]/40 border border-[#1A1A1A] rounded-none p-2 text-center leading-none shadow-[2px_2px_0px_0px_#1A1A1A]/20">
              <div className="text-[8px] text-[#1A1A1A]/70 font-mono font-bold uppercase mb-1.5 truncate">
                HVAC (w3)
              </div>
              <div className="text-xs font-mono text-[#1A1A1A] font-black">
                {selectedClient.localLoss > 0 ? `${selectedClient.localWeights.w3.toFixed(2)} Wh` : "PENDING"}
              </div>
            </div>
          </div>
          
          <p className="text-[9px] text-[#1A1A1A]/70 italic mt-3 font-sans leading-relaxed">
            ℹ️ Regenerates {selectedClient.dataPointsCount} unique decentralized trip readings locally inside the device storage relative to these physical factors. Or use the buttons to enable or disable training.
          </p>
        </div>
      </div>
    </div>
  );
}
