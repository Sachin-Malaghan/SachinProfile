/* Exploded-view demo: a generic inline-four engine built from
   primitives in three.js (r128 globals). Recreates, on a non-client model, the
   exploded-view feature built for an automotive client. */
(function (root) {
  'use strict';

  function mount(container, opts) {
    opts = opts || {};
    var THREE = root.THREE;
    var W = opts.width || container.clientWidth || 800, H = opts.height || container.clientHeight || 450;

    var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!opts.capture, alpha: false });
    renderer.setPixelRatio(opts.capture ? 1 : Math.min(2, root.devicePixelRatio || 1));
    renderer.setSize(W, H, !opts.capture);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1222);
    scene.fog = new THREE.Fog(0x0c1222, 6, 14);

    // studio environment for metal reflections, built from a few emissive panels
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envScene = new THREE.Scene();
    var room = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x1a2033, side: THREE.BackSide }));
    envScene.add(room);
    function panel(w, h, x, y, z, c) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    }
    panel(6, 2, 0, 4.5, 0, 0xb8b8b8); panel(3, 3, 4.5, 1, 2, 0x8f97aa); panel(3, 3, -4.5, 1, -2, 0x4c5a78); panel(4, 1, 0, 1, 4.8, 0x9a7c58);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;

    var camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 50);
    camera.position.set(2.55, 1.55, 3.0);

    scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x10131c, 0.5));
    var key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 5, 3); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera; sc.left = -2.5; sc.right = 2.5; sc.top = 2.5; sc.bottom = -2.5; sc.far = 15;
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x8fb8ff, 0.9); rim.position.set(-4, 2, -3); scene.add(rim);
    var warm = new THREE.PointLight(0xffb048, 0.6, 6); warm.position.set(1.5, 0.3, 1.5); scene.add(warm);

    var floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.86; floor.receiveShadow = true; scene.add(floor);
    var grid = new THREE.GridHelper(12, 30, 0x1f2b47, 0x141c30); grid.position.y = -0.859; scene.add(grid);

    // ------------------------------------------------------------ materials
    function mat(color, metal, rough, extra) {
      var m = new THREE.MeshStandardMaterial(Object.assign({ color: color, metalness: metal, roughness: rough, envMapIntensity: metal > 0.5 ? 1.0 : 0.35 }, extra || {}));
      m.color.convertSRGBToLinear();
      return m;
    }
    var M = {
      rubber: mat(0x16181d, 0.0, 0.88),
      alloy: mat(0xaab0bb, 1.0, 0.34),
      steel: mat(0x8e949e, 1.0, 0.38),
      dark: mat(0x3a3f48, 0.8, 0.5),
      cast: mat(0x5b6069, 0.6, 0.62),
      red: mat(0xb0200f, 0.2, 0.38),
      spring: mat(0x2f6fd6, 0.4, 0.32),
      chrome: mat(0xe6e9ef, 1.0, 0.08),
      boot: mat(0x101114, 0.0, 0.7)
    };

    // ------------------------------------------------------------ parts
    var parts = [];
    var root3 = new THREE.Group(); scene.add(root3);
    function part(name, desc, obj, dir, dist, delay) {
      var g = new THREE.Group(); g.add(obj);
      obj.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.part = parts.length; } });
      root3.add(g);
      var p = { name: name, desc: desc, group: g, home: g.position.clone(), dir: new THREE.Vector3().copy(dir).normalize(), dist: dist, delay: delay, meshes: [] };
      obj.traverse(function (o) { if (o.isMesh) p.meshes.push(o); });
      parts.push(p); return p;
    }
    function alongX(geo) { geo.rotateZ(Math.PI / 2); return geo; }

    // Generic inline-four engine. Crank axis runs along X; Y is up; intake on +Z, exhaust on -Z.
    var i, k;
    M.alu = mat(0x7c8189, 0.45, 0.5);
    M.block = mat(0x5a5f68, 0.35, 0.6);
    M.crinkle = mat(0xa3180d, 0.15, 0.6);
    M.plastic = mat(0x17191d, 0.0, 0.55);
    M.gasket = mat(0x2a2d33, 0.3, 0.45);
    M.rust = mat(0x6f4f3f, 0.75, 0.48);
    M.piston = mat(0xc4c8cf, 0.9, 0.3);
    M.copper = mat(0xb4713d, 1.0, 0.35);

    function box(w, h, d, m, x, y, z) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); return o; }
    function cylX(r, len, m, x, y, z, seg) { var o = new THREE.Mesh(alongX(new THREE.CylinderGeometry(r, r, len, seg || 32)), m); o.position.set(x || 0, y || 0, z || 0); return o; }
    function cylY(r, len, m, x, y, z, seg) { var o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 32), m); o.position.set(x || 0, y || 0, z || 0); return o; }
    function tube(pts, r, m) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 14, false), m); }
    var BORES = [-0.18, -0.06, 0.06, 0.18];
    var CRANK_Y = -0.14, THROW = 0.045, ROD = 0.2;
    function pinY(n) { return CRANK_Y + (n === 0 || n === 3 ? THROW : -THROW); }

    // engine block
    var block = new THREE.Group();
    block.add(box(0.52, 0.3, 0.3, M.block, 0, 0.01, 0));
    block.add(box(0.5, 0.08, 0.34, M.block, 0, -0.1, 0));                 // crankcase bulge
    for (i = 0; i < 5; i++) { block.add(box(0.012, 0.22, 0.02, M.block, -0.24 + i * 0.12, -0.02, 0.158)); block.add(box(0.012, 0.22, 0.02, M.block, -0.24 + i * 0.12, -0.02, -0.158)); }
    BORES.forEach(function (x) { block.add(cylY(0.046, 0.004, M.boot, x, 0.1615, 0, 40)); });  // bores seen from above
    block.add(cylY(0.018, 0.05, M.alu, 0.2, 0.03, 0.17));                  // oil filter boss
    block.add(cylY(0.035, 0.09, M.plastic, 0.2, -0.02, 0.2));              // oil filter

    // oil pan
    var pan = new THREE.Group();
    pan.add(box(0.5, 0.012, 0.32, M.alu, 0, -0.146, 0));
    pan.add(box(0.46, 0.12, 0.26, M.alu, 0, -0.21, 0));
    pan.add(box(0.2, 0.06, 0.24, M.alu, 0.1, -0.29, 0));
    pan.add(cylY(0.012, 0.02, M.chrome, 0.15, -0.325, 0.05, 6));           // drain plug

    // crankshaft
    var crank = new THREE.Group();
    crank.add(cylX(0.022, 0.62, M.steel, 0, CRANK_Y, 0));
    BORES.forEach(function (x, n) {
      var py = pinY(n), up = py > CRANK_Y ? 1 : -1;
      crank.add(cylX(0.02, 0.04, M.steel, x, py, 0));
      [-0.028, 0.028].forEach(function (dx) {
        var web = box(0.016, 0.1, 0.06, M.steel, x + dx, CRANK_Y + up * 0.012, 0); crank.add(web);
        var cw = new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 32, 1, false, 0, Math.PI)), M.steel);
        cw.rotation.x = up > 0 ? Math.PI / 2 : -Math.PI / 2; cw.position.set(x + dx, CRANK_Y, 0); crank.add(cw);
      });
    });
    crank.add(cylX(0.03, 0.03, M.steel, -0.3, CRANK_Y, 0));                // snout

    // pistons and connecting rods
    var pist = new THREE.Group();
    BORES.forEach(function (x, n) {
      var wy = pinY(n) + ROD;
      pist.add(cylY(0.043, 0.06, M.piston, x, wy + 0.012, 0, 40));
      [0.028, 0.018, 0.008].forEach(function (ry) { pist.add(new THREE.Mesh(new THREE.TorusGeometry(0.0432, 0.0016, 6, 40), M.dark)).rotation.x = Math.PI / 2; pist.children[pist.children.length - 1].position.set(x, wy + ry, 0); });
      var rod = box(0.018, ROD - 0.02, 0.026, M.steel, x, pinY(n) + ROD / 2, 0); pist.add(rod);
      pist.add(cylX(0.03, 0.022, M.steel, x, pinY(n), 0));                // big end
    });

    // head gasket
    var gasket = new THREE.Group();
    gasket.add(box(0.52, 0.006, 0.3, M.gasket, 0, 0.163, 0));
    BORES.forEach(function (x) { var r = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.004, 8, 48), M.copper); r.rotation.x = Math.PI / 2; r.position.set(x, 0.167, 0); gasket.add(r); });

    // cylinder head
    var head = new THREE.Group();
    head.add(box(0.52, 0.12, 0.28, M.alu, 0, 0.226, 0));
    BORES.forEach(function (x) {
      head.add(box(0.05, 0.05, 0.03, M.alu, x, 0.215, 0.152));             // intake ports
      head.add(box(0.05, 0.045, 0.03, M.alu, x, 0.21, -0.152));            // exhaust ports
    });

    // camshafts
    var cams = new THREE.Group();
    [0.06, -0.06].forEach(function (z) {
      cams.add(cylX(0.012, 0.54, M.steel, 0, 0.305, z));
      BORES.forEach(function (x) {
        [-0.022, 0.022].forEach(function (dx) {
          var lobe = new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 24)), M.steel);
          lobe.scale.set(1, 1, 1.45); lobe.position.set(x + dx, 0.305, z); lobe.rotation.x = (x + dx) * 9; cams.add(lobe);
        });
      });
    });

    // valve cover
    var cover = new THREE.Group();
    cover.add(box(0.5, 0.045, 0.25, M.crinkle, 0, 0.345, 0));
    for (i = 0; i < 6; i++) cover.add(box(0.46, 0.01, 0.012, M.crinkle, 0, 0.371, -0.1 + i * 0.04));
    cover.add(cylY(0.028, 0.02, M.plastic, 0.16, 0.378, -0.07));          // oil cap

    // ignition coils
    var coils = new THREE.Group();
    BORES.forEach(function (x) {
      coils.add(cylY(0.017, 0.1, M.plastic, x, 0.38, 0.0));
      coils.add(box(0.05, 0.022, 0.04, M.plastic, x, 0.435, 0.0));
      coils.add(box(0.014, 0.012, 0.03, M.copper, x + 0.018, 0.448, 0.0));
    });

    // intake manifold
    var intake = new THREE.Group();
    intake.add(cylX(0.052, 0.48, M.plastic, 0, 0.3, 0.3));
    BORES.forEach(function (x) {
      intake.add(tube([new THREE.Vector3(x, 0.215, 0.165), new THREE.Vector3(x, 0.22, 0.23), new THREE.Vector3(x, 0.27, 0.28), new THREE.Vector3(x, 0.3, 0.3)], 0.021, M.plastic));
    });
    intake.add(cylX(0.04, 0.08, M.alu, -0.28, 0.3, 0.3));                  // throttle body

    // exhaust manifold
    var exh = new THREE.Group();
    BORES.forEach(function (x) {
      exh.add(tube([new THREE.Vector3(x, 0.21, -0.165), new THREE.Vector3(x, 0.18, -0.22), new THREE.Vector3(x * 0.6 + 0.04, 0.06, -0.25), new THREE.Vector3(0.06, -0.04, -0.26)], 0.02, M.rust));
    });
    exh.add(cylY(0.035, 0.12, M.rust, 0.06, -0.1, -0.26));
    exh.add(box(0.52, 0.06, 0.012, M.rust, 0, 0.21, -0.172));              // flange

    // timing pulleys and belt
    var pulleys = new THREE.Group();
    pulleys.add(cylX(0.05, 0.022, M.dark, -0.275, CRANK_Y, 0, 40));
    [0.06, -0.06].forEach(function (z) { pulleys.add(cylX(0.058, 0.022, M.dark, -0.275, 0.305, z, 40)); });
    pulleys.add(cylX(0.03, 0.022, M.chrome, -0.275, 0.1, 0.1, 24));        // tensioner
    var beltPts = [new THREE.Vector3(-0.275, 0.365, -0.06), new THREE.Vector3(-0.275, 0.365, 0.06), new THREE.Vector3(-0.275, 0.3, 0.12), new THREE.Vector3(-0.275, 0.1, 0.132), new THREE.Vector3(-0.275, CRANK_Y - 0.05, 0.02),
                   new THREE.Vector3(-0.275, CRANK_Y - 0.03, -0.045), new THREE.Vector3(-0.275, 0.1, -0.1), new THREE.Vector3(-0.275, 0.3, -0.12)];
    pulleys.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true), 120, 0.006, 6, true), M.rubber));

    // timing cover
    var tcover = new THREE.Group();
    tcover.add(box(0.02, 0.56, 0.3, M.plastic, -0.305, 0.1, 0));
    tcover.add(cylX(0.052, 0.02, M.plastic, -0.32, CRANK_Y, 0, 40));

    // flywheel
    var fly = new THREE.Group();
    fly.add(cylX(0.15, 0.024, M.steel, 0.29, CRANK_Y, 0, 64));
    var ringGear = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.008, 8, 90), M.dark); ringGear.rotation.y = Math.PI / 2; ringGear.position.set(0.29, CRANK_Y, 0); fly.add(ringGear);
    for (i = 0; i < 6; i++) { var ba = i / 6 * Math.PI * 2; fly.add(cylX(0.008, 0.03, M.chrome, 0.302, CRANK_Y + Math.cos(ba) * 0.04, Math.sin(ba) * 0.04, 6)); }

    var X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    part('Ignition coils', 'Four coil-on-plug units. First off, so the valve cover can lift.', coils, Y, 0.98, 0.0);
    part('Valve cover', 'Seals the top of the head and the valve train.', cover, Y, 0.8, 0.08);
    part('Intake manifold', 'Plenum and four runners feeding the intake ports.', intake, new THREE.Vector3(1, 0.15, 0.9), 0.62, 0.06);
    part('Exhaust manifold', 'Four-into-one cast manifold on the hot side.', exh, new THREE.Vector3(-0.6, 0.3, -1), 0.5, 0.06);
    part('Timing cover', 'Front cover over the belt drive.', tcover, new THREE.Vector3(-1, 0, 0), 0.42, 0.04);
    part('Camshafts', 'Twin overhead cams, eight lobes each.', cams, Y, 0.6, 0.16);
    part('Timing belt and pulleys', 'Keeps the cams in step with the crank.', pulleys, new THREE.Vector3(-1, 0, 0), 0.24, 0.14);
    part('Cylinder head', 'Ports, valves and combustion chambers.', head, Y, 0.42, 0.26);
    part('Head gasket', 'Multi-layer steel with copper fire rings.', gasket, Y, 0.27, 0.34);
    part('Pistons and rods', 'Rise out of the bores once the head is off.', pist, Y, 0.24, 0.44);
    part('Engine block', 'Stays in place: the reference part everything explodes from.', block, Y, 0.0, 0.0);
    part('Flywheel', 'Bolted to the rear of the crankshaft.', fly, X, 0.36, 0.1);
    part('Oil pan', 'Drops away first on the underside.', pan, new THREE.Vector3(0, -1, 0), 0.38, 0.18);
    part('Crankshaft', 'Lowers out once the pan and flywheel are clear.', crank, new THREE.Vector3(0, -1, 0), 0.2, 0.34);

    root3.position.set(0, 0, 0);
    root3.rotation.y = 0.55;

    // ------------------------------------------------------------ interaction
    var controls = null;
    if (root.THREE.OrbitControls && !opts.capture) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.minDistance = 1.4; controls.maxDistance = 7; controls.maxPolarAngle = Math.PI * 0.53;
      controls.target.set(0, 0.32, 0); controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
      controls.enablePan = false;
      controls.addEventListener('start', function () { controls.autoRotate = false; });
    }
    var target0 = new THREE.Vector3(0, 0.34, 0);
    camera.lookAt(target0);

    var amount = 0, goal = 0, selected = -1, hover = -1;
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function apply() {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var local = Math.min(1, Math.max(0, (amount * 1.6 - p.delay) / 0.9));
        var k = ease(local);
        p.group.position.copy(p.home).addScaledVector(p.dir, p.dist * k);
      }
    }
    function highlight() {
      for (var i = 0; i < parts.length; i++) {
        var on = i === selected || i === hover;
        parts[i].meshes.forEach(function (m) {
          if (!m.userData.baseMat) m.userData.baseMat = m.material;
          if (on) {
            if (!m.userData.hlMat) { m.userData.hlMat = m.userData.baseMat.clone(); m.userData.hlMat.emissive = new THREE.Color(0xffb048); }
            m.userData.hlMat.emissiveIntensity = i === selected ? 0.32 : 0.16;
            m.material = m.userData.hlMat;
          } else m.material = m.userData.baseMat;
        });
      }
    }

    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(ev) {
      var r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObjects(root3.children, true)[0];
      return hit ? hit.object.userData.part : -1;
    }
    var downAt = null;
    if (!opts.capture) {
      renderer.domElement.addEventListener('pointermove', function (e) { var h = pick(e); if (h !== hover) { hover = h; highlight(); renderer.domElement.style.cursor = h >= 0 ? 'pointer' : 'grab'; } });
      renderer.domElement.addEventListener('pointerleave', function () { hover = -1; highlight(); });
      renderer.domElement.addEventListener('pointerdown', function (e) { downAt = [e.clientX, e.clientY]; });
      renderer.domElement.addEventListener('pointerup', function (e) {
        if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
        select(pick(e));
      });
    }
    function select(i) { selected = i; highlight(); if (opts.onSelect) opts.onSelect(i, i >= 0 ? parts[i] : null); }

    function resize(w, h) {
      W = w; H = h; renderer.setSize(w, h, !opts.capture); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var last = 0, running = false;
    function tick(ts) {
      if (!running) return;
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      var diff = goal - amount;
      if (Math.abs(diff) > 0.0005) { amount += Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.55); apply(); if (opts.onAmount) opts.onAmount(amount); }
      if (controls) controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    function start() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } }
    function stop() { running = false; }
    apply();
    renderer.render(scene, camera);

    return {
      parts: parts, renderer: renderer, camera: camera, scene: scene, controls: controls,
      start: start, stop: stop, resize: resize, select: select,
      setGoal: function (v) { goal = Math.max(0, Math.min(1, v)); },
      setAmount: function (v) { amount = goal = Math.max(0, Math.min(1, v)); apply(); },
      getAmount: function () { return amount; },
      orbit: function (angle, dist, height) { // for scripted capture
        camera.position.set(target0.x + Math.cos(angle) * dist, height, target0.z + Math.sin(angle) * dist);
        camera.lookAt(target0);
      },
      render: function () { renderer.render(scene, camera); }
    };
  }

  root.ExplodeDemo = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
