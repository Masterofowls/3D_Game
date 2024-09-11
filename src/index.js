import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Основные переменные
let isGameRunning = false;
let paused = false;
let menuVisible = true;

document.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') {
    if (isGameRunning) {
      resumeGame();
    } else {
      startGame();
    }
  } else if (event.code === 'Escape') {
    if (paused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }
});

function toggleMenu(visible) {
  const menu = document.getElementById('menu');
  menu.style.display = visible ? 'block' : 'none';
  menuVisible = visible;
}

function startGame() {
  toggleMenu(false);
  isGameRunning = true;
  paused = false;
  setTimeout(() => controls.lock(), 100);
  requestAnimationFrame(animate);
}

function resumeGame() {
  toggleMenu(false);
  paused = false;
  setTimeout(() => controls.lock(), 100);
  requestAnimationFrame(animate);
}

function pauseGame() {
  paused = true;
  toggleMenu(true);
}

// WebGPU Initialization with WGSL (No GLSLang required)
async function initWebGPU() {
  if (!navigator.gpu) {
    console.error("WebGPU is not supported on this browser.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const shaderModule = device.createShaderModule({
    code: `
      @vertex
      fn vs_main(@location(0) inPos: vec4<f32>) -> @builtin(position) vec4<f32> {
          return inPos;
      }

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(0.0, 1.0, 0.0, 1.0);
      }
    `,
  });

  // Initialize WebGPU Renderer (without GLSLang)
  const renderer = new THREE.WebGLRenderer(); // Note: Replace WebGPURenderer with standard WebGLRenderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  return renderer;
}

// Call initWebGPU to get the WebGPURenderer
initWebGPU().then((renderer) => {
  if (!renderer) return;

  // Сцена и камера
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.8, 5);

  // Счетчик FPS
  const stats = new Stats();
  document.body.appendChild(stats.dom);

  // Контролы камеры
  const controls = new PointerLockControls(camera, document.body);
  document.body.addEventListener('click', () => {
    if (!isGameRunning) return;
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    if (!paused) toggleMenu(false);
  });
  controls.addEventListener('unlock', () => {
    if (isGameRunning) pauseGame();
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Skybox
  const skyboxLoader = new THREE.CubeTextureLoader();
  const skyboxTexture = skyboxLoader.load([
    'https://playground.babylonjs.com/textures/skybox_px.jpg',
    'https://playground.babylonjs.com/textures/skybox_nx.jpg',
    'https://playground.babylonjs.com/textures/skybox_py.jpg',
    'https://playground.babylonjs.com/textures/skybox_ny.jpg',
    'https://playground.babylonjs.com/textures/skybox_pz.jpg',
    'https://playground.babylonjs.com/textures/skybox_nz.jpg'
  ]);
  scene.background = skyboxTexture;

  // Мир физики (Cannon.js)
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;

  const fixedTimeStep = 1 / 60;
  const maxSubSteps = 3;

  // Пол
  const textureLoader = new THREE.TextureLoader();
  const groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(10, 10);

  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, metalness: 0.3, roughness: 0.7 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // Стены
  const wallTexture = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_diff_2k.jpg');
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, metalness: 0.0, roughness: 0.8 });

  const wall1 = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), wallMaterial);
  wall1.position.set(0, 2.5, -5);
  wall1.castShadow = true;
  scene.add(wall1);

  const wall1Body = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5)),
  });
  wall1Body.position.set(0, 2.5, -5);
  world.addBody(wall1Body);

  // Освещение
  const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x0f0e0d, 1);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Зеркальная поверхность (отражения)
  const mirror = new Reflector(new THREE.PlaneGeometry(10, 10), {
    color: new THREE.Color(0x7f7f7f),
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
  });
  mirror.position.set(0, 5, -10);
  mirror.rotation.y = Math.PI / 2;
  scene.add(mirror);

  // Объект куба с динамической физикой
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterial);
  cube.position.set(0, 1, 0);
  cube.castShadow = true;
  scene.add(cube);

  const cubeBody = new CANNON.Body({
    mass: 2,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  });
  cubeBody.position.set(0, 1, 0);
  world.addBody(cubeBody);

  // Объект сферы с динамической физикой
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
  sphere.position.set(3, 1, 0);
  sphere.castShadow = true;
  scene.add(sphere);

  const sphereBody = new CANNON.Body({
    mass: 2,
    shape: new CANNON.Sphere(0.5),
  });
  sphereBody.position.set(3, 1, 0);
  world.addBody(sphereBody);

  // Физика игрока
  const playerBody = new CANNON.Body({
    mass: 5,
    shape: new CANNON.Sphere(1),
  });
  playerBody.position.set(0, 1, 10);
  world.addBody(playerBody);

  let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
  let canJump = false;
  let isSprinting = false;
  let baseMoveSpeed = 100;
  let sprintMultiplier = 2;
  let velocity = new THREE.Vector3();
  let heldObject = null;
  let holder = new THREE.Vector3();

  const pickupDistance = 2.5;

  playerBody.addEventListener('collide', (event) => {
    if (event.body === groundBody) {
      canJump = true;
    }
  });

  document.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'KeyW': moveForward = true; break;
      case 'KeyS': moveBackward = true; break;
      case 'KeyA': moveLeft = true; break;
      case 'KeyD': moveRight = true; break;
      case 'ControlLeft': isSprinting = true; break;
      case 'Space':
        if (canJump) {
          playerBody.velocity.y = 10;
          canJump = false;
        }
        break;
      case 'KeyE':
        if (heldObject) {
          releaseObject();
        } else {
          pickUpObject();
        }
        break;
      case 'KeyF':
        if (heldObject) {
          throwObject();
        }
        break;
    }
  });

  document.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyW': moveForward = false; break;
      case 'KeyS': moveBackward = false; break;
      case 'KeyA': moveLeft = false; break;
      case 'KeyD': moveRight = false; break;
      case 'ControlLeft': isSprinting = false; break;
    }
  });

  function pickUpObject() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects([cube, sphere]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      let body;
      if (intersectedObject === cube) {
        body = cubeBody;
      } else if (intersectedObject === sphere) {
        body = sphereBody;
      }

      const distance = playerBody.position.distanceTo(intersectedObject.position);

      if (distance <= pickupDistance) {
        heldObject = body;
        heldObject.angularVelocity.set(0, 0, 0);
        heldObject.angularDamping = 1;

        heldObject.type = CANNON.Body.KINEMATIC;
        heldObject.allowSleep = false;
        heldObject.gravityScale = 0;
        heldObject.collisionResponse = false;
      }
    }
  }

  function releaseObject() {
    if (heldObject) {
      heldObject.type = CANNON.Body.DYNAMIC;
      heldObject.gravityScale = 1;
      heldObject.angularDamping = 0.1;
      heldObject.collisionResponse = true;
      heldObject = null;
    }
  }

  function throwObject() {
    if (heldObject) {
      const throwVelocity = new CANNON.Vec3();
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      throwVelocity.set(cameraDirection.x * 20, cameraDirection.y * 20, cameraDirection.z * 20);

      heldObject.velocity.copy(throwVelocity);
      releaseObject();
    }
  }

  function updatePlayerMovement(delta) {
    velocity.set(0, 0, 0);

    const moveSpeed = isSprinting ? baseMoveSpeed * sprintMultiplier : baseMoveSpeed;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    if (moveForward) velocity.add(forward.multiplyScalar(moveSpeed * delta));
    if (moveBackward) velocity.add(forward.multiplyScalar(-moveSpeed * delta));
    if (moveLeft) velocity.add(right.multiplyScalar(-moveSpeed * delta));
    if (moveRight) velocity.add(right.multiplyScalar(moveSpeed * delta));

    playerBody.velocity.x = velocity.x;
    playerBody.velocity.z = velocity.z;

    camera.position.copy(playerBody.position);
    controls.object.position.copy(playerBody.position);

    if (heldObject) {
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.normalize();

      holder.copy(camera.position).add(cameraDirection.multiplyScalar(2));
      heldObject.position.set(holder.x, holder.y, holder.z);
    }
  }

  const clock = new THREE.Clock();
  function animate() {
    if (paused) return;

    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    world.step(fixedTimeStep, delta, maxSubSteps);

    updatePlayerMovement(delta);

    wall1.position.copy(wall1Body.position);
    wall1.quaternion.copy(wall1Body.quaternion);

    cube.position.copy(cubeBody.position);
    cube.quaternion.copy(cubeBody.quaternion);

    sphere.position.copy(sphereBody.position);
    sphere.quaternion.copy(sphereBody.quaternion);

    stats.update();
    renderer.render(scene, camera);
  }

  animate();
});
