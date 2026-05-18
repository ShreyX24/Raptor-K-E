/**
 * Lighting recipe per skill aesthetic.md.
 *   - Warm directional key from upper-right
 *   - Arc-cyan rim from below-back (the signature "light leaking" effect)
 *   - Cool fill from the left
 *   - Low ambient (don't wash out the rim)
 */
export function Lighting() {
  return (
    <>
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.8}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Arc-cyan rim from below-back — the signature "light leaking" effect */}
      <pointLight
        position={[0, -5, -8]}
        intensity={12}
        color="#00b2ff"
        distance={22}
        decay={1.6}
      />
      <pointLight
        position={[-8, 3, 4]}
        intensity={2}
        color="#4dd0ff"
        distance={25}
        decay={1.8}
      />
      <ambientLight intensity={0.22} />
    </>
  )
}
