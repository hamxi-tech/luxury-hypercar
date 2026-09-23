# Assets and licences

## Vehicle model: `public/models/aubade.glb` and `aubade-lite.glb`

- **Source:** Khronos Group glTF Sample Assets, `Models/CarConcept`
  (https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept).
- **Author:** Eric Chadwick; owner Darmstadt Graphics Group GmbH (2024). Derived from
  a generic concept car; it is not a real make or model.
- **Licence:** CC BY 4.0. Attribution is given in the page's case study section and in
  the footer. Keep both if the page is reused.
- **Trademark clause:** the original file carries Khronos and 3D Commerce marks on the
  licence plate and the steering-wheel emblem under a separate trademark licence. Both
  nodes (`License Plate`, `InteriorSteeringEmblem`) were removed in preparation, so the
  shipped file contains no Khronos marks.
- **Preparation (scratch script, not in the repo):** removed the two trademark nodes,
  dropped the `KHR_materials_variants` paint variants (paint is set at runtime),
  removed the unused Pearl/Graphite materials, re-encoded textures as WebP at a 1024 px
  cap, then simplified per part with meshoptimizer (painted and glazed panels untouched;
  wipers, rims, interior and small parts reduced) and Draco-compressed.
  - `aubade.glb`: desktop build, 148k triangles, 1.29 MB (original 213k, 11.8 MB).
  - `aubade-lite.glb`: touch-device build, 117k triangles, 512 px textures, 1.01 MB.
- **Runtime:** every material is replaced in `src/components/scene/Vehicle.tsx`; only
  geometry, UVs and the baked occlusion and normal maps come from the file.

## Draco decoder: `public/draco/`

Copied from `three/examples/jsm/libs/draco/gltf/` (three.js, MIT).

## Fonts

Anybody, Familjen Grotesk and Geist Mono, self-hosted through `next/font/google`
(SIL Open Font License).

## Environment

Procedural. There is no HDRI in the project; see `src/components/scene/LightRig.tsx`.

## Not used

No photography, no competitor imagery, no third-party icons.
