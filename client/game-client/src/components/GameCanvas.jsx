import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { SceneLoader } from '../utils/SceneLoader'

export default function GameCanvas() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneLoaderRef = useRef(null)
  const playersRef = useRef({})
  const enemiesRef = useRef({})
  const enemyBoundingBoxesRef = useRef({})
  const attackRadiusRef = useRef(null)
  const damageTextsRef = useRef([])
  const animationRef = useRef(null)
  const keysRef = useRef({})
  const isLockedRef = useRef(false)
  const cameraAngleRef = useRef(0) // Horizontal rotation (yaw)
  const cameraPitchRef = useRef(0.5) // Vertical angle (pitch) - 0 to 1, 0.5 is middle
  const cameraDistanceRef = useRef(20) // For zoom
  const targetedEnemiesRef = useRef(new Set())
  const socketRef = useRef(null) // Socket ref for animation loop access
  const sceneTransitionRef = useRef(false) // True when switching scenes - snap positions instead of interpolating
  
  // SIMPLE APPROACH: All positions come from the store. Period.
  // The store is the single source of truth for ALL player positions.
  
  const { socket, playerId, players, enemies, inHubWorld, inDungeon, weaponStats, targetedEnemies, damageNumbers, removeDamageNumber, panelCollapsed, chatBubbles } = useGameStore()
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return
    
    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a0a0f)
    sceneRef.current = scene
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 15, 15)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap // Soft shadows
    renderer.physicallyCorrectLights = true // IMPORTANT: Enable physically correct lights for point/spot lights!
    renderer.toneMapping = THREE.ACESFilmicToneMapping // Better lighting
    renderer.toneMappingExposure = 1.0
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    // Initialize Scene Loader
    // Game server is on port 3030, accessible from browser
    sceneLoaderRef.current = new SceneLoader({
      baseURL: `${window.location.protocol}//${window.location.hostname}:3030/api/scenes`,
      debug: true
    })
    
    // Grid helper (optional, for debugging - can be disabled in production)
    const grid = new THREE.GridHelper(100, 50, 0x4a2a2f, 0x3a1a1f)
    grid.userData.keepOnSceneChange = true
    scene.add(grid)
    
    // Animation loop with camera follow
    // FPS tracking
    let lastTime = performance.now()
    let frameCount = 0
    
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      
      // Calculate FPS
      frameCount++
      const currentTime = performance.now()
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime))
        const fpsElement = document.getElementById('fps-counter')
        if (fpsElement) {
          fpsElement.textContent = `FPS: ${fps}`
        }
        frameCount = 0
        lastTime = currentTime
      }
      
      const currentPlayerId = useGameStore.getState().playerId
      const currentSocket = socketRef.current
      const currentPlayers = useGameStore.getState().players
      
      // Process keyboard input and send to server
      const keys = keysRef.current
      let dx = 0, dz = 0
      const moveSpeed = 0.15
      
      if (keys['w']) dz -= 1
      if (keys['s']) dz += 1
      if (keys['a']) dx -= 1
      if (keys['d']) dx += 1
      
      if ((dx !== 0 || dz !== 0) && currentPlayerId && currentSocket) {
        // Normalize diagonal movement
        const length = Math.sqrt(dx * dx + dz * dz)
        dx /= length
        dz /= length
        
        // Apply camera rotation to movement
        const angle = cameraAngleRef.current
        const moveX = dx * Math.cos(angle) + dz * Math.sin(angle)
        const moveZ = -dx * Math.sin(angle) + dz * Math.cos(angle)
        
        // Just send to server - server will update position and broadcast back
        currentSocket.emit('updatePlayerPosition', {
          x: moveX * moveSpeed,
          z: moveZ * moveSpeed
        })
      }
      
      // Update ALL player meshes from store positions (simple interpolation for smoothness)
      const interpolationSpeed = 0.3
      Object.keys(playersRef.current).forEach(id => {
        const mesh = playersRef.current[id]
        const playerData = currentPlayers[id]
        if (mesh && playerData?.position) {
          mesh.position.x += (playerData.position.x - mesh.position.x) * interpolationSpeed
          mesh.position.y += (playerData.position.y - mesh.position.y) * interpolationSpeed
          mesh.position.z += (playerData.position.z - mesh.position.z) * interpolationSpeed
        }
      })
      
      // Update camera to follow local player RIGIDLY (no lerp = perfectly fluid)
      if (currentPlayerId && playersRef.current[currentPlayerId]) {
        const playerMesh = playersRef.current[currentPlayerId]
        
        // Calculate camera position based on horizontal angle, pitch, and zoom distance
        const distance = cameraDistanceRef.current
        const pitch = cameraPitchRef.current // 0 = ground level, 1 = directly above
        
        // Convert pitch to actual height and horizontal distance
        const verticalAngle = pitch * Math.PI * 0.45 // 0 to ~80 degrees
        const horizontalDist = distance * Math.cos(verticalAngle)
        const height = distance * Math.sin(verticalAngle) + 2 // +2 to never go below ground
        
        const offsetX = Math.sin(cameraAngleRef.current) * horizontalDist
        const offsetZ = Math.cos(cameraAngleRef.current) * horizontalDist
        
        // RIGID follow - no lerp, camera matches player exactly
        camera.position.set(
          playerMesh.position.x + offsetX,
          playerMesh.position.y + height,
          playerMesh.position.z + offsetZ
        )
        camera.lookAt(playerMesh.position)
      }
      
      renderer.render(scene, camera)
    }
    animate()
    
    // Handle resize using ResizeObserver to detect container size changes
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      // Update camera aspect ratio (this maintains proper perspective)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      
      // Resize renderer to match container
      renderer.setSize(width, height)
    }
    
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)
    
    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animationRef.current)
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      // Clear all refs when scene is destroyed
      playersRef.current = {}
      enemiesRef.current = {}
      enemyBoundingBoxesRef.current = {}
      attackRadiusRef.current = null
    }
  }, [])
  
  // Load scene based on game state
  useEffect(() => {
    if (!sceneLoaderRef.current || !sceneRef.current) return
    
    const loadSceneAsync = async () => {
      try {
        let sceneId = 'hub_world'
        
        if (inDungeon) {
          sceneId = 'dungeon_corridor'
        } else if (inHubWorld) {
          sceneId = 'hub_world'
        }
        
        console.log(`[GameCanvas] Loading scene: ${sceneId}`)
        await sceneLoaderRef.current.loadScene(sceneId, sceneRef.current)
        console.log(`[GameCanvas] Scene loaded successfully`)
      } catch (error) {
        console.error('[GameCanvas] Failed to load scene:', error)
      }
    }
    
    loadSceneAsync()
    
    // Mark that we're in a scene transition - positions should snap, not interpolate
    sceneTransitionRef.current = true
    console.log('[GameCanvas] Scene transition started - will snap positions')
  }, [inHubWorld, inDungeon])
  
  // Handle pointer lock for camera control
  const handleClick = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.requestPointerLock()
        .catch((err) => {
          // Suppress SecurityError when user exits lock before request completes
          if (err.name !== 'SecurityError') {
            console.error('[GameCanvas] Pointer lock error:', err)
          }
        })
    }
  }, [])
  
  useEffect(() => {
    const handleLockChange = () => {
      isLockedRef.current = document.pointerLockElement === containerRef.current
    }
    
    document.addEventListener('pointerlockchange', handleLockChange)
    return () => document.removeEventListener('pointerlockchange', handleLockChange)
  }, [])
  
  // Mouse movement for camera
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isLockedRef.current) return
      
      const sensitivity = 0.003
      
      // Horizontal rotation (yaw)
      cameraAngleRef.current -= e.movementX * sensitivity
      
      // Vertical rotation (pitch) - moving mouse up looks down at player, mouse down looks from above
      cameraPitchRef.current += e.movementY * sensitivity
      // Clamp pitch between 0.1 (almost ground level) and 0.95 (almost top-down)
      cameraPitchRef.current = Math.max(0.1, Math.min(0.95, cameraPitchRef.current))
    }
    
    // Scroll wheel for zoom
    const handleWheel = (e) => {
      e.preventDefault()
      const zoomSpeed = 2
      cameraDistanceRef.current += e.deltaY > 0 ? zoomSpeed : -zoomSpeed
      // Clamp zoom distance
      cameraDistanceRef.current = Math.max(5, Math.min(50, cameraDistanceRef.current))
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeEventListener('wheel', handleWheel)
    }
  }, [])
  
  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      keysRef.current[e.key.toLowerCase()] = true
    }
    
    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      keysRef.current[e.key.toLowerCase()] = false
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  // Store socket in ref for animation loop access
  useEffect(() => {
    socketRef.current = socket
  }, [socket])
  
  // Sync players to scene
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    
    const currentPlayerId = useGameStore.getState().playerId
    
    // Add/update players
    Object.entries(players).forEach(([id, player]) => {
      const existingMesh = playersRef.current[id]
      
      // Check if we need to recreate the mesh (shape or color changed)
      if (existingMesh) {
        const currentColor = existingMesh.material.color.getHex()
        const newColor = typeof player.color === 'string' 
          ? parseInt(player.color.replace('#', ''), 16) 
          : (player.color || 0x00ff00)
        
        // If shape or color changed, remove old mesh
        if (existingMesh.userData.shape !== (player.shape || 'cube') || currentColor !== newColor) {
          scene.remove(existingMesh)
          existingMesh.geometry.dispose()
          existingMesh.material.dispose()
          delete playersRef.current[id]
        } else if (player.position && sceneTransitionRef.current) {
          // During scene transitions, snap all positions immediately
          existingMesh.position.set(player.position.x, player.position.y, player.position.z)
          console.log(`[GameCanvas] Snapped player ${id} to position during scene transition`)
        }
      }
      
      if (!playersRef.current[id]) {
        // Create new player mesh
        const shape = player.shape || 'cube'
        const geometry = getPlayerGeometry(shape)
        const color = typeof player.color === 'string' 
          ? parseInt(player.color.replace('#', ''), 16) 
          : (player.color || 0x00ff00)
        const material = new THREE.MeshStandardMaterial({ color })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.userData.shape = shape
        mesh.userData.isPlayer = true
        
        // Set initial position from server data
        const pos = player.position || { x: 0, y: 0.5, z: 0 }
        mesh.position.set(pos.x, pos.y, pos.z)
        
        scene.add(mesh)
        playersRef.current[id] = mesh
        console.log(`Created player mesh for ${id}:`, { shape, color: color.toString(16), position: player.position })
      }
    })
    
    // Clear scene transition flag after processing all players
    if (sceneTransitionRef.current) {
      sceneTransitionRef.current = false
      console.log('[GameCanvas] Scene transition complete - resuming interpolation')
    }
    
    // Remove disconnected players
    Object.keys(playersRef.current).forEach(id => {
      if (!players[id]) {
        scene.remove(playersRef.current[id])
        playersRef.current[id].geometry.dispose()
        playersRef.current[id].material.dispose()
        delete playersRef.current[id]
      }
    })
    
  }, [players, playerId])
  
  // Sync enemies to scene
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    
    enemies.forEach(enemy => {
      if (!enemiesRef.current[enemy.id]) {
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.userData.isEnemy = true  // ← IMPORTANT: Mark as enemy so it's not cleared by SceneLoader!
        mesh.position.set(enemy.position?.x || 0, 0.75, enemy.position?.z || 0)
        scene.add(mesh)
        enemiesRef.current[enemy.id] = mesh
      } else {
        const mesh = enemiesRef.current[enemy.id]
        if (enemy.position) {
          mesh.position.set(enemy.position.x, 0.75, enemy.position.z)
        }
      }
    })
    
    // Remove dead enemies
    const enemyIds = enemies.map(e => e.id)
    Object.keys(enemiesRef.current).forEach(id => {
      if (!enemyIds.includes(id)) {
        scene.remove(enemiesRef.current[id])
        enemiesRef.current[id].geometry.dispose()
        enemiesRef.current[id].material.dispose()
        delete enemiesRef.current[id]
        
        // Also remove bounding box
        if (enemyBoundingBoxesRef.current[id]) {
          scene.remove(enemyBoundingBoxesRef.current[id])
          enemyBoundingBoxesRef.current[id].geometry.dispose()
          enemyBoundingBoxesRef.current[id].material.dispose()
          delete enemyBoundingBoxesRef.current[id]
        }
      }
    })
  }, [enemies])
  
  // Attack radius indicator
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !inDungeon) return
    
    const radius = weaponStats?.attackRadius || 5
    
    // Remove old radius indicator
    if (attackRadiusRef.current) {
      scene.remove(attackRadiusRef.current)
      attackRadiusRef.current.geometry.dispose()
      attackRadiusRef.current.material.dispose()
    }
    
    // Create new attack radius circle
    const geometry = new THREE.RingGeometry(radius - 0.1, radius, 64)
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff4444, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1
    ring.userData.keepOnSceneChange = true  // ← Don't clear attack radius
    scene.add(ring)
    attackRadiusRef.current = ring
    
    return () => {
      if (attackRadiusRef.current && scene) {
        scene.remove(attackRadiusRef.current)
      }
    }
  }, [weaponStats?.attackRadius, inDungeon])
  
  // Update attack radius position to follow player
  useEffect(() => {
    const updateRadiusPosition = () => {
      const currentPlayerId = useGameStore.getState().playerId
      if (attackRadiusRef.current && currentPlayerId && playersRef.current[currentPlayerId]) {
        const playerMesh = playersRef.current[currentPlayerId]
        attackRadiusRef.current.position.x = playerMesh.position.x
        attackRadiusRef.current.position.z = playerMesh.position.z
      }
    }
    
    const interval = setInterval(updateRadiusPosition, 16)
    return () => clearInterval(interval)
  }, [])
  
  // Update targeted enemy bounding boxes - runs every frame to keep in sync
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    
    console.log('Targeted enemies changed:', targetedEnemies)
    
    const updateBoundingBoxes = () => {
      const currentTargets = useGameStore.getState().targetedEnemies || []
      const currentTargetSet = new Set(currentTargets)
      
      // Remove boxes for enemies no longer targeted
      Object.keys(enemyBoundingBoxesRef.current).forEach(id => {
        if (!currentTargetSet.has(id)) {
          scene.remove(enemyBoundingBoxesRef.current[id])
          enemyBoundingBoxesRef.current[id].geometry.dispose()
          enemyBoundingBoxesRef.current[id].material.dispose()
          delete enemyBoundingBoxesRef.current[id]
        }
      })
      
      // Create/update boxes for all targeted enemies
      currentTargets.forEach(enemyId => {
        const enemyMesh = enemiesRef.current[enemyId]
        if (!enemyMesh) {
          console.log('Enemy mesh not found for:', enemyId)
          return
        }
        
        if (!enemyBoundingBoxesRef.current[enemyId]) {
          console.log('Creating bounding box for enemy:', enemyId)
          // Create new bounding box
          const boxGeometry = new THREE.BoxGeometry(2.2, 2.2, 2.2)
          const edges = new THREE.EdgesGeometry(boxGeometry)
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffff00, 
            linewidth: 3,
            transparent: true,
            opacity: 0.9
          })
          const wireframe = new THREE.LineSegments(edges, lineMaterial)
          wireframe.position.copy(enemyMesh.position)
          wireframe.userData.keepOnSceneChange = true  // ← Don't clear bounding boxes
          scene.add(wireframe)
          enemyBoundingBoxesRef.current[enemyId] = wireframe
        } else {
          // Update position
          enemyBoundingBoxesRef.current[enemyId].position.copy(enemyMesh.position)
        }
      })
    }
    
    // Run immediately and then on interval
    updateBoundingBoxes()
    const interval = setInterval(updateBoundingBoxes, 50)
    
    return () => clearInterval(interval)
  }, [targetedEnemies])
  
  // Project 3D position to screen coordinates for damage numbers
  const projectToScreen = useCallback((x, y, z) => {
    if (!cameraRef.current || !containerRef.current) return null
    
    const vector = new THREE.Vector3(x, y, z)
    vector.project(cameraRef.current)
    
    const widthHalf = containerRef.current.clientWidth / 2
    const heightHalf = containerRef.current.clientHeight / 2
    
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }, [])
  
  // Auto-remove damage numbers after animation - use refs to track scheduled removals
  const scheduledRemovalsRef = useRef(new Set())
  
  useEffect(() => {
    damageNumbers.forEach(dmg => {
      // Only schedule removal once per damage number
      if (!scheduledRemovalsRef.current.has(dmg.id)) {
        scheduledRemovalsRef.current.add(dmg.id)
        setTimeout(() => {
          removeDamageNumber(dmg.id)
          scheduledRemovalsRef.current.delete(dmg.id)
        }, 1200) // Slightly longer than animation
      }
    })
  }, [damageNumbers, removeDamageNumber])
  
  return (
    <div 
      ref={containerRef} 
      onClick={handleClick}
      className="w-full h-full cursor-crosshair relative"
      style={{ zIndex: 1 }}
    >
      {/* Damage Numbers Overlay */}
      {damageNumbers.map(dmg => {
        const screenPos = projectToScreen(dmg.x, dmg.y, dmg.z)
        if (!screenPos) return null
        
        return (
          <div
            key={dmg.id}
            className="absolute pointer-events-none animate-damage-float"
            style={{
              left: screenPos.x,
              top: screenPos.y,
              transform: 'translate(-50%, -50%)',
              color: '#ff4444',
              fontWeight: 'bold',
              fontSize: '24px',
              textShadow: '2px 2px 4px black, -1px -1px 2px black',
              animation: 'damageFloat 1s ease-out forwards'
            }}
          >
            -{dmg.damage}
          </div>
        )
      })}
      
      {/* Chat Bubbles Above Players */}
      {Object.entries(chatBubbles).map(([playerId, bubble]) => {
        const player = players[playerId]
        if (!player || !player.position) return null
        
        // Position bubble above player's head (y + 2 units)
        const screenPos = projectToScreen(player.position.x, player.position.y + 2, player.position.z)
        if (!screenPos) return null
        
        return (
          <div
            key={playerId}
            className="absolute pointer-events-none"
            style={{
              left: screenPos.x,
              top: screenPos.y,
              transform: 'translate(-50%, -100%)',
              animation: 'chatBubbleFade 5s ease-out forwards'
            }}
          >
            <div
              className="glass rounded-lg px-3 py-2 max-w-[200px] break-words"
              style={{
                backgroundColor: 'rgba(20, 10, 15, 0.95)',
                border: '1px solid rgba(139, 0, 0, 0.5)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5), 0 0 10px rgba(139, 0, 0, 0.3)'
              }}
            >
              <p className="text-white text-sm leading-tight">{bubble.message}</p>
            </div>
          </div>
        )
      })}
      
      <style>{`
        @keyframes damageFloat {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-50px);
          }
        }
        
        @keyframes chatBubbleFade {
          0% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.8);
          }
          10% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.9);
          }
        }
      `}</style>
    </div>
  )
}

function getPlayerGeometry(shape) {
  switch (shape) {
    case 'sphere':
      return new THREE.SphereGeometry(0.8, 16, 16)
    case 'cone':
      return new THREE.ConeGeometry(0.6, 1.5, 8)
    default:
      return new THREE.BoxGeometry(1, 1.5, 1)
  }
}

