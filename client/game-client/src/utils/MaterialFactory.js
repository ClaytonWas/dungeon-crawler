import * as THREE from 'three'

/**
 * Factory for creating Three.js materials from scene definitions
 */
export class MaterialFactory {
  static create(config = {}) {
    const type = config.type || 'standard'
    const params = this.parseParams(config)
    
    switch (type) {
      case 'standard':
        return new THREE.MeshStandardMaterial(params)
      
      case 'basic':
        return new THREE.MeshBasicMaterial(params)
      
      case 'phong':
        return new THREE.MeshPhongMaterial(params)
      
      case 'physical':
        return new THREE.MeshPhysicalMaterial(params)
      
      case 'toon':
        return new THREE.MeshToonMaterial(params)
      
      default:
        console.warn(`[MaterialFactory] Unknown material type: ${type}`)
        return new THREE.MeshStandardMaterial(params)
    }
  }
  
  static parseParams(config) {
    const params = {}
    
    if (config.color) params.color = this.parseColor(config.color)
    if (config.emissive) params.emissive = this.parseColor(config.emissive)
    if (config.emissiveIntensity !== undefined) params.emissiveIntensity = config.emissiveIntensity
    if (config.metalness !== undefined) params.metalness = config.metalness
    if (config.roughness !== undefined) params.roughness = config.roughness
    if (config.opacity !== undefined) params.opacity = config.opacity
    if (config.transparent !== undefined) params.transparent = config.transparent
    if (config.wireframe !== undefined) params.wireframe = config.wireframe
    if (config.side) params.side = this.parseSide(config.side)
    
    return params
  }
  
  static parseColor(color) {
    if (typeof color === 'string') {
      if (color.startsWith('0x')) {
        return new THREE.Color(parseInt(color, 16))
      }
      return new THREE.Color(color)
    }
    return new THREE.Color(color)
  }
  
  static parseSide(side) {
    switch (side) {
      case 'front': return THREE.FrontSide
      case 'back': return THREE.BackSide
      case 'double': return THREE.DoubleSide
      default: return THREE.FrontSide
    }
  }
}

