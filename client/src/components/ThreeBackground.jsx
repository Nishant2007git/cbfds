import React, { useEffect, useRef, memo } from "react";
import * as THREE from "three";

const ThreeBackground = memo(() => {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, (el.clientWidth || window.innerWidth) / (el.clientHeight || window.innerHeight), 0.1, 200);
    camera.position.set(0, 0, 18);

    const hslToHex = (hslStr) => {
      const m = hslStr.match(/[\d.]+/g);
      if (!m) return "#4f88ff";
      const h = parseFloat(m[0]) / 360;
      const s = parseFloat(m[1]) / 100;
      const l = parseFloat(m[2]) / 100;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p2 = 2 * l - q;
      const hue2 = (t) => {
        const t2 = ((t % 1) + 1) % 1;
        if (t2 < 1/6) return p2 + (q - p2) * 6 * t2;
        if (t2 < 1/2) return q;
        if (t2 < 2/3) return p2 + (q - p2) * (2/3 - t2) * 6;
        return p2;
      };
      const r = Math.round(hue2(h + 1/3) * 255);
      const g = Math.round(hue2(h) * 255);
      const b = Math.round(hue2(h - 1/3) * 255);
      return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
    };

    const s2 = getComputedStyle(document.documentElement);
    const colors = [
      new THREE.Color(hslToHex(s2.getPropertyValue("--accent-primary").trim() || "hsl(217,91%,60%)")),
      new THREE.Color(hslToHex(s2.getPropertyValue("--accent-secondary").trim() || "hsl(262,83%,58%)")),
      new THREE.Color(hslToHex(s2.getPropertyValue("--accent-cyan").trim() || "hsl(187,85%,53%)")),
    ];

    const shardGeo = new THREE.IcosahedronGeometry(0.22, 0);
    const shards = [];
    const shardSpeeds = [];
    for (let i = 0; i < 350; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % 3], transparent: true, opacity: 0.05 + Math.random() * 0.18, wireframe: true });
      const mesh = new THREE.Mesh(shardGeo, mat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 28;
      mesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) - 8);
      mesh.scale.setScalar(0.4 + Math.random() * 1.8);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(mesh);
      shards.push(mesh);
      shardSpeeds.push({ rx: (Math.random() - 0.5) * 0.005, ry: (Math.random() - 0.5) * 0.007 });
    }

    const orbMeshes = [
      new THREE.Mesh(new THREE.TorusKnotGeometry(4, 0.07, 120, 12, 3, 5), new THREE.MeshBasicMaterial({ color: colors[0], transparent: true, opacity: 0.07 })),
      new THREE.Mesh(new THREE.TorusKnotGeometry(6, 0.045, 160, 8, 2, 7), new THREE.MeshBasicMaterial({ color: colors[1], transparent: true, opacity: 0.05 })),
      new THREE.Mesh(new THREE.TorusGeometry(9, 0.04, 16, 120), new THREE.MeshBasicMaterial({ color: colors[2], transparent: true, opacity: 0.04 })),
    ];
    orbMeshes.forEach(m => { m.rotation.set(Math.random(), Math.random(), Math.random()); scene.add(m); });

    const gridHelper = new THREE.GridHelper(80, 40, 0x1a2040, 0x0d1428);
    gridHelper.position.y = -12;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    const mouse = { x: 0, y: 0 };
    const camTarget = { x: 0, y: 0 };
    const onMouse = (e) => { mouse.x = (e.clientX / window.innerWidth - 0.5) * 2; mouse.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("mousemove", onMouse);

    const onResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      camTarget.x += (mouse.x * 2.5 - camTarget.x) * 0.035;
      camTarget.y += (-mouse.y * 1.5 - camTarget.y) * 0.035;
      camera.position.x = camTarget.x;
      camera.position.y = camTarget.y;
      camera.lookAt(0, 0, 0);
      shards.forEach((m, i) => { m.rotation.x += shardSpeeds[i].rx; m.rotation.y += shardSpeeds[i].ry; m.position.y += Math.sin(t * 0.3 + i * 0.2) * 0.001; });
      orbMeshes[0].rotation.x = t * 0.07; orbMeshes[0].rotation.y = t * 0.04;
      orbMeshes[1].rotation.x = -t * 0.04; orbMeshes[1].rotation.z = t * 0.06;
      orbMeshes[2].rotation.y = t * 0.02; orbMeshes[2].rotation.x = Math.sin(t * 0.1) * 0.3;
      gridHelper.position.z = (t * 0.5) % 2;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      shards.forEach(m => { m.geometry.dispose(); m.material.dispose(); scene.remove(m); });
      orbMeshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); scene.remove(m); });
      shardGeo.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} aria-hidden="true" style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, width:"100%", height:"100%" }} />
  );
});

ThreeBackground.displayName = "ThreeBackground";
export default ThreeBackground;
