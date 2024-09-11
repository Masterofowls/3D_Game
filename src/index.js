import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Main variables
let isGameRunning = false;
let paused = false;
let menuVisible = true;

// Movement variables
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let isSprinting = false;
let baseMoveSpeed = 10;
let sprintMultiplier = 2;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3(); // Direction vector for movement
let playerBody; // Player physics body

// Event listeners for player movement
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'Enter':
      if (isGameRunning) resumeGame();
      else startGame();
      break;
    case 'Escape':
      if (paused) resumeGame();
      else pauseGame();
      break;
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'ShiftLeft': isSprinting = true; break;
    case 'Space':
      if (canJump && playerBody) {
        playerBody.velocity.y = 10; // Jump velocity
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
    case 'ShiftLeft': isSprinting = false; break;
  }
});

// Game control functions
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

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  return renderer;
}

initWebGPU().then((renderer) => {
  if (!renderer) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.8, 5); // Height to simulate the player's view

  const stats = new Stats();
  document.body.appendChild(stats.dom);

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

  // Initialize Cannon.js physics world
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  // Create player body (invisible in first-person view)
  playerBody = new CANNON.Body({
    mass: 5,
    shape: new CANNON.Sphere(1), // A simple sphere for collision detection
  });
  playerBody.position.set(0, 1, 10);
  world.addBody(playerBody);

  // Floor for player to walk on
  const groundBody = new CANNON.Body({
    mass: 0, // Static body
    shape: new CANNON.Plane(),
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate plane to be horizontal
  world.addBody(groundBody);

  // Player movement function
  function updatePlayerMovement(delta) {
    velocity.set(0, 0, 0);

    const moveSpeed = isSprinting ? baseMoveSpeed * sprintMultiplier : baseMoveSpeed;
    direction.set(0, 0, 0);

    // Get movement directions based on camera's orientation
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    if (moveForward) direction.add(forward);
    if (moveBackward) direction.sub(forward);
    if (moveLeft) direction.sub(right);
    if (moveRight) direction.add(right);

    direction.normalize(); // Normalize direction vector to prevent faster diagonal movement

    // Apply movement speed
    velocity.copy(direction.multiplyScalar(moveSpeed));

    // Apply to physics body
    playerBody.velocity.x = velocity.x;
    playerBody.velocity.z = velocity.z;

    // Sync camera with player body position
    camera.position.copy(playerBody.position);
  }

  const clock = new THREE.Clock();
  function animate() {
    if (paused) return;

    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    world.step(1 / 60, delta, 3); // Update physics simulation

    updatePlayerMovement(delta); // Update player movement based on inputs

    stats.update();
    renderer.render(scene, camera); // Render the scene
  }

  animate();
});
