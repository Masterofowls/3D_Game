import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { WebGPURenderer } from './WebGPURenderer.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module.js';
var isGameRunning = false; // Track if the game is running
var paused = false; // Track if the game is paused

document.addEventListener('DOMContentLoaded', function () {
  var mainButton = document.getElementById('mainButton');
  if (mainButton) {
    mainButton.onclick = function () {
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
var scene = new THREE.Scene();

// Replace WebGLRenderer with WebGPURenderer
var renderer = new WebGPURenderer({
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// FPS Counter (Stats.js)
var stats = new Stats();
document.body.appendChild(stats.dom);
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);
var controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', function () {
  if (!isGameRunning) return; // Prevent locking controls before the game starts
  controls.lock();
});
controls.addEventListener('lock', function () {
  if (!paused) document.getElementById('menu').style.display = 'none'; // Hide the menu when the pointer is locked
});
controls.addEventListener('unlock', function () {
  if (isGameRunning) pauseGame(); // Show the menu when the pointer is unlocked and the game is running
});
window.addEventListener('resize', function () {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Load Babylon.js online skybox textures using CubeTextureLoader
var skyboxLoader = new THREE.CubeTextureLoader();
var skyboxTexture = skyboxLoader.load(['https://playground.babylonjs.com/textures/skybox_px.jpg', 'https://playground.babylonjs.com/textures/skybox_nx.jpg', 'https://playground.babylonjs.com/textures/skybox_py.jpg', 'https://playground.babylonjs.com/textures/skybox_ny.jpg', 'https://playground.babylonjs.com/textures/skybox_pz.jpg', 'https://playground.babylonjs.com/textures/skybox_nz.jpg']);
scene.background = skyboxTexture;

// Physics world setup (unchanged)
var world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;
var fixedTimeStep = 1 / 120;
var maxSubSteps = 3;

// Ground Physics and Mesh setup (unchanged)
var groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);
var textureLoader = new THREE.TextureLoader();
var groundTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10);
var groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  metalness: 0.3,
  roughness: 0.7
});
var ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Wall, Cube, Sphere setup (unchanged)
var wallTexture = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_006/brick_wall_006_diff_2k.jpg');
var wallMaterial = new THREE.MeshStandardMaterial({
  map: wallTexture,
  metalness: 0.0,
  roughness: 0.8
});
var wall1 = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), wallMaterial);
wall1.position.set(0, 2.5, -5);
wall1.castShadow = true;
wall1.receiveShadow = true;
scene.add(wall1);
var wall1Body = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5))
});
wall1Body.position.set(0, 2.5, -5);
world.addBody(wall1Body);
var wall2 = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), wallMaterial);
wall2.position.set(-5, 2.5, 0);
wall2.rotation.y = Math.PI / 2;
wall2.castShadow = true;
wall2.receiveShadow = true;
scene.add(wall2);
var wall2Body = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5))
});
wall2Body.position.set(-5, 2.5, 0);
wall2Body.quaternion.setFromEuler(0, Math.PI / 2, 0);
world.addBody(wall2Body);

// Light setup (unchanged)
var hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x0f0e0d, 1);
scene.add(hemisphereLight);
var directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Cube object with dynamic physics
var cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000
});
var cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterial);
cube.position.set(0, 1, 0);
cube.castShadow = true;
scene.add(cube);
var cubeBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
});
cubeBody.position.set(0, 1, 0);
world.addBody(cubeBody);
var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({
  color: 0x00ff00
}));
sphere.position.set(3, 1, 0);
sphere.castShadow = true;
scene.add(sphere);
var sphereBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Sphere(0.5)
});
sphereBody.position.set(3, 1, 0);
world.addBody(sphereBody);
var playerBody = new CANNON.Body({
  mass: 5,
  shape: new CANNON.Sphere(1)
});
playerBody.position.set(0, 1, 10);
world.addBody(playerBody);
var moveForward = false,
  moveBackward = false,
  moveLeft = false,
  moveRight = false;
var canJump = false;
var isSprinting = false;
var baseMoveSpeed = 100;
var sprintMultiplier = 2;
var velocity = new THREE.Vector3();
var heldObject = null;
var holder = new THREE.Vector3();
var pickupDistance = 2.5;

// Event listener for collisions to enable jumping (unchanged)
playerBody.addEventListener('collide', function (event) {
  if (event.body === groundBody) {
    canJump = true;
  }
});

// Input controls (unchanged)
document.addEventListener('keydown', function (event) {
  switch (event.code) {
    case 'KeyW':
      moveForward = true;
      break;
    case 'KeyS':
      moveBackward = true;
      break;
    case 'KeyA':
      moveLeft = true;
      break;
    case 'KeyD':
      moveRight = true;
      break;
    case 'ControlLeft':
      isSprinting = true;
      break;
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
document.addEventListener('keyup', function (event) {
  switch (event.code) {
    case 'KeyW':
      moveForward = false;
      break;
    case 'KeyS':
      moveBackward = false;
      break;
    case 'KeyA':
      moveLeft = false;
      break;
    case 'KeyD':
      moveRight = false;
      break;
    case 'ControlLeft':
      isSprinting = false;
      break;
  }
});

// Animation loop (unchanged)
var clock = new THREE.Clock();
function animate() {
  if (paused) return;
  var delta = clock.getDelta();
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