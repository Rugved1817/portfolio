document.addEventListener('DOMContentLoaded', () => {
  const world = document.getElementById('world');
  const player = document.getElementById('player');
  const preloader = document.getElementById('preloader');
  const preBar = document.getElementById('preBar');
  const zoneToast = document.getElementById('zone-toast');
  const dots = document.querySelectorAll('.si-dot');
  const navLinks = document.querySelectorAll('.nav-links a');
  const sections = document.querySelectorAll('.world-section');
  const starsBack = document.getElementById('stars-back');
  const starsFront = document.getElementById('stars-front');

  let scrollPos = 0;
  let targetScrollPos = 0;
  let walkTimeout;
  let currentZoneIdx = -1;
  const sectionWidth = window.innerWidth;
  const maxScroll = sectionWidth * (sections.length - 1);

  // --- THREE.JS ---
  const canvas = document.getElementById('three-canvas');
  let renderer, scene, camera, stars3D;
  const objects3D = [];

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.z = 250;
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const mainLight = new THREE.DirectionalLight(0x00f2fe, 1.5);
    mainLight.position.set(100, 200, 100);
    scene.add(mainLight);

    const starCount = 10000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 6000;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    stars3D = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, opacity: 0.8 }));
    scene.add(stars3D);

    const add3D = (mesh, type, speed = 0.005) => { scene.add(mesh); objects3D.push({ mesh, type, speed }); };
    
    // Level 1
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(70, 1), new THREE.MeshStandardMaterial({ color: 0x00f2fe, wireframe: true }));
    core.position.set(0, 0, -300);
    add3D(core, 'rotate');

    // Level 2
    const planet = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 32), new THREE.MeshStandardMaterial({ color: 0x4facfe, wireframe: true }));
    planet.position.set(1200, 0, -400);
    add3D(planet, 'rotate');

    // Level 5: Massive Multi-Ringed Vortex
    const vortex = new THREE.Group();
    for(let i=0; i<15; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(120 + i*45, 1, 16, 100),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x00f2fe : 0xf093fb, transparent: true, opacity: 0.3 - (i*0.015) })
      );
      ring.rotation.x = Math.random() * Math.PI;
      vortex.add(ring);
    }
    vortex.position.set(4200, 0, -800);
    add3D(vortex, 'rotate-fast');

  } catch (e) { console.warn(e); }

  // --- PRELOADER ---
  let progress = 0;
  const loadInt = setInterval(() => {
    progress += Math.random() * 30;
    if (progress >= 100) { progress = 100; clearInterval(loadInt); setTimeout(() => { preloader.classList.add('fade-out'); showZoneToast(0); }, 500); }
    if (preBar) preBar.style.width = `${progress}%`;
  }, 100);

  const showZoneToast = (idx) => {
    if (currentZoneIdx === idx) return;
    currentZoneIdx = idx;
    const zoneName = sections[idx].dataset.zone;
    zoneToast.textContent = `ZONE ${idx + 1}: ${zoneName}`;
    zoneToast.classList.add('show');
    setTimeout(() => zoneToast.classList.remove('show'), 3000);
  };

  const handleScroll = (delta) => {
    if (delta > 0) player.classList.remove('facing-left'); else if (delta < 0) player.classList.add('facing-left');
    player.classList.add('walking');
    clearTimeout(walkTimeout); walkTimeout = setTimeout(() => player.classList.remove('walking'), 150);
    targetScrollPos += delta; targetScrollPos = Math.max(0, Math.min(targetScrollPos, maxScroll));
  };

  window.addEventListener('wheel', (e) => handleScroll(e.deltaY + e.deltaX), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') handleScroll(250); if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') handleScroll(-250);
  });

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.05; mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
  });

  const animate = () => {
    scrollPos += (targetScrollPos - scrollPos) * 0.08;
    world.style.transform = `translateX(${-scrollPos}px)`;
    if (starsBack) starsBack.style.transform = `translateX(${scrollPos * 0.4}px)`;
    if (starsFront) starsFront.style.transform = `translateX(${scrollPos * 0.2}px)`;

    if (renderer) {
      camera.position.x += (scrollPos * 0.6 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(camera.position.x, 0, -600);
      objects3D.forEach(obj => {
        if (obj.type === 'rotate') obj.mesh.rotation.y += 0.005;
        if (obj.type === 'rotate-fast') { obj.mesh.rotation.x += 0.02; obj.mesh.rotation.y += 0.02; }
      });
      stars3D.rotation.y += 0.0002; renderer.render(scene, camera);
    }

    const currentIdx = Math.round(scrollPos / sectionWidth);
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIdx));
    if (Math.abs(scrollPos - (currentIdx * sectionWidth)) < 50) showZoneToast(currentIdx);

    const currentSection = sections[currentIdx];
    if (currentSection && currentSection.id === 'skills') {
      currentSection.querySelectorAll('.neural-node-card').forEach(card => {
        const level = parseInt(card.dataset.level);
        const fill = card.querySelector('.gauge-fill');
        if(fill) { fill.style.strokeDashoffset = 377 - (377 * level) / 100; }
      });
    }
    requestAnimationFrame(animate);
  };

  window.addEventListener('resize', () => { if (renderer) { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); } });
  dots.forEach(dot => dot.addEventListener('click', () => { targetScrollPos = Array.from(sections).indexOf(document.getElementById(dot.dataset.target)) * sectionWidth; }));
  navLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); targetScrollPos = Array.from(sections).indexOf(document.getElementById(link.dataset.target)) * sectionWidth; }));
  animate();
});
