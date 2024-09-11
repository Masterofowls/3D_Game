import * as three from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let isGameRunning = false; // Track if the game is running
let paused = false; // Track if the game is paused

document.addEventListener('DOMContentLoaded', function () {
  const mainButton = document.getElementById('mainButton');

  if (mainButton) {
    mainButton.onclick = () => {
      if (isGameRunning) {
        resumeGame(); // Resume the game if already started and paused
      } else {
        startGame(); // Start the game for the first time
      }
    };
  } else {
    console.error("Main button not found!");
  }
});

function startGame() {
  controls.lock(); // Lock the pointer for the first time
  isGameRunning = true;
  paused = false;
  document.getElementById('mainButton').innerText = 'Resume Game'; // Change button to 'Resume Game' after start
  document.getElementById('menu').style.display = 'none'; // Hide the menu
  animate(); // Start the game animation loop
}

function resumeGame() {
  controls.lock(); // Lock the pointer again to resume
  paused = false;
  document.getElementById('menu').style.display = 'none'; // Hide the menu
  animate(); // Resume the animation loop
}

function pauseGame() {
  paused = true;
  document.getElementById('menu').style.display = 'block'; // Show the menu when paused
}

const scene = new three.Scene();
const renderer = new three.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = three.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// FPS Counter (Stats.js)
const stats = new Stats();
document.body.appendChild(stats.dom);

const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => {
  if (!isGameRunning) return; // Prevent locking controls before the game starts
  controls.lock();
});
controls.addEventListener('lock', () => {
  if (!paused) document.getElementById('menu').style.display = 'none'; // Hide the menu when the pointer is locked
});
controls.addEventListener('unlock', () => {
  if (isGameRunning) pauseGame(); // Show the menu when the pointer is unlocked and the game is running
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Load Babylon.js online skybox textures using CubeTextureLoader
const skyboxLoader = new three.CubeTextureLoader();
const skyboxTexture = skyboxLoader.load([
  'https://playground.babylonjs.com/textures/skybox_px.jpg',
  'https://playground.babylonjs.com/textures/skybox_nx.jpg',
  'https://playground.babylonjs.com/textures/skybox_py.jpg',
  'https://playground.babylonjs.com/textures/skybox_ny.jpg',
  'https://playground.babylonjs.com/textures/skybox_pz.jpg',
  'https://playground.babylonjs.com/textures/skybox_nz.jpg'
]);
scene.background = skyboxTexture;

// Physics world
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
const wallTexture = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_diff_2k.jpg');
const wallMaterial = new three.MeshStandardMaterial({ map: wallTexture, metalness: 0.0, roughness: 0.8 });

// Create walls
const wall1 = new three.Mesh(new three.BoxGeometry(10, 5, 1), wallMaterial);
wall1.position.set(0, 2.5, -5);
wall1.castShadow = true;
wall1.receiveShadow = true;
scene.add(wall1);

const wall1Body = new CANNON.Body({
  mass: 0,
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
  mass: 0,
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

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let isSprinting = false;
let baseMoveSpeed = 100;
let sprintMultiplier = 2;
let velocity = new three.Vector3();
let heldObject = null;
let holder = new three.Vector3();

const pickupDistance = 2.5;

// Event listener for collisions to enable jumping
playerBody.addEventListener('collide', (event) => {
  if (event.body === groundBody) {
    canJump = true;
  }
});

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

// Picking up objects and making them kinematic
function pickUpObject() {
  const raycaster = new three.Raycaster();
  raycaster.setFromCamera(new three.Vector2(0, 0), camera);
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
    const cameraDirection = new three.Vector3();
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

  // Move held object smoothly with the player
  if (heldObject) {
    const cameraDirection = new three.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.normalize();

    holder.copy(camera.position).add(cameraDirection.multiplyScalar(2));

    heldObject.position.set(holder.x, holder.y, holder.z);
  }
}

// Animation loop
const clock = new three.Clock();
function animate() {
  if (paused) return; // Stop the loop if paused

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
  requestAnimationFrame(animate);
}

animate();