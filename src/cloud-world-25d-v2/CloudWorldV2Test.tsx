/**
 * Minimal CloudWorldV2 test — just Canvas with a cube.
 */
import { Canvas } from '@react-three/fiber';

export function CloudWorldV2Test({ onExit }: { onExit: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 48, background: '#142030', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: '#ffe9a8', zIndex: 100 }}>
        <span>TEST MODE</span>
        <button onClick={onExit} style={{ background: '#ffe9a8', color: '#142030', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Back</button>
      </div>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 7]} intensity={1} />
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#ffe9a8" />
        </mesh>
      </Canvas>
    </>
  );
}

export default CloudWorldV2Test;