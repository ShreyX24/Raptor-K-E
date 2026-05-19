/**
 * Lighting recipe — tuned for the "lit chip die" look in
 * cell-color.jpg and Presentation1_page-0002.jpg.
 *
 * Five sources, all relatively bright:
 *   1. hemisphereLight   — natural sky/ground gradient (cheap, fills shadows)
 *   2. ambientLight      — global fill so nothing reads as flat black
 *   3. directionalLight  — warm key from upper-right (the sun-like rake)
 *   4. pointLight #1     — cyan rim from below-back (the "light leaking
 *                          from under the chip" signature in cell-color.jpg)
 *   5. pointLight #2     — cool fill from the left, softens key shadows
 *
 * Per [[feedback-no-reflection]] all materials are matte, so the lighting
 * does the work of telling shapes apart — hence the higher-than-default
 * ambient + hemisphere combo.
 */
export function Lighting() {
  return (
    <>
      {/* Hemisphere — sky cyan/violet → ground deep blue. Inexpensive, lifts the
          dark corners of the scene the way a softbox would. */}
      <hemisphereLight args={['#9fc8ff', '#0c1230', 0.55]} />

      {/* Global fill — no shadows, no fall-off, prevents "anything in shadow
          goes pitch black". Bumped from 0.22 → 0.45. */}
      <ambientLight intensity={0.45} />

      {/* Warm directional key from upper-right (sun-rake). Slightly brighter
          so cell colours pop on the lit side. */}
      <directionalLight
        position={[6, 10, 4]}
        intensity={2.4}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Arc-cyan rim from below-back — "light leaking from under the chip".
          Brightness bumped so the rim reads strongly in context mode too. */}
      <pointLight
        position={[0, -5, -8]}
        intensity={16}
        color="#00b2ff"
        distance={28}
        decay={1.6}
      />

      {/* Cool fill from the left — softens the warm-key shadows on the left
          half of the chip. */}
      <pointLight
        position={[-8, 3, 4]}
        intensity={3.2}
        color="#4dd0ff"
        distance={28}
        decay={1.8}
      />

      {/* Subtle warm fill from the front-right too — prevents the right side
          of the chip from feeling identically tinted to the left. */}
      <pointLight
        position={[8, 4, 6]}
        intensity={1.8}
        color="#ffb070"
        distance={26}
        decay={1.8}
      />
    </>
  )
}
