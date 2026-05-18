/**
 * Dark anodized aluminum — the default for L0 tile plates and L1/L2 core/cluster blocks.
 * Source: .claude/skills/raptor-tma-3d/references/materials.md recipe 3.
 */
import * as THREE from 'three'

export function anodized(color = '#1a1d24'): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.85,
    roughness: 0.42,
    clearcoat: 0.4,
    clearcoatRoughness: 0.6,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 1,
  })
}
