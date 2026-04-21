import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ConfirmationParticles() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 100);
    camera.position.z = 3;

    const COUNT = 180;
    const positions = new Float32Array(COUNT * 3);
    const velocities = [];
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.06;
      velocities.push({
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        z: (Math.random() - 0.5) * 0.02,
        life: 1.0,
        decay: 0.008 + Math.random() * 0.012,
      });
      sizes[i] = Math.random() * 4 + 1;
    }

    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', posAttr);
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying float vLife;
        uniform float uTime;
        void main() {
          vLife = 1.0 - uTime * 0.5;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z) * vLife;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying float vLife;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * vLife * 0.8;
          vec3 color = mix(vec3(0.9,0.85,0.75), vec3(1.0,1.0,0.95), vLife);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let animId;
    let elapsed = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      elapsed += 0.016;
      material.uniforms.uTime.value = elapsed;

      const pos = geometry.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        const v = velocities[i];
        v.life -= v.decay;
        if (v.life < 0) v.life = 0;
        v.y -= 0.001;
        pos[i * 3] += v.x;
        pos[i * 3 + 1] += v.y;
        pos[i * 3 + 2] += v.z;
      }
      geometry.attributes.position.needsUpdate = true;

      if (elapsed > 3) {
        cancelAnimationFrame(animId);
        return;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
