import * as THREE from "three";

/*
  Two environment maps, blended in the shader. The light rig bakes a handful
  of keyframe environments once, at load; from then on every frame only chooses
  which two keyframes bracket the current moment and how far between them it
  is. Nothing is re-baked while the visitor scrolls.

  three.js samples a single `envMap` for image-based lighting. This patch adds a
  second sampler and a mix factor to the physically based materials and routes
  every environment lookup through a blend of the two. The uniforms are getters
  so a change here reaches every material without touching them.
*/

export const envBlend = {
  mapB: null as THREE.Texture | null,
  mix: 0,
};

const CHUNK = "#include <envmap_physical_pars_fragment>";

function patchedChunk() {
  const source = THREE.ShaderChunk.envmap_physical_pars_fragment as string;
  return (
    /* glsl */ `
    uniform sampler2D envMapB;
    uniform float envMix;
    vec4 sampleEnvBlend( vec3 dir, float roughness ) {
      #ifdef ENVMAP_TYPE_CUBE_UV
        vec4 a = textureCubeUV( envMap, dir, roughness );
        if ( envMix <= 0.0 ) return a;
        vec4 b = textureCubeUV( envMapB, dir, roughness );
        return mix( a, b, envMix );
      #else
        return vec4( 0.0 );
      #endif
    }
    ` + source.replace(/textureCubeUV\(\s*envMap\s*,/g, "sampleEnvBlend(")
  );
}

let chunkCache: string | null = null;

export function patchEnvBlend<T extends THREE.Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.envMapB = {
      get value() {
        return envBlend.mapB ?? shader.uniforms.envMap?.value ?? null;
      },
    } as THREE.IUniform;
    shader.uniforms.envMix = {
      get value() {
        return envBlend.mapB ? envBlend.mix : 0;
      },
    } as THREE.IUniform;
    chunkCache ??= patchedChunk();
    shader.fragmentShader = shader.fragmentShader.replace(CHUNK, chunkCache);
  };
  material.customProgramCacheKey = () => "envblend";
  return material;
}
