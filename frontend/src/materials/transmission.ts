/**
 * Glass / acrylic chip housing parameters.
 * Source: .claude/skills/raptor-tma-3d/references/materials.md recipe 2.
 *
 * Used with drei's <MeshTransmissionMaterial> JSX component:
 *   <MeshTransmissionMaterial {...transmissionProps} />
 */
export const transmissionProps = {
  thickness: 0.6,
  roughness: 0.06,
  transmission: 1,
  ior: 1.45,
  chromaticAberration: 0.04,
  backside: true,
  distortion: 0.05,
  attenuationColor: '#88c5ff',
  attenuationDistance: 2.5,
  color: '#e8f6ff',
} as const
