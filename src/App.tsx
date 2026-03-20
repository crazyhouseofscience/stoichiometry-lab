import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Beaker, 
  Scale, 
  RotateCcw, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  Wind,
  MousePointerClick,
  Calculator,
  X
} from 'lucide-react';

// --- Constants ---
const MOLAR_MASS_CACO3 = 100.09;
const MOLAR_MASS_CO2 = 44.01;
const TARGET_CACO3_MASS = 7.0;
const BEAKER_EMPTY_MASS = 125.42;
const HCL_DENSITY = 1.02; 
const HCL_VOLUME_NEEDED = 165; 

type Step = 
  | 'INTRO'
  | 'MASS_BEAKER'
  | 'ADD_CACO3'
  | 'MEASURE_HCL'
  | 'ADD_HCL'
  | 'RECORD_STARTING_MASS'
  | 'REACTION'
  | 'FINAL_MASS'
  | 'CALCULATE_CO2'
  | 'RESULTS';

export default function App() {
  const [step, setStep] = useState<Step>('INTRO');
  const [beakerOnScale, setBeakerOnScale] = useState(false);
  const [caCO3Mass, setCaCO3Mass] = useState(0);
  const [hclAdded, setHclAdded] = useState(0);
  const [isStirring, setIsStirring] = useState(false);
  const [reactionProgress, setReactionProgress] = useState(0);
  const [isReacting, setIsReacting] = useState(false);
  const [isScooping, setIsScooping] = useState(false);
  const [hclInCylinder, setHclInCylinder] = useState(0);
  const [isPouringIntoCylinder, setIsPouringIntoCylinder] = useState(false);
  const [isPouringCylinderToBeaker, setIsPouringCylinderToBeaker] = useState(false);
  const [yieldFactor, setYieldFactor] = useState(() => 0.85 + Math.random() * 0.12);
  
  // New States for Features
  const [scratchpadText, setScratchpadText] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  
  // Student Input States
  const [recordedEmptyBeaker, setRecordedEmptyBeaker] = useState<string>('');
  const [recordedCaCO3, setRecordedCaCO3] = useState<string>('');
  const [recordedHCl, setRecordedHCl] = useState<string>('');
  const [recordedStartingMass, setRecordedStartingMass] = useState<string>('');
  const [recordedFinalMass, setRecordedFinalMass] = useState<string>('');
  const [recordedCO2Lost, setRecordedCO2Lost] = useState<string>('');

  const bubbles = useMemo(() => {
    return [...Array(80)].map(() => ({
      startX: Math.random() * 100 + 10,
      endXOffset: Math.random() * 40 - 20,
      scale: Math.random() * 1 + 0.5,
      duration: 0.6 + Math.random() * 1.2,
      delay: Math.random() * 2,
      size: Math.random() > 0.8 ? 'w-3 h-3' : (Math.random() > 0.5 ? 'w-2 h-2' : 'w-1.5 h-1.5')
    }));
  }, []);

  // Derived values
  const theoreticalCO2 = caCO3Mass > 0 ? (caCO3Mass / MOLAR_MASS_CACO3) * MOLAR_MASS_CO2 : 0;
  const actualCO2Released = theoreticalCO2 * yieldFactor * (reactionProgress / 100);

  const currentTotalMass = beakerOnScale 
    ? BEAKER_EMPTY_MASS + caCO3Mass + (hclAdded * HCL_DENSITY) - actualCO2Released
    : 0;

  // Validation logic
  const isValueCorrect = (entered: string, actual: number, decimals: number = 2) => {
    if (!entered) return false;
    const parsed = parseFloat(entered);
    if (isNaN(parsed)) return false;
    return parsed.toFixed(decimals) === actual.toFixed(decimals);
  };

  const isEmptyBeakerCorrect = isValueCorrect(recordedEmptyBeaker, BEAKER_EMPTY_MASS, 2);
  const isCaCO3Correct = isValueCorrect(recordedCaCO3, caCO3Mass, 2);
  const currentHClVolume = hclInCylinder > 0 ? hclInCylinder : hclAdded;
  const isHClCorrect = isValueCorrect(recordedHCl, currentHClVolume * HCL_DENSITY, 2);
  const isStartingMassCorrect = isValueCorrect(recordedStartingMass, BEAKER_EMPTY_MASS + caCO3Mass + (hclAdded * HCL_DENSITY), 2);
  const isFinalMassCorrect = isValueCorrect(recordedFinalMass, BEAKER_EMPTY_MASS + caCO3Mass + (hclAdded * HCL_DENSITY) - (theoreticalCO2 * yieldFactor), 2);
  const isCO2LostCorrect = isValueCorrect(recordedCO2Lost, theoreticalCO2 * yieldFactor, 2);

  const getInputClass = (value: string, isCorrect: boolean, isFinal: boolean = false) => {
    const width = isFinal ? "w-24" : "w-20";
    if (!value) {
      return isFinal 
        ? `${width} bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-right font-bold text-emerald-800 focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors`
        : `${width} bg-stone-50 border border-stone-200 rounded px-2 py-1 text-right font-bold text-stone-800 focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors`;
    }
    if (isCorrect) return `${width} bg-emerald-50 border border-emerald-500 rounded px-2 py-1 text-right font-bold text-emerald-700 focus:outline-none disabled:opacity-50 transition-colors`;
    
    // Only show red if they've typed something and it's wrong, but don't clear it immediately
    return `${width} bg-rose-50 border border-rose-500 rounded px-2 py-1 text-right font-bold text-rose-700 focus:outline-none disabled:opacity-50 transition-colors`;
  };

  // Simulation logic
  useEffect(() => {
    if (isReacting && reactionProgress < 100) {
      const interval = setInterval(() => {
        setReactionProgress(prev => {
          const next = prev + 0.5;
          if (next >= 100) {
            setIsReacting(false);
            return 100;
          }
          return next;
        });
      }, 40);
      return () => clearInterval(interval);
    } else if (reactionProgress >= 100 && step === 'REACTION') {
      setStep('FINAL_MASS');
    }
  }, [isReacting, reactionProgress, step]);

  const handleAddCaCO3 = () => {
    if (!isScooping && caCO3Mass === 0) {
      setIsScooping(true);
      // Animation delay before mass updates
      setTimeout(() => {
        setCaCO3Mass(7.0);
        setTimeout(() => setIsScooping(false), 1000);
      }, 1000);
    }
  };

  const handlePourIntoCylinderAnimation = () => {
    if (hclInCylinder < HCL_VOLUME_NEEDED && !isPouringIntoCylinder) {
      setIsPouringIntoCylinder(true);
      setTimeout(() => {
        setHclInCylinder(HCL_VOLUME_NEEDED);
        setIsPouringIntoCylinder(false);
      }, 2500);
    }
  };

  const handlePourCylinderToBeakerAnimation = () => {
    if (hclAdded < HCL_VOLUME_NEEDED && !isPouringCylinderToBeaker) {
      setIsPouringCylinderToBeaker(true);
      setTimeout(() => {
        setHclAdded(HCL_VOLUME_NEEDED);
        setHclInCylinder(0);
        if (caCO3Mass > 0) {
          setStep('RECORD_STARTING_MASS');
        }
        setIsPouringCylinderToBeaker(false);
      }, 2500);
    }
  };

  const resetLab = () => {
    setStep('INTRO');
    setBeakerOnScale(false);
    setCaCO3Mass(0);
    setHclAdded(0);
    setIsStirring(false);
    setReactionProgress(0);
    setIsReacting(false);
    setIsScooping(false);
    setHclInCylinder(0);
    setIsPouringIntoCylinder(false);
    setIsPouringCylinderToBeaker(false);
    setYieldFactor(0.85 + Math.random() * 0.12);
    setRecordedEmptyBeaker('');
    setRecordedCaCO3('');
    setRecordedHCl('');
    setRecordedStartingMass('');
    setRecordedFinalMass('');
    setRecordedCO2Lost('');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      {/* Header - Compact */}
      <header className="bg-white border-b border-stone-200 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded text-white">
            <Beaker size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Stoichiometry Lab</h1>
            <p className="text-[10px] text-stone-500 font-mono uppercase tracking-tighter">CaCO₃ + 2HCl → CaCl₂ + CO₂ + H₂O</p>
          </div>
        </div>
        <button onClick={resetLab} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors text-stone-600">
          <RotateCcw size={16} />
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
        {/* Left: Lab Simulation */}
        <div className="flex-[3] flex flex-col gap-4 min-w-[300px]">
          <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm relative flex flex-col items-center justify-center p-4">
            
            {/* Visuals */}
            <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
              {/* Fixed Coordinate System Stage */}
              <div className="relative w-[400px] h-[400px]">
                
                {/* Scale Base */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-10 bg-stone-200 rounded-t-lg border-x border-t border-stone-300 shadow-inner flex items-center justify-center z-0">
                  <div className="bg-stone-800 px-4 py-1 rounded border border-stone-600 font-mono text-emerald-400 text-base shadow-lg">
                    {currentTotalMass.toFixed(2)}g
                  </div>
                </div>

                {/* Beaker */}
                <AnimatePresence>
                  {beakerOnScale && (
                    <motion.div 
                      key="beaker"
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10"
                    >
                      <div className="w-32 h-44 border-2 border-stone-300 rounded-b-lg relative overflow-hidden bg-white/30 backdrop-blur-sm shadow-sm">
                        <motion.div className="absolute bottom-0 w-full bg-blue-600/90" animate={{ height: `${(hclAdded / 200) * 100}%` }} />
                        <motion.div className="absolute bottom-0 w-full bg-stone-200" animate={{ height: `${(caCO3Mass / 10) * 20}%`, opacity: 1 - (reactionProgress / 100), scaleX: 1 - (reactionProgress / 200) }} />
                        
                        {/* Enhanced Bubbles & Reaction Visuals */}
                        {isReacting && (
                          <>
                            {/* Enhanced Gas escaping from top */}
                            <div className="absolute -top-32 left-0 w-full h-32 pointer-events-none z-20">
                              {[...Array(15)].map((_, i) => (
                                <motion.div
                                  key={`gas-enhanced-${i}`}
                                  className="absolute bottom-0 w-12 h-12 bg-white/40 blur-xl rounded-full"
                                  initial={{ x: 20 + (i * 6), y: 20, scale: 0.5, opacity: 0 }}
                                  animate={{ 
                                    y: -100 - (Math.random() * 60), 
                                    x: 20 + (i * 6) + (Math.random() * 80 - 40),
                                    scale: 3 + Math.random() * 3, 
                                    opacity: [0, 0.6, 0] 
                                  }}
                                  transition={{ 
                                    duration: 2 + Math.random() * 1.5, 
                                    repeat: Infinity, 
                                    delay: i * 0.2 
                                  }}
                                />
                              ))}
                            </div>

                            <div className="absolute inset-0 z-10 overflow-hidden rounded-b-lg pointer-events-none">
                              {/* Surface Fizz */}
                              <motion.div 
                                className="absolute w-full bg-white/50 blur-[1px] rounded-full -translate-y-1/2"
                                style={{ bottom: `calc(${(hclAdded / 200) * 100}% - 8px)` }}
                                animate={{ 
                                  opacity: [0.4, 0.8, 0.4],
                                  height: ['8px', '16px', '8px'],
                                  scaleX: [0.95, 1.02, 0.95]
                                }}
                                transition={{ duration: 0.3, repeat: Infinity }}
                              />

                              {/* Rising Bubbles */}
                              {bubbles.map((b, i) => (
                                <motion.div 
                                  key={`bubble-${i}`} 
                                  className={`absolute bottom-2 ${b.size} bg-white/80 border border-white rounded-full shadow-sm`}
                                  initial={{ 
                                    x: b.startX, 
                                    y: 0, 
                                    scale: b.scale 
                                  }} 
                                  animate={{ 
                                    y: [0, -140], 
                                    opacity: [0, 1, 0], 
                                    x: [b.startX, b.startX + b.endXOffset]
                                  }} 
                                  transition={{ 
                                    duration: b.duration, 
                                    repeat: Infinity, 
                                    ease: "easeIn",
                                    delay: b.delay
                                  }} 
                                />
                              ))}
                            </div>
                          </>
                        )}
                        {isStirring && (
                          <motion.div 
                            key="stir-rod"
                            className="absolute top-0 left-1/2 w-1 h-48 bg-stone-400/80 rounded-full -translate-x-1/2 z-20 origin-top" 
                            animate={{ rotate: [0, 8, -8, 0], x: ['-50%', '-40%', '-60%', '-50%'] }} 
                            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} 
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CaCO3 Source Container */}
                {step === 'ADD_CACO3' && (
                  <div className="absolute left-10 bottom-10 flex flex-col items-center z-20">
                    <div className="w-20 h-24 bg-stone-100 border-2 border-stone-200 rounded-lg relative overflow-hidden shadow-sm">
                      <div className="absolute bottom-0 w-full h-1/2 bg-stone-200" />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-stone-400 uppercase">CaCO₃</div>
                    </div>
                    <div className="text-[10px] font-bold text-stone-400 mt-2 uppercase">Stock Jar</div>
                    
                    {/* Interactive Scoopula */}
                    <AnimatePresence>
                      {!isScooping && caCO3Mass === 0 && (
                        <motion.button 
                          key="scoopula-btn"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={handleAddCaCO3}
                          className="absolute -right-16 top-4 group cursor-pointer flex flex-col items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="w-24 h-2 bg-stone-400 rounded-full relative group-hover:bg-stone-500 transition-colors shadow-sm">
                            <div className="absolute -left-2 top-0 w-6 h-4 bg-stone-200 rounded-full shadow-sm group-hover:bg-stone-300 transition-colors" />
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-4 uppercase bg-white px-2 py-1 rounded-full shadow-md border border-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MousePointerClick size={12} /> Click to Scoop
                          </div>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Scoopula Animation */}
                <AnimatePresence>
                  {isScooping && (
                    <motion.div 
                      key="scoopula-anim"
                      className="absolute z-30 pointer-events-none"
                      initial={{ left: '25%', top: '65%', rotate: -20 }}
                      animate={{ 
                        left: ['25%', '50%', '50%', '25%'],
                        top: ['65%', '25%', '25%', '65%'],
                        rotate: [-20, -20, 20, -20]
                      }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    >
                      <div className="w-32 h-2 bg-stone-400 rounded-full relative shadow-md -translate-x-1/2 -translate-y-1/2">
                        <div className="absolute -left-2 top-0 w-6 h-4 bg-stone-100 rounded-full shadow-sm">
                          {/* Powder on scoopula */}
                          <motion.div 
                            className="absolute inset-0 bg-stone-200 rounded-full"
                            animate={{ opacity: [1, 1, 0, 0] }}
                            transition={{ duration: 2 }}
                          />
                        </div>
                      </div>
                      {/* Falling powder effect */}
                      <motion.div 
                        className="absolute left-[-16px] top-[8px] w-6 h-12 flex flex-col items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0, 1, 0] }}
                        transition={{ duration: 2 }}
                      >
                        {[...Array(8)].map((_, i) => (
                          <motion.div 
                            key={`powder-${i}`}
                            className="w-1.5 h-1.5 bg-stone-200 rounded-full mb-1"
                            animate={{ y: [0, 60], opacity: [1, 0], x: Math.random() * 10 - 5 }}
                            transition={{ duration: 0.6, delay: i * 0.08, repeat: 2 }}
                          />
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Graduated Cylinder (Static or Interactive) */}
                {(step === 'MEASURE_HCL' || step === 'ADD_HCL') && beakerOnScale && (
                  <div className="absolute bottom-4 right-12 z-20 flex flex-col items-center">
                    {step === 'ADD_HCL' && !isPouringCylinderToBeaker && hclInCylinder > 0 ? (
                      <motion.div
                        drag
                        dragSnapToOrigin
                        dragConstraints={{ left: -300, right: 0, top: -200, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(event, info) => {
                          if (info.offset.x < -100) {
                            handlePourCylinderToBeakerAnimation();
                          }
                        }}
                        className="cursor-grab active:cursor-grabbing flex flex-col items-center group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-10 h-40 border-2 border-white bg-white/40 backdrop-blur-sm rounded-b-xl border-t-0 relative overflow-hidden shadow-inner flex items-end justify-center">
                          <div 
                            className="w-full bg-blue-400/60 transition-all duration-1000 ease-in-out" 
                            style={{ height: `${(hclInCylinder / 200) * 100}%` }} 
                          />
                          <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-40">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="flex items-center">
                                <div className="border-b-2 border-stone-500 w-3" />
                                {i % 2 === 0 && <span className="text-[8px] text-stone-600 ml-1">{200 - i * 20}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-2 uppercase bg-white px-2 py-1 rounded-full shadow-md border border-blue-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <MousePointerClick size={12} /> Drag to Beaker
                        </div>
                      </motion.div>
                    ) : (
                      !isPouringCylinderToBeaker && (
                        <div className="w-10 h-40 border-2 border-white bg-white/40 backdrop-blur-sm rounded-b-xl border-t-0 relative overflow-hidden shadow-inner flex items-end justify-center">
                          <div 
                            className="w-full bg-blue-400/60 transition-all duration-1000 ease-in-out" 
                            style={{ height: `${(hclInCylinder / 200) * 100}%` }} 
                          />
                          <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-40">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="flex items-center">
                                <div className="border-b-2 border-stone-500 w-3" />
                                {i % 2 === 0 && <span className="text-[8px] text-stone-600 ml-1">{200 - i * 20}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* HCl Bottle (Interactive) */}
                {step === 'MEASURE_HCL' && beakerOnScale && (
                  <div className="absolute top-10 left-10 flex flex-col items-center z-30">
                    <AnimatePresence>
                      {!isPouringIntoCylinder && hclInCylinder < HCL_VOLUME_NEEDED && (
                        <motion.div 
                          key="hcl-bottle"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          drag
                          dragSnapToOrigin
                          dragConstraints={{ left: 0, right: 300, top: 0, bottom: 200 }}
                          dragElastic={0.2}
                          onDragEnd={(event, info) => {
                            if (info.offset.x > 100) {
                              handlePourIntoCylinderAnimation();
                            }
                          }}
                          className="group cursor-grab active:cursor-grabbing flex flex-col items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="w-16 h-24 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-center relative overflow-hidden shadow-md group-hover:border-blue-400 transition-colors">
                             <div className="absolute bottom-0 w-full bg-blue-500/80 h-3/4 pointer-events-none" />
                             <span className="relative z-10 text-xs font-bold text-blue-900 bg-white/80 px-2 py-1 rounded pointer-events-none">HCl</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-3 uppercase bg-white px-2 py-1 rounded-full shadow-md border border-blue-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <MousePointerClick size={12} /> Drag to Cylinder
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Pouring HCl into Cylinder Animation */}
                <AnimatePresence>
                  {isPouringIntoCylinder && (
                    <>
                      <motion.div 
                        key="pouring-bottle-cyl"
                        className="absolute z-40 pointer-events-none origin-top-right"
                        initial={{ right: 'calc(100% - 104px)', bottom: 'calc(100% - 136px)', rotate: 0 }}
                        animate={{ 
                          right: ['calc(100% - 104px)', '88px', '88px', 'calc(100% - 104px)'],
                          bottom: ['calc(100% - 136px)', '176px', '176px', 'calc(100% - 136px)'],
                          rotate: [0, 80, 80, 0]
                        }}
                        transition={{ duration: 2.5, ease: "easeInOut" }}
                      >
                        <div className="w-16 h-24 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg">
                           <motion.div 
                             className="absolute bottom-0 w-full bg-blue-600/90" 
                             animate={{ height: ['75%', '75%', '10%', '10%'] }}
                             transition={{ duration: 2.5 }}
                           />
                           <span className="relative z-10 text-xs font-bold text-blue-100 bg-blue-900/80 px-2 py-1 rounded">HCl</span>
                        </div>
                      </motion.div>
                      {/* Liquid pouring effect */}
                      <motion.div 
                        key="pouring-liquid-cyl"
                        className="absolute z-30 pointer-events-none w-2 bg-blue-600/90 rounded-b-full"
                        initial={{ right: '68px', bottom: '16px', scaleY: 0, opacity: 0 }}
                        animate={{ 
                          scaleY: [0, 1, 1, 0], 
                          opacity: [0, 1, 1, 0] 
                        }}
                        transition={{ duration: 2.5, times: [0, 0.15, 0.85, 1] }}
                        style={{ height: '256px', transformOrigin: 'top' }}
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* Pouring Cylinder into Beaker Animation */}
                <AnimatePresence>
                  {isPouringCylinderToBeaker && (
                    <>
                      <motion.div 
                        key="pouring-cyl-beaker"
                        className="absolute z-40 pointer-events-none origin-top-left"
                        initial={{ right: '48px', bottom: '16px', rotate: 0 }}
                        animate={{ 
                          right: ['48px', 'calc(50% - 104px)', 'calc(50% - 104px)', '48px'],
                          bottom: ['16px', '208px', '208px', '16px'],
                          rotate: [0, -80, -80, 0]
                        }}
                        transition={{ duration: 2.5, ease: "easeInOut" }}
                      >
                        <div className="w-10 h-40 border-2 border-white bg-white/40 backdrop-blur-sm rounded-b-xl border-t-0 relative overflow-hidden shadow-inner flex items-end justify-center">
                           <motion.div 
                             className="w-full bg-blue-400/60" 
                             animate={{ height: ['82.5%', '82.5%', '0%', '0%'] }}
                             transition={{ duration: 2.5 }}
                           />
                        </div>
                      </motion.div>
                      {/* Liquid pouring effect */}
                      <motion.div 
                        key="pouring-liquid-beaker"
                        className="absolute z-30 pointer-events-none w-3 bg-blue-600/90 rounded-b-full"
                        initial={{ left: '50%', bottom: '48px', scaleY: 0, opacity: 0 }}
                        animate={{ 
                          scaleY: [0, 1, 1, 0], 
                          opacity: [0, 1, 1, 0] 
                        }}
                        transition={{ duration: 2.5, times: [0, 0.15, 0.85, 1] }}
                        style={{ height: '320px', transform: 'translateX(-50%)', transformOrigin: 'top' }}
                      />
                    </>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Step Content */}
            <div className="mt-8 text-center w-full max-w-sm shrink-0">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {step === 'INTRO' && (
                    <div className="space-y-3">
                      <h2 className="text-xl font-bold">Stoichiometry Lab</h2>
                      <p className="text-sm text-stone-600 leading-relaxed">Determine the experimental yield of CO₂ gas by measuring the mass difference after the reaction.</p>
                      <button onClick={() => setStep('MASS_BEAKER')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg">Start Experiment <ArrowRight size={18} /></button>
                    </div>
                  )}
                  {step === 'MASS_BEAKER' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Place the empty beaker on the balance and record its mass in the data log.</p>
                      {!beakerOnScale ? (
                        <button onClick={() => setBeakerOnScale(true)} className="bg-stone-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-stone-800 transition-all mx-auto shadow-lg">Place Beaker</button>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <button 
                            onClick={() => setStep('ADD_CACO3')} 
                            disabled={!isEmptyBeakerCorrect}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next Step <ArrowRight size={18} />
                          </button>
                          {!isEmptyBeakerCorrect && recordedEmptyBeaker !== '' && <span className="text-xs text-rose-500 font-medium animate-pulse">Record the correct mass in the data log to continue</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {step === 'ADD_CACO3' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Click the scoopula on the stock jar to add 7.0 g of Calcium Carbonate into the beaker. Record the exact mass added in the data log.</p>
                      <div className="flex flex-col items-center gap-2">
                        {caCO3Mass > 0 && (
                          <button 
                            onClick={() => setStep('MEASURE_HCL')} 
                            disabled={!isCaCO3Correct}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next Step <ArrowRight size={18} />
                          </button>
                        )}
                        {caCO3Mass > 0 && !isCaCO3Correct && recordedCaCO3 !== '' && <span className="text-xs text-rose-500 font-medium animate-pulse">Record the correct mass in the data log to continue</span>}
                      </div>
                    </div>
                  )}
                  {step === 'MEASURE_HCL' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Drag the HCl bottle to the graduated cylinder to measure exactly 165 mL of Hydrochloric Acid (Mass = 168.30 g).</p>
                      <div className="flex flex-col items-center gap-2">
                        {hclInCylinder >= HCL_VOLUME_NEEDED && (
                          <button 
                            onClick={() => setStep('ADD_HCL')} 
                            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg"
                          >
                            Next Step <ArrowRight size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {step === 'ADD_HCL' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Drag the graduated cylinder to the beaker to add the measured Hydrochloric Acid.</p>
                    </div>
                  )}
                  {step === 'RECORD_STARTING_MASS' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Record the mass of HCl added and the starting total mass from the balance before the reaction begins.</p>
                      <div className="flex flex-col items-center gap-2">
                        <button 
                          onClick={() => {
                            setIsReacting(true);
                            setStep('REACTION');
                          }} 
                          disabled={!isHClCorrect || !isStartingMassCorrect}
                          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Start Reaction <ArrowRight size={18} />
                        </button>
                        {(!isHClCorrect || !isStartingMassCorrect) && (recordedHCl !== '' || recordedStartingMass !== '') && <span className="text-xs text-rose-500 font-medium animate-pulse">Record the correct mass in the data log to continue</span>}
                      </div>
                    </div>
                  )}
                  {step === 'REACTION' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Stir the mixture and wait for the bubbling to cease.</p>
                      <div className="flex gap-4 justify-center">
                        <button onMouseDown={() => setIsStirring(true)} onMouseUp={() => setIsStirring(false)} onMouseLeave={() => setIsStirring(false)} className="bg-stone-200 text-stone-800 px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-stone-300 transition-all shadow-sm active:scale-95">Hold to Stir</button>
                        {reactionProgress === 100 && (
                          <button onClick={() => setStep('FINAL_MASS')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg">Final Mass <ArrowRight size={18} /></button>
                        )}
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-4">
                        <motion.div className="bg-emerald-500 h-full" animate={{ width: `${reactionProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {step === 'FINAL_MASS' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Record the final mass in the data log. Notice the decrease due to CO₂ release. <br/><span className="font-bold text-emerald-700">Note: This final mass represents the experimental yield of the beaker's contents.</span></p>
                      <div className="flex flex-col items-center gap-2">
                        <button 
                          onClick={() => setStep('CALCULATE_CO2')} 
                          disabled={!isFinalMassCorrect}
                          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next Step <ArrowRight size={18} />
                        </button>
                        {!isFinalMassCorrect && recordedFinalMass !== '' && <span className="text-xs text-rose-500 font-medium animate-pulse">Record the correct final mass in the data log to continue</span>}
                      </div>
                    </div>
                  )}
                  {step === 'CALCULATE_CO2' && (
                    <div className="space-y-3">
                      <p className="text-sm text-stone-600">Calculate the mass of CO₂ gas lost during the reaction. Subtract the final mass from the starting total mass.</p>
                      <div className="flex flex-col items-center gap-2">
                        <button 
                          onClick={() => setStep('RESULTS')} 
                          disabled={!isCO2LostCorrect}
                          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          View Results <ArrowRight size={18} />
                        </button>
                        {!isCO2LostCorrect && recordedCO2Lost !== '' && <span className="text-xs text-rose-500 font-medium animate-pulse">Record the correct CO₂ lost in the data log to continue</span>}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Equation Bar */}
          <div className="bg-stone-100 rounded-2xl p-4 flex items-center justify-between shrink-0 border border-stone-200">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Chemical Equation</div>
            <div className="text-sm font-mono text-stone-700 font-bold">CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + CO₂(g) + H₂O(l)</div>
            <div className="flex gap-3">
              <Wind size={18} className="text-blue-500" />
              <div className="text-xs font-bold text-stone-600">CO₂ Gas Released</div>
            </div>
          </div>
        </div>

        {/* Right: Data Log */}
        <div className="flex-1 flex flex-col gap-4 w-full lg:max-w-[350px]">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm flex-1">
            <h3 className="text-sm font-bold flex items-center gap-2 text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-4">
              <Info size={16} className="text-emerald-600" />
              Lab Data Log
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div className="flex flex-col border-b border-stone-50 pb-2 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Empty Beaker:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={recordedEmptyBeaker}
                      onChange={(e) => setRecordedEmptyBeaker(e.target.value)}
                      disabled={step === 'INTRO' || !beakerOnScale}
                      className={getInputClass(recordedEmptyBeaker, isEmptyBeakerCorrect)}
                      placeholder="0.00"
                    />
                    <span className="text-stone-500">g</span>
                  </div>
                </div>
                <span className="text-[9px] text-stone-400 font-sans leading-tight">Mass of the clean, dry 250mL beaker before adding any reactants.</span>
              </div>

              <div className="flex flex-col border-b border-stone-50 pb-2 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">CaCO₃ Mass:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={recordedCaCO3}
                      onChange={(e) => setRecordedCaCO3(e.target.value)}
                      disabled={step === 'INTRO' || step === 'MASS_BEAKER' || caCO3Mass === 0}
                      className={getInputClass(recordedCaCO3, isCaCO3Correct)}
                      placeholder="0.00"
                    />
                    <span className="text-stone-500">g</span>
                  </div>
                </div>
                <span className="text-[9px] text-stone-400 font-sans leading-tight">Mass of the solid Calcium Carbonate powder added to the beaker.</span>
              </div>

              <div className="flex flex-col border-b border-stone-50 pb-2 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">HCl Mass:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={recordedHCl}
                      onChange={(e) => setRecordedHCl(e.target.value)}
                      disabled={step === 'INTRO' || step === 'MASS_BEAKER' || step === 'ADD_CACO3' || (hclInCylinder === 0 && hclAdded === 0)}
                      className={getInputClass(recordedHCl, isHClCorrect)}
                      placeholder="0.00"
                    />
                    <span className="text-stone-500">g</span>
                  </div>
                </div>
                <span className="text-[9px] text-stone-400 font-sans leading-tight">Mass of 3.0M Hydrochloric Acid solution to be poured into the beaker.</span>
              </div>

              <div className="flex flex-col border-b border-stone-50 pb-2 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Starting Total:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={recordedStartingMass}
                      onChange={(e) => setRecordedStartingMass(e.target.value)}
                      disabled={step === 'INTRO' || step === 'MASS_BEAKER' || step === 'ADD_CACO3' || hclAdded === 0}
                      className={getInputClass(recordedStartingMass, isStartingMassCorrect)}
                      placeholder="0.00"
                    />
                    <span className="text-stone-500">g</span>
                  </div>
                </div>
                <span className="text-[9px] text-stone-400 font-sans leading-tight">Combined mass of the beaker, CaCO₃, and HCl before the reaction begins.</span>
              </div>

              <div className="flex flex-col border-b border-stone-50 pb-2 gap-1">
                <div className="flex justify-between items-center text-emerald-600 font-bold text-sm">
                  <span>Final Mass:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={recordedFinalMass}
                      onChange={(e) => setRecordedFinalMass(e.target.value)}
                      disabled={step !== 'FINAL_MASS' && step !== 'CALCULATE_CO2' && step !== 'RESULTS'}
                      className={getInputClass(recordedFinalMass, isFinalMassCorrect, true)}
                      placeholder="0.00"
                    />
                    <span className="text-emerald-600">g</span>
                  </div>
                </div>
                <span className="text-[9px] text-emerald-600/70 font-sans leading-tight">Mass of the beaker and its contents after the reaction has completed and CO₂ has escaped.</span>
              </div>

              <div className="flex flex-col pt-2 gap-1">
                <div className="flex justify-between items-center text-blue-600 font-bold text-sm">
                  <span>CO₂ Lost:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={recordedCO2Lost}
                      onChange={(e) => setRecordedCO2Lost(e.target.value)}
                      disabled={step !== 'CALCULATE_CO2' && step !== 'RESULTS'}
                      className={getInputClass(recordedCO2Lost, isCO2LostCorrect)}
                      placeholder="0.00"
                    />
                    <span className="text-blue-600">g</span>
                  </div>
                </div>
                <span className="text-[9px] text-blue-600/70 font-sans leading-tight">Calculated mass of CO₂ gas that escaped during the reaction.</span>
              </div>
              
            </div>
          </div>

          {/* Final Results Card */}
          {step === 'RESULTS' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-stone-900 text-white rounded-2xl p-6 text-center space-y-4 shadow-2xl"
            >
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-lg font-bold">Lab Complete</h4>
                <p className="text-xs text-stone-400 mt-1">All experimental data has been recorded.</p>
              </div>
              <button onClick={resetLab} className="w-full bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-emerald-500 transition-all mt-2">Restart Lab</button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Scratchpad Toggle */}
      <button 
        onClick={() => setShowScratchpad(!showScratchpad)}
        className="fixed bottom-6 right-6 bg-stone-800 text-white p-4 rounded-full shadow-2xl hover:bg-stone-700 transition-colors z-50"
      >
        <Calculator size={24} />
      </button>

      {/* Scratchpad Panel */}
      <AnimatePresence>
        {showScratchpad && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 flex flex-col"
          >
            <div className="bg-stone-100 px-4 py-3 border-b border-stone-200 flex justify-between items-center">
              <h3 className="font-bold text-stone-700 flex items-center gap-2"><Calculator size={16}/> Scratchpad</h3>
              <button onClick={() => setShowScratchpad(false)} className="text-stone-400 hover:text-stone-600"><X size={16}/></button>
            </div>
            <textarea 
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              placeholder="Use this space for calculations (e.g., molar masses, experimental yield)..."
              className="w-full h-64 p-4 resize-none focus:outline-none text-sm font-mono text-stone-700"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
