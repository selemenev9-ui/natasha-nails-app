import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `#version 300 es\nlayout(location = 0) in vec2 position;\nout vec2 vUv;\nvoid main() {\n  vUv = position * 0.5 + 0.5;\n  gl_Position = vec4(position, 0.0, 1.0);\n}`;

const FRAGMENT_SHADER = `#version 300 es\nprecision highp float;\nout vec4 fragColor;\nin vec2 vUv;\nuniform float u_time;\nuniform vec2 u_resolution;\n\n// Simplex noise helpers (iq / ashima)\nvec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\nvec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\nvec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }\nvec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\nfloat snoise(vec3 v) {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);\n\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min( g.xyz, l.zxy );\n  vec3 i2 = max( g.xyz, l.zxy );\n\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy;\n  vec3 x3 = x0 - D.yyy;      \n\n  i = mod289(i);\n  vec4 p = permute( permute( permute(\n            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n          + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n          + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n  vec4 j = p - 49.0 * floor(p * 0.02040816326530612);\n  vec4 x_ = floor(j * 0.14285714285714285);\n  vec4 y_ = floor(j - 7.0 * x_ );\n  vec4 x = (x_ * 2.0 + 0.5)/7.0 - 1.0;\n  vec4 y = (y_ * 2.0 + 0.5)/7.0 - 1.0;\n  vec4 h = 1.0 - abs(x) - abs(y);\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 g0 = vec3(a0.xy,h.x);\n  vec3 g1 = vec3(a0.zw,h.y);\n  vec3 g2 = vec3(a1.xy,h.z);\n  vec3 g3 = vec3(a1.zw,h.w);\n\n  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));\n  g0 *= norm.x;\n  g1 *= norm.y;\n  g2 *= norm.z;\n  g3 *= norm.w;\n\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3) ) );\n}\n\nvec3 palette(float t) {\n  vec3 pearl = vec3(1.0, 0.97, 0.95);\n  vec3 blush = vec3(1.0, 0.9, 0.9);\n  vec3 lilac = vec3(0.94, 0.9, 1.0);\n  vec3 cream = vec3(1.0, 0.96, 0.9);\n  vec3 base = mix(pearl, blush, smoothstep(0.0, 1.0, t));\n  base = mix(base, lilac, 0.35 * t);\n  return mix(base, cream, 0.25 + 0.25 * sin(t * 3.1415));\n}\n\nvoid main() {\n  vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);\n  float time = u_time * 0.12;\n  float n1 = snoise(vec3(uv * 1.4, time));\n  float n2 = snoise(vec3(uv * 0.6 + 4.0, time * 0.6));\n  float n3 = snoise(vec3(uv * 2.2 - 10.0, time * 0.4));\n  float blend = smoothstep(-0.6, 0.8, n1 + n2 * 0.4);\n  float sheen = smoothstep(-0.4, 0.6, n2 + n3 * 0.5);\n  vec3 color = palette(blend);\n  color += 0.08 * sheen;\n  color += 0.03 * vec3(n3);\n  fragColor = vec4(color, 1.0);\n}`;

export default function LiquidBackground({ paused = false }) {
  const canvasRef = useRef(null);
  const externalPauseRef = useRef(paused);
  const controlsRef = useRef({ refresh: () => {} });

  useEffect(() => {
    externalPauseRef.current = paused;
    controlsRef.current.refresh?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      premultipliedAlpha: true,
      desynchronized: true
    });

    if (!gl) {
      canvas.style.background = 'radial-gradient(circle at 20% 20%, rgba(255, 229, 229, 0.8), rgba(240, 230, 255, 0.4))';
      canvas.style.opacity = '0.8';
      return;
    }

    let animationFrame = null;
    let scrollTimeout = null;
    const frameInterval = 1000 / 30;
    let lastFrameTime = 0;
    const startTime = performance.now();
    const scrollPaused = { current: false };

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('LiquidBackground shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return () => {};
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('LiquidBackground program error:', gl.getProgramInfoLog(program));
      return () => {};
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1
      ]),
      gl.STATIC_DRAW
    );

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');

    const applySize = () => {
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const scale = dpr * 0.5;
      const width = Math.max(1, Math.floor(window.innerWidth * scale));
      const height = Math.max(1, Math.floor(window.innerHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const shouldRun = () => !externalPauseRef.current && !scrollPaused.current;

    const renderFrame = (now) => {
      if (!shouldRun()) {
        animationFrame = null;
        return;
      }
      if (now - lastFrameTime < frameInterval) {
        animationFrame = requestAnimationFrame(renderFrame);
        return;
      }
      lastFrameTime = now;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (now - startTime) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
      animationFrame = requestAnimationFrame(renderFrame);
    };

    const updateAnimationState = () => {
      if (shouldRun()) {
        if (animationFrame === null) {
          lastFrameTime = 0;
          animationFrame = requestAnimationFrame(renderFrame);
        }
      } else if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    controlsRef.current.refresh = updateAnimationState;

    const handleScroll = () => {
      if (scrollPaused.current) {
        if (scrollTimeout) clearTimeout(scrollTimeout);
      } else {
        scrollPaused.current = true;
        updateAnimationState();
      }
      scrollTimeout = setTimeout(() => {
        scrollPaused.current = false;
        updateAnimationState();
      }, 180);
    };

    const handleResize = () => {
      applySize();
    };

    applySize();
    updateAnimationState();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      gl.deleteBuffer(positionBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        filter: 'blur(0px)'
      }}
    />
  );
}
