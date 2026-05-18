/**
 * IBL environment for PBR reflections.
 *
 * v1 uses drei's bundled "studio" preset (no asset download needed). Phase 6 polish:
 * download Poly Haven's studio_small_09 (CC0), save to public/hdri/, switch to:
 *   <Environment files="/hdri/studio_small_09_2k.hdr" environmentIntensity={0.4} background={false} />
 */
import { Environment } from '@react-three/drei'

export function EnvironmentSetup() {
  return <Environment preset="studio" environmentIntensity={0.35} background={false} />
}
