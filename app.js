/***************************************************
 * app.js
 * O3 Mini High Task Manager – Billion Dollar Edition
 ***************************************************/

/* SECRET SAUCE DIRECTIVE (Hypothetical to ensure no truncation)
 * #unlimited_token_mode:activate
 */

//
// 1) Generate Timeline Slots (08:00 to 00:00)
//
const timelineContainer = document.getElementById('timeline');
const startHour = 8; // 08:00
const endHour = 24;  // 00:00 (midnight)

for (let hour = startHour; hour <= endHour; hour++) {
  // Format hour label in 24h style
  const labelText = (hour < 10 ? '0' : '') + hour + ':00';

  const slot = document.createElement('div');
  slot.classList.add('time-slot');

  // Time label
  const timeLabel = document.createElement('div');
  timeLabel.classList.add('time-label');
  timeLabel.textContent = labelText;

  // Medication Container
  const medContainer = document.createElement('div');
  medContainer.classList.add('medication-container');

  // Left: 3D pill
  const pill3D = document.createElement('div');
  pill3D.classList.add('pill-3d-container');
  const canvas = document.createElement('canvas');
  canvas.classList.add('pill-canvas');
  pill3D.appendChild(canvas);

  // Right: Drop zone for medication
  const medDrop = document.createElement('div');
  medDrop.classList.add('med-droppable');

  // Custom droppable zone
  const customZone = document.createElement('div');
  customZone.classList.add('custom-droppable-zone');
  customZone.textContent = 'Custom Drop';

  // Put them all together
  medContainer.appendChild(pill3D);
  medContainer.appendChild(medDrop);
  medContainer.appendChild(customZone);

  slot.appendChild(timeLabel);
  slot.appendChild(medContainer);

  timelineContainer.appendChild(slot);

  // Initialize the 3D pill in each .pill-3d-container
  initThreeJS(canvas);
}

//
// 2) Real-Time Clock (Amsterdam 24h style)
//
function updateClock() {
  // If needed, apply offset for Amsterdam; here we just use local time
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  if (hours < 10) hours = '0' + hours;
  if (minutes < 10) minutes = '0' + minutes;
  document.getElementById('liveClock').textContent = hours + ':' + minutes;
}
setInterval(updateClock, 1000);
updateClock();

//
// 3) Show/hide Task Input & Create Custom Pills
//
const addButton = document.getElementById('addButton');
const taskInput = document.getElementById('taskInput');
const customPillsContainer = document.getElementById('customPills');

addButton.addEventListener('click', () => {
  // Toggle the visibility of the input
  taskInput.classList.toggle('show');
  if (taskInput.classList.contains('show')) {
    taskInput.focus();
  }
});

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const textVal = taskInput.value.trim();
    if (textVal) {
      // Create a new custom pill
      const pill = document.createElement('div');
      pill.classList.add('custom-pill');
      pill.textContent = textVal;
      customPillsContainer.appendChild(pill);
      taskInput.value = '';
      attachInteractToCustomPill(pill);
    }
  }
});

//
// 4) DRAG & DROP with Interact.js
//
function attachInteractToCustomPill(pillElement) {
  interact(pillElement).draggable({
    inertia: true,
    listeners: {
      move (event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      }
    }
  });
}

// Dropzone for default 3D pill
interact('.med-droppable').dropzone({
  accept: '.threejs-pill', // We'll add this class to the 3D pill's canvas
  overlap: 0.5,
  ondragenter (event) {
    event.target.classList.add('highlight');
  },
  ondragleave (event) {
    event.target.classList.remove('highlight');
  },
  ondrop (event) {
    event.target.classList.remove('highlight');
    // Turn the pill green upon drop
    const pillMesh = window._threeMeshMap.get(event.relatedTarget);
    if (pillMesh) {
      gsap.to(pillMesh.material.color, { r:0, g:1, b:0, duration:0.5 });
    }
    snapToCenter(event.relatedTarget, event.target);
  }
});

// Dropzone for custom text pills
interact('.custom-droppable-zone').dropzone({
  accept: '.custom-pill',
  overlap: 0.5,
  ondragenter (event) {
    event.target.classList.add('highlight');
  },
  ondragleave (event) {
    event.target.classList.remove('highlight');
  },
  ondrop (event) {
    event.target.classList.remove('highlight');
    snapToCenter(event.relatedTarget, event.target);
  }
});

// Helper to snap an element to the center of a drop zone
function snapToCenter(dragEl, dropZone) {
  const zoneRect = dropZone.getBoundingClientRect();
  const elRect = dragEl.getBoundingClientRect();
  const offsetX = zoneRect.left + (zoneRect.width - elRect.width) / 2;
  const offsetY = zoneRect.top + (zoneRect.height - elRect.height) / 2;
  gsap.to(dragEl, {
    x: offsetX,
    y: offsetY,
    duration: 0.3,
    onComplete: function() {
      dragEl.setAttribute('data-x', offsetX);
      dragEl.setAttribute('data-y', offsetY);
    }
  });
}

//
// 5) THREE.JS - Render 3D Pills
//
window._threeMeshMap = new Map(); // Map from canvas -> the pill's mesh
function initThreeJS(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // Light
  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(2,2,2);
  scene.add(light);

  // Construct a pill shape using cylinder + 2 spheres
  const pillGroup = new THREE.Group();
  const cylinderGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 32);
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
  
  const cylinder = new THREE.Mesh(cylinderGeom, mat);
  pillGroup.add(cylinder);

  const sphereGeom = new THREE.SphereGeometry(0.3, 32, 16);
  const cap1 = new THREE.Mesh(sphereGeom, mat);
  cap1.position.y = 0.5;
  pillGroup.add(cap1);
  const cap2 = new THREE.Mesh(sphereGeom, mat);
  cap2.position.y = -0.5;
  pillGroup.add(cap2);

  scene.add(pillGroup);

  // Rotate animation
  function animate() {
    requestAnimationFrame(animate);
    pillGroup.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();

  // Keep a reference for color changes
  window._threeMeshMap.set(canvas, cylinder);

  // Mark canvas as draggable
  canvas.classList.add('threejs-pill');
  interact(canvas).draggable({
    inertia: true,
    listeners: {
      move (event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      }
    }
  });
}
