import * as three from 'three'; // Import the three.js module
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'; // Import PointerLockControls
import * as CANNON from 'cannon-es'; // Import Cannon.js

document.addEventListener('DOMContentLoaded', function () {
  const resumeButton = document.getElementById('resumeButton');
  if (resumeButton) {
    resumeButton.onclick = resumeGame;
  } else {
    console.error("Resume button not found!");
  }
});

function resumeGame() {
  controls.lock();
}

const scene = new three.Scene();
const renderer = new three.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = three.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => document.getElementById('menu').style.display = 'none');
controls.addEventListener('unlock', () => document.getElementById('menu').style.display = 'block');

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

const fixedTimeStep = 1 / 120;
const maxSubSteps = 3;

const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const textureLoader = new three.TextureLoader();
const groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
groundTexture.wrapS = groundTexture.wrapT = three.RepeatWrapping;
groundTexture.repeat.set(10, 10);

const groundMaterial = new three.MeshStandardMaterial({ map: groundTexture, metalness: 0.3, roughness: 0.7 });
const ground = new three.Mesh(new three.PlaneGeometry(50, 50), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const wallAlbedo = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_diff_2k.jpg');
const wallMaterial = new three.MeshStandardMaterial({ map: wallAlbedo, metalness: 0.0, roughness: 0.8 });

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

const hemisphereLight = new three.HemisphereLight(0xddeeff, 0x0f0e0d, 1);
scene.add(hemisphereLight);

const directionalLight = new three.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

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

const customObject = new three.Mesh(new three.BoxGeometry(1, 1, 1), customShaderMaterial);
customObject.position.set(0, 1, 0);
customObject.castShadow = true;
scene.add(customObject);

const customObjectBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
});
customObjectBody.position.set(0, 1, 0);
customObjectBody.threeMesh = customObject;  // Link the three.js mesh with the physics body
world.addBody(customObjectBody);

const sphere = new three.Mesh(new three.SphereGeometry(0.5, 32, 32), new three.MeshStandardMaterial({ color: 0x00ff00 }));
sphere.position.set(3, 1, 0);
sphere.castShadow = true;
scene.add(sphere);

const sphereBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Sphere(0.5),
});
sphereBody.position.set(3, 1, 0);
sphereBody.threeMesh = sphere;  // Link the three.js mesh with the physics body
world.addBody(sphereBody);

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
const pickupDistance = 2.5;

playerBody.addEventListener('collide', (event) => {
  if (Math.abs(event.contact.ni.y) > 0.5) {
    canJump = true;
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
    case 'ArrowRight': moveRight = true; break;
    case 'Space':
      if (canJump) {
        playerBody.velocity.y = 10;
        canJump = false;
      }
      break;
    case 'ControlLeft': isSprinting = true; break;
    case 'KeyE': 
      if (heldObject) {
        releaseObject();
      } else {
        pickUpObject();
      }
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
    case 'ArrowRight': moveRight = false; break;
    case 'ControlLeft': isSprinting = false; break;
  }
});

function pickUpObject() {
  const raycaster = new three.Raycaster();
  raycaster.setFromCamera(new three.Vector2(0, 0), camera); 
  const intersects = raycaster.intersectObjects([customObject, sphere]);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    let body;
    if (intersectedObject === customObject) {
      body = customObjectBody;
    } else if (intersectedObject === sphere) {
      body = sphereBody;
    }

    const distance = playerBody.position.distanceTo(intersectedObject.position);
    
    if (distance <= pickupDistance && body.mass > 0) {
      heldObject = body;
      heldObject.type = CANNON.Body.KINEMATIC;  // Set to kinematic to ignore gravity, retain volume for collisions
      heldObject.velocity.set(0, 0, 0); // Reset velocity to prevent shaking
      heldObject.angularVelocity.set(0, 0, 0);
    }
  }
}

function releaseObject() {
  if (heldObject) {
    heldObject.type = CANNON.Body.DYNAMIC; // Re-enable full physics when releasing
    heldObject = null;
  }
}

function checkForCollisions(newPosition, object) {
  const boundingBox = new three.Box3().setFromObject(object.threeMesh);
  const directions = [
    new three.Vector3(1, 0, 0),  // Right
    new three.Vector3(-1, 0, 0), // Left
    new three.Vector3(0, 1, 0),  // Up
    new three.Vector3(0, -1, 0), // Down
    new three.Vector3(0, 0, 1),  // Forward
    new three.Vector3(0, 0, -1), // Backward
  ];

  for (let direction of directions) {
    const raycaster = new three.Raycaster();
    const origin = boundingBox.getCenter(new three.Vector3());
    raycaster.set(origin, direction);
    
    const distance = boundingBox.getSize(new three.Vector3()).length() * 0.5;
    const intersects = raycaster.intersectObjects([wall1, wall2, ground]);

    if (intersects.length > 0 && intersects[0].distance < distance) {
      return true;
    }
  }
  return false;
}

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

  if (heldObject) {
    const cameraDirection = new three.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.normalize();
    
    const offset = new three.Vector3();
    offset.copy(cameraDirection).multiplyScalar(2); // Move object 2 units in front of camera
    offset.add(camera.position);

    // Check if the object would collide with any walls/objects
    if (!checkForCollisions(offset, heldObject)) {
      heldObject.position.set(offset.x, offset.y, offset.z); // Move the held object with the player
    } else {
      // Adjust position slightly to avoid object getting stuck
      offset.y += 0.1; // Adjust slightly upward to prevent getting stuck
      heldObject.position.set(offset.x, offset.y, offset.z);
    }
  }
}

const clock = new three.Clock();
function animate() {
  const delta = clock.getDelta();
  world.step(fixedTimeStep, delta, maxSubSteps);
  updatePlayerMovement(delta);

  wall1.position.copy(wall1Body.position);
  wall1.quaternion.copy(wall1Body.quaternion);
  wall2.position.copy(wall2Body.position);
  wall2.quaternion.copy(wall2Body.quaternion);

  customObject.position.copy(customObjectBody.position);
  customObject.quaternion.copy(customObjectBody.quaternion);

  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

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
