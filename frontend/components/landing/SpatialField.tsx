"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type SpatialFieldProps = {
  intensity?: "quiet" | "active";
};

export function SpatialField({ intensity = "quiet" }: SpatialFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 80);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const planeSize = intensity === "active" ? 9 : 7;
    const grid = new THREE.GridHelper(planeSize, 32, 0x38bdf8, 0x1e293b);
    grid.position.y = -2.25;
    grid.rotation.x = 0.14;
    grid.material.opacity = intensity === "active" ? 0.22 : 0.12;
    grid.material.transparent = true;
    group.add(grid);

    const rings = [1.35, 2.05, 2.85, 3.7].map((radius, index) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.006, 8, 180),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? 0xf97316 : 0x38bdf8,
          transparent: true,
          opacity: intensity === "active" ? 0.18 : 0.1,
          blending: THREE.AdditiveBlending,
        })
      );
      mesh.rotation.x = Math.PI / 2.7;
      mesh.rotation.z = index * 0.42;
      group.add(mesh);
      return mesh;
    });

    const particleCount = intensity === "active" ? 520 : 320;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 9;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 5.4;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x9ee7ff,
        size: 0.018,
        transparent: true,
        opacity: intensity === "active" ? 0.38 : 0.2,
        depthWrite: false,
      })
    );
    scene.add(particles);

    const clock = new THREE.Clock();
    let frame = 0;

    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", resize);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = Math.sin(elapsed * 0.16) * 0.09;
      particles.rotation.y = elapsed * 0.018;
      particles.rotation.x = Math.sin(elapsed * 0.11) * 0.04;
      rings.forEach((ring, index) => {
        ring.rotation.z = elapsed * (0.04 + index * 0.012) + index * 0.42;
      });
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
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
  }, [intensity]);

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 opacity-80" aria-hidden="true" />;
}
