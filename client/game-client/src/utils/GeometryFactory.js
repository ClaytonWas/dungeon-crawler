import * as THREE from 'three'

/**
 * Factory for creating Three.js geometries from scene definitions
 */
export class GeometryFactory {
  static create(primitive, params = {}) {
    switch (primitive) {
      case 'box':
        return new THREE.BoxGeometry(
          params.width || 1,
          params.height || 1,
          params.depth || 1,
          params.widthSegments || 1,
          params.heightSegments || 1,
          params.depthSegments || 1
        )
      
      case 'sphere':
        return new THREE.SphereGeometry(
          params.radius || 1,
          params.widthSegments || 16,
          params.heightSegments || 16
        )
      
      case 'cylinder':
        return new THREE.CylinderGeometry(
          params.radiusTop !== undefined ? params.radiusTop : (params.radius || 1),
          params.radiusBottom !== undefined ? params.radiusBottom : (params.radius || 1),
          params.height || 1,
          params.radialSegments || 8,
          params.heightSegments || 1,
          params.openEnded || false
        )
      
      case 'cone':
        return new THREE.ConeGeometry(
          params.radius || 1,
          params.height || 1,
          params.radialSegments || 8,
          params.heightSegments || 1,
          params.openEnded || false
        )
      
      case 'plane':
        return new THREE.PlaneGeometry(
          params.width || 1,
          params.height || 1,
          params.widthSegments || 1,
          params.heightSegments || 1
        )
      
      case 'torus':
        return new THREE.TorusGeometry(
          params.radius || 1,
          params.tube || 0.4,
          params.radialSegments || 8,
          params.tubularSegments || 6,
          params.arc || Math.PI * 2
        )
      
      default:
        console.warn(`[GeometryFactory] Unknown primitive: ${primitive}`)
        return new THREE.BoxGeometry(1, 1, 1)
    }
  }
}

