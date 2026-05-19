/**
 * Post-processing chain.
 *
 * Minimal pipeline restored after the bottom-left spike-bar corruption was
 * traced to the original pipeline (cause: one of the heavier effects
 * misbehaving against the new bright gradient backdrop — N8AO + Bloom
 * disabled alone didn't fix it, but disabling PostFX entirely did, so
 * we've stripped to just the essentials: tone-mapping + AA + a soft
 * vignette).
 *
 * Bloom is re-enabled with the low-luminance threshold so cell emissive
 * still reads as "glow from within". If the spikes come back, comment
 * out Bloom next.
 */
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  SMAA,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={1.4}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.5}
        radius={0.85}
        levels={6}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
    </EffectComposer>
  )
}
