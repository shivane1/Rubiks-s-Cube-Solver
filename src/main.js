import * as THREE from 'three';
import { gsap } from 'gsap';
import './style.css';

class CubeSolverInterface {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.cubelets = [];
        this.currentSolution = [];
        this.currentStep = 0;
        this.isConnected = false;
        this.socket = null;
        this.cubeState = null;
        
        // Camera scanning
        this.videoStream = null;
        this.isScanning = false;
        this.scannedFaces = {};
        this.currentScanFace = null;
        this.scanningOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        this.currentFaceIndex = 0;
        
        this.init();
        this.setupEventListeners();
        this.startAnimations();
    }

    init() {
        this.setupThreeJS();
        this.createCube();
        this.animate();
        this.updateScanProgress();
    }

    setupThreeJS() {
        const container = document.getElementById('cube-3d');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0x4a90e2, 0.6);
        pointLight.position.set(-5, 5, 5);
        this.scene.add(pointLight);
    }

    createCube() {
        this.cube = new THREE.Group();
        this.cubelets = [];
        
        const colors = {
            'W': 0xffffff, // White
            'Y': 0xffff00, // Yellow
            'R': 0xff0000, // Red
            'O': 0xff8800, // Orange
            'G': 0x00ff00, // Green
            'B': 0x0000ff  // Blue
        };
        
        const size = 0.95;
        const gap = 0.05;
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const geometry = new THREE.BoxGeometry(size, size, size);
                    
                    // Create materials for each face with default colors
                    const materials = [
                        new THREE.MeshLambertMaterial({ color: x === 1 ? colors.R : 0x333333 }), // Right
                        new THREE.MeshLambertMaterial({ color: x === -1 ? colors.O : 0x333333 }), // Left
                        new THREE.MeshLambertMaterial({ color: y === 1 ? colors.W : 0x333333 }), // Top
                        new THREE.MeshLambertMaterial({ color: y === -1 ? colors.Y : 0x333333 }), // Bottom
                        new THREE.MeshLambertMaterial({ color: z === 1 ? colors.G : 0x333333 }), // Front
                        new THREE.MeshLambertMaterial({ color: z === -1 ? colors.B : 0x333333 })  // Back
                    ];
                    
                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.set(x * (size + gap), y * (size + gap), z * (size + gap));
                    cubelet.castShadow = true;
                    cubelet.receiveShadow = true;
                    
                    // Store original position for animations
                    cubelet.userData = {
                        originalPosition: { x: x * (size + gap), y: y * (size + gap), z: z * (size + gap) },
                        gridPosition: { x, y, z }
                    };
                    
                    this.cube.add(cubelet);
                    this.cubelets.push(cubelet);
                }
            }
        }
        
        this.scene.add(this.cube);
    }

    async startCameraScanning() {
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment' // Use back camera on mobile
                } 
            });
            
            const videoElement = document.getElementById('camera-feed');
            videoElement.srcObject = this.videoStream;
            
            this.isScanning = true;
            this.currentFaceIndex = 0;
            this.currentScanFace = this.scanningOrder[0];
            
            this.updateScanningUI();
            this.showCameraInterface();
            this.startColorDetection();
            
            this.updateStatus('scanning', 'Scanning cube faces...');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please ensure camera permissions are granted.');
        }
    }

    showCameraInterface() {
        const cameraModal = document.getElementById('camera-modal');
        cameraModal.classList.add('active');
        
        // Add scanning grid overlay
        this.addScanningGrid();
    }

    addScanningGrid() {
        const overlay = document.querySelector('.camera-overlay');
        overlay.innerHTML = `
            <div class="scanning-grid">
                <div class="grid-cell"></div>
                <div class="grid-cell"></div>
                <div class="grid-cell"></div>
                <div class="grid-cell"></div>
                <div class="grid-cell center"></div>
                <div class="grid-cell"></div>
                <div class="grid-cell"></div>
                <div class="grid-cell"></div>
                <div class="grid-cell"></div>
            </div>
            <div class="scan-instruction">
                <h3>Scanning Face: ${this.currentScanFace}</h3>
                <p>Align the ${this.getFaceName(this.currentScanFace)} face with the grid</p>
                <div class="scan-progress-bar">
                    <div class="progress" style="width: ${(this.currentFaceIndex / 6) * 100}%"></div>
                </div>
            </div>
        `;
    }

    startColorDetection() {
        const videoElement = document.getElementById('camera-feed');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 640;
        canvas.height = 480;
        
        const detectColors = () => {
            if (!this.isScanning) return;
            
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Sample colors from 3x3 grid positions
            const colors = [];
            const gridSize = 3;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const spacing = 60;
            
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    const x = centerX + (j - 1) * spacing;
                    const y = centerY + (i - 1) * spacing;
                    
                    const imageData = ctx.getImageData(x, y, 1, 1);
                    const [r, g, b] = imageData.data;
                    
                    // Convert RGB to HSV and classify color
                    const color = this.classifyColor(r, g, b);
                    colors.push(color);
                    
                    // Update grid cell color
                    const cellIndex = i * 3 + j;
                    const gridCells = document.querySelectorAll('.grid-cell');
                    if (gridCells[cellIndex]) {
                        gridCells[cellIndex].style.backgroundColor = this.getColorHex(color);
                        gridCells[cellIndex].textContent = color;
                    }
                }
            }
            
            // Store the detected colors for this face
            this.scannedFaces[this.currentScanFace] = colors;
            
            requestAnimationFrame(detectColors);
        };
        
        videoElement.addEventListener('loadedmetadata', () => {
            detectColors();
        });
    }

    classifyColor(r, g, b) {
        // Convert RGB to HSV
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : Math.round((diff / max) * 100);
        const v = Math.round((max / 255) * 100);
        
        // Color classification based on HSV values (similar to your Python code)
        if (h >= 5 && h <= 36 && s >= 9 && s <= 60 && v >= 45 && v <= 179) return "W";
        if (h >= 0 && h <= 25 && s >= 156 && s <= 232 && v >= 82 && v <= 143) return "R";
        if (h >= 28 && h <= 39 && s >= 146 && s <= 255 && v >= 132 && v <= 194) return "Y";
        if (h >= 42 && h <= 160 && s >= 133 && s <= 255 && v >= 97 && v <= 190) return "G";
        if (h >= 55 && h <= 121 && s >= 129 && s <= 255 && v >= 26 && v <= 84) return "B";
        if (h >= 1 && h <= 85 && s >= 211 && s <= 248 && v >= 75 && v <= 148) return "O";
        return "O"; // Default
    }

    getColorHex(colorCode) {
        const colors = {
            'W': '#ffffff',
            'Y': '#ffff00',
            'R': '#ff0000',
            'O': '#ff8800',
            'G': '#00ff00',
            'B': '#0000ff'
        };
        return colors[colorCode] || '#666666';
    }

    getFaceName(face) {
        const names = {
            'U': 'Up/Top',
            'R': 'Right',
            'F': 'Front',
            'D': 'Down/Bottom',
            'L': 'Left',
            'B': 'Back'
        };
        return names[face] || face;
    }

    captureFace() {
        if (!this.currentScanFace || !this.scannedFaces[this.currentScanFace]) return;
        
        // Mark face as captured
        const faceItem = document.querySelector(`[data-face="${this.currentScanFace}"]`);
        if (faceItem) {
            faceItem.classList.add('scanned');
            faceItem.querySelector('.scan-status').textContent = '✅';
            
            // Update face preview
            const preview = faceItem.querySelector('.face-preview');
            const colors = this.scannedFaces[this.currentScanFace];
            colors.forEach((color, index) => {
                const sticker = preview.children[index];
                if (sticker) {
                    sticker.style.backgroundColor = this.getColorHex(color);
                }
            });
        }
        
        // Move to next face
        this.currentFaceIndex++;
        if (this.currentFaceIndex < this.scanningOrder.length) {
            this.currentScanFace = this.scanningOrder[this.currentFaceIndex];
            this.addScanningGrid();
        } else {
            this.completeScan();
        }
    }

    completeScan() {
        this.isScanning = false;
        this.closeCameraInterface();
        
        // Build cube string for solver
        const cubeString = this.buildCubeString();
        console.log('Cube string:', cubeString);
        
        this.updateStatus('solving', 'Solving cube...');
        this.solveCube(cubeString);
    }

    buildCubeString() {
        // Convert scanned faces to cube string format
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let cubeString = '';
        
        // Create color to face mapping based on center pieces
        const colorToFace = {};
        faceOrder.forEach(face => {
            if (this.scannedFaces[face]) {
                const centerColor = this.scannedFaces[face][4]; // Center piece is at index 4
                colorToFace[centerColor] = face;
            }
        });
        
        // Build cube string
        faceOrder.forEach(face => {
            if (this.scannedFaces[face]) {
                this.scannedFaces[face].forEach(color => {
                    cubeString += colorToFace[color] || '?';
                });
            }
        });
        
        return cubeString;
    }

    async solveCube(cubeString) {
        try {
            // In a real implementation, you would send this to your Python solver
            // For now, we'll simulate a solution
            setTimeout(() => {
                const mockSolution = "R U R' U' R U R' F' R U R' U' R' F R";
                this.receiveSolution(mockSolution);
            }, 2000);
            
        } catch (error) {
            console.error('Error solving cube:', error);
            this.updateStatus('error', 'Error solving cube');
        }
    }

    closeCameraInterface() {
        const cameraModal = document.getElementById('camera-modal');
        cameraModal.classList.remove('active');
        
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    updateScanningUI() {
        // Remove scanning class from all faces
        document.querySelectorAll('.face-item').forEach(item => {
            item.classList.remove('scanning');
        });
        
        // Add scanning class to current face
        if (this.currentScanFace) {
            const currentFaceItem = document.querySelector(`[data-face="${this.currentScanFace}"]`);
            if (currentFaceItem) {
                currentFaceItem.classList.add('scanning');
            }
        }
    }

    updateScanProgress() {
        const faceItems = document.querySelectorAll('.face-item');
        faceItems.forEach(item => {
            const face = item.dataset.face;
            const preview = item.querySelector('.face-preview');
            
            // Create 9 stickers for 3x3 grid
            preview.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const sticker = document.createElement('div');
                sticker.className = 'sticker';
                preview.appendChild(sticker);
            }
        });
    }

    receiveSolution(solutionString) {
        this.currentSolution = solutionString.split(' ');
        this.currentStep = 0;
        this.displaySolutionSteps();
        this.updateUI();
        this.updateStatus('ready', 'Ready to solve!');
    }

    displaySolutionSteps() {
        const stepsContainer = document.querySelector('.steps-container');
        stepsContainer.innerHTML = '';
        
        this.currentSolution.forEach((move, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = `step-item ${index === 0 ? 'current' : ''}`;
            stepElement.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-move">${move}</div>
                    <div class="step-description">${this.getMoveDescription(move)}</div>
                </div>
                <div class="step-progress">
                    <div class="progress-bar"></div>
                </div>
            `;
            stepsContainer.appendChild(stepElement);
        });
    }

    getMoveDescription(move) {
        const descriptions = {
            'R': 'Right face clockwise',
            "R'": 'Right face counterclockwise',
            'R2': 'Right face 180°',
            'L': 'Left face clockwise',
            "L'": 'Left face counterclockwise',
            'L2': 'Left face 180°',
            'U': 'Up face clockwise',
            "U'": 'Up face counterclockwise',
            'U2': 'Up face 180°',
            'D': 'Down face clockwise',
            "D'": 'Down face counterclockwise',
            'D2': 'Down face 180°',
            'F': 'Front face clockwise',
            "F'": 'Front face counterclockwise',
            'F2': 'Front face 180°',
            'B': 'Back face clockwise',
            "B'": 'Back face counterclockwise',
            'B2': 'Back face 180°'
        };
        return descriptions[move] || 'Unknown move';
    }

    showNextMove() {
        if (this.currentStep >= this.currentSolution.length) {
            this.showCompletionMessage();
            return;
        }
        
        const move = this.currentSolution[this.currentStep];
        this.highlightCurrentStep();
        this.animateMove(move);
        this.showMoveOverlay(move);
        
        // Update step progress
        const currentStepElement = document.querySelector('.step-item.current .progress-bar');
        if (currentStepElement) {
            gsap.to(currentStepElement, {
                duration: 1,
                width: '100%',
                ease: "power2.out"
            });
        }
        
        this.currentStep++;
        
        // Update current step indicator
        setTimeout(() => {
            this.updateCurrentStepIndicator();
        }, 1000);
    }

    animateMove(move) {
        this.isShowingMove = true;
        
        // Get the face and rotation info
        const face = move[0];
        const modifier = move.slice(1);
        
        // Calculate rotation
        let rotationAngle = Math.PI / 2; // 90 degrees
        if (modifier === "'") rotationAngle = -Math.PI / 2;
        if (modifier === "2") rotationAngle = Math.PI;
        
        // Animate the cube to show the move
        const rotationAxis = this.getRotationAxis(face);
        
        gsap.to(this.cube.rotation, {
            duration: 1.5,
            [rotationAxis]: this.cube.rotation[rotationAxis] + rotationAngle,
            ease: "power2.inOut",
            onComplete: () => {
                this.isShowingMove = false;
            }
        });
        
        // Add visual effects
        this.addMoveEffects(face);
    }

    getRotationAxis(face) {
        const axes = {
            'R': 'x', 'L': 'x',
            'U': 'y', 'D': 'y',
            'F': 'z', 'B': 'z'
        };
        return axes[face] || 'y';
    }

    addMoveEffects(face) {
        // Add particle effects or highlights for the moving face
        const faceColors = {
            'R': 0xff0000, 'L': 0xff8800,
            'U': 0xffffff, 'D': 0xffff00,
            'F': 0x00ff00, 'B': 0x0000ff
        };
        
        // Create a temporary highlight effect
        const geometry = new THREE.RingGeometry(2, 2.5, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: faceColors[face] || 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        const ring = new THREE.Mesh(geometry, material);
        
        // Position the ring based on the face
        this.positionRingForFace(ring, face);
        this.scene.add(ring);
        
        // Animate the ring
        gsap.to(ring.scale, {
            duration: 1,
            x: 1.5, y: 1.5, z: 1.5,
            ease: "power2.out"
        });
        
        gsap.to(ring.material, {
            duration: 1,
            opacity: 0,
            ease: "power2.out",
            onComplete: () => {
                this.scene.remove(ring);
            }
        });
    }

    positionRingForFace(ring, face) {
        const positions = {
            'R': { x: 2, y: 0, z: 0, rotateY: Math.PI/2 },
            'L': { x: -2, y: 0, z: 0, rotateY: -Math.PI/2 },
            'U': { x: 0, y: 2, z: 0, rotateX: Math.PI/2 },
            'D': { x: 0, y: -2, z: 0, rotateX: -Math.PI/2 },
            'F': { x: 0, y: 0, z: 2, rotateY: 0 },
            'B': { x: 0, y: 0, z: -2, rotateY: Math.PI }
        };
        
        const pos = positions[face];
        if (pos) {
            ring.position.set(pos.x, pos.y, pos.z);
            if (pos.rotateX) ring.rotation.x = pos.rotateX;
            if (pos.rotateY) ring.rotation.y = pos.rotateY;
        }
    }

    showMoveOverlay(move) {
        const overlay = document.querySelector('.move-overlay');
        const moveText = overlay.querySelector('.current-move');
        const moveDesc = overlay.querySelector('.move-description');
        
        moveText.textContent = move;
        moveDesc.textContent = this.getMoveDescription(move);
        
        overlay.classList.add('visible');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            overlay.classList.remove('visible');
        }, 3000);
    }

    highlightCurrentStep() {
        document.querySelectorAll('.step-item').forEach((item, index) => {
            item.classList.remove('current', 'completed');
            if (index === this.currentStep) {
                item.classList.add('current');
            } else if (index < this.currentStep) {
                item.classList.add('completed');
            }
        });
    }

    updateCurrentStepIndicator() {
        document.querySelectorAll('.step-item').forEach((item, index) => {
            item.classList.remove('current');
            if (index === this.currentStep && this.currentStep < this.currentSolution.length) {
                item.classList.add('current');
            }
        });
    }

    showCompletionMessage() {
        this.updateStatus('solved', 'Cube Solved! 🎉');
        
        // Show completion overlay
        const completionOverlay = document.createElement('div');
        completionOverlay.className = 'completion-overlay';
        completionOverlay.innerHTML = `
            <div class="completion-content">
                <h2>🎉 Cube Solved!</h2>
                <p>Congratulations! Your cube has been solved successfully.</p>
                <button class="reset-btn" onclick="location.reload()">Solve Another Cube</button>
            </div>
        `;
        document.body.appendChild(completionOverlay);
        
        // Victory animation
        this.playVictoryAnimation();
    }

    playVictoryAnimation() {
        // Confetti-like effect with cubelets
        this.cubelets.forEach((cubelet, index) => {
            gsap.to(cubelet.rotation, {
                duration: 3,
                x: Math.random() * Math.PI * 4,
                y: Math.random() * Math.PI * 4,
                z: Math.random() * Math.PI * 4,
                delay: index * 0.02,
                ease: "power2.out"
            });
            
            gsap.to(cubelet.position, {
                duration: 2,
                y: cubelet.position.y + (Math.random() * 3 - 1.5),
                delay: index * 0.02,
                yoyo: true,
                repeat: 2,
                ease: "power2.out"
            });
        });
    }

    updateStatus(type, message) {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        statusText.textContent = message;
        
        // Remove all status classes
        statusDot.classList.remove('scanning', 'ready', 'solving', 'solved', 'error');
        statusDot.classList.add(type);
    }

    updateUI() {
        const nextBtn = document.getElementById('next-move-btn');
        const solveBtn = document.getElementById('solve-btn');
        
        nextBtn.disabled = false;
        solveBtn.disabled = true;
        
        // Update step counter
        const stepCounter = document.querySelector('.step-counter');
        if (stepCounter) {
            stepCounter.textContent = `Step 1 of ${this.currentSolution.length}`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Gentle rotation when not showing specific moves
        if (!this.isShowingMove) {
            this.cube.rotation.y += 0.003;
            this.cube.rotation.x += 0.001;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Cube controls
        document.getElementById('rotate-x').addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 0.5, x: this.cube.rotation.x + Math.PI / 2 });
        });
        
        document.getElementById('rotate-y').addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 0.5, y: this.cube.rotation.y + Math.PI / 2 });
        });
        
        document.getElementById('rotate-z').addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 0.5, z: this.cube.rotation.z + Math.PI / 2 });
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 1, x: 0, y: 0, z: 0, ease: "back.out(1.7)" });
        });
        
        // Action buttons
        document.getElementById('scan-btn').addEventListener('click', () => this.startCameraScanning());
        document.getElementById('solve-btn').addEventListener('click', () => this.solveCube());
        document.getElementById('next-move-btn').addEventListener('click', () => this.showNextMove());
        document.getElementById('reset-btn').addEventListener('click', () => location.reload());
        
        // Camera controls
        document.getElementById('capture-face').addEventListener('click', () => this.captureFace());
        document.getElementById('close-camera').addEventListener('click', () => this.closeCameraInterface());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isScanning) {
                    this.captureFace();
                } else {
                    this.showNextMove();
                }
            }
            if (e.code === 'Escape' && this.isScanning) {
                this.closeCameraInterface();
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    startAnimations() {
        // Animate floating cubes in background
        document.querySelectorAll('.floating-cube').forEach((cube, index) => {
            gsap.to(cube, {
                duration: 4 + index,
                y: '30px',
                rotation: 360,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut",
                delay: index * 0.7
            });
        });
        
        // Animate tech info items
        gsap.from('.tech-item', {
            duration: 1,
            y: 50,
            opacity: 0,
            stagger: 0.2,
            delay: 0.5,
            ease: "back.out(1.7)"
        });
        
        // Animate header elements
        gsap.from('.main-title', {
            duration: 1,
            y: -50,
            opacity: 0,
            ease: "back.out(1.7)"
        });
        
        gsap.from('.subtitle', {
            duration: 1,
            y: -30,
            opacity: 0,
            delay: 0.2,
            ease: "back.out(1.7)"
        });
        
        gsap.from('.credits', {
            duration: 1,
            y: -20,
            opacity: 0,
            delay: 0.4,
            ease: "back.out(1.7)"
        });
    }

    onWindowResize() {
        const container = document.getElementById('cube-3d');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

// Initialize the application
new CubeSolverInterface();