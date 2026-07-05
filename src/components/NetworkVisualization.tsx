import React from "react";
import { EVClient, ModelWeights } from "../types";
import { Server, ShieldCheck, Zap, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NetworkVisualizationProps {
  clients: EVClient[];
  globalWeights: ModelWeights;
  isTraining: boolean;
  round: number;
  selectedClientId: string;
  onSelectClient: (id: string) => void;
}

export default function NetworkVisualization({
  clients,
  globalWeights,
  isTraining,
  round,
  selectedClientId,
  onSelectClient,
}: NetworkVisualizationProps) {
  return (
    <div 
      className="relative bg-[#F9F7F2] border-2 border-[#1A1A1A] p-6 overflow-hidden h-[450px] shadow-[6px_6px_0px_0px_#1A1A1A] flex flex-col justify-between transition-all" 
      id="network-visualizer"
    >
      {/* Editorial grid background */}
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Decorative Corner Accents */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#1A1A1A]/30" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#1A1A1A]/30" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-[#1A1A1A]/30" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-[#1A1A1A]/30" />

      {/* Header telemetry bar */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs border-b-2 border-[#1A1A1A] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#1A1A1A]" />
          <span className="font-bold uppercase tracking-widest text-[#1A1A1A] font-sans">
            Federated Network Topology
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="text-[#1A1A1A] bg-[#E8E4D8] px-2.5 py-1 font-bold border border-[#1A1A1A]">
            ROUND: <span className="text-[#1A1A1A] font-extrabold">{round}</span>
          </div>
          <div className="text-[#1A1A1A] border border-[#1A1A1A] px-2.5 py-1 font-bold bg-[#F9F7F2] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURE AGGREGATION</span>
          </div>
        </div>
      </div>

      {/* Interactive Topology Grid SVG + Nodes */}
      <div className="relative flex-1 flex items-center justify-center min-h-[250px]">
        {/* Connection rays from central aggregator to edge clients */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {clients.map((client, index) => {
            const angle = (index * 2 * Math.PI) / clients.length - Math.PI / 2;
            const radius = 110; // Radius in pixels
            const xOffset = Math.cos(angle) * radius;
            const yOffset = Math.sin(angle) * radius;

            const isSelected = client.id === selectedClientId;

            return (
              <g key={`ray-${client.id}`}>
                {/* SVG connection line */}
                <line
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${xOffset}px)`}
                  y2={`calc(50% + ${yOffset}px)`}
                  className="transition-all duration-700"
                  style={{
                    stroke: "#1A1A1A",
                    strokeWidth: isSelected ? "2.5" : "1",
                    strokeDasharray: client.isParticipating 
                      ? isTraining 
                        ? "4 4" 
                        : "2 2"
                      : "0",
                    opacity: client.isParticipating ? (isSelected ? "0.9" : "0.3") : "0.08",
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Central Aggregation Node */}
        <div className="relative z-10 w-24 h-24 rounded-full bg-[#1A1A1A] border-4 border-[#1A1A1A] flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(26,26,26,0.15)] text-[#F9F7F2]">
          <div className="absolute -inset-2 rounded-full border border-[#1A1A1A]/10 animate-pulse pointer-events-none" />
          <Server className="w-7 h-7 text-[#F9F7F2]" />
          <span className="text-[10px] uppercase font-black tracking-tight mt-1 text-center font-sans">
            Central
          </span>
          <span className="text-[9px] font-mono tracking-wider opacity-80 leading-none">
            {clients.filter(c => c.isParticipating && c.status === "sending").length > 0 ? "STREAMING..." : "FED-AVG"}
          </span>
        </div>

        {/* Floating Weight Packets during Training Rounds */}
        <AnimatePresence>
          {isTraining && clients.map((client, index) => {
            if (!client.isParticipating) return null;
            const angle = (index * 2 * Math.PI) / clients.length - Math.PI / 2;
            const radius = 110;
            const xOffset = Math.cos(angle) * radius;
            const yOffset = Math.sin(angle) * radius;

            return (
              <div key={`packets-${client.id}`}>
                {/* Upward Parameter Weight Update (Client sending to Central Aggregator) */}
                <motion.div
                  initial={{ x: xOffset, y: yOffset, opacity: 0, scale: 0.6 }}
                  animate={{ 
                    x: [xOffset, 0], 
                    y: [yOffset, 0], 
                    opacity: [0, 1, 1, 0],
                    scale: [0.6, 1.1, 1.1, 0.5] 
                  }}
                  transition={{ 
                    duration: 1.8, 
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                    delay: index * 0.25
                  }}
                  className="absolute z-20 w-4 h-4 bg-[#1A1A1A] border border-[#F9F7F2] rounded-full flex items-center justify-center shadow"
                >
                  <span className="text-[7px] font-black text-[#F9F7F2] font-mono">θ</span>
                </motion.div>

                {/* Downward Global Weights Broadcast (Server dispatching model to Client) */}
                <motion.div
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                  animate={{ 
                    x: [0, xOffset], 
                    y: [0, yOffset], 
                    opacity: [0, 1, 1, 0],
                    scale: [0.5, 1.1, 1.1, 0.6] 
                  }}
                  transition={{ 
                    duration: 1.8, 
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                    delay: 0.9 + index * 0.25
                  }}
                  className="absolute z-20 w-4 h-4 bg-[#E8E4D8] border-2 border-[#1A1A1A] rounded-full flex items-center justify-center shadow"
                >
                  <span className="text-[7px] font-black text-[#1A1A1A] font-mono">G</span>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {/* Edge Clients Nodes */}
        {clients.map((client, index) => {
          const angle = (index * 2 * Math.PI) / clients.length - Math.PI / 2;
          const radius = 120; // Radius positioning
          const xOffset = Math.cos(angle) * radius;
          const yOffset = Math.sin(angle) * radius;

          const isSelected = client.id === selectedClientId;

          // Border / background colors centered in "Artistic Flair"
          let borderStyle = "border-[#1A1A1A] bg-[#F9F7F2] text-[#1A1A1A]";
          if (client.isParticipating) {
            if (isSelected) {
              borderStyle = "border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] scale-105 z-20";
            } else if (client.status === "training") {
              borderStyle = "border-2 border-dashed border-[#1A1A1A] bg-[#E8E4D8]/60 text-[#1A1A1A] scale-[1.02] animate-pulse";
            } else if (client.status === "sending") {
              borderStyle = "border-2 border-[#1a1a1a] bg-[#E8E4D8] text-[#1A1A1A]";
            } else if (client.status === "updated") {
              borderStyle = "border-2 border-[#1A1A1A] bg-[#F9F7F2] text-[#1A1A1A]";
            }
          } else {
            borderStyle = "border-[#1A1A1A]/20 bg-[#F9F7F2]/40 text-[#1A1A1A]/40 opacity-40 selection:bg-none";
          }

          return (
            <motion.div
              key={client.id}
              className={`absolute z-10 w-28 p-2 rounded-none border text-center transition-all cursor-pointer ${borderStyle}`}
              style={{
                transform: `translate(${xOffset}px, ${yOffset}px)`,
              }}
              onClick={() => onSelectClient(client.id)}
              whileHover={{ scale: client.isParticipating ? (isSelected ? 1.05 : 1.03) : 1 }}
            >
              {/* Badge info */}
              <div className="flex justify-between items-center text-[8px] mb-1 px-0.5 leading-none font-bold uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 ${
                  client.isParticipating 
                    ? client.status === "training" 
                      ? "bg-[#1A1A1A] animate-pulse" 
                      : client.status === "sending" 
                        ? "bg-[#1A1A1A]" 
                        : "bg-[#1A1A1A]/60"
                    : "bg-red-600"
                }`} />
                <span className="font-mono text-[7px] opacity-70">
                  {client.isParticipating ? client.status : "OFFLINE"}
                </span>
                <span className="font-mono text-[7px] text-[red]/90 opacity-60">
                  n={client.dataPointsCount}
                </span>
              </div>

              {/* Client specifications */}
              <div className="text-[10px] font-black truncate leading-tight uppercase tracking-tight">
                {client.name}
              </div>
              <div className="text-[8px] opacity-70 font-medium truncate mb-1">
                {client.routeName}
              </div>

              {/* Performance indicators */}
              <div className={`rounded-none p-1 leading-none text-left flex flex-col gap-0.5 border ${
                isSelected 
                  ? "bg-[#F9F7F2] text-[#1A1A1A] border-[#F9F7F2]" 
                  : "bg-[#E8E4D8]/30 border-[#1A1A1A]/10 text-[#1A1A1A]"
              }`}>
                <div className="flex justify-between text-[7px] font-mono font-bold">
                  <span>MSE Loss:</span>
                  <span>
                    {client.localLoss > 0 ? client.localLoss.toFixed(1) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-[7px] font-mono font-bold">
                  <span>R² Coef:</span>
                  <span>
                    {client.localR2 > 0 ? client.localR2.toFixed(3) : "—"}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer key terms */}
      <div className="relative z-10 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t-2 border-[#1A1A1A] pt-3 text-[10px] text-[#1A1A1A] font-medium uppercase font-sans tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 border border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] font-mono text-[8px] font-black flex items-center justify-center leading-none">θ</span>
          <span>Encrypted Local Gradient Parameters</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 border border-[#1A1A1A] bg-[#E8E4D8] text-[#1A1A1A] font-mono text-[8px] font-black flex items-center justify-center leading-none">G</span>
          <span>Aggregated Privacy model Broadcast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#1A1A1A]" />
          <span>Local Device Epochs (SGD Training)</span>
        </div>
      </div>
    </div>
  );
}
