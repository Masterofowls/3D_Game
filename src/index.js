import * as three from 'three'; // Import the three.js module
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'; // Import PointerLockControls
import * as CANNON from 'cannon-es'; // Import Cannon.js
import Stats from 'three/examples/jsm/libs/stats.module.js'; // Import Stats.js

// Pause menu logic
let isPaused = false;
const menu = document.getElementById('menu');

// Pause the game
function pauseGame() {
  isPaused = true;
  menu.style.display = 'block';  // Show the pause menu
  controls.unlock();  // Unlock pointer controls
  document.exitPointerLock();  // Ensure the cursor shows up
}

// Resume the game
function resumeGame() {
  isPaused = false;
  menu.style.display = 'none';  // Hide the pause menu
  controls.lock();  // Lock the pointer again
}

// Handle resume button click
document.addEventListener('DOMContentLoaded', function () {
  const resumeButton = document.getElementById('resumeButton');
  if (resumeButton) {
    resumeButton.onclick = () => {
      resumeGame();
    };
  } else {
    console.error("Resume button not found!");
  }
});

// Toggle Pause with Esc key
document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    if (!isPaused) {
      pauseGame();
    } else {
      resumeGame();
    }
  }
});

// Create the scene and renderer
const scene = new three.Scene();
const renderer = new three.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = three.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// FPS Counter (Stats.js)
const stats = new Stats();
document.body.appendChild(stats.dom);

// Camera and Controls
const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);

const controls = new PointerLockControls(camera, document.body);

// Ensure that movement works when the pointer is locked
controls.addEventListener('lock', () => {
  isPaused = false;  // Ensure the game is not paused when the pointer is locked
});

controls.addEventListener('unlock', () => {
  pauseGame();  // Pause the game as soon as the pointer is unlocked (e.g., by pressing "Esc")
});

// Handle locking pointer on click (allowing the player to move on game start)
document.body.addEventListener('click', () => {
  if (!isPaused) {
    controls.lock();  // Lock the pointer and allow movement when the canvas is clicked
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Physics world setup
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
const textureLoader = new three.TextureLoader();
const groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
groundTexture.wrapS = groundTexture.wrapT = three.RepeatWrapping;
groundTexture.repeat.set(10, 10);

const groundMaterial = new three.MeshStandardMaterial({ map: groundTexture, metalness: 0.3, roughness: 0.7 });
const ground = new three.Mesh(new three.PlaneGeometry(50, 50), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Wall texture
const wallTexture = textureLoader.load('images/brick_wall_006_diff_2k.jpg');
const wallMaterial = new three.MeshStandardMaterial({ map: wallTexture, metalness: 0.0, roughness: 0.8 });

// Create walls
const wall1 = new three.Mesh(new three.BoxGeometry(10, 5, 1), wallMaterial);
wall1.position.set(0, 2.5, -5);
wall1.castShadow = true;
wall1.receiveShadow = true;
scene.add(wall1);

const wall1Body = new CANNON.Body({
  mass: 0, // Static object, unmovable
  shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5)),
});
wall1Body.position.set(0, 2.5, -5);
world.addBody(wall1Body);

const wall2 = new three.Mesh(new three.BoxGeometry(10, 5, 1), wallMaterial);
wall2.position.set(-5, 2.5, 0);
wall2.rotation.y = Math.PI / 2;
wall2.castShadow = true;
wall2.receiveShadow = true;
scene.add(wall2);

const wall2Body = new CANNON.Body({
  mass: 0, // Static object, unmovable
  shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5)),
});
wall2Body.position.set(-5, 2.5, 0);
wall2Body.quaternion.setFromEuler(0, Math.PI / 2, 0);
world.addBody(wall2Body);

// Light setup
const hemisphereLight = new three.HemisphereLight(0xddeeff, 0x0f0e0d, 1);
scene.add(hemisphereLight);

const directionalLight = new three.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Cube object with dynamic physics
const cubeMaterial = new three.MeshStandardMaterial({ color: 0xff0000 });
const cube = new three.Mesh(new three.BoxGeometry(1, 1, 1), cubeMaterial);
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
const sphere = new three.Mesh(new three.SphereGeometry(0.5, 32, 32), new three.MeshStandardMaterial({ color: 0x00ff00 }));
sphere.position.set(3, 1, 0);
sphere.castShadow = true;
scene.add(sphere);

const sphereBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Sphere(0.5),
});
sphereBody.position.set(3, 1, 0);
world.addBody(sphereBody);

// Player Physics
const playerBody = new CANNON.Body({
  mass: 5,
  shape: new CANNON.Sphere(1),
});
playerBody.position.set(0, 1, 10);
world.addBody(playerBody);

// Helper function to detect collision with the ground for jumping
function handlePlayerCollision(event) {
  if (Math.abs(event.contact.ni.y) > 0.5) { // If the collision is from below
    canJump = true;
  }
}

// Add event listener for collisions to enable jumping
playerBody.addEventListener('collide', handlePlayerCollision);

// ---- MOVEMENT LOGIC ---- //
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let isSprinting = false;
let baseMoveSpeed = 50;
let sprintMultiplier = 6;
let velocity = new three.Vector3();

// Movement control logic (keydown)
function handleMovementControls(event) {
  if (controls.isLocked && !isPaused) {
    switch (event.code) {
      case 'KeyW': moveForward = true; break;
      case 'KeyS': moveBackward = true; break;
      case 'KeyA': moveLeft = true; break;
      case 'KeyD': moveRight = true; break;
      case 'ShiftLeft': isSprinting = true; break;
      case 'Space': 
        if (canJump) {
          playerBody.velocity.y = 15;
          canJump = false;
        }
        break;
    }
  }
}

// Movement control logic (keyup)
function handleStopMovementControls(event) {
  if (controls.isLocked && !isPaused) {
    switch (event.code) {
      case 'KeyW': moveForward = false; break;
      case 'KeyS': moveBackward = false; break;
      case 'KeyA': moveLeft = false; break;
      case 'KeyD': moveRight = false; break;
      case 'ShiftLeft': isSprinting = false; break;
    }
  }
}

// Event listeners for movement controls
document.addEventListener('keydown', handleMovementControls);
document.addEventListener('keyup', handleStopMovementControls);

// ---- MOVEMENT UPDATE AND ANIMATION ---- //
function updatePlayerMovement(delta) {
  velocity.set(0, 0, 0);
  const moveSpeed = isSprinting ? baseMoveSpeed * sprintMultiplier : baseMoveSpeed;

  const forward = new three.Vector3();
  camera.getWorldDirection(forward);

  const right = new three.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (moveForward) velocity.add(forward.multiplyScalar(moveSpeed * delta));
  if (moveBackward) velocity.add(forward.multiplyScalar(-moveSpeed * delta));
  if (moveLeft) velocity.add(right.multiplyScalar(-moveSpeed * delta));
  if (moveRight) velocity.add(right.multiplyScalar(moveSpeed * delta));

  playerBody.velocity.x = velocity.x;
  playerBody.velocity.z = velocity.z;

  camera.position.copy(playerBody.position);
  controls.object.position.copy(playerBody.position);
}

const clock = new three.Clock();
function animate() {
  if (!isPaused) {  // Update only if the game is not paused
    const delta = clock.getDelta();
    world.step(fixedTimeStep, delta, maxSubSteps);

    updatePlayerMovement(delta);

    wall1.position.copy(wall1Body.position);
    wall1.quaternion.copy(wall1Body.quaternion);
    wall2.position.copy(wall2Body.position);
    wall2.quaternion.copy(wall2Body.quaternion);

    cube.position.copy(cubeBody.position);
    cube.quaternion.copy(cubeBody.quaternion);

    sphere.position.copy(sphereBody.position);
    sphere.quaternion.copy(sphereBody.quaternion);

    stats.update();

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

animate();

// Load skybox texture
const skyboxLoader = new three.CubeTextureLoader();
const skyboxTexture = skyboxLoader.load([
  'https://playground.babylonjs.com/textures/skybox_px.jpg',
  'https://playground.babylonjs.com/textures/skybox_nx.jpg',
  'https://playground.babylonjs.com/textures/skybox_py.jpg',
  'https://playground.babylonjs.com/textures/skybox_ny.jpg',
  'https://playground.babylonjs.com/textures/skybox_pz.jpg',
  'https://playground.babylonjs.com/textures/skybox_nz.jpg',
]);
scene.background = skyboxTexture;
