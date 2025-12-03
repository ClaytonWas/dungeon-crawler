# 🌍 World Creation Guide

Complete guide to creating and editing game worlds using the JSON scene system.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Scene Structure](#scene-structure)
- [Creating Your First World](#creating-your-first-world)
- [Geometry Types](#geometry-types)
- [Material Types](#material-types)
- [Lighting Guide](#lighting-guide)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Create JSON File

```bash
# Create new scene file
cd server/scenes
touch my_dungeon.json
```

### Step 2: Define Basic Scene

```json
{
  "meta": {
    "id": "my_dungeon",
    "version": "1.0.0",
    "type": "dungeon",
    "name": "My First Dungeon",
    "description": "A dark dungeon with torch-lit corridors"
  },
  "environment": {
    "spawn": { "position": [0, 1, 0] },
    "skybox": { "type": "color", "color": "0x0a0000" },
    "ambient": { "color": "0x404040", "intensity": 0.5 }
  },
  "lights": [],
  "nodes": []
}
```

### Step 3: Load in Game

```javascript
// client/game-client/src/components/GameCanvas.jsx
// In the scene loading logic:
if (inDungeon) {
  sceneId = 'my_dungeon'  // Load your scene
}
```

### Step 4: Test

1. **Save the JSON file**
2. **Refresh browser** (no rebuild needed!)
3. **Start dungeon** to see your scene

---

## 📐 Scene Structure

### Meta Block

```json
{
  "meta": {
    "id": "unique_scene_id",        // Required: Must match filename
    "version": "1.0.0",             // Required: Semantic versioning
    "type": "hub|dungeon|test",     // Required: Scene type
    "name": "Display Name",         // Optional: Human-readable name
    "description": "..."            // Optional: Scene description
  }
}
```

### Environment Block

```json
{
  "environment": {
    "spawn": {
      "position": [x, y, z]         // Required: Player spawn point
    },
    "skybox": {
      "type": "color",              // Required: 'color' | 'gradient' | 'cubemap'
      "color": "0xRRGGBB"           // Hex color for sky
    },
    "ambient": {
      "color": "0xRRGGBB",          // Ambient light color
      "intensity": 0.5              // 0.0 to 1.0 (or higher)
    },
    "fog": {                        // Optional: Add fog effect
      "type": "linear",             // 'linear' | 'exp' | 'exp2'
      "color": "0x000000",
      "near": 10,                   // Distance where fog starts
      "far": 100                    // Distance where fog is complete
    }
  }
}
```

### Lights Array

```json
{
  "lights": [
    {
      "id": "light-name",
      "type": "directional|point|spot|hemisphere",
      "color": "0xRRGGBB",
      "intensity": 1.0,
      "position": [x, y, z],
      // ... type-specific properties
    }
  ]
}
```

### Nodes Array

```json
{
  "nodes": [
    {
      "id": "node-name",
      "type": "mesh",
      "geometry": { ... },
      "material": { ... },
      "transform": { ... },
      "rendering": { ... }
    }
  ]
}
```

---

## 🏗️ Creating Your First World

### Example: Simple Room

```json
{
  "meta": {
    "id": "simple_room",
    "version": "1.0.0",
    "type": "dungeon"
  },
  "environment": {
    "spawn": { "position": [0, 1, 0] },
    "skybox": { "type": "color", "color": "0x1a0505" },
    "ambient": { "color": "0x404040", "intensity": 0.6 }
  },
  "lights": [
    {
      "id": "sun",
      "type": "directional",
      "color": "0xffffff",
      "intensity": 1.5,
      "position": [10, 20, 10],
      "target": [0, 0, 0],
      "castShadow": true
    },
    {
      "id": "center-light",
      "type": "point",
      "color": "0xff6600",
      "intensity": 50,
      "position": [0, 5, 0],
      "distance": 30,
      "decay": 1
    }
  ],
  "nodes": [
    {
      "id": "floor",
      "type": "mesh",
      "geometry": {
        "primitive": "plane",
        "parameters": { "width": 50, "height": 50 }
      },
      "material": {
        "type": "standard",
        "color": "0x2a1a1f",
        "roughness": 0.8
      },
      "transform": {
        "position": [0, 0, 0],
        "rotation": [-1.5708, 0, 0]    // -90 degrees in radians
      },
      "rendering": {
        "receiveShadow": true
      }
    },
    {
      "id": "wall-north",
      "type": "mesh",
      "geometry": {
        "primitive": "box",
        "parameters": { "width": 50, "height": 10, "depth": 1 }
      },
      "material": {
        "type": "standard",
        "color": "0x3a2a2f",
        "roughness": 0.9
      },
      "transform": {
        "position": [0, 5, -25]
      },
      "rendering": {
        "castShadow": true,
        "receiveShadow": true
      }
    }
  ]
}
```

---

## 📦 Geometry Types

### Box

```json
{
  "primitive": "box",
  "parameters": {
    "width": 10,    // X axis
    "height": 5,    // Y axis
    "depth": 2      // Z axis
  }
}
```

**Use for**: Walls, platforms, pillars

### Plane

```json
{
  "primitive": "plane",
  "parameters": {
    "width": 100,
    "height": 100
  }
}
```

**Use for**: Floors, ceilings, walls

**Important**: Rotate by -90° on X axis for floor: `"rotation": [-1.5708, 0, 0]`

### Sphere

```json
{
  "primitive": "sphere",
  "parameters": {
    "radius": 2,
    "widthSegments": 32,    // More = smoother
    "heightSegments": 16
  }
}
```

**Use for**: Decorations, orbs, planets

### Cylinder

```json
{
  "primitive": "cylinder",
  "parameters": {
    "radiusTop": 1,
    "radiusBottom": 1.5,
    "height": 10,
    "radialSegments": 8     // More = rounder
  }
}
```

**Use for**: Pillars, torches, towers

### Cone

```json
{
  "primitive": "cone",
  "parameters": {
    "radius": 2,
    "height": 5,
    "radialSegments": 8
  }
}
```

**Use for**: Roofs, spikes, markers

### Torus

```json
{
  "primitive": "torus",
  "parameters": {
    "radius": 3,          // Ring radius
    "tube": 0.5,          // Tube thickness
    "radialSegments": 16,
    "tubularSegments": 32
  }
}
```

**Use for**: Rings, decorations, portals

---

## 🎨 Material Types

### Standard Material (Recommended)

```json
{
  "type": "standard",
  "color": "0x8a2a2f",
  "roughness": 0.8,        // 0 = mirror, 1 = matte
  "metalness": 0.2,        // 0 = non-metal, 1 = metal
  "emissive": "0x000000",  // Glow color (optional)
  "emissiveIntensity": 0   // Glow strength (optional)
}
```

**Best for**: Most objects (realistic lighting)

### Basic Material

```json
{
  "type": "basic",
  "color": "0xff0000"
}
```

**Best for**: UI elements, unlit objects (ignores lighting)

### Phong Material

```json
{
  "type": "phong",
  "color": "0x00ff00",
  "specular": "0xffffff",  // Highlight color
  "shininess": 30          // Highlight sharpness
}
```

**Best for**: Shiny objects (older material system)

---

## 💡 Lighting Guide

### Ambient Light

```json
{
  "id": "ambient",
  "type": "ambient",
  "color": "0x404040",
  "intensity": 0.5
}
```

**Purpose**: Base lighting for entire scene  
**Tip**: Keep intensity low (0.3-0.8)

### Directional Light (Sunlight)

```json
{
  "id": "sun",
  "type": "directional",
  "color": "0xffffff",
  "intensity": 1.5,
  "position": [10, 20, 10],  // Light source position
  "target": [0, 0, 0],       // Where it points
  "castShadow": true,
  "shadowMapSize": [2048, 2048]
}
```

**Purpose**: Parallel light (sun, moon)  
**Tip**: Best for outdoor scenes

### Point Light (Torch)

```json
{
  "id": "torch",
  "type": "point",
  "color": "0xff6600",
  "intensity": 50,           // High intensity needed!
  "position": [0, 5, 0],
  "distance": 30,            // Light range
  "decay": 1                 // 1 = realistic, 2 = more falloff
}
```

**Purpose**: Light radiating from a point  
**Tip**: Use HIGH intensity (30-100+) with `physicallyCorrectLights`

### Spot Light

```json
{
  "id": "spotlight",
  "type": "spot",
  "color": "0xffffff",
  "intensity": 50,
  "position": [0, 10, 0],
  "target": [0, 0, 0],
  "angle": 0.5,              // Cone angle in radians
  "penumbra": 0.2,           // Edge softness (0-1)
  "distance": 50,
  "decay": 1,
  "castShadow": true
}
```

**Purpose**: Cone-shaped light beam  
**Tip**: Great for dramatic lighting

### Hemisphere Light

```json
{
  "id": "sky",
  "type": "hemisphere",
  "skyColor": "0x87ceeb",    // Sky color
  "groundColor": "0x8b4513", // Ground color
  "intensity": 0.6
}
```

**Purpose**: Sky and ground ambient  
**Tip**: Adds color variation

---

## ✨ Best Practices

### Lighting

1. **Always use `ambient` light** (base illumination)
2. **Point lights need HIGH intensity** (50-100+)
3. **Use `decay: 1`** for realistic falloff
4. **Limit shadows** to 1-2 lights (performance)
5. **Directional light** for main scene lighting

### Geometry

1. **Keep poly count low** (use low `*Segments`)
2. **Reuse geometries** where possible
3. **Use simple shapes** for collision
4. **Group related objects** logically

### Materials

1. **Use `standard`** material for most things
2. **Set `roughness: 0.7-0.9`** for realistic surfaces
3. **Use `emissive`** for glowing objects
4. **Avoid pure white/black** (use grays)

### Performance

1. **Limit lights** to 5-8 per scene
2. **Use shadows sparingly** (1-2 lights max)
3. **Keep meshes under 10k vertices** each
4. **Use fog** to hide distant objects

---

## 🎯 Examples

### Dark Dungeon

```json
{
  "environment": {
    "skybox": { "type": "color", "color": "0x000000" },
    "ambient": { "color": "0x202020", "intensity": 0.3 },
    "fog": { "type": "exp2", "color": "0x000000", "density": 0.05 }
  },
  "lights": [
    {
      "type": "directional",
      "intensity": 0.5,
      "castShadow": true
    },
    {
      "type": "point",
      "color": "0xff4400",
      "intensity": 30,
      "distance": 20,
      "decay": 2
    }
  ]
}
```

### Bright Hub World

```json
{
  "environment": {
    "skybox": { "type": "color", "color": "0x87ceeb" },
    "ambient": { "color": "0x606060", "intensity": 0.8 }
  },
  "lights": [
    {
      "type": "directional",
      "intensity": 2.0,
      "castShadow": true
    },
    {
      "type": "hemisphere",
      "skyColor": "0x87ceeb",
      "groundColor": "0x8b4513",
      "intensity": 0.6
    }
  ]
}
```

### Mystical Arena

```json
{
  "environment": {
    "skybox": { "type": "color", "color": "0x1a0a2e" },
    "ambient": { "color": "0x4a2a6f", "intensity": 0.4 },
    "fog": { "type": "linear", "color": "0x1a0a2e", "near": 20, "far": 60 }
  },
  "lights": [
    {
      "type": "point",
      "color": "0x00ffff",
      "intensity": 60,
      "position": [10, 5, 10]
    },
    {
      "type": "point",
      "color": "0xff00ff",
      "intensity": 60,
      "position": [-10, 5, -10]
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Scene is Pitch Black

**Problem**: Can't see anything  
**Solution**:
1. Increase ambient light intensity: `0.5-0.8`
2. Add directional light with `intensity: 1.5-2.0`
3. Point lights need `intensity: 50+` and `distance: 30+`
4. Set `renderer.physicallyCorrectLights = true` (already done in GameCanvas)

### Objects Not Visible

**Problem**: Geometry exists but can't see it  
**Solution**:
1. Check material color isn't black (`0x000000`)
2. Ensure object is at spawn position
3. Check Y position (not underground)
4. Verify geometry parameters (not zero size)

### Shadows Not Working

**Problem**: No shadows appearing  
**Solution**:
1. Set `castShadow: true` on light
2. Set `castShadow: true` on object (caster)
3. Set `receiveShadow: true` on floor (receiver)
4. Directional light needs `shadowMapSize: [2048, 2048]`

### Scene Not Loading

**Problem**: Error in console  
**Solution**:
1. Validate JSON syntax (use jsonlint.com)
2. Check `meta.id` matches filename
3. Ensure scene is in `server/scenes/`
4. Check server logs for errors

### Poor Performance

**Problem**: Low FPS  
**Solution**:
1. Reduce number of lights (max 5-8)
2. Disable shadows on most lights
3. Lower geometry segments
4. Add fog to hide distant objects
5. Use simpler materials

---

## 📝 Quick Reference

### Color Values

```
Dark Red:    0x8a0a0a
Blood Red:   0x8a2a2f
Dark Gray:   0x2a2a2a
Light Gray:  0x808080
Black:       0x000000
White:       0xffffff
Orange:      0xff6600
Blue:        0x0066ff
Green:       0x00ff00
Purple:      0x8800ff
```

### Rotation Values (Radians)

```
0°:    0
45°:   0.7854
90°:   1.5708
180°:  3.1416
270°:  4.7124
360°:  6.2832
```

**Tip**: Use `-1.5708` for floor (rotate plane down)

---

## 🎓 Next Steps

1. **Edit existing scenes** to learn
2. **Create test scene** with one object
3. **Add lighting** gradually
4. **Test in-game** frequently
5. **Iterate and refine**

---

**Need Help?**
- Check `SCENE_QUICK_START.md` for schema details
- See `server/schemas/scene.schema.json` for validation
- Look at existing scenes in `server/scenes/` for examples

---

**Happy World Building!** 🌍✨

