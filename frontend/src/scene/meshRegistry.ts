/**
 * meshRegistry — module-scoped Map of block id → THREE.Mesh.
 *
 * Used by useChoreographer to look up the focused block's mesh and run
 * fitToBox. Kept outside Zustand because ref updates shouldn't trigger
 * React re-renders (60 Hz churn during scene construction).
 *
 * Each Block registers its mesh on mount, unregisters on unmount.
 */
import type * as THREE from 'three'

const meshes = new Map<string, THREE.Mesh>()

export function registerMesh(id: string, mesh: THREE.Mesh): void {
  meshes.set(id, mesh)
}

export function unregisterMesh(id: string): void {
  meshes.delete(id)
}

export function getMesh(id: string): THREE.Mesh | undefined {
  return meshes.get(id)
}
