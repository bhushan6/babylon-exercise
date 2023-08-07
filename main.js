import "./style.css";
import * as BABYLON from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import cannon from "cannon";

const COLOR_BLACK = new BABYLON.Color3(0, 0, 0);
const COLOR_WHITE = new BABYLON.Color3(1, 1, 1);

const colors = ["#FF4D4D", "#25A769", "#FFBD4D", "#D36DC1", "#7D9AEB"];

function getRandomElement(arr) {
  if (!arr.length) {
    return null; // Return null if the array is empty
  }
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

function hexToRgb(hex) {
  if (hex.charAt(0) === "#") {
    hex = hex.slice(1);
  }

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

const BOX = "BOX";
const SPHERE = "SPHERE";
const CYLINDER = "CYLINDER";
const CONE = "CONE";
const TORUS = "TORUS";

const types = [BOX, CYLINDER, SPHERE, CONE, TORUS];

const initCamera = (scene) => {
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    0,
    0,
    10,
    new BABYLON.Vector3(0, 0, 0),
    scene
  );

  camera.attachControl(true);
  camera.setPosition(new BABYLON.Vector3(0, 20, -20));
  return camera;
};

const initMesh = (type = BOX, scene, physics, position = {}) => {
  let mesh;
  let s = 1;
  switch (type) {
    case BOX:
      mesh = BABYLON.CreateBox("box", { size: 0.8 * s }, scene);
      break;
    case SPHERE:
      mesh = BABYLON.CreateSphere(
        "sphere",
        { segments: 16, diameter: 1 * s },
        scene
      );
      break;
    case CYLINDER:
      mesh = BABYLON.CreateCylinder(
        "cylinder",
        { height: 1 * s, diameter: 0.6 * s },
        scene
      );
      break;
    case CONE:
      mesh = BABYLON.CreateCylinder(
        "cone",
        { diameterTop: 0, height: 0.8 * s },
        scene
      );
      break;
    case TORUS:
      mesh = BABYLON.CreateTorus(
        "torus",
        { diameter: 1 * s, thickness: 0.5 * s },
        scene
      );
      break;
  }

  mesh.position.y = 10;
  mesh.rotation.x = Math.random() * 20;
  Object.keys(position).forEach((key) => {
    mesh.position[key] = position[key];
  });

  let material = new BABYLON.StandardMaterial(`floor`, scene);
  const color = getRandomElement(colors);
  const materialColor = hexToRgb(color);

  material.diffuseColor = new BABYLON.Color3(
    materialColor.r / 255,
    materialColor.g / 255,
    materialColor.b / 255
  );
  material.specularColor = COLOR_BLACK;
  mesh.material = material;
  mesh.receiveShadows = true;

  if (physics) {
    mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
      mesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      {
        mass: 1,
        restitution: 0.5,
      },
      scene
    );
  }

  return mesh;
};

const initLights = (scene) => {
  let hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.9;
  hemiLight.diffuse = COLOR_WHITE;
  hemiLight.specular = COLOR_BLACK;
  hemiLight.groundColor = COLOR_WHITE;

  let dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(1, -1, 0),
    scene
  );
  dirLight.intensity = 0.3;
  dirLight.diffuse = COLOR_WHITE;
  dirLight.position = new BABYLON.Vector3(-5, 5, 0);
  dirLight.shadowFrustumSize = 50;

  return { hemiLight, dirLight };
};

const initGround = (scene, physics) => {
  let ground = BABYLON.CreateGround(
    "ground",
    { width: 100, height: 100, subdivisions: 2 },
    scene
  );
  ground.receiveShadows = true;
  let floorMaterial = new BABYLON.StandardMaterial("floor", scene);
  floorMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
  floorMaterial.specularColor = COLOR_BLACK;

  const grid = BABYLON.CreateGround(
    "grid",
    { width: 100, height: 100, subdivisions: 2 },
    scene
  );

  grid.position.y = 0.1;

  const gridMaterial = new GridMaterial("gridMaterial", scene);
  gridMaterial.majorUnitFrequency = 5;
  gridMaterial.minorUnitVisibility = 0.2;
  gridMaterial.gridRatio = 2;
  gridMaterial.opacity = 0.15;
  gridMaterial.useMaxLine = true;
  gridMaterial.lineColor = COLOR_BLACK;
  grid.material = gridMaterial;
  ground.material = floorMaterial;

  if (physics) {
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
      ground,
      BABYLON.PhysicsImpostor.PlaneImpostor,
      {
        mass: 0,
        restitution: 1,
      },
      scene
    );
  }

  return ground;
};

const initShadowGenerator = (light) => {
  let shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
  // Basic soft shadows
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurBoxOffset = 1;

  return shadowGenerator;
};

const initPhysics = (scene) => {
  let gravityVector = new BABYLON.Vector3(0, -9.81, 0);
  let physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, cannon);
  scene.enablePhysics(gravityVector, physicsPlugin);

  return physicsPlugin;
};

const createUI = (scene, shadowGenerator) => {
  const buttonContainer = document.getElementById("mesh-creator-ui");
  types.forEach((type) => {
    const button = document.createElement("button");

    const label = document.createTextNode(type);

    button.append(label);

    button.draggable = true;

    button.addEventListener("click", (e) => {
      const mesh = initMesh(type, scene, true, {
        x: Math.random() * 5,
        z: Math.random() * 5,
      });
      shadowGenerator.getShadowMap().renderList.push(mesh);
    });

    buttonContainer.appendChild(button);
  });
};

const canvas = document.getElementById("renderCanvas");

const engine = new BABYLON.Engine(canvas);

const createScene = function (engine) {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(255 / 255, 255 / 255, 255 / 255);
  //CAMERA
  initCamera(scene);

  //PHYSICS
  initPhysics(scene);

  // //MESHES
  const meshes = types.map((type, i) =>
    initMesh(type, scene, true, { x: i * 2 })
  );

  //LIGHTS
  let { dirLight } = initLights(scene);

  //SHADOW
  const shadowGenerator = initShadowGenerator(dirLight);

  meshes.forEach((mesh) =>
    shadowGenerator.getShadowMap().renderList.push(mesh)
  );

  //GROUND
  initGround(scene, true);

  createUI(scene, shadowGenerator);

  return scene;
};

const scene = createScene(engine);

engine.runRenderLoop(function () {
  scene.render();
});

window.addEventListener("resize", function () {
  engine.resize();
});
