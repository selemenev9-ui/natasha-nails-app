import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroPhoto({ className }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(4, 3, 1, 1);
    const uniforms = {
      uTime: { value: 0 },
      uNoiseScale: { value: 0.25 },
      uTintA: { value: new THREE.Color('#2a2520') },
      uTintB: { value: new THREE.Color('#1a1814') },
      uGlow: { value: new THREE.Color('#F4D5AA') }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          modelPosition.y += sin((uv.x + uv.y) * 2.0) * 0.05;
          gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uNoiseScale;
        uniform vec3 uTintA;
        uniform vec3 uTintB;
        uniform vec3 uGlow;
        float noise(vec2 p){
          return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
        }
        void main() {
          vec2 uv = vUv;
          float vignette = smoothstep(1.2, 0.2, distance(uv, vec2(0.5)));
          float grain = noise(uv * 120.0 + uTime * 0.05) * 0.05;
          float lightWave = sin((uv.y + uTime * 0.05) * 6.2831) * 0.12;
          vec3 base = mix(uTintA, uTintB, uv.y + grain + lightWave);
          vec3 glow = uGlow * (0.3 + 0.7 * smoothstep(0.4, 0.0, uv.y));
          vec3 color = mix(base, glow, 0.35) * vignette;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let mouseX = 0;
    let mouseY = 0;

    const onPointerMove = (event) => {
      const { innerWidth, innerHeight } = window;
      mouseX = (event.clientX / innerWidth - 0.5) * 0.8;
      mouseY = (event.clientY / innerHeight - 0.5) * 0.8;
    };

    window.addEventListener('pointermove', onPointerMove);

    let animationId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      uniforms.uTime.value = elapsed;
      const targetX = mouseX * 0.2;
      const targetY = mouseY * 0.15;
      camera.position.x += (targetX - camera.position.x) * 0.03;
      camera.position.y += (-targetY - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      mesh.rotation.z += 0.0008;
      mesh.scale.x = 1.05 + Math.sin(elapsed * 0.05) * 0.02;
      mesh.scale.y = 1.05 + Math.cos(elapsed * 0.05) * 0.02;
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className={className} ref={mountRef} />;
}
