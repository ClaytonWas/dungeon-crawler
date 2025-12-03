import * as THREE from 'three'
import { GeometryFactory } from './GeometryFactory'
import { MaterialFactory } from './MaterialFactory'

/**
 * Industry-Standard Scene Loader
 * - Fetches scenes from server (not bundled in client)
 * - Caching and versioning support
 * - Validation and error handling
 * - Scene graph hierarchy
 * - Instanced rendering optimization
 * - LOD support (future)
 */
export class SceneLoader {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/scenes'
    this.cache = new Map()
    this.loadedScenes = new Map()
    this.activeScene = null
    this.debug = options.debug || false
  }
  
  /**
   * Load a scene from server
   * @param {String} sceneId - Scene identifier
   * @param {THREE.Scene} scene - Three.js scene to populate
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Scene metadata
   */
  async loadScene(sceneId, scene, options = {}) {
    const startTime = performance.now()
    this.log(`Loading scene: ${sceneId}`)
    
    try {
      // Fetch scene data from server
      const sceneData = await this.fetchScene(sceneId, options.version)
      
      // Validate scene data
      if (!this.validateScene(sceneData)) {
        throw new Error(`Invalid scene data for: ${sceneId}`)
      }
      
      // Clear previous scene
      if (options.clearScene !== false) {
        this.clearScene(scene)
      }
      
      // Load environment
      await this.loadEnvironment(scene, sceneData.environment)
      
      // Load lights
      const lights = await this.loadLights(scene, sceneData.lights || [])
      
      // Load nodes (scene graph)
      const nodes = await this.loadNodes(scene, sceneData.nodes || [])
      
      // Setup gameplay elements (don't render, just return data)
      const gameplay = this.parseGameplay(sceneData.gameplay || {})
      
      // Store loaded scene
      const sceneMetadata = {
        id: sceneId,
        meta: sceneData.meta,
        data: sceneData,
        lights,
        nodes,
        gameplay,
        loadTime: performance.now() - startTime
      }
      
      this.loadedScenes.set(sceneId, sceneMetadata)
      this.activeScene = sceneId
      
      this.log(`Scene loaded in ${sceneMetadata.loadTime.toFixed(2)}ms`, sceneMetadata)
      
      return sceneMetadata
    } catch (error) {
      this.error(`Failed to load scene: ${sceneId}`, error)
      throw error
    }
  }
  
  /**
   * Fetch scene from server with caching
   */
  async fetchScene(sceneId, version = null) {
    const cacheKey = version ? `${sceneId}@${version}` : sceneId
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      this.log(`Using cached scene: ${cacheKey}`)
      return this.cache.get(cacheKey)
    }
    
    // Fetch from server
    const url = version 
      ? `${this.baseURL}/${sceneId}?v=${version}`
      : `${this.baseURL}/${sceneId}`
    
    this.log(`Fetching scene from server: ${url}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache the data
    this.cache.set(cacheKey, data)
    
    return data
  }
  
  /**
   * Validate scene data structure
   */
  validateScene(data) {
    if (!data || typeof data !== 'object') {
      this.error('Scene data is not an object')
      return false
    }
    
    if (!data.meta || !data.meta.id || !data.meta.version) {
      this.error('Scene missing required meta fields (id, version)')
      return false
    }
    
    if (!data.environment) {
      this.error('Scene missing environment')
      return false
    }
    
    return true
  }
  
  /**
   * Clear scene of all objects except camera and game entities
   */
  clearScene(scene) {
    const objectsToRemove = []
    
    scene.traverse((object) => {
      if (
        object !== scene &&
        object.type !== 'PerspectiveCamera' &&
        object.type !== 'OrthographicCamera' &&
        !object.userData.isPlayer &&
        !object.userData.isEnemy &&
        !object.userData.keepOnSceneChange &&
        !object.userData.isUI
      ) {
        objectsToRemove.push(object)
      }
    })
    
    // Remove and dispose
    objectsToRemove.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj)
      this.disposeObject(obj)
    })
    
    // Clear fog and background
    scene.fog = null
    
    this.log(`Cleared ${objectsToRemove.length} objects from scene`)
  }
  
  /**
   * Dispose of Three.js object properly
   */
  disposeObject(obj) {
    if (obj.geometry) {
      obj.geometry.dispose()
    }
    
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(mat => this.disposeMaterial(mat))
      } else {
        this.disposeMaterial(obj.material)
      }
    }
  }
  
  /**
   * Dispose of material and its textures
   */
  disposeMaterial(material) {
    // Dispose textures
    if (material.map) material.map.dispose()
    if (material.normalMap) material.normalMap.dispose()
    if (material.roughnessMap) material.roughnessMap.dispose()
    if (material.metalnessMap) material.metalnessMap.dispose()
    if (material.emissiveMap) material.emissiveMap.dispose()
    if (material.aoMap) material.aoMap.dispose()
    
    material.dispose()
  }
  
  /**
   * Load environment (skybox, fog, ambient)
   */
  async loadEnvironment(scene, envData) {
    if (!envData) return
    
    // Skybox/Background
    if (envData.skybox) {
      this.loadSkybox(scene, envData.skybox)
    }
    
    // Fog
    if (envData.fog && envData.fog.enabled !== false) {
      this.loadFog(scene, envData.fog)
    }
    
    // Ambient light
    if (envData.ambient) {
      const color = MaterialFactory.parseColor(envData.ambient.color || 0x404040)
      const intensity = envData.ambient.intensity !== undefined ? envData.ambient.intensity : 0.5
      const ambient = new THREE.AmbientLight(color, intensity)
      ambient.userData.sceneLight = true
      scene.add(ambient)
    }
  }
  
  /**
   * Load skybox
   */
  loadSkybox(scene, skyboxData) {
    if (skyboxData.type === 'color') {
      const color = MaterialFactory.parseColor(skyboxData.color || 0x000000)
      scene.background = color
    } else if (skyboxData.type === 'gradient') {
      // TODO: Implement gradient skybox
      this.warn('Gradient skybox not yet implemented')
    } else if (skyboxData.type === 'cubemap') {
      // TODO: Implement cubemap skybox
      this.warn('Cubemap skybox not yet implemented')
    }
  }
  
  /**
   * Load fog
   */
  loadFog(scene, fogData) {
    const color = MaterialFactory.parseColor(fogData.color || 0x000000)
    
    if (fogData.type === 'linear') {
      scene.fog = new THREE.Fog(color, fogData.near || 1, fogData.far || 100)
    } else if (fogData.type === 'exp' || fogData.type === 'exp2') {
      scene.fog = new THREE.FogExp2(color, fogData.density || 0.01)
    }
  }
  
  /**
   * Load lights from scene data
   */
  async loadLights(scene, lightsData) {
    const lights = []
    
    for (const lightData of lightsData) {
      if (lightData.enabled === false) continue
      
      try {
        const light = this.createLight(lightData)
        if (light) {
          scene.add(light)
          
          // Add target for directional/spot lights
          if (light.userData.targetNeedsScene && light.target) {
            scene.add(light.target)
          }
          
          this.log(`Created light: ${lightData.id} (${lightData.type}) at`, lightData.position, 'intensity:', lightData.intensity)
          
          lights.push(light)
        }
      } catch (error) {
        this.error(`Failed to create light: ${lightData.id}`, error)
      }
    }
    
    return lights
  }
  
  /**
   * Create a single light
   */
  createLight(config) {
    const color = MaterialFactory.parseColor(config.color || 0xffffff)
    const intensity = config.intensity !== undefined ? config.intensity : 1
    
    let light
    
    switch (config.type) {
      case 'ambient':
        light = new THREE.AmbientLight(color, intensity)
        break
      
      case 'directional':
        light = new THREE.DirectionalLight(color, intensity)
        if (config.castShadow) {
          light.castShadow = true
          if (config.shadowMapSize) {
            light.shadow.mapSize.set(config.shadowMapSize[0], config.shadowMapSize[1])
          }
        }
        break
      
      case 'point':
        light = new THREE.PointLight(color, intensity)
        light.distance = config.distance !== undefined ? config.distance : 0
        light.decay = config.decay !== undefined ? config.decay : 2
        if (config.castShadow) {
          light.castShadow = true
          if (config.shadowMapSize) {
            light.shadow.mapSize.set(config.shadowMapSize[0], config.shadowMapSize[1])
          }
        }
        break
      
      case 'spot':
        light = new THREE.SpotLight(color, intensity)
        if (config.distance) light.distance = config.distance
        if (config.angle) light.angle = config.angle
        if (config.penumbra !== undefined) light.penumbra = config.penumbra
        if (config.decay !== undefined) light.decay = config.decay
        if (config.castShadow) {
          light.castShadow = true
          if (config.shadowMapSize) {
            light.shadow.mapSize.set(config.shadowMapSize[0], config.shadowMapSize[1])
          }
        }
        break
      
      case 'hemisphere':
        const skyColor = MaterialFactory.parseColor(config.skyColor || 0xffffff)
        const groundColor = MaterialFactory.parseColor(config.groundColor || 0x444444)
        light = new THREE.HemisphereLight(skyColor, groundColor, intensity)
        break
      
      default:
        this.warn(`Unknown light type: ${config.type}`)
        return null
    }
    
    // Set transform
    if (config.position) {
      light.position.set(...config.position)
    }
    
    if (config.rotation) {
      light.rotation.set(...config.rotation)
    }
    
    // Set target for directional/spot lights
    if (config.target && (light.type === 'DirectionalLight' || light.type === 'SpotLight')) {
      light.target.position.set(...config.target)
      light.userData.targetNeedsScene = true
    }
    
    // Store metadata
    light.userData.id = config.id
    light.userData.sceneLight = true
    
    return light
  }
  
  /**
   * Load nodes (scene graph)
   */
  async loadNodes(scene, nodesData) {
    const nodes = []
    const nodeMap = new Map()
    
    // First pass: Create all nodes
    for (const nodeData of nodesData) {
      if (nodeData.enabled === false) continue
      
      try {
        const node = await this.createNode(nodeData)
        if (node) {
          nodeMap.set(nodeData.id, { data: nodeData, object: node })
          nodes.push(node)
        }
      } catch (error) {
        this.error(`Failed to create node: ${nodeData.id}`, error)
      }
    }
    
    // Second pass: Build hierarchy
    for (const [id, { data, object }] of nodeMap.entries()) {
      if (data.children && data.children.length > 0) {
        for (const childId of data.children) {
          const child = nodeMap.get(childId)
          if (child) {
            object.add(child.object)
          } else {
            this.warn(`Child node not found: ${childId}`)
          }
        }
      }
      
      // Add root nodes to scene
      if (!data.parent) {
        scene.add(object)
      }
    }
    
    return nodes
  }
  
  /**
   * Create a single node
   */
  async createNode(nodeData) {
    if (nodeData.type === 'instance' && nodeData.instances) {
      return this.createInstancedNode(nodeData)
    }
    
    if (nodeData.type === 'group' || nodeData.type === 'empty') {
      return this.createGroupNode(nodeData)
    }
    
    if (nodeData.type === 'mesh') {
      return this.createMeshNode(nodeData)
    }
    
    this.warn(`Unknown node type: ${nodeData.type}`)
    return null
  }
  
  /**
   * Create a mesh node
   */
  createMeshNode(nodeData) {
    // Create geometry
    const geometry = nodeData.geometry
      ? GeometryFactory.create(nodeData.geometry.primitive, nodeData.geometry.parameters || {})
      : new THREE.BoxGeometry(1, 1, 1)
    
    // Create material
    const material = nodeData.material
      ? MaterialFactory.create(nodeData.material)
      : new THREE.MeshStandardMaterial()
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material)
    
    // Apply transform
    this.applyTransform(mesh, nodeData.transform)
    
    // Apply rendering settings
    if (nodeData.rendering) {
      if (nodeData.rendering.castShadow) mesh.castShadow = true
      if (nodeData.rendering.receiveShadow) mesh.receiveShadow = true
      if (nodeData.rendering.visible !== undefined) mesh.visible = nodeData.rendering.visible
      if (nodeData.rendering.renderOrder !== undefined) mesh.renderOrder = nodeData.rendering.renderOrder
    }
    
    // Store metadata
    mesh.userData.id = nodeData.id
    mesh.userData.sceneNode = true
    if (nodeData.userData) {
      Object.assign(mesh.userData, nodeData.userData)
    }
    
    return mesh
  }
  
  /**
   * Create an instanced mesh node
   */
  createInstancedNode(nodeData) {
    const geometry = nodeData.geometry
      ? GeometryFactory.create(nodeData.geometry.primitive, nodeData.geometry.parameters || {})
      : new THREE.BoxGeometry(1, 1, 1)
    
    const material = nodeData.material
      ? MaterialFactory.create(nodeData.material)
      : new THREE.MeshStandardMaterial()
    
    const count = nodeData.instances.length
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count)
    
    // Set instance transforms
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Euler()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)
    
    nodeData.instances.forEach((inst, i) => {
      if (inst.position) position.set(...inst.position)
      if (inst.rotation) {
        rotation.set(...inst.rotation)
        quaternion.setFromEuler(rotation)
      }
      if (inst.scale) {
        if (Array.isArray(inst.scale)) {
          scale.set(...inst.scale)
        } else {
          scale.setScalar(inst.scale)
        }
      }
      
      matrix.compose(position, quaternion, scale)
      instancedMesh.setMatrixAt(i, matrix)
    })
    
    instancedMesh.instanceMatrix.needsUpdate = true
    
    // Apply base transform
    this.applyTransform(instancedMesh, nodeData.transform)
    
    // Apply rendering settings
    if (nodeData.rendering) {
      if (nodeData.rendering.castShadow) instancedMesh.castShadow = true
      if (nodeData.rendering.receiveShadow) instancedMesh.receiveShadow = true
    }
    
    instancedMesh.userData.id = nodeData.id
    instancedMesh.userData.sceneNode = true
    instancedMesh.userData.isInstanced = true
    
    return instancedMesh
  }
  
  /**
   * Create a group/empty node
   */
  createGroupNode(nodeData) {
    const group = new THREE.Group()
    
    this.applyTransform(group, nodeData.transform)
    
    group.userData.id = nodeData.id
    group.userData.sceneNode = true
    
    return group
  }
  
  /**
   * Apply transform to object
   */
  applyTransform(object, transform) {
    if (!transform) return
    
    if (transform.position) {
      object.position.set(...transform.position)
    }
    
    if (transform.rotation) {
      object.rotation.set(...transform.rotation)
    }
    
    if (transform.scale) {
      if (Array.isArray(transform.scale)) {
        object.scale.set(...transform.scale)
      } else {
        object.scale.setScalar(transform.scale)
      }
    }
  }
  
  /**
   * Parse gameplay elements (triggers, spawners, etc.)
   */
  parseGameplay(gameplayData) {
    return {
      triggers: gameplayData.triggers || [],
      spawners: gameplayData.spawners || [],
      zones: gameplayData.zones || [],
      navmesh: gameplayData.navmesh || null
    }
  }
  
  /**
   * Get loaded scene metadata
   */
  getScene(sceneId) {
    return this.loadedScenes.get(sceneId)
  }
  
  /**
   * Get active scene
   */
  getActiveScene() {
    return this.activeScene ? this.loadedScenes.get(this.activeScene) : null
  }
  
  /**
   * Unload a scene
   */
  unloadScene(sceneId) {
    const scene = this.loadedScenes.get(sceneId)
    if (!scene) return
    
    // Dispose all objects
    scene.lights.forEach(light => this.disposeObject(light))
    scene.nodes.forEach(node => this.disposeObject(node))
    
    this.loadedScenes.delete(sceneId)
    
    if (this.activeScene === sceneId) {
      this.activeScene = null
    }
    
    this.log(`Unloaded scene: ${sceneId}`)
  }
  
  /**
   * Clear cache
   */
  clearCache(sceneId = null) {
    if (sceneId) {
      this.cache.delete(sceneId)
    } else {
      this.cache.clear()
    }
  }
  
  /**
   * Logging helpers
   */
  log(...args) {
    if (this.debug) console.log('[SceneLoader]', ...args)
  }
  
  warn(...args) {
    console.warn('[SceneLoader]', ...args)
  }
  
  error(...args) {
    console.error('[SceneLoader]', ...args)
  }
}

