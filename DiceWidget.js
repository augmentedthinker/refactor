import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';

/**
 * DiceWidget Module
 * Encapsulates the full 3D Polyhedral Dice Engine.
 */
export function initDiceWidget(container) {
    // --- CONFIGURATION ---
    const CONFIG = {
        colors: {
            die: 0x3b82f6,
            floor: 0xf1f5f9,
            text: '#ffffff',
            gold: '#eab308',
            red: '#dc2626',
            dark: '#334155'
        },
        physics: {
            gravity: -50,
            friction: 0.3,
            restitution: 0.5
        },
        radius: 1.5
    };

    // --- RUNTIME STATE ---
    const STATE = {
        scene: null, camera: null, renderer: null, world: null,
        dieBody: null, dieMesh: null,
        logicalFaces: [], 
        isRolling: false,
        currentSides: 20,
        sharedMaterial: null
    };

    // Inject Styles
    const style = document.createElement('style');
    style.textContent = `
        .dice-widget-container {
            position: relative; width: 360px; height: 500px; border-radius: 24px;
            overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            background: #f1f5f9; display: flex; flex-direction: column;
            user-select: none; font-family: 'Segoe UI', sans-serif;
        }
        .widget-ui { position: absolute; inset: 0; z-index: 10; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; }
        
        .header { position: relative; text-align: center; padding-bottom: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); background: linear-gradient(to bottom, rgba(241, 245, 249, 0.95), transparent); }
        .title { color: #64748b; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
        
        #color-picker-wrapper { position: absolute; top: 0; right: 0; pointer-events: auto; }
        #current-color-btn { width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; background: #3b82f6; transition: transform 0.2s; padding: 0; }
        
        #color-dropdown { position: absolute; top: 30px; right: -5px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); padding: 8px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; opacity: 0; transform: translateY(-10px); pointer-events: none; transition: all 0.2s ease; border: 1px solid rgba(0,0,0,0.05); }
        #color-dropdown.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .color-option { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.1s; }

        .result-disp { font-size: 5rem; font-weight: 800; color: #334155; text-align: center; -webkit-text-stroke: 3px #f1f5f9; text-shadow: 0 5px 15px rgba(0,0,0,0.15); opacity: 0; transform: translate(-50%, -50%) scale(0.8); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: absolute; top: 45%; left: 50%; pointer-events: none; z-index: 20; }
        .result-disp.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        
        .controls-area { pointer-events: auto; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.8); border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
        .dice-selector { display: flex; justify-content: space-between; background: rgba(0,0,0,0.05); border-radius: 12px; padding: 4px; }
        .die-btn { background: none; border: none; color: #64748b; font-weight: bold; font-size: 0.8rem; padding: 8px 6px; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
        .die-btn.active { background: #ffffff; color: #0284c7; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        
        .roll-btn { background: #3b82f6; border: none; padding: 12px; color: white; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); transition: 0.1s; }
        .roll-btn:disabled { filter: grayscale(1); opacity: 0.5; }
    `;
    document.head.appendChild(style);

    // Create HTML
    container.innerHTML = `
        <div class="dice-widget-container">
            <div class="widget-ui">
                <div class="header">
                    <div class="title">Polyhedral Engine</div>
                    <div id="color-picker-wrapper">
                        <button id="current-color-btn"></button>
                        <div id="color-dropdown">
                            <button class="color-option" data-color="0x3b82f6" style="background: #3b82f6;"></button>
                            <button class="color-option" data-color="0xef4444" style="background: #ef4444;"></button>
                            <button class="color-option" data-color="0x22c55e" style="background: #22c55e;"></button>
                            <button class="color-option" data-color="0xa855f7" style="background: #a855f7;"></button>
                            <button class="color-option" data-color="0xeab308" style="background: #eab308;"></button>
                            <button class="color-option" data-color="0x334155" style="background: #334155;"></button>
                        </div>
                    </div>
                </div>
                <div class="result-disp" id="res-val">20</div>
                <div class="controls-area">
                    <div class="dice-selector">
                        <button class="die-btn" data-sides="4">D4</button>
                        <button class="die-btn" data-sides="6">D6</button>
                        <button class="die-btn" data-sides="8">D8</button>
                        <button class="die-btn" data-sides="10">D10</button>
                        <button class="die-btn" data-sides="12">D12</button>
                        <button class="die-btn active" data-sides="20">D20</button>
                    </div>
                    <button class="roll-btn" id="roll-trigger">Roll Dice</button>
                </div>
            </div>
            <div class="canvas-host" style="width:100%; height:100%;"></div>
        </div>
    `;

    const canvasHost = container.querySelector('.canvas-host');
    const rollBtn = container.querySelector('#roll-trigger');
    const resDisp = container.querySelector('#res-val');
    const colorBtn = container.querySelector('#current-color-btn');
    const colorDrop = container.querySelector('#color-dropdown');

    // --- ENGINE LOGIC ---
    function setupGraphics() {
        STATE.scene = new THREE.Scene();
        STATE.scene.background = new THREE.Color(CONFIG.colors.floor);
        STATE.camera = new THREE.PerspectiveCamera(30, 360/500, 0.1, 100);
        STATE.camera.position.set(0, 20, 10);
        STATE.camera.lookAt(0, 0, 0);
        STATE.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        STATE.renderer.setSize(360, 500);
        STATE.renderer.shadowMap.enabled = true;
        canvasHost.appendChild(STATE.renderer.domElement);
        STATE.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(5, 15, 5);
        sun.castShadow = true;
        STATE.scene.add(sun);
    }

    function setupPhysics() {
        STATE.world = new CANNON.World();
        STATE.world.gravity.set(0, CONFIG.physics.gravity, 0);
        STATE.sharedMaterial = new CANNON.Material();
        STATE.world.addContactMaterial(new CANNON.ContactMaterial(STATE.sharedMaterial, STATE.sharedMaterial, CONFIG.physics));
        
        // Floor and Walls
        const addPlane = (pos, rot) => {
            const body = new CANNON.Body({ mass: 0, material: STATE.sharedMaterial });
            body.addShape(new CANNON.Plane());
            body.position.copy(pos);
            body.quaternion.setFromEuler(rot.x, rot.y, rot.z);
            STATE.world.addBody(body);
        };
        addPlane(new CANNON.Vec3(0,0,0), new CANNON.Vec3(-Math.PI/2, 0, 0));

        const addWall = (x, z, ry) => {
            const body = new CANNON.Body({ mass: 0, material: STATE.sharedMaterial });
            body.addShape(new CANNON.Box(new CANNON.Vec3(10, 10, 1)));
            body.position.set(x, 10, z);
            body.quaternion.setFromEuler(0, ry, 0);
            STATE.world.addBody(body);
        };
        addWall(0, -3.5, 0); addWall(0, 3.5, 0);
        addWall(-5, 0, Math.PI/2); addWall(5, 0, Math.PI/2);
    }

    function createD10Geometry(radius) {
        const vertices = [], indices = [];
        const H = radius * 1.2, R = radius * 1.0, h = radius * 0.2;
        vertices.push(0, H, 0, 0, -H, 0); 
        for(let i=0; i<5; i++) { 
            const ang = (i * 72) * Math.PI/180;
            vertices.push(Math.cos(ang)*R, h, Math.sin(ang)*R);
        }
        for(let i=0; i<5; i++) { 
            const ang = ((i * 72) + 36) * Math.PI/180;
            vertices.push(Math.cos(ang)*R, -h, Math.sin(ang)*R);
        }
        for(let i=0; i<5; i++) {
            const A=2+i, B=7+i, An=2+((i+1)%5), Bn=7+((i+1)%5);
            indices.push(0, B, A,  0, An, B,  1, B, An,  1, An, Bn);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices); geo.computeVertexNormals();
        return geo;
    }

    function spawnDie(sides) {
        if(STATE.dieBody) STATE.world.removeBody(STATE.dieBody);
        if(STATE.dieMesh) STATE.scene.remove(STATE.dieMesh);
        STATE.logicalFaces = [];
        STATE.currentSides = sides;

        let geometry;
        const r = CONFIG.radius;
        switch(sides) {
            case 4: geometry = new THREE.TetrahedronGeometry(r); break;
            case 6: geometry = new THREE.BoxGeometry(r*1.5, r*1.5, r*1.5); break;
            case 8: geometry = new THREE.OctahedronGeometry(r); break;
            case 10: geometry = createD10Geometry(r); break;
            case 12: geometry = new THREE.DodecahedronGeometry(r); break;
            case 20: geometry = new THREE.IcosahedronGeometry(r); break;
        }

        const material = new THREE.MeshStandardMaterial({ color: CONFIG.colors.die, roughness: 0.1, metalness: 0.2, flatShading: true });
        STATE.dieMesh = new THREE.Group();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        STATE.dieMesh.add(mesh);

        // Physics Processing
        const pos = geometry.attributes.position;
        const verts = [], pMap = {}, tempFaces = [];
        for(let i=0; i<pos.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i);
            const key = v.x.toFixed(3)+v.y.toFixed(3)+v.z.toFixed(3);
            if(pMap[key] === undefined) { pMap[key] = verts.length; verts.push(new CANNON.Vec3(v.x, v.y, v.z)); }
        }
        const idx = geometry.index ? geometry.index.array : [...Array(pos.count).keys()];
        for(let i=0; i<idx.length; i+=3) { tempFaces.push([idx[i], idx[i+1], idx[i+2]]); }
        const cFaces = tempFaces.map(tri => tri.map(i => {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i);
            return pMap[v.x.toFixed(3)+v.y.toFixed(3)+v.z.toFixed(3)];
        }));

        // Logical Face calculation for labels and results
        tempFaces.forEach(tri => {
            const a = new THREE.Vector3().fromBufferAttribute(pos, tri[0]);
            const b = new THREE.Vector3().fromBufferAttribute(pos, tri[1]);
            const c = new THREE.Vector3().fromBufferAttribute(pos, tri[2]);
            const center = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1/3);
            const normal = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
            const threshold = (sides === 10) ? 0.95 : 0.99;
            const existing = STATE.logicalFaces.find(lf => lf.normal.dot(normal) > threshold);
            if(existing) { existing.centerAcc.add(center); existing.count++; }
            else { STATE.logicalFaces.push({ normal: normal.clone(), centerAcc: center.clone(), count: 1 }); }
        });
        STATE.logicalFaces.forEach(f => f.center = f.centerAcc.divideScalar(f.count));

        // Physics Body
        const shape = new CANNON.ConvexPolyhedron({ vertices: verts, faces: cFaces });
        STATE.dieBody = new CANNON.Body({ mass: 5, shape, material: STATE.sharedMaterial });
        STATE.dieBody.position.set(0, 4, 0);
        STATE.dieBody.quaternion.setFromEuler(Math.random()*6, Math.random()*6, 0);
        
        // Add Labels
        STATE.logicalFaces.forEach((data, index) => {
            data.value = index + 1;
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(data.value, 32, 32);
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
            plane.position.copy(data.center).add(data.normal.clone().multiplyScalar(0.01));
            plane.lookAt(data.center.clone().add(data.normal));
            STATE.dieMesh.add(plane);
        });

        STATE.world.addBody(STATE.dieBody);
        STATE.scene.add(STATE.dieMesh);
    }

    function roll() {
        if(STATE.isRolling) return;
        STATE.isRolling = true;
        rollBtn.disabled = true;
        resDisp.classList.remove('visible');
        STATE.dieBody.position.set(0, 6, 0);
        STATE.dieBody.velocity.set((Math.random()-0.5)*10, -5, (Math.random()-0.5)*10);
        STATE.dieBody.angularVelocity.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);

        const check = setInterval(() => {
            if(STATE.dieBody.velocity.length() < 0.1 && STATE.dieBody.angularVelocity.length() < 0.1) {
                clearInterval(check);
                STATE.isRolling = false;
                rollBtn.disabled = false;
                showResult();
            }
        }, 100);
    }

    function showResult() {
        const quat = new THREE.Quaternion().copy(STATE.dieBody.quaternion);
        let bestDot = -Infinity, result = 1;
        const targetDir = (STATE.currentSides === 4) ? new THREE.Vector3(0,-1,0) : new THREE.Vector3(0,1,0);
        STATE.logicalFaces.forEach(f => {
            const dot = f.normal.clone().applyQuaternion(quat).dot(targetDir);
            if(dot > bestDot) { bestDot = dot; result = f.value; }
        });
        resDisp.innerText = result;
        resDisp.style.color = (result === STATE.currentSides) ? CONFIG.colors.gold : (result === 1) ? CONFIG.colors.red : CONFIG.colors.dark;
        resDisp.classList.add('visible');
    }

    function animate() {
        requestAnimationFrame(animate);
        STATE.world.step(1/60);
        if(STATE.dieBody && STATE.dieMesh) {
            STATE.dieMesh.position.copy(STATE.dieBody.position);
            STATE.dieMesh.quaternion.copy(STATE.dieBody.quaternion);
        }
        STATE.renderer.render(STATE.scene, STATE.camera);
    }

    // Interactions
    container.querySelectorAll('.die-btn').forEach(btn => {
        btn.onclick = () => {
            container.querySelectorAll('.die-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            spawnDie(parseInt(btn.dataset.sides));
            resDisp.classList.remove('visible');
        };
    });

    colorBtn.onclick = (e) => { e.stopPropagation(); colorDrop.classList.toggle('open'); };
    document.addEventListener('click', () => colorDrop.classList.remove('open'));
    container.querySelectorAll('.color-option').forEach(opt => {
        opt.onclick = (e) => {
            const col = parseInt(opt.dataset.color);
            CONFIG.colors.die = col;
            colorBtn.style.background = opt.style.background;
            rollBtn.style.background = opt.style.background;
            if(STATE.dieMesh) STATE.dieMesh.children[0].material.color.setHex(col);
        };
    });

    setupGraphics(); setupPhysics(); spawnDie(20); animate();
    rollBtn.onclick = roll;
}
