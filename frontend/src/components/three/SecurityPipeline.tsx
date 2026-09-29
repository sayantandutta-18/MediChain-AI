import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, Line, OrbitControls, Text } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';

/**
 * TRD-14: the 3D layer *explains the security pipeline* rather than decorating it.
 * Each node is a real step of the record flow, and the pulse travels along the
 * path in the same order the backend performs it.
 */

interface NodeSpec {
  id: string;
  label: string;
  sublabel: string;
  position: [number, number, number];
  color: string;
}

const NODES: NodeSpec[] = [
  { id: 'patient', label: 'Patient', sublabel: 'Uploads record', position: [-5.4, 0.4, 0], color: '#67e8f9' },
  { id: 'record', label: 'Record', sublabel: 'Validated file', position: [-2.6, 1.5, 0.4], color: '#7dd3fc' },
  { id: 'encrypt', label: 'AES-256-GCM', sublabel: 'Encrypted at rest', position: [0, 0.3, -0.5], color: '#60a5fa' },
  { id: 'hash', label: 'SHA-256', sublabel: 'Integrity digest', position: [2.5, -1.1, 0.4], color: '#a78bfa' },
  { id: 'chain', label: 'Sui', sublabel: 'Hash anchored', position: [5.2, 0.6, -0.3], color: '#34d399' },
];

const STEP_ORDER = NODES.map((node) => node.id);

/** A single pipeline node with a soft halo and a click-through label. */
const PipelineNode = ({
  node,
  isActive,
  onSelect,
}: {
  node: NodeSpec;
  isActive: boolean;
  onSelect: (id: string) => void;
}) => {
  const meshRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      const scale = isActive ? 1.18 + Math.sin(t * 3) * 0.06 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.15);
    }
    if (haloRef.current) {
      const material = haloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = isActive ? 0.25 + Math.sin(t * 2.4) * 0.12 : 0.07;
    }
  });

  return (
    <group position={node.position}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.82, 24, 24]} />
        <meshBasicMaterial color={node.color} transparent opacity={0.1} depthWrite={false} />
      </mesh>

      <mesh
        ref={meshRef}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isActive ? 1.1 : 0.35}
          roughness={0.25}
          metalness={0.65}
        />
      </mesh>

      <Html center distanceFactor={9} position={[0, -0.95, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap text-center">
          <p className="text-[11px] font-semibold tracking-wide text-white">{node.label}</p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400">{node.sublabel}</p>
        </div>
      </Html>
    </group>
  );
};

/** A packet that travels Patient -> ... -> Verification. */
const DataPacket = ({ curve, progress }: { curve: THREE.CatmullRomCurve3; progress: number }) => {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const point = curve.getPointAt(progress % 1);
    ref.current.position.copy(point);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.11, 16, 16]} />
      <meshBasicMaterial color="#ffffff" />
      <pointLight color="#67e8f9" intensity={2.4} distance={2.2} />
    </mesh>
  );
};

const PipelineScene = ({ activeStep, onStepChange }: { activeStep: number; onStepChange: (index: number) => void }) => {
  const groupRef = useRef<Group>(null);
  const [progress, setProgress] = useState(0);

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        NODES.map((node) => new THREE.Vector3(...node.position)),
        false,
        'catmullrom',
        0.4,
      ),
    [],
  );

  const linePoints = useMemo(() => curve.getPoints(120), [curve]);

  useFrame((_, delta) => {
    setProgress((prev) => (prev + delta * 0.16) % 1);
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(Date.now() * 0.00012) * 0.16;
    }
  });

  return (
    <group ref={groupRef}>
      {NODES.map((node, index) => (
        <PipelineNode
          key={node.id}
          node={node}
          isActive={index === activeStep}
          onSelect={() => onStepChange(index)}
        />
      ))}

      <Line points={linePoints} color="#22d3ee" lineWidth={1.1} transparent opacity={0.35} />
      <DataPacket curve={curve} progress={progress} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
        <Text
          position={[0, -2.6, 0]}
          fontSize={0.19}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          maxWidth={12}
        >
          Patient → Record → Encryption → SHA-256 → Blockchain → Verification
        </Text>
      </Float>
    </group>
  );
};

export interface SecurityPipelineProps {
  className?: string;
  /** Milliseconds between pipeline steps. */
  speed?: number;
}

export const SecurityPipeline = ({ className = '', speed = 2600 }: SecurityPipelineProps) => {
  const [step, setStep] = useState(0);
  const [isPinned, setIsPinned] = useState(false);

  // The pipeline auto-advances until the visitor clicks a node to pin a step.
  useEffect(() => {
    if (isPinned) return undefined;
    const timer = window.setInterval(() => {
      setStep((prev) => (prev + 1) % (STEP_ORDER.length + 1));
    }, speed);
    return () => window.clearInterval(timer);
  }, [speed, isPinned]);

  const handleStepChange = (index: number) => {
    setIsPinned(true);
    setStep(index);
  };

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 1.6, 11], fov: 48 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // TRD-14: capped pixel ratio and no heavy post processing keep this smooth
        // on ordinary laptop GPUs.
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 6]} intensity={0.8} color="#7dd3fc" />
        <pointLight position={[-6, -3, 4]} intensity={0.5} color="#3b82f6" />
        <fog attach="fog" args={['#04060c', 14, 30]} />

        <PipelineScene activeStep={step} onStepChange={handleStepChange} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3.1}
          maxPolarAngle={Math.PI / 1.9}
          autoRotate
          autoRotateSpeed={0.35}
        />
      </Canvas>
    </div>
  );
};

export const PIPELINE_STEPS = STEP_ORDER;
