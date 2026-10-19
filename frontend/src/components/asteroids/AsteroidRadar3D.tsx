import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Asteroid } from '@/types';
import { kmToLd } from '@/lib/utils';

interface AsteroidRadar3DProps {
  asteroids: Asteroid[];
  selectedAsteroid: Asteroid | null;
  onSelectAsteroid: (ast: Asteroid | null) => void;
  onHoverAsteroid?: (ast: Asteroid | null, screenPos: { x: number; y: number } | null) => void;
}

export const AsteroidRadar3D: React.FC<AsteroidRadar3DProps> = ({
  asteroids,
  selectedAsteroid,
  onSelectAsteroid,
  onHoverAsteroid,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const asteroidMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const sweepMeshRef = useRef<THREE.Mesh | null>(null);

  // Camera Orbit State
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 110, theta: 0.6, phi: 0.8 });

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.003);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(100, 50, 100);
    scene.add(sunLight);

    const earthGlowLight = new THREE.PointLight(0x22d3ee, 2, 40);
    earthGlowLight.position.set(0, 0, 0);
    scene.add(earthGlowLight);

    // 5. Starfield Particles
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 500;
      starPositions[i + 1] = (Math.random() - 0.5) * 500;
      starPositions[i + 2] = (Math.random() - 0.5) * 500;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x8aebff,
      size: 1.2,
      transparent: true,
      opacity: 0.4,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 6. Central Earth Sphere
    const earthRadius = 4.5;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0f2b48,
      emissive: 0x001f3f,
      roughness: 0.4,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Earth wireframe glow grid
    const earthWireMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const earthWire = new THREE.Mesh(earthGeo, earthWireMat);
    scene.add(earthWire);

    // Atmospheric Glow Ring
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.15, 32, 32);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));

    // 7. Lunar Distance Reference Rings (1 LD, 5 LD, 10 LD, 20 LD)
    const ringRadii = [
      { ld: 1, r: 12, color: 0x859397, label: '1 LD (Moon Orbit · 384k km)' },
      { ld: 5, r: 30, color: 0x1f2c42, label: '5 LD (1.92M km)' },
      { ld: 10, r: 52, color: 0x2d3f5e, label: '10 LD (3.84M km)' },
      { ld: 20, r: 80, color: 0x1f2c42, label: '20 LD (7.68M km)' },
    ];

    ringRadii.forEach(({ r, color }) => {
      const ringGeo = new THREE.BufferGeometry();
      const segments = 128;
      const positions = new Float32Array((segments + 1) * 3);
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(theta) * r;
      }
      ringGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const ringMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
      });
      scene.add(new THREE.Line(ringGeo, ringMat));
    });

    // Axis Crosshairs
    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          -90, 0, 0, 90, 0, 0,
          0, 0, -90, 0, 0, 90,
        ]),
        3
      )
    );
    const axisMat = new THREE.LineBasicMaterial({
      color: 0x1f2c42,
      transparent: true,
      opacity: 0.4,
    });
    scene.add(new THREE.LineSegments(axisGeo, axisMat));

    // 8. Radar Sweep Visualizer
    const sweepGeo = new THREE.RingGeometry(earthRadius, 85, 32, 1, 0, Math.PI / 6);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.rotation.x = Math.PI / 2;
    scene.add(sweepMesh);
    sweepMeshRef.current = sweepMesh;

    // Update camera position from spherical coordinates
    const updateCamera = () => {
      const s = sphericalRef.current;
      camera.position.x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
      camera.position.y = s.radius * Math.cos(s.phi);
      camera.position.z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    // Mouse Drag Controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      sphericalRef.current.theta -= deltaX * 0.008;
      sphericalRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, sphericalRef.current.phi - deltaY * 0.008)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(
        30,
        Math.min(220, sphericalRef.current.radius + e.deltaY * 0.1)
      );
      updateCamera();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId: number = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Rotate Earth slowly
      earthMesh.rotation.y += 0.002;
      earthWire.rotation.y += 0.002;

      // Rotate Radar Sweep
      if (sweepMeshRef.current) {
        sweepMeshRef.current.rotation.z -= 0.015;
      }

      renderer.render(scene, camera);
    };
    animate();
    animationFrameRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Asteroid Meshes when `asteroids` or `selectedAsteroid` changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing asteroid meshes
    asteroidMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    asteroidMeshesRef.current.clear();

    // Map asteroids to scaled 3D positions
    asteroids.forEach((ast, index) => {
      const ld = kmToLd(ast.miss_distance_km);
      // Map Lunar Distance to 3D radar radius (logarithmic non-linear scale)
      // 1 LD -> 12 radius; 20 LD -> 80 radius
      const radius = Math.min(85, Math.max(8, 12 + Math.log2(Math.max(1, ld)) * 15));

      // Deterministic angle based on hash of neo_id or index
      const angle = (index / Math.max(1, asteroids.length)) * Math.PI * 2 + 0.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.sin(angle * 3) * 6); // slight orbital inclination

      // Diameter mapping (scale between 1.0 and 3.0)
      const maxDiam = typeof ast.diameter_max_m === 'number' ? ast.diameter_max_m : parseFloat(ast.diameter_max_m) || 100;
      const meshSize = Math.max(1.2, Math.min(3.2, 1.2 + (maxDiam / 500) * 1.5));

      const isSelected = selectedAsteroid?.neo_id === ast.neo_id;
      const isHazardous = ast.hazardous;

      // Color scheme: Hazardous = Red/Amber glow; Safe = Spectral Violet/Cyan
      const color = isHazardous ? 0xef4444 : 0x8b5cf6;
      const emissive = isHazardous ? 0x991b1b : 0x4c1d95;

      const geo = new THREE.SphereGeometry(meshSize, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffffff : color,
        emissive: isSelected ? 0x22d3ee : emissive,
        emissiveIntensity: isSelected ? 1.5 : 0.8,
        roughness: 0.3,
        metalness: 0.6,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { asteroid: ast };

      // Add orbital trajectory arc
      const trailPoints: THREE.Vector3[] = [];
      const trailSpan = 0.5; // arc length
      for (let t = -trailSpan; t <= trailSpan; t += 0.05) {
        const a = angle + t;
        const r = radius * (1 + t * 0.1);
        trailPoints.push(new THREE.Vector3(Math.cos(a) * r, y + t * 2, Math.sin(a) * r));
      }
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
      const trailMat = new THREE.LineBasicMaterial({
        color: isHazardous ? 0xf59e0b : 0x8b5cf6,
        transparent: true,
        opacity: isSelected ? 0.8 : 0.3,
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      scene.add(trailLine);
      mesh.userData.trailLine = trailLine;

      scene.add(mesh);
      asteroidMeshesRef.current.set(ast.neo_id, mesh);
    });
  }, [asteroids, selectedAsteroid]);

  // Raycaster for Hover and Click detection
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const meshes = Array.from(asteroidMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const topMesh = intersects[0].object as THREE.Mesh;
      const ast = topMesh.userData.asteroid as Asteroid;
      onHoverAsteroid?.(ast, { x: e.clientX, y: e.clientY });
    } else {
      onHoverAsteroid?.(null, null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const meshes = Array.from(asteroidMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const topMesh = intersects[0].object as THREE.Mesh;
      const ast = topMesh.userData.asteroid as Asteroid;
      onSelectAsteroid(ast);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      className="relative w-full h-[600px] md:h-[650px] rounded-2xl overflow-hidden bg-[#070b14] border border-outline-variant/30 shadow-2xl cursor-grab active:cursor-grabbing select-none"
    >
      {/* HUD Radial Scale Markers */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 font-data-sm text-[0.6875rem] text-primary/80 bg-surface-container-lowest/80 p-2.5 rounded-xl border border-outline-variant/30 backdrop-blur-md pointer-events-none">
        <span className="font-bold tracking-widest text-primary uppercase">RADAR RANGE RINGS</span>
        <span>· 1 LD = 384,400 km (Lunar Orbit)</span>
        <span>· 5 LD = 1.92 Million km</span>
        <span>· 10 LD = 3.84 Million km</span>
        <span>· 20 LD = 7.68 Million km</span>
      </div>

      {/* Orbit Controls Hint */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-surface-container-lowest/80 px-3 py-1.5 rounded-lg border border-outline-variant/30 text-xs font-label-caps text-on-surface-variant backdrop-blur-md pointer-events-none">
        <span className="material-symbols-outlined text-[1rem] text-primary">3d_rotation</span>
        <span>Drag to rotate · Scroll to zoom</span>
      </div>

      {/* Scale note at bottom-left */}
      <div className="absolute bottom-4 left-4 z-10 max-w-sm font-data-sm text-[0.65rem] text-on-surface-variant/70 bg-surface-container-lowest/80 p-2 rounded-lg border border-outline-variant/20 backdrop-blur-md pointer-events-none">
        <span className="text-amber-400 font-bold uppercase">SCALE NOTICE:</span> Non-linear
        visual compression applied for interactive observability. Central Earth sphere and Lunar
        orbit are visually enhanced.
      </div>
    </div>
  );
};
