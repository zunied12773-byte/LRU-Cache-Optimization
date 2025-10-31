import { useState, useEffect, useRef } from "react";
import { CoreDisplay } from "@/components/CoreDisplay";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { ControlPanel } from "@/components/ControlPanel";
import { EventLog } from "@/components/EventLog";
import { EducationalPanel } from "@/components/EducationalPanel";
import { CacheLine, CacheStats, CacheEvent, MemoryAccess } from "@/types/cache";
import {
  initializeCache,
  generateRandomAccesses,
  simulateCacheAccess,
} from "@/utils/cacheSimulator";
import { Cpu } from "lucide-react";

const NUM_CORES = 4;
const INITIAL_ACCESSES = 30;

const Index = () => {
  const [caches, setCaches] = useState<CacheLine[][]>(initializeCache(NUM_CORES));
  const [memoryAccesses, setMemoryAccesses] = useState<MemoryAccess[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [stats, setStats] = useState<CacheStats[]>(
    Array(NUM_CORES).fill({
      hits: 0,
      misses: 0,
      falseSharingCount: 0,
      totalAccesses: 0,
    })
  );
  const [events, setEvents] = useState<CacheEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CacheEvent | undefined>();
  const intervalRef = useRef<number>();

  useEffect(() => {
    generateNewSequence(INITIAL_ACCESSES, NUM_CORES);
  }, []);

  useEffect(() => {
    if (isRunning && currentStep < memoryAccesses.length) {
      intervalRef.current = window.setInterval(() => {
        executeStep();
      }, speed);
    } else if (currentStep >= memoryAccesses.length) {
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, currentStep, speed, memoryAccesses.length]);

  const executeStep = () => {
    if (currentStep >= memoryAccesses.length) {
      setIsRunning(false);
      return;
    }

    const access = memoryAccesses[currentStep];
    const { event, updatedCaches } = simulateCacheAccess(
      access,
      caches,
      currentStep
    );

    setCaches(updatedCaches);
    setCurrentEvent(event);
    setEvents((prev) => [...prev, event]);

    // Update stats
    setStats((prevStats) => {
      const newStats = [...prevStats];
      const coreStats = { ...newStats[access.coreId] };
      
      coreStats.totalAccesses++;
      if (event.type === "hit") {
        coreStats.hits++;
      } else if (event.type === "miss" || event.type === "eviction") {
        coreStats.misses++;
      }
      if (event.type === "false-sharing") {
        coreStats.falseSharingCount++;
      }

      newStats[access.coreId] = coreStats;
      return newStats;
    });

    setCurrentStep((prev) => prev + 1);
  };

  const handlePlayPause = () => {
    if (currentStep >= memoryAccesses.length) {
      handleReset();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setCaches(initializeCache(NUM_CORES));
    setStats(
      Array(NUM_CORES).fill({
        hits: 0,
        misses: 0,
        falseSharingCount: 0,
        totalAccesses: 0,
      })
    );
    setEvents([]);
    setCurrentEvent(undefined);
  };

  const handleStep = () => {
    if (currentStep < memoryAccesses.length) {
      executeStep();
    }
  };

  const generateNewSequence = (numAccesses: number, numCores: number) => {
    const accesses = generateRandomAccesses(numAccesses, numCores, 0.4);
    setMemoryAccesses(accesses);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                LRU Cache Simulator
              </h1>
              <p className="text-sm text-muted-foreground">
                Interactive multicore cache replacement visualization
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Metrics */}
        <MetricsDashboard
          stats={stats}
          currentStep={currentStep}
          totalSteps={memoryAccesses.length}
        />

        {/* Main Simulation Area */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cache Displays */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-semibold">Cache States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caches.map((cache, coreId) => (
                <CoreDisplay
                  key={coreId}
                  coreId={coreId}
                  cache={cache}
                  currentEvent={currentEvent}
                />
              ))}
            </div>
          </div>

          {/* Controls & Event Log */}
          <div className="space-y-4">
            <ControlPanel
              isRunning={isRunning}
              speed={speed}
              numCores={NUM_CORES}
              numAccesses={memoryAccesses.length}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
              onStep={handleStep}
              onSpeedChange={setSpeed}
              onGenerate={generateNewSequence}
            />
            <EventLog events={events} maxEvents={15} />
          </div>
        </div>

        {/* Educational Content */}
        <EducationalPanel />
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built to demonstrate Computer Organization & Architecture concepts
          </p>
          <p className="mt-1">
            LRU Replacement • Cache Coherence • False Sharing Detection
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
