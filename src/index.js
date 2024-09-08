import * as three from 'three'; // Import the three.js module
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'; // Import PointerLockControls
import * as CANNON from 'cannon-es'; // Import Cannon.js
import Stats from 'three/examples/jsm/libs/stats.module.js'; // Import Stats.js

let isPaused = false;
const resumeButton = document.getElementById('resumeButton');
const menu = document.getElementById('menu');

// Event Listener for Resume Button
document.addEventListener('DOMContentLoaded', function () {
  if (resumeButton) {
    resumeButton.onclick = resumeGame;
  } else {
    console.error("Resume button not found!");
  }
});

// Pause the game
function pauseGame() {
  isPaused = true;
  controls.unlock(); // Unlock the pointer
  menu.style.display = 'block'; // Show the pause menu
}

// Resume the game
function resumeGame() {
  isPaused = false;
  controls.lock(); // Lock the pointer and resume game
  menu.style.display = 'none'; // Hide the pause menu
}

// Scene and Renderer
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

// Lock and Unlock event listeners for pointer controls
controls.addEventListener('lock', () => {
  menu.style.display = 'none';  // Hide the pause menu when pointer is locked
});
controls.addEventListener('unlock', () => {
  if (!isPaused) pauseGame(); // Pause the game when the pointer is unlocked
});

// Lock pointer on body click
document.body.addEventListener('click', () => {
  if (!isPaused) controls.lock();
});

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

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
const textureLoader = new three.TextureLoader();
const groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
groundTexture.wrapS = groundTexture.wrapT = three.RepeatWrapping;
groundTexture.repeat.set(10, 10);

const groundMaterial = new three.MeshStandardMaterial({ map: groundTexture, metalness: 0.3, roughness: 0.7 });
const ground = new three.Mesh(new three.PlaneGeometry(50, 50), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Wall setup
const wallTexture = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_diff_2k.jpg');
const wallMaterial = new three.MeshStandardMaterial({ map: wallTexture, metalness: 0.0, roughness: 0.8 });

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

// Lighting setup
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

// Player movement logic
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let isSprinting = false;
let baseMoveSpeed = 100;
let sprintMultiplier = 2;
let velocity = new three.Vector3();
let heldObject = null;
const pickupDistance = 2.5;

// Chat System
const chatInput = document.createElement('input');
chatInput.type = 'text';
chatInput.style.position = 'absolute';
chatInput.style.bottom = '10px';
chatInput.style.left = '50%';
chatInput.style.transform = 'translateX(-50%)';
chatInput.style.display = 'none';
chatInput.style.padding = '10px';
chatInput.style.width = '300px';
chatInput.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
chatInput.style.color = 'white';
chatInput.style.border = '1px solid #ccc';
chatInput.style.borderRadius = '5px';
document.body.appendChild(chatInput);

let chatBox = document.createElement('div');
chatBox.style.position = 'absolute';
chatBox.style.bottom = '50px';
chatBox.style.left = '50%';
chatBox.style.transform = 'translateX(-50%)';
chatBox.style.maxHeight = '150px';
chatBox.style.overflowY = 'auto';
chatBox.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
chatBox.style.color = 'white';
chatBox.style.padding = '10px';
chatBox.style.width = '300px';
chatBox.style.borderRadius = '5px';
document.body.appendChild(chatBox);

let chatActive = false;

// Toggle chat
function toggleChat() {
  if (chatActive) {
    chatInput.style.display = 'none';
    chatInput.blur();
    chatActive = false;
    controls.lock(); // Resume game when closing chat
  } else {
    chatInput.style.display = 'block';
    chatInput.focus();
    chatActive = true;
    controls.unlock(); // Pause game while chat is active
  }
}

// Handle chat input
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyT' && !chatActive) {
    event.preventDefault();
    toggleChat();
  }
});

chatInput.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') {
    const message = chatInput.value.trim();
    if (message) addChatMessage(message);
    chatInput.value = ''; // Clear input
    toggleChat();
  }
});

function addChatMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Object interaction logic
const raycaster = new three.Raycaster();
const interactableObjects = [cube, sphere];

function pickUpObject() {
  raycaster.setFromCamera(new three.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(interactableObjects);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    let body = intersectedObject === cube ? cubeBody : sphereBody;

    if (playerBody.position.distanceTo(intersectedObject.position) <= pickupDistance) {
      heldObject = body;
      heldObject.type = CANNON.Body.KINEMATIC;
      heldObject.allowSleep = false;
      heldObject.gravityScale = 0;
    }
  }
}

function releaseObject() {
  if (heldObject) {
    heldObject.type = CANNON.Body.DYNAMIC;
    heldObject.gravityScale = 1;
    heldObject = null;
  }
}

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

// Input controls for movement, sprint, and interactions
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'ShiftLeft': isSprinting = true; break;
    case 'Space': if (canJump) playerBody.velocity.y = 10; break;
    case 'KeyE': heldObject ? releaseObject() : pickUpObject(); break;
    case 'KeyF': throwObject(); break;
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

// Update player movement
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

// Animation loop
const clock = new three.Clock();
function animate() {
  const delta = clock.getDelta();
  world.step(fixedTimeStep, delta, maxSubSteps);

  updatePlayerMovement(delta);

  // Sync the physics bodies and Three.js meshes
  cube.position.copy(cubeBody.position);
  cube.quaternion.copy(cubeBody.quaternion);

  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);

  stats.update();
  renderer.render(scene, camera);
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
