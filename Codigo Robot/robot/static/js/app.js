document.addEventListener('DOMContentLoaded', () => {
    
    let targetAngles = [90, 45, 180, 0, 135, 90]; 
    let visualAngles = [90, 45, 180, 0, 135, 90]; 

    let joystickVels = [0, 0, 0, 0, 0, 0];

    const MACROS = {
        home:      [90, 45, 180, 0, 135, 90],   
        recoger:   [90, 35, 130, 25, 135, 170]  
    };

    window.ejecutarMacro = function(nombreMacro) {
        if(MACROS[nombreMacro]) {
            targetAngles = [...MACROS[nombreMacro]];
            actualizarTextos();
            sendAngles();
        }
    };

    // JOYSTICKS
    const opcionesJoyLeft = {
        zone: document.getElementById('zone_joystick_left'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#0dcaf0' 
    };
    const joyLeft = nipplejs.create(opcionesJoyLeft);

    const opcionesJoyRight = {
        zone: document.getElementById('zone_joystick_right'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#ffc107' 
    };
    const joyRight = nipplejs.create(opcionesJoyRight);

    joyLeft.on('move', (evt, data) => {
        const velMax = 3.0; 
        joystickVels[0] = Math.cos(data.angle.radian) * (data.distance / 50) * velMax;
        joystickVels[1] = Math.sin(data.angle.radian) * (data.distance / 50) * velMax;
    });
    joyLeft.on('end', () => { joystickVels[0] = 0; joystickVels[1] = 0; });

    joyRight.on('move', (evt, data) => {
        const velMax = 3.0; 
        joystickVels[3] = Math.cos(data.angle.radian) * (data.distance / 50) * velMax;
        joystickVels[2] = -Math.sin(data.angle.radian) * (data.distance / 50) * velMax;
    });
    joyRight.on('end', () => { joystickVels[2] = 0; joystickVels[3] = 0; });

    
    setInterval(() => {
        let huboCambio = false;
        for(let i=0; i<4; i++) {
            if(Math.abs(joystickVels[i]) > 0.1) {
                let nuevoAngulo = targetAngles[i] + joystickVels[i];
                nuevoAngulo = Math.max(0, Math.min(180, nuevoAngulo)); 
                
                if(Math.round(nuevoAngulo) !== targetAngles[i]) {
                    targetAngles[i] = Math.round(nuevoAngulo);
                    huboCambio = true;
                }
            }
        }
        if(huboCambio) {
            actualizarTextos();
            sendAngles();
        }
    }, 100);

    
    
    
    window.ajustarArticulacion = function(idx, cantidad) {
        targetAngles[idx] = Math.max(0, Math.min(180, targetAngles[idx] + cantidad));
        actualizarTextos();
        sendAngles();
    };

    
    window.accionPinza = function(accion) {
        
        const ANGULO_ABIERTO = 160; 
        const ANGULO_CERRADO = 90;  

        if(accion === 'abrir') {
            targetAngles[5] = ANGULO_ABIERTO;
        } else {
            targetAngles[5] = ANGULO_CERRADO;
        }
        
        actualizarTextos();
        sendAngles();
    };

    function actualizarTextos() {
        const lecturas = document.getElementById('lecturas-grados');
        lecturas.innerHTML = targetAngles.map((ang, i) => `S${i+1}: <span class="text-white">${ang}°</span>`).join(' | ');
    }
    actualizarTextos();

    
    const canvasCont = document.getElementById('canvas3d');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161b22);
    
    const camera = new THREE.PerspectiveCamera(45, canvasCont.clientWidth / canvasCont.clientHeight, 0.1, 1000);
    camera.position.set(0, 20, 45);
    camera.lookAt(0, 10, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasCont.clientWidth, canvasCont.clientHeight);
    canvasCont.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 25, 15);
    scene.add(dirLight);
    scene.add(new THREE.GridHelper(30, 30, 0x444444, 0x222222));

    const matBase = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const matLink = new THREE.MeshStandardMaterial({ color: 0x0dcaf0 });
    const matJoint = new THREE.MeshStandardMaterial({ color: 0xffc107 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2, 32), matBase);
    scene.add(base);

    const joints = []; 
    let parent = base;
    const linkHeights = [6.1, 11.1, 9.2, 6.2, 3.2, 2.0];

    for(let i = 0; i < 6; i++) {
        const jointGroup = new THREE.Group();
        jointGroup.position.y = (i === 0) ? 1 : linkHeights[i-1]; 
        
        const jointMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), matJoint);
        jointGroup.add(jointMesh);

        const linkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, linkHeights[i], 16), matLink);
        linkMesh.position.y = linkHeights[i] / 2; 
        jointGroup.add(linkMesh);

        parent.add(jointGroup);
        joints.push(jointGroup);
        parent = jointGroup;
    }

    function animate() {
        requestAnimationFrame(animate);
        for(let i = 0; i < 6; i++) {
            visualAngles[i] += (targetAngles[i] - visualAngles[i]) * 0.1; 
            updateRobotVisual(i, visualAngles[i]);
        }
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = canvasCont.clientWidth / canvasCont.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasCont.clientWidth, canvasCont.clientHeight);
    });

    
    let envioEnCurso = false;

    async function sendAngles() {
        if(envioEnCurso) return; 
        envioEnCurso = true;

        const payload = {};
        targetAngles.forEach((ang, idx) => { payload[`s${idx+1}`] = ang; });
        
        try {
            await fetch('/set_servos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {}
        envioEnCurso = false;
    }

    function updateRobotVisual(idx, angle) {
        const radians = (angle - 90) * (Math.PI / 180);
        if(idx === 0) joints[idx].rotation.y = radians; 
        else if(idx === 1) joints[idx].rotation.z = radians; 
        else if(idx === 2) joints[idx].rotation.z = radians; 
        else if(idx === 3) joints[idx].rotation.y = radians; 
        else if(idx === 4) joints[idx].rotation.x = radians; 
        else joints[idx].rotation.z = radians; 
    }

    let rutinaIK = [];
    let enReproduccion = false;
    let modoBucleActivo = false;

    window.guardarPaso = function() {
        rutinaIK.push([...targetAngles]);
        document.getElementById('contadorPaso').innerText = rutinaIK.length;
    };

    window.borrarRutina = function() {
        rutinaIK = [];
        document.getElementById('contadorPaso').innerText = 0;
        enReproduccion = false;
    };

    window.reproducirRutina = async function(esBucle) {
        if (rutinaIK.length === 0) return;
        if (enReproduccion) { enReproduccion = false; return; }

        enReproduccion = true;
        modoBucleActivo = esBucle;
        const btnSencilla = document.getElementById('btnReproducir');
        const btnBucle = document.getElementById('btnBucle');

        if (modoBucleActivo) {
            btnBucle.classList.replace('btn-warning', 'btn-danger');
            btnBucle.classList.remove('text-dark');
            btnBucle.innerText = "STOP LOOP";
            btnSencilla.disabled = true;
        } else {
            btnSencilla.classList.replace('btn-success', 'btn-danger');
            btnSencilla.innerText = "STOP";
            btnBucle.disabled = true;
        }

        let pasoActual = 0;
        while (enReproduccion) {
            targetAngles = [...rutinaIK[pasoActual]];
            actualizarTextos();
            await sendAngles();
            await new Promise(resolve => setTimeout(resolve, 2500));
            pasoActual++;
            if (pasoActual >= rutinaIK.length) {
                if (modoBucleActivo) pasoActual = 0;
                else enReproduccion = false;
            }
        }

        btnSencilla.classList.replace('btn-danger', 'btn-success');
        btnSencilla.innerText = "ONCE";
        btnSencilla.disabled = false;
        btnBucle.classList.replace('btn-danger', 'btn-warning');
        btnBucle.classList.add('text-dark');
        btnBucle.innerText = "LOOP";
        btnBucle.disabled = false;
    };
});
