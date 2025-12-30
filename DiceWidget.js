import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';

/**
 * DiceWidget Module
 * Encapsulates the 3D Polyhedral Dice Engine.
 */
export function initDiceWidget(container) {
    // --- CONFIGURATION ---
    const CONFIG = {
        colors: { die: 0x3b82f6, floor: 0xf1f5f9, text: '#ffffff', gold: '#eab308', red: '#dc2626', dark: '#334155' },
        physics: { gravity: -50, friction: 0.3, restitution: 0.5 },
        radius: 1.5
    };

    const STATE = {
        scene: null, camera: null, renderer: null, world: null,
        dieBody: null, dieMesh: null, logicalFaces: [], isRolling: false, currentSides: 20
    };

    // Inject the CSS needed for the widget
    const style = document.createElement('style');
    style.textContent = `
        .dice-widget-container {
            position: relative; width: 360px; height: 500px; border-radius: 24px;
            overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            background: #f1f5f9; display: flex; flex-direction: column;
        }
        .widget-ui { position: absolute; inset: 0; z-index: 10; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; }
        .result-disp { font-size: 5rem; font-weight: 800; color: #334155; text-align: center; position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; transition: 0.3s; pointer-events: none; }
        .result-disp.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        .controls { pointer-events: auto; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(8px); border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
        .roll-btn { background: #3b82f6; border: none; padding: 12px; color: white; font-weight: bold; border-radius: 12px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // Create HTML Structure
    container.innerHTML = `
        <div class="dice-widget-container">
            <div class="widget-ui">
                <div style="text-align:center; color:#64748b; font-size:0.75rem; font-weight:700; letter-spacing:2px;">DICE MODULE</div>
                <div class="result-disp" id="res-val">20</div>
                <div class="controls">
                    <button class="roll-btn" id="roll-trigger">ROLL DICE</button>
                </div>
            </div>
            <div class="canvas-host" style="width:100%; height:100%;"></div>
        </div>
    `;

    const canvasHost = container.querySelector('.canvas-host');
    const rollBtn = container.querySelector('#roll-trigger');
    const resDisp = container.querySelector('#res-val');

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
        const mat = new CANNON.Material();
        STATE.world.addContactMaterial(new CANNON.ContactMaterial(mat, mat, CONFIG.physics));
        
        // Floor
        const floorBody = new CANNON.Body({ mass: 0, material: mat });
        floorBody.addShape(new CANNON.Plane());
        floorBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        STATE.world.addBody(floorBody);
    }

    function spawnDie(sides) {
        if(STATE.dieBody) STATE.world.removeBody(STATE.dieBody);
        if(STATE.dieMesh) STATE.scene.remove(STATE.dieMesh);
        
        let geo;
        if(sides === 20) geo = new THREE.IcosahedronGeometry(CONFIG.radius);
        else geo = new THREE.BoxGeometry(CONFIG.radius, CONFIG.radius, CONFIG.radius);

        const mat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.die, flatShading: true });
        STATE.dieMesh = new THREE.Mesh(geo, mat);
        STATE.dieMesh.castShadow = true;
        STATE.scene.add(STATE.dieMesh);

        // Simple convex shape for physics
        const shape = new CANNON.Box(new CANNON.Vec3(CONFIG.radius, CONFIG.radius, CONFIG.radius));
        STATE.dieBody = new CANNON.Body({ mass: 5, shape });
        STATE.dieBody.position.set(0, 5, 0);
        STATE.world.addBody(STATE.dieBody);

        // Pre-calculate faces for results (Simplified for module demo)
        STATE.logicalFaces = [];
        const pos = geo.attributes.position;
        for(let i=0; i<6; i++) { // Mocking faces for simplicity in this module example
            STATE.logicalFaces.push({ value: i+1, normal: new THREE.Vector3(0,1,0) });
        }
    }

    function roll() {
        if(STATE.isRolling) return;
        STATE.isRolling = true;
        resDisp.classList.remove('visible');
        STATE.dieBody.position.set(0, 6, 0);
        STATE.dieBody.velocity.set((Math.random()-0.5)*10, -5, (Math.random()-0.5)*10);
        STATE.dieBody.angularVelocity.set(Math.random()*20, Math.random()*20, Math.random()*20);

        const check = setInterval(() => {
            if(STATE.dieBody.velocity.length() < 0.1) {
                clearInterval(check);
                STATE.isRolling = false;
                resDisp.innerText = Math.floor(Math.random() * 20) + 1; // Simplified result
                resDisp.classList.add('visible');
            }
        }, 100);
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

    // Init Execution
    setupGraphics();
    setupPhysics();
    spawnDie(20);
    rollBtn.onclick = roll;
    animate();
}