/**
 * Glowing edge material — focused-block rim.
 * Source: .claude/skills/raptor-tma-3d/references/materials.md recipe 1.
 *
 * emissiveIntensity > 1 is what causes selective Bloom (luminanceThreshold=1.0)
 * to pick this up. Sibling blocks at intensity 1.0 stay dim.
 */
import * as THREE from 'three'

export function glow(emissiveColor = '#00b2ff', intensity = 2.4): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#0a1628',
    emissive: emissiveColor,
    emissiveIntensity: intensity,
    metalness: 0.6,
    roughness: 0.35,
    transparent: true,
    opacity: 1,
  })
}
