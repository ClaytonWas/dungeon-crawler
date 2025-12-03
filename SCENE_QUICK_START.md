# 🚀 Scene System - Quick Start Guide

## ⚡ Create a New Scene (2 Minutes)

### **Step 1: Copy Template**
```bash
cd server/scenes
cp hub_world.json my_new_scene.json
```

### **Step 2: Edit Metadata**
```json
{
  "meta": {
    "id": "my_new_scene",      ← Change this
    "version": "1.0.0",
    "type": "dungeon",          ← hub|dungeon|arena|town
    "name": "My Awesome Scene"  ← Change this
  }
}
```

### **Step 3: Save**
Done! Scene will load automatically in game.

---

## 📋 Minimal Scene Template

```json
{
  "meta": {
    "id": "minimal_scene",
    "version": "1.0.0",
    "type": "dungeon"
  },
  "environment": {
    "spawn": { "position": [0, 1, 0] },
    "skybox": { "type": "color", "color": "0x0a0a0a" },
    "ambient": { "color": "0x404040", "intensity": 0.4 }
  },
  "lights": [
    {
      "id": "main-light",
      "type": "point",
      "color": "0xffffff",
      "intensity": 2.0,
      "position": [0, 5, 0],
      "distance": 20,
      "decay": 2
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
        "color": "0x333333"
      },
      "transform": {
        "position": [0, 0, 0],
        "rotation": [-1.5708, 0, 0]
      }
    }
  ]
}
```

---

## 🎨 Common Elements

### **Add a Wall**
```json
{
  "id": "wall",
  "type": "mesh",
  "geometry": {
    "primitive": "box",
    "parameters": { "width": 1, "height": 5, "depth": 20 }
  },
  "material": {
    "type": "standard",
    "color": "0x444444"
  },
  "transform": {
    "position": [10, 2.5, 0]
  },
  "rendering": {
    "castShadow": true
  }
}
```

### **Add a Pillar**
```json
{
  "id": "pillar",
  "type": "mesh",
  "geometry": {
    "primitive": "cylinder",
    "parameters": { "radius": 0.5, "height": 8, "radialSegments": 8 }
  },
  "material": {
    "type": "standard",
    "color": "0x333333"
  },
  "transform": {
    "position": [5, 4, 5]
  },
  "rendering": {
    "castShadow": true
  }
}
```

### **Add Multiple Objects (Instancing)**
```json
{
  "id": "trees",
  "type": "instance",
  "geometry": {
    "primitive": "cone",
    "parameters": { "radius": 1, "height": 3, "radialSegments": 8 }
  },
  "material": {
    "type": "standard",
    "color": "0x228B22"
  },
  "instances": [
    { "position": [5, 1.5, 5] },
    { "position": [10, 1.5, 8] },
    { "position": [15, 1.5, 12] }
  ]
}
```

### **Add Point Light**
```json
{
  "id": "torch",
  "type": "point",
  "color": "0xff6600",
  "intensity": 2.0,
  "position": [5, 3, 5],
  "distance": 20,
  "decay": 2
}
```

### **Add Enemy Spawner**
```json
{
  "spawners": [
    {
      "id": "spawn-1",
      "entityType": "enemy",
      "position": [10, 1, 10],
      "count": 5,
      "radius": 3,
      "enabled": true
    }
  ]
}
```

---

## 🎯 Scene Types

### **Hub (Safe Zone)**
```json
{
  "meta": { "type": "hub" },
  "environment": {
    "ambient": { "intensity": 0.6 },
    "skybox": { "color": "0x1a0a0f" }
  }
}
```

### **Dungeon (Dark, Dangerous)**
```json
{
  "meta": { "type": "dungeon" },
  "environment": {
    "ambient": { "intensity": 0.4 },
    "skybox": { "color": "0x0a0a0a" },
    "fog": {
      "enabled": true,
      "type": "exp2",
      "density": 0.03
    }
  }
}
```

### **Arena (Boss Fight)**
```json
{
  "meta": { "type": "arena" },
  "environment": {
    "ambient": { "intensity": 0.5 },
    "skybox": { "color": "0x1a0505" }
  }
}
```

---

## 💡 Pro Tips

### **Lighting**
- **Ambient**: Always use `0.4` - `0.6`
- **Point Lights**: `intensity: 2.0`, `distance: 20`, `decay: 2`
- **Directional**: Include `target: [0, 0, 0]`

### **Performance**
- **Use Instancing**: 100 objects = 1 draw call
- **Limit Lights**: Max 5-7 lights per scene
- **Frustum Culling**: Enabled by default

### **Coordinates**
- **Y-up**: [X, Y, Z] where Y is height
- **Rotation**: In radians
  - Flat ground: `[-1.5708, 0, 0]`
  - 90° turn: `[0, 1.5708, 0]`

### **Colors**
- **Format**: `"0xRRGGBB"` (hex string)
- **Dark dungeon**: `0x0a0a0a`
- **Medium**: `0x333333`
- **Bright**: `0xffffff`

---

## 🐛 Debugging

### **Scene Not Loading**
1. Check server logs: `docker logs dungeon-crawler-server-1`
2. Check browser console: `F12 → Console`
3. Verify JSON syntax: Use JSONLint.com
4. Check `meta.id` matches filename

### **Objects Not Visible**
1. Check ambient light `intensity` (should be ≥ 0.4)
2. Check object `position` (not at [0, 0, 0]?)
3. Check `rendering.visible` (should be `true` or omitted)
4. Check material `color` (not same as skybox?)

### **Performance Issues**
1. Count total nodes (should be < 500)
2. Check light count (should be < 7)
3. Use instancing for repeated objects
4. Enable fog to hide distant objects

---

## 📁 File Locations

```
server/scenes/            ← All scene JSONs here
├── hub_world.json
├── dungeon_corridor.json
└── your_scene.json

server/schemas/           ← Schema documentation
└── scene.schema.json

client/src/utils/         ← Don't edit (auto-loads)
├── SceneLoader.js
├── GeometryFactory.js
└── MaterialFactory.js
```

---

## 🔄 Workflow

1. **Create** scene JSON in `server/scenes/`
2. **Save** file
3. **Restart** server: `docker-compose restart server`
4. **Test** in game (loads automatically!)
5. **Iterate** - no client rebuild needed!

---

## 📚 Full Documentation

- **Complete Guide**: `SCENE_SYSTEM_V2.md`
- **Schema Reference**: `server/schemas/scene.schema.json`

---

## ✨ Example: Complete Room

```json
{
  "meta": {
    "id": "treasure_room",
    "version": "1.0.0",
    "type": "dungeon",
    "name": "Treasure Room"
  },
  "environment": {
    "spawn": { "position": [0, 1, -10] },
    "skybox": { "type": "color", "color": "0x0a0000" },
    "fog": { "enabled": true, "type": "exp2", "color": "0x000000", "density": 0.02 },
    "ambient": { "color": "0x404040", "intensity": 0.4 }
  },
  "lights": [
    {
      "id": "overhead",
      "type": "directional",
      "color": "0x8888bb",
      "intensity": 0.6,
      "position": [0, 10, 0],
      "target": [0, 0, 0]
    },
    {
      "id": "chest-glow",
      "type": "point",
      "color": "0xffdd00",
      "intensity": 2.5,
      "position": [0, 2, 10],
      "distance": 15,
      "decay": 2
    }
  ],
  "nodes": [
    {
      "id": "floor",
      "type": "mesh",
      "geometry": { "primitive": "plane", "parameters": { "width": 30, "height": 30 } },
      "material": { "type": "standard", "color": "0x222222", "roughness": 0.9 },
      "transform": { "position": [0, 0.5, 0], "rotation": [-1.5708, 0, 0] },
      "rendering": { "receiveShadow": true }
    },
    {
      "id": "walls",
      "type": "instance",
      "geometry": { "primitive": "box", "parameters": { "width": 1, "height": 5, "depth": 30 } },
      "material": { "type": "standard", "color": "0x333333", "roughness": 0.8 },
      "rendering": { "castShadow": true },
      "instances": [
        { "position": [-15, 2.5, 0] },
        { "position": [15, 2.5, 0] }
      ]
    },
    {
      "id": "chest",
      "type": "mesh",
      "geometry": { "primitive": "box", "parameters": { "width": 2, "height": 1, "depth": 1 } },
      "material": {
        "type": "standard",
        "color": "0x8B4513",
        "emissive": "0xffdd00",
        "emissiveIntensity": 0.3
      },
      "transform": { "position": [0, 1, 10] },
      "rendering": { "castShadow": true }
    }
  ],
  "gameplay": {
    "triggers": [
      {
        "id": "chest-trigger",
        "type": "sphere",
        "position": [0, 1, 10],
        "radius": 2,
        "action": "openChest",
        "data": { "loot": "legendary" }
      }
    ]
  }
}
```

**Copy, modify, and create!** 🎨✨

