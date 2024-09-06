import * as three from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es'; // Import Cannon.js

// Initialize the scene
const scene = new three.Scene();

// Enable shadow maps for better lighting and realism
const renderer = new three.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;  // Enable shadows
renderer.shadowMap.type = three.PCFSoftShadowMap;  // Use soft shadows
document.body.appendChild(renderer.domElement);

// Create a camera
const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5); // Adjusted height for better player perspective

// PointerLock Controls for Mouse Look
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => document.getElementById('menu').style.display = 'none');
controls.addEventListener('unlock', () => document.getElementById('menu').style.display = 'block');

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Physics setup with Cannon.js
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Gravity pointing downwards
world.broadphase = new CANNON.NaiveBroadphase(); // Broadphase for optimized collision detection
world.solver.iterations = 10; // Increase solver iterations for more accurate physics

// Reduce physics step to improve collision detection
const fixedTimeStep = 1 / 120;  // 120 Hz for better collision detection
const maxSubSteps = 3;  // Max sub-steps to avoid tunneling

// Create the ground physics body
const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC, // Doesn't move
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate ground to lie flat
world.addBody(groundBody);

// Load textures for the ground
const textureLoader = new three.TextureLoader();
const groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
groundTexture.wrapS = groundTexture.wrapT = three.RepeatWrapping;
groundTexture.repeat.set(10, 10);

// Create the ground with a basic PBR material
const groundMaterial = new three.MeshStandardMaterial({ map: groundTexture, metalness: 0.3, roughness: 0.7 });
const ground = new three.Mesh(new three.PlaneGeometry(50, 50), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Wall textures from Poly Haven
const wallAlbedo = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_diff_2k.jpg');
const wallNormal = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_nor_gl_2k.jpg');
const wallRoughness = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_rough_2k.jpg');
const wallDisplacement = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_disp_2k.jpg');

// Adjust texture wrapping and repeat to cover the walls correctly
wallAlbedo.wrapS = wallAlbedo.wrapT = three.RepeatWrapping;
wallAlbedo.repeat.set(2, 1);
wallNormal.wrapS = wallNormal.wrapT = three.RepeatWrapping;
wallNormal.repeat.set(2, 1);
wallRoughness.wrapS = wallRoughness.wrapT = three.RepeatWrapping;
wallRoughness.repeat.set(2, 1);
wallDisplacement.wrapS = wallDisplacement.wrapT = three.RepeatWrapping;
wallDisplacement.repeat.set(2, 1);

// Create wall material using albedo, normal, roughness, and displacement maps
const wallMaterial = new three.MeshStandardMaterial({
  map: wallAlbedo,
  normalMap: wallNormal,
  roughnessMap: wallRoughness,
  displacementMap: wallDisplacement,
  metalness: 0.0,
  roughness: 0.8,
  displacementScale: 0.1,
});

// Create wall meshes and corresponding physics bodies
const wall1 = new three.Mesh(new three.BoxGeometry(10, 5, 1), wallMaterial);
wall1.position.set(0, 2.5, -5); // Centered and positioned vertically at half-height
wall1.castShadow = true;
wall1.receiveShadow = true;
scene.add(wall1);

// Create physics body for wall1
const wall1Body = new CANNON.Body({
  mass: 0, // Static object
  shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5)), // Half-extents of the wall
  collisionFilterGroup: 1,  // Group for static objects
  collisionFilterMask: 2 | 4 // Allow collision with player and movable objects
});
wall1Body.position.set(0, 2.5, -5);
world.addBody(wall1Body);

const wall2 = new three.Mesh(new three.BoxGeometry(10, 5, 1), wallMaterial);
wall2.position.set(-5, 2.5, 0);
wall2.rotation.y = Math.PI / 2;
wall2.castShadow = true;
wall2.receiveShadow = true;
scene.add(wall2);

// Create physics body for wall2
const wall2Body = new CANNON.Body({
  mass: 0, // Static object
  shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5)),
  collisionFilterGroup: 1, // Group for static objects
  collisionFilterMask: 2 | 4 // Allow collision with player and movable objects
});
wall2Body.position.set(-5, 2.5, 0);
wall2Body.quaternion.setFromEuler(0, Math.PI / 2, 0); // Align the body to match the visual rotation
world.addBody(wall2Body);

// Add Hemisphere light for ambient lighting (simulates sky lighting)
const hemisphereLight = new three.HemisphereLight(0xddeeff, 0x0f0e0d, 1);
scene.add(hemisphereLight);

// Add directional light for sharper shadows and more definition
const directionalLight = new three.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add a point light to simulate a localized dynamic light source
const pointLight = new three.PointLight(0xffffff, 0.8, 50);
pointLight.position.set(5, 10, 5);
pointLight.castShadow = true;
scene.add(pointLight);

// Define a custom shader for special objects
const customShaderMaterial = new three.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      vec3 light = vec3(0.5, 0.5, 0.8);
      light = normalize(light);
      float lighting = dot(vNormal, light) * 0.5 + 0.5;
      gl_FragColor = vec4(vec3(0.3, 0.5, 1.0) * lighting, 1.0);
    }
  `,
});

// Add Cube Object with Physics
const customObject = new three.Mesh(new three.BoxGeometry(1, 1, 1), customShaderMaterial); // Smaller cube
customObject.position.set(0, 1, 0);
customObject.castShadow = true;
scene.add(customObject);

// Add physics to the cube
const customObjectBody = new CANNON.Body({
  mass: 2, // Dynamic object
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)), // Physics size matches the visual size
  collisionFilterGroup: 4, // Group for dynamic objects
  collisionFilterMask: 1 | 2 | 4 // Collide with walls, player, and other dynamic objects
});
customObjectBody.position.set(0, 1, 0);
world.addBody(customObjectBody);

// Add a Sphere Object with Physics
const sphereGeometry = new three.SphereGeometry(0.5, 32, 32); // Visual sphere geometry
const sphereMaterial = new three.MeshStandardMaterial({ color: 0x00ff00 }); // Green material for sphere
const sphere = new three.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(3, 1, 0);
sphere.castShadow = true;
scene.add(sphere);

// Add physics to the sphere
const sphereBody = new CANNON.Body({
  mass: 2, // Dynamic object with same mass as cube
  shape: new CANNON.Sphere(0.5), // Physics size matches the visual size of the sphere
  collisionFilterGroup: 4, // Group for dynamic objects
  collisionFilterMask: 1 | 2 | 4 // Collide with walls, player, and other dynamic objects
});
sphereBody.position.set(3, 1, 0);
world.addBody(sphereBody);

// Player movement controls with a physics body
const playerShape = new CANNON.Sphere(1.0); // Increased player size to better fit walls and objects
const playerBody = new CANNON.Body({ 
  mass: 5, 
  shape: playerShape, 
  collisionFilterGroup: 2, // Group for the player
  collisionFilterMask: 1 | 4 // Collide with walls and dynamic objects
});
playerBody.position.set(0, 1, 10); // Moved player start position to avoid overlap with objects
playerBody.linearDamping = 0.9; // Reduced sliding effect by damping linear velocity
playerBody.angularDamping = 0.9; // Reduced rotation/slipping
world.addBody(playerBody);

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let isSprinting = false;
let baseMoveSpeed = 100;
let sprintMultiplier = 2;
let velocity = new three.Vector3();
let direction = new three.Vector3();

// Event listener for collisions to detect when the player is grounded
playerBody.addEventListener('collide', (event) => {
  if (Math.abs(event.contact.ni.y) > 0.5) { // Check if the collision normal is mostly vertical
    canJump = true; // Allow jumping
  }
});

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = true; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = true; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = true; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = true; break;
    case 'Space': // Handle jump
      if (canJump) {
        playerBody.velocity.y = 10; // Apply upward velocity for jumping
        canJump = false; // Disable further jumping until the player lands
      }
      break;
    case 'ControlLeft': // Handle sprinting
      isSprinting = true;
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = false; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = false; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = false; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = false; break;
    case 'ControlLeft': // Stop sprinting when Ctrl is released
      isSprinting = false;
      break;
  }
});

// Update player movement based on camera direction
function updatePlayerMovement(delta) {
  velocity.set(0, 0, 0);

  const moveSpeed = isSprinting ? baseMoveSpeed * sprintMultiplier : baseMoveSpeed;

  // Get the camera's forward direction
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

  // Sync the camera with the player's physics body
  camera.position.copy(playerBody.position);
  controls.object.position.copy(playerBody.position); // Replacing getObject() with controls.object
}

// Main animation loop
const clock = new three.Clock();
function animate() {
  const delta = clock.getDelta();

  // Update physics with sub-stepping to prevent tunneling
  world.step(fixedTimeStep, delta, maxSubSteps);

  updatePlayerMovement(delta);

  // Sync wall meshes with physics bodies
  wall1.position.copy(wall1Body.position);
  wall1.quaternion.copy(wall1Body.quaternion);
  wall2.position.copy(wall2Body.position);
  wall2.quaternion.copy(wall2Body.quaternion);

  // Sync cube and sphere with their physics bodies
  customObject.position.copy(customObjectBody.position);
  customObject.quaternion.copy(customObjectBody.quaternion);

  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// Function to resume game from the menu
function resumeGame() {
  controls.lock();
}

// Load Babylon.js skybox
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
