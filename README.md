# Three.js Visual Encyclopedia

**[→ View the Guide](https://neuralpixelgames.github.io/threejs-visual-guide/)**

96 illustrated breakdowns covering every major Three.js concept — geometry, materials, cameras, shaders, post-processing, physics, audio, loaders, helpers, and more. Designed for visual learners who learn better from images than documentation.

---

## What's Inside

| Section | Topics |
|---------|--------|
| Architecture | Scene graph, render loop, core classes |
| Geometry | 21 built-in types, BufferGeometry, custom shapes |
| Materials | MeshBasicMaterial → MeshPhysicalMaterial, PBR |
| Lighting | 7 light types, shadow maps, IBL |
| Objects | Mesh, Group, SkinnedMesh, Sprite, LOD, Instancing |
| Cameras | PerspectiveCamera, OrthographicCamera, CubeCamera |
| Textures | UV mapping, PBR texture sets, HDR, compressed KTX2 |
| Renderer | WebGL vs WebGPU, tone mapping, anti-aliasing |
| Post-Processing | Bloom, SSAO, depth of field, motion blur, LUTs, and more |
| Controls | OrbitControls, FirstPersonControls, PointerLockControls |
| TSL | Three.js Shading Language — node-based shaders |
| Animation | Keyframes, skeletal animation, morph targets |
| Audio | Spatial audio, AudioAnalyser, audio cones |
| Special Objects | Water, Sky, Reflector, CSS3D, Raycaster, Particles |
| Loaders | GLTFLoader, FBXLoader, OBJLoader, DRACOLoader |
| Physics | Rigid body, cloth, vehicle physics, ragdolls |
| Helpers | Grid, Camera, Light, Skeleton helpers |
| Curves | Bezier, CatmullRom, Shape + Extrude |
| Math | Vectors, Quaternions, Matrix4, Euler |

---

## Found Something Wrong?

Images were generated with AI and may contain inaccuracies. If you spot an error in a diagram — wrong label, incorrect description, misleading illustration — please open a PR or issue.

**How to fix an image:**
1. Fork this repo
2. Replace the incorrect image in `images/encyclopedia/` (WebP, 16:9)
3. Open a PR describing what was wrong and what you fixed

**How to fix text:**
1. Open `index.html`
2. Find the `<div class="img-meta">` for the relevant entry
3. Fix the description and open a PR

All contributions are welcome.

---

## Follow for More

Built by [@AIOnlyDeveloper](https://x.com/AIOnlyDeveloper) — follow for more Three.js content, visual guides, and browser game development.

---

## Tech Stack

- Static HTML/CSS/JS — no build step, no framework
- Images: WebP q=90 (96 slides, ~36MB total)
- Hosted on GitHub Pages
- Images generated with Google Gemini 3 Pro

## License

MIT
