/**
 * Severity → emissive color/intensity tables.
 *
 * Source: .claude/skills/raptor-tma-3d/references/materials.md.
 * Pulse ONLY on CRITICAL (~6 rad/s). YELLOW/RED are static-elevated.
 */
import * as THREE from 'three'
import type { Severity } from '@/state/schema'

export const severityColors: Record<Severity, THREE.Color> = {
  GREEN: new THREE.Color('#00b2ff'),
  YELLOW: new THREE.Color('#ffcc33'),
  RED: new THREE.Color('#ff5566'),
  CRITICAL: new THREE.Color('#ff2233'),
}

export const severityIntensity: Record<Severity, number> = {
  GREEN: 1.0,
  YELLOW: 2.0,
  RED: 4.0,
  CRITICAL: 8.0,
}

export const PULSE_RATE = 6 // rad/s
