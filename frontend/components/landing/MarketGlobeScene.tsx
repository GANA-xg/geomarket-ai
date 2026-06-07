"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const cityPoints = [
  { lat: 40.7128, lng: -74.006, color: 0x38bdf8 },
  { lat: 51.5072, lng: -0.1276, color: 0xf97316 },
  { lat: 19.076, lng: 72.8777, color: 0x22c55e },
  { lat: 35.6762, lng: 139.6503, color: 0xa78bfa },
  { lat: 1.3521, lng: 103.8198, color: 0xfacc15 },
  { lat: -33.8688, lng: 151.2093, color: 0xfb7185 },
];

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function makeArc(start: THREE.Vector3, end: THREE.Vector3, color: number) {
  const mid = start.clone().add(end).normalize().multiplyScalar(2.15);
  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const geometry = new THREE.TubeGeometry(curve, 72, 0.008, 8, false);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Mesh(geometry, material);
}

export function MarketGlobeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.045);

    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.28, 5.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = -0.18;
    scene.add(group);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.42, 96, 96),
      new THREE.MeshStandardMaterial({
        color: 0x07111b,
        emissive: 0x09233a,
        emissiveIntensity: 0.55,
        roughness: 0.7,
        metalness: 0.18,
        transparent: true,
        opacity: 0.94,
      })
    );
    group.add(globe);

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(1.435, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      })
    );
    group.add(wire);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.54, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x1d9bf0,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      })
    );
    group.add(atmosphere);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });

    [1.72, 1.98, 2.24].forEach((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.004, 8, 180), ringMaterial.clone());
      ring.rotation.x = Math.PI / 2 + index * 0.18;
      ring.rotation.y = index * 0.38;
      group.add(ring);
    });

    const points = cityPoints.map((point) => ({
      ...point,
      vector: latLngToVector3(point.lat, point.lng, 1.48),
    }));

    points.forEach((point) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshBasicMaterial({ color: point.color })
      );
      marker.position.copy(point.vector);
      group.add(marker);
    });

    const arcs: THREE.Mesh[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const arc = makeArc(points[index].vector, points[(index + 2) % points.length].vector, points[index].color);
      arcs.push(arc);
      group.add(arc);
    }

    const particleCount = 900;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 3.2 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[index * 3 + 1] = radius * Math.cos(phi);
      particlePositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x8fd9ff,
        size: 0.014,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    scene.add(particles);

    const keyLight = new THREE.PointLight(0x60a5fa, 4.2, 10);
    keyLight.position.set(-2.5, 2.4, 3.2);
    scene.add(keyLight);

    const warmLight = new THREE.PointLight(0xf97316, 3.5, 10);
    warmLight.position.set(2.2, -1.7, 2.8);
    scene.add(warmLight);

    scene.add(new THREE.AmbientLight(0x9fb6d1, 0.85));

    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let animationFrame = 0;

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    mount.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onResize);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = elapsed * 0.16 + pointer.x * 0.12;
      group.rotation.x = -0.18 + pointer.y * 0.08;
      particles.rotation.y = elapsed * -0.025;
      particles.rotation.x = Math.sin(elapsed * 0.2) * 0.04;
      atmosphere.scale.setScalar(1 + Math.sin(elapsed * 1.35) * 0.018);
      arcs.forEach((arc, index) => {
        const material = arc.material as THREE.MeshBasicMaterial;
        material.opacity = 0.34 + Math.sin(elapsed * 1.8 + index) * 0.22;
      });

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mount.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((object) => {
        if ("geometry" in object && object.geometry) object.geometry.dispose();
        if ("material" in object && object.material) {
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
