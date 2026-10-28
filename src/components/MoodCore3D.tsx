import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EMOTION_LIST, EMOTION_TOKENS, EmotionKey } from '../types/mood';

export type FinishMode = 'obsidian' | 'gold' | 'platinum' | 'crystal';
export type CameraPreset = 'default' | 'closeup' | 'topdown' | 'cinematic';

interface MoodCore3DProps {
  activeEmotion: EmotionKey;
  explodedFactor: number; // 0 to 1
  finishMode: FinishMode;
  cameraPreset: CameraPreset;
  breathScale: number; // 0.85 to 1.35 from breathing orb or idle pulse
  arousal: number; // 0 to 100
}

// Pre-allocated scratch math helpers outside the render loop (Zero GC)
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();
const _targetEmotionColor = new THREE.Color();
const _secondaryEmotionColor = new THREE.Color();

function createProceduralDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 1024, 1024);
  const cx = 512;
  const cy = 512;

  // Concentric calibration rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 2;
  [460, 420, 340, 260].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 72 precision degree ticks
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    const rInner = isMajor ? 425 : 440;
    const rOuter = 458;
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
    ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMicroBumpTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    const wave = Math.sin(x * 0.35) * Math.cos(y * 0.35) * 0.5 + 0.5;
    const v = Math.floor(110 + wave * 45);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export const MoodCore3D: React.FC<MoodCore3DProps> = ({
  activeEmotion,
  explodedFactor,
  finishMode,
  cameraPreset,
  breathScale,
  arousal,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Store mutable props in a ref so React updates never tear down the WebGL canvas
  const stateRef = useRef({
    activeEmotion,
    explodedFactor,
    finishMode,
    cameraPreset,
    breathScale,
    arousal,
  });

  useEffect(() => {
    stateRef.current = {
      activeEmotion,
      explodedFactor,
      finishMode,
      cameraPreset,
      breathScale,
      arousal,
    };
  }, [activeEmotion, explodedFactor, finishMode, cameraPreset, breathScale, arousal]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color('#07090e');
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2('#07090e', 0.042);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Camera & Damped OrbitControls
    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      100
    );
    camera.position.set(0, 2.5, 6.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 2.8;
    controls.maxDistance = 14;
    controls.target.set(0, 1.55, 0);

    let userInteractingWithCamera = false;
    controls.addEventListener('start', () => {
      userInteractingWithCamera = true;
    });

    // 3. Studio 3-Point Lighting Rig + Area Softboxes
    const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x0b0f19, 0.65);
    hemiLight.position.set(0, 15, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(4.5, 7.5, 5.0);
    keyLight.castShadow = !isSoftwareGl;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-4.5, 4.0, -5.0);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0x06b6d4, 3.2, 12, 1.8);
    corePointLight.position.set(0, 1.65, 0);
    scene.add(corePointLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxLeft = new THREE.RectAreaLight(0xffffff, 3.5, 3, 4);
      softboxLeft.position.set(-4, 3.5, 3);
      softboxLeft.lookAt(0, 1.6, 0);
      scene.add(softboxLeft);

      const softboxRight = new THREE.RectAreaLight(0xfef08a, 2.5, 3, 4);
      softboxRight.position.set(4, 3.5, -2);
      softboxRight.lookAt(0, 1.6, 0);
      scene.add(softboxRight);
    }

    // Ground platform & procedural calibration textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const dialTex = createProceduralDialTexture(maxAniso);
    const contactShadowTex = createContactShadowTexture();
    const bumpTex = createMicroBumpTexture();

    const floorGeo = new THREE.CircleGeometry(18, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b11,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // =========================================================================
    // COMPOSITE 9-PART PROCEDURAL MODEL: MoodMate Biometric Neural Gyroscope
    // Pivoted at bottom-center flush with the ground (y = 0)
    // =========================================================================
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    // Shared PBR Materials across silhouette layers (with roughness delta >= 0.25)
    const primaryMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0x161b26,
      roughness: 0.26,
      metalness: 0.92,
      anisotropy: 0.75,
      clearcoat: 0.4,
      normalMap: bumpTex,
      normalScale: new THREE.Vector2(0.08, 0.08),
    });

    const secondaryAlloyMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.16,
      metalness: 0.95,
      anisotropy: 0.85,
      clearcoat: 0.6,
    });

    const satinSlateMat = new THREE.MeshStandardMaterial({
      color: 0x263042,
      roughness: 0.56,
      metalness: 0.62,
    });

    const matteCeramicMat = new THREE.MeshStandardMaterial({
      color: 0x0f141d,
      roughness: 0.82,
      metalness: 0.12,
    });

    // Custom vertex shader pulse uniform for the Crystalline Neural Core
    const corePulseUniforms = {
      uTime: { value: 0 },
      uPulseStrength: { value: 0.06 },
    };

    const crystalCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.35,
      roughness: 0.08,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.68 : 1.0,
      ior: 1.65,
      thickness: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    crystalCoreMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = corePulseUniforms.uTime;
      shader.uniforms.uPulseStrength = corePulseUniforms.uPulseStrength;
      shader.vertexShader =
        `uniform float uTime;\nuniform float uPulseStrength;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float wave = sin(position.x * 4.0 + uTime * 2.5) * cos(position.y * 4.0 + uTime * 2.0) * sin(position.z * 4.0 + uTime * 1.8);
        transformed += normal * wave * uPulseStrength;
        `
      );
    };

    // --- PART 1: Sculpted Pedestal Base (LatheGeometry, flush at y = 0) ---
    const lathePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.45, 0.0),
      new THREE.Vector2(1.38, 0.12),
      new THREE.Vector2(1.15, 0.22),
      new THREE.Vector2(0.95, 0.36),
      new THREE.Vector2(0.55, 0.45),
      new THREE.Vector2(0.0, 0.45),
    ];
    const pedestalGeo = new THREE.LatheGeometry(lathePoints, 48);
    pedestalGeo.computeTangents();
    const pedestalMesh = new THREE.Mesh(pedestalGeo, primaryMetalMat);
    pedestalMesh.castShadow = true;
    pedestalMesh.receiveShadow = true;
    rootGroup.add(pedestalMesh);

    // --- PART 2: Central Crystalline Affective Core (IcosahedronGeometry) ---
    const coreGeo = new THREE.IcosahedronGeometry(0.68, 5);
    coreGeo.computeTangents();
    const coreMesh = new THREE.Mesh(coreGeo, crystalCoreMat);
    coreMesh.position.set(0, 1.65, 0);
    coreMesh.castShadow = true;
    rootGroup.add(coreMesh);

    // Inner glowing nucleus wireframe inside the crystal core
    const innerNucleusGeo = new THREE.OctahedronGeometry(0.38, 2);
    const innerNucleusMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
    });
    const innerNucleusMesh = new THREE.Mesh(innerNucleusGeo, innerNucleusMat);
    coreMesh.add(innerNucleusMesh);

    // --- PART 3: Inner Harmonic Gimbal Ring (TorusGeometry) ---
    const innerGimbalGeo = new THREE.TorusGeometry(0.96, 0.042, 24, 96);
    const innerGimbalMesh = new THREE.Mesh(innerGimbalGeo, secondaryAlloyMat);
    innerGimbalMesh.position.set(0, 1.65, 0);
    innerGimbalMesh.castShadow = true;
    rootGroup.add(innerGimbalMesh);

    // --- PART 4: Middle Azimuth Beveled Ring (ExtrudeGeometry) ---
    const outerR = 1.24;
    const innerR = 1.12;
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    ringShape.holes.push(holePath);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      curveSegments: 64,
    };
    const middleRingGeo = new THREE.ExtrudeGeometry(ringShape, extrudeSettings);
    middleRingGeo.center();
    middleRingGeo.computeTangents();
    const middleRingMesh = new THREE.Mesh(middleRingGeo, satinSlateMat);
    middleRingMesh.position.set(0, 1.65, 0);
    middleRingMesh.castShadow = true;
    rootGroup.add(middleRingMesh);

    // --- PART 5: Outer Orbital Stabilizer Ring (TorusGeometry) ---
    const outerGimbalGeo = new THREE.TorusGeometry(1.48, 0.036, 24, 112);
    const outerGimbalMesh = new THREE.Mesh(outerGimbalGeo, primaryMetalMat);
    outerGimbalMesh.position.set(0, 1.65, 0);
    outerGimbalMesh.castShadow = true;
    rootGroup.add(outerGimbalMesh);

    // --- PART 6: Three Curved Stator Struts (TubeGeometry) ---
    const strutsGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 1.05, 0.35, Math.sin(angle) * 1.05),
        new THREE.Vector3(Math.cos(angle) * 1.72, 1.1, Math.sin(angle) * 1.72),
        new THREE.Vector3(Math.cos(angle) * 1.68, 2.25, Math.sin(angle) * 1.68),
        new THREE.Vector3(Math.cos(angle) * 0.72, 2.95, Math.sin(angle) * 0.72),
      ]);
      const strutGeo = new THREE.TubeGeometry(curve, 32, 0.045, 16, false);
      const strutMesh = new THREE.Mesh(strutGeo, matteCeramicMat);
      strutMesh.castShadow = true;
      strutMesh.receiveShadow = true;
      strutsGroup.add(strutMesh);
    }
    rootGroup.add(strutsGroup);

    // --- PART 7: 36 Orbital Micro-Resonators (InstancedMesh > 20 items) ---
    const nodeCount = 36;
    const nodeGeo = new THREE.OctahedronGeometry(0.055, 1);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.85,
    });
    const instancedNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    instancedNodes.frustumCulled = false;

    const nodeScales: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      // ±15% scale variation and per-instance emotion token tint
      const s = 0.85 + (i % 7) * 0.05;
      nodeScales.push(s);
      const token = EMOTION_LIST[i % EMOTION_LIST.length];
      _color.set(token.hex);
      instancedNodes.setColorAt(i, _color);
    }
    if (instancedNodes.instanceColor) {
      instancedNodes.instanceColor.needsUpdate = true;
    }
    rootGroup.add(instancedNodes);

    // --- PART 8: Upper Crown Optical Aperture (LatheGeometry) ---
    const crownPoints = [
      new THREE.Vector2(0.18, 0.0),
      new THREE.Vector2(0.76, 0.0),
      new THREE.Vector2(0.68, 0.14),
      new THREE.Vector2(0.35, 0.24),
      new THREE.Vector2(0.22, 0.28),
    ];
    const crownGeo = new THREE.LatheGeometry(crownPoints, 36);
    crownGeo.computeTangents();
    const crownMesh = new THREE.Mesh(crownGeo, secondaryAlloyMat);
    crownMesh.position.set(0, 2.88, 0);
    crownMesh.castShadow = true;
    rootGroup.add(crownMesh);

    // --- PART 9: Ground Calibration Chapter Ring + Soft Contact Shadow ---
    const chapterGeo = new THREE.PlaneGeometry(4.6, 4.6);
    const chapterMat = new THREE.MeshBasicMaterial({
      map: dialTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const chapterMesh = new THREE.Mesh(chapterGeo, chapterMat);
    chapterMesh.rotation.x = -Math.PI / 2;
    chapterMesh.position.y = 0.02;
    rootGroup.add(chapterMesh);

    const shadowPlaneGeo = new THREE.PlaneGeometry(4.2, 4.2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadowPlaneMesh = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlaneMesh.rotation.x = -Math.PI / 2;
    shadowPlaneMesh.position.y = 0.005;
    rootGroup.add(shadowPlaneMesh);

    // Pre-warm shaders on hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Track last camera preset to re-enable scripted transition when user switches preset
    let lastPreset: CameraPreset = stateRef.current.cameraPreset;
    let currentExploded = stateRef.current.explodedFactor;
    let currentBreath = stateRef.current.breathScale;

    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // Check if camera preset changed via UI dock
      if (st.cameraPreset !== lastPreset) {
        lastPreset = st.cameraPreset;
        userInteractingWithCamera = false;
      }

      // Smoothly damp emotion colors
      const token = EMOTION_TOKENS[st.activeEmotion] || EMOTION_TOKENS.natural;
      _targetEmotionColor.set(token.hex);
      _secondaryEmotionColor.set(token.secondaryHex);

      crystalCoreMat.color.lerp(_targetEmotionColor, 1 - Math.exp(-4.5 * dt));
      crystalCoreMat.emissive.lerp(_targetEmotionColor, 1 - Math.exp(-4.5 * dt));
      innerNucleusMat.emissive.lerp(_secondaryEmotionColor, 1 - Math.exp(-4.5 * dt));
      corePointLight.color.lerp(_targetEmotionColor, 1 - Math.exp(-4.5 * dt));
      rimLight.color.lerp(_secondaryEmotionColor, 1 - Math.exp(-3.5 * dt));

      // Material finish switcher
      if (st.finishMode === 'gold') {
        _color.set('#d97706');
        primaryMetalMat.color.lerp(_color, 1 - Math.exp(-5 * dt));
        secondaryAlloyMat.color.lerp(_targetEmotionColor, 1 - Math.exp(-5 * dt));
      } else if (st.finishMode === 'platinum') {
        _color.set('#cbd5e1');
        primaryMetalMat.color.lerp(_color, 1 - Math.exp(-5 * dt));
        secondaryAlloyMat.color.lerp(_targetEmotionColor, 1 - Math.exp(-5 * dt));
      } else if (st.finishMode === 'crystal') {
        primaryMetalMat.color.lerp(_secondaryEmotionColor, 1 - Math.exp(-5 * dt));
        secondaryAlloyMat.color.lerp(_targetEmotionColor, 1 - Math.exp(-5 * dt));
      } else {
        _color.set('#161b26');
        primaryMetalMat.color.lerp(_color, 1 - Math.exp(-5 * dt));
        secondaryAlloyMat.color.lerp(_targetEmotionColor, 1 - Math.exp(-5 * dt));
      }

      // Exponential damping on exploded view & breathing scale
      currentExploded = THREE.MathUtils.damp(currentExploded, st.explodedFactor, 6, dt);
      currentBreath = THREE.MathUtils.damp(currentBreath, st.breathScale, 5, dt);

      const speedMult = 0.6 + (st.arousal / 100) * 1.4;
      corePulseUniforms.uTime.value = elapsed * speedMult;
      corePulseUniforms.uPulseStrength.value = 0.045 + (st.arousal / 100) * 0.055;

      // Apply breathing scale and gentle levitation to the core
      const coreY = 1.65 + Math.sin(elapsed * 1.6) * 0.05;
      coreMesh.position.y = coreY;
      coreMesh.scale.setScalar(currentBreath);
      coreMesh.rotation.y += dt * 0.35 * speedMult;
      coreMesh.rotation.x += dt * 0.22 * speedMult;
      innerNucleusMesh.rotation.y -= dt * 0.8 * speedMult;

      // Gimbal rotations & exploded-view axial separation
      innerGimbalMesh.position.y = coreY;
      innerGimbalMesh.scale.setScalar(1 + currentExploded * 0.25);
      innerGimbalMesh.rotation.x = elapsed * 0.55 * speedMult;
      innerGimbalMesh.rotation.y = elapsed * 0.38 * speedMult;

      middleRingMesh.position.y = coreY + currentExploded * 0.35;
      middleRingMesh.scale.setScalar(1 + currentExploded * 0.32);
      middleRingMesh.rotation.y = -elapsed * 0.42 * speedMult;
      middleRingMesh.rotation.z = Math.sin(elapsed * 0.7) * 0.35;

      outerGimbalMesh.position.y = coreY - currentExploded * 0.35;
      outerGimbalMesh.scale.setScalar(1 + currentExploded * 0.42);
      outerGimbalMesh.rotation.x = Math.PI / 3 + Math.cos(elapsed * 0.4) * 0.25;
      outerGimbalMesh.rotation.z = elapsed * 0.28 * speedMult;

      crownMesh.position.y = 2.88 + currentExploded * 0.95;
      crownMesh.rotation.y = -elapsed * 0.3;

      strutsGroup.scale.set(
        1 + currentExploded * 0.35,
        1,
        1 + currentExploded * 0.35
      );

      chapterMesh.rotation.z = elapsed * 0.08;

      // Update 36 InstancedMesh orbital resonators with zero GC
      const orbitRadius = 1.85 + currentExploded * 0.85;
      for (let i = 0; i < nodeCount; i++) {
        const phi = (i / nodeCount) * Math.PI * 2 + elapsed * 0.25 * speedMult;
        const ringBand = (i % 3) - 1;
        const r = orbitRadius + ringBand * 0.22;
        const yOffset =
          coreY +
          ringBand * (0.45 + currentExploded * 0.35) +
          Math.sin(elapsed * 2 + i) * 0.08;

        _pos.set(Math.cos(phi) * r, yOffset, Math.sin(phi) * r);
        _euler.set(elapsed + i, elapsed * 0.7, 0);
        _quat.setFromEuler(_euler);
        const s = nodeScales[i] * (0.9 + Math.sin(elapsed * 3 + i) * 0.15);
        _scale.setScalar(s);

        _mat4.compose(_pos, _quat, _scale);
        instancedNodes.setMatrixAt(i, _mat4);
      }
      instancedNodes.instanceMatrix.needsUpdate = true;

      // Smoothly damp camera toward active preset when user is not dragging
      if (!userInteractingWithCamera) {
        if (st.cameraPreset === 'closeup') {
          _targetCamPos.set(0, 1.85, 3.6);
          _targetLookAt.set(0, 1.65, 0);
        } else if (st.cameraPreset === 'topdown') {
          _targetCamPos.set(0, 7.2, 1.2);
          _targetLookAt.set(0, 1.2, 0);
        } else if (st.cameraPreset === 'cinematic') {
          _targetCamPos.set(
            Math.sin(elapsed * 0.18) * 6.4,
            2.3 + Math.sin(elapsed * 0.3) * 0.4,
            Math.cos(elapsed * 0.18) * 6.4
          );
          _targetLookAt.set(0, 1.6, 0);
        } else {
          _targetCamPos.set(0, 2.5, 6.8);
          _targetLookAt.set(0, 1.55, 0);
        }

        camera.position.lerp(_targetCamPos, 1 - Math.exp(-3.5 * dt));
        controls.target.lerp(_targetLookAt, 1 - Math.exp(-4.5 * dt));
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      dialTex.dispose();
      contactShadowTex.dispose();
      bumpTex.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-screen h-screen z-0 overflow-hidden pointer-events-auto"
      aria-label="Interactive 3D Biometric Neural Gyroscope Viewport"
    />
  );
};
