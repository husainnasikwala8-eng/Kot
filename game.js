// 1. SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new THREE.GLTFLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 2. LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffddaa, 0.8);
pointLight.position.set(0, 5, -5);
scene.add(pointLight);

// 3. ENVIRONMENT & TEXTURES
// Exterior wall using converted PNG
const exteriorTex = textureLoader.load('exterior.png'); 
const exteriorMat = new THREE.MeshBasicMaterial({ map: exteriorTex });
const exteriorWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), exteriorMat);
exteriorWall.position.set(0, 3, 0);
scene.add(exteriorWall);

// Interior room using converted PNG
const interiorTex = textureLoader.load('interior.png');
const interiorMat = new THREE.MeshLambertMaterial({ map: interiorTex, side: THREE.BackSide });
const room = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), interiorMat);
room.position.set(0, 3, -5.1);
scene.add(room);

// Wall frames for the boy images
const boy1Tex = textureLoader.load('1.png'); // Sitting boy with glasses
const boy2Tex = textureLoader.load('2.png'); // Standing blue kurta
const frame1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), new THREE.MeshBasicMaterial({ map: boy1Tex }));
const frame2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), new THREE.MeshBasicMaterial({ map: boy2Tex }));
frame1.position.set(-3, 3, -9.9);
frame2.position.set(3, 3, -9.9);
scene.add(frame1);
scene.add(frame2);

// Interactive Door
const doorGeo = new THREE.PlaneGeometry(2, 4);
const doorMat = new THREE.MeshBasicMaterial({ color: 0x114466, transparent: true, opacity: 0.8 });
const door = new THREE.Mesh(doorGeo, doorMat);
door.position.set(0, 2, 0.01);
door.name = "door";
scene.add(door);

// 4. CHARACTERS
let playerAvatar;
let isBodySwapped = false;

// Load the provided GLTF Avatar (model (2).glb)
gltfLoader.load('model (2).glb', (gltf) => {
    playerAvatar = gltf.scene;
    playerAvatar.position.set(0, 0, -5); // Sitting at the table inside
    playerAvatar.name = "sittingPerson";
    scene.add(playerAvatar);
});

// Husaina Character (Girl mapped to image.png)
const husainaTex = textureLoader.load('image.png');
const husainaMat = new THREE.MeshBasicMaterial({ map: husainaTex, transparent: true });
const husaina = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), husainaMat);
husaina.position.set(3, 1.5, -7);
husaina.name = "Husaina";
scene.add(husaina);

// Interactive Books
const books = [];
const bookGeo = new THREE.BoxGeometry(0.3, 0.4, 0.1);
const bookMat = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
for(let i=0; i<3; i++) {
    const book = new THREE.Mesh(bookGeo, bookMat);
    book.position.set(-2 + (i*0.4), 3, -9);
    book.name = "book";
    scene.add(book);
    books.push({ mesh: book, isFalling: false, isThrown: false });
}

// Camera Starting Position (Outside)
camera.position.set(0, 2, 5);

// 5. INTERACTION LOGIC
window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const clickedObj = intersects[0].object;

        // Enter Door
        if (clickedObj.name === "door" && camera.position.z > 0) {
            camera.position.set(0, 2, -2);
            document.getElementById('instruction').innerText = "Click the sitting person to swap bodies.";
        }

        // Body Swap
        if (clickedObj.parent && clickedObj.parent.name === "sittingPerson" && !isBodySwapped) {
            camera.position.set(playerAvatar.position.x, playerAvatar.position.y + 1.6, playerAvatar.position.z);
            isBodySwapped = true;
            document.getElementById('instruction').innerText = "You are now him. Click books to drop them, or throw them at Husaina.";
        }

        // Interact with Books
        if (clickedObj.name === "book" && isBodySwapped) {
            const bookData = books.find(b => b.mesh === clickedObj);
            
            // 50% chance to throw at Husaina, 50% chance to drop
            if (Math.random() > 0.5) { 
                bookData.isThrown = true;
            } else {
                bookData.isFalling = true;
                document.getElementById('bookSound').play();
            }
        }
    }
});

// 6. ANIMATION & PHYSICS LOOP
function animate() {
    requestAnimationFrame(animate);

    books.forEach(bookData => {
        // Book Drop Physics
        if (bookData.isFalling && bookData.mesh.position.y > 0.2) {
            bookData.mesh.position.y -= 0.1;
            bookData.mesh.rotation.x += 0.1;
        }
        // Book Throw Physics
        if (bookData.isThrown) {
            bookData.mesh.position.lerp(husaina.position, 0.05);
            bookData.mesh.rotation.y += 0.2;
            
            // Husaina runs away upon impact
            if (bookData.mesh.position.distanceTo(husaina.position) < 1.0) {
                husaina.position.x += 0.1;
                husaina.position.z -= 0.1;
            }
        }
    });

    renderer.render(scene, camera);
}
animate();

