import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let isGameRunning = false;
let paused = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let isSprinting = false;
let baseMoveSpeed = 100;
let sprintMultiplier = 2;
let heldObject = null;
let holder = new THREE.Vector3();
const pickupDistance = 2.5;

document.addEventListener('DOMContentLoaded', function () {
  const mainButton = document.getElementById('mainButton');

  if (mainButton) {
    mainButton.onclick = () => {
      if (isGameRunning) {
        resumeGame();
      } else {
        startGame();
      }
    };
  } else {
    console.error("Main button not found!");
  }
});

function startGame() {
  controls.lock();
  isGameRunning = true;
  paused = false;
  document.getElementById('mainButton').innerText = 'Resume Game';
  document.getElementById('menu').style.display = 'none';
  animate();
}

function resumeGame() {
  controls.lock();
  paused = false;
  document.getElementById('menu').style.display = 'none';
  animate();
}

function pauseGame() {
  paused = true;
  document.getElementById('menu').style.display = 'block';
}

// Scene, renderer, and camera setup
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// FPS Counter (Stats.js)
const stats = new Stats();
document.body.appendChild(stats.dom);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => {
  if (!isGameRunning) return;
  controls.lock();
});
controls.addEventListener('lock', () => {
  if (!paused) document.getElementById('menu').style.display = 'none';
});
controls.addEventListener('unlock', () => {
  if (isGameRunning) pauseGame();
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Load skybox textures using CubeTextureLoader
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

// Physics world setup (Cannon.js)
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

const fixedTimeStep = 1 / 120;
const maxSubSteps = 3;

// Ground Physics
const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Ground Mesh
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10);

const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, metalness: 0.3, roughness: 0.7 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Cube object with dynamic physics
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

// Sphere object with dynamic physics
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), sphereMaterial);
sphere.position.set(3, 1, 0);
sphere.castShadow = true;
scene.add(sphere);

const sphereBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Sphere(0.5),
});
sphereBody.position.set(3, 1, 0);
world.addBody(sphereBody);

// Input controls
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'ControlLeft': isSprinting = true; break;
    case 'Space':
      if (canJump) {
        velocity.y = 10;
        canJump = false;
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

// Picking up objects and making them kinematic
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

    const distance = camera.position.distanceTo(intersectedObject.position);

    if (distance <= pickupDistance) {
      heldObject = body;
      heldObject.angularVelocity.set(0, 0, 0);
      heldObject.angularDamping = 1;

      // Disable gravity and set kinematic so the object doesn't affect the player
      heldObject.type = CANNON.Body.KINEMATIC;
      heldObject.allowSleep = false;
      heldObject.gravityScale = 0;

      // Adjust object position smoothly to prevent passing through walls
      heldObject.collisionResponse = false;
    }
  }
}

// Release held object and make it dynamic again
function releaseObject() {
  if (heldObject) {
    heldObject.type = CANNON.Body.DYNAMIC;
    heldObject.gravityScale = 1;
    heldObject.angularDamping = 0.1;
    heldObject.collisionResponse = true;
    heldObject = null;
  }
}

// Throw object with velocity
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

// Movement logic and restrictions
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

  camera.position.add(velocity);
}

// Animation loop
const clock = new THREE.Clock();
function animate() {
  if (paused) return;

  const delta = clock.getDelta();
  world.step(fixedTimeStep, delta, maxSubSteps);

  updatePlayerMovement(delta);

  cube.position.copy(cubeBody.position);
  cube.quaternion.copy(cubeBody.quaternion);

  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);

  stats.update();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
