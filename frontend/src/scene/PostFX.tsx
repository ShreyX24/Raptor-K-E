/**
 * Post-processing chain per skill postprocessing.md.
 *
 * Order matters — N8AO first (needs normal pass), Bloom/DoF in HDR linear space,
 * color grading before AgX, SMAA last in display space.
 */
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  ToneMapping,
  ChromaticAberration,
  BrightnessContrast,
  HueSaturation,
  SMAA,
  N8AO,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export function PostFX() {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <N8AO
        aoRadius={0.6}
        distanceFalloff={0.4}
        intensity={3}
        screenSpaceRadius
        color="#000814"
        quality="high"
      />
      <Bloom
        mipmapBlur
        intensity={1.4}
        luminanceThreshold={1.0}
        luminanceSmoothing={0.4}
        radius={0.85}
        levels={7}
      />
      {/* DoF disabled for Phase 2 — MD's focusDistance=0 means focal point at the
          near plane, which blurs the whole scene. Re-enable in Phase 6 polish with
          focusDistance computed from camera → scene-center distance (~0.2 for our setup),
          OR switch to autofocus via a focusTarget ref on the focused mesh. */}
      {/* <DepthOfField focusDistance={0.2} focalLength={0.04} bokehScale={1.5} height={720} /> */}
      <ChromaticAberration
        offset={[0.0006, 0.0006]}
        radialModulation
        modulationOffset={0.5}
      />
      <HueSaturation saturation={0.08} />
      <BrightnessContrast brightness={-0.02} contrast={0.12} />
      <Vignette eskil={false} offset={0.18} darkness={0.7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
    </EffectComposer>
  )
}
