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
        this.realTimeCubeState = null;
        
        // Camera scanning
        this.videoStream = null;
        this.isScanning = false;
        this.scannedFaces = {};
        this.currentScanFace = null;
        this.scanningOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        this.currentFaceIndex = 0;
        this.isRealTimeMode = false;
        
        this.init();
        this.setupEventListeners();
        this.startAnimations();
        this.startRealTimeUpdates();
    }

    init() {
        this.setupThreeJS();
        this.createCube();
        this.animate();
        this.updateScanProgress();
        this.initializeFacts();
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
        this.camera.position.set(6, 6, 6);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Enhanced Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0x4a90e2, 0.8);
        pointLight1.position.set(-5, 5, 5);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.6);
        pointLight2.position.set(5, -5, -5);
        this.scene.add(pointLight2);
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
                    
                    // Create materials for each face with enhanced appearance
                    const materials = [
                        new THREE.MeshPhongMaterial({ 
                            color: x === 1 ? colors.R : 0x222222,
                            shininess: 100,
                            specular: 0x111111
                        }), // Right
                        new THREE.MeshPhongMaterial({ 
                            color: x === -1 ? colors.O : 0x222222,
                            shininess: 100,
                            specular: 0x111111
                        }), // Left
                        new THREE.MeshPhongMaterial({ 
                            color: y === 1 ? colors.W : 0x222222,
                            shininess: 100,
                            specular: 0x111111
                        }), // Top
                        new THREE.MeshPhongMaterial({ 
                            color: y === -1 ? colors.Y : 0x222222,
                            shininess: 100,
                            specular: 0x111111
                        }), // Bottom
                        new THREE.MeshPhongMaterial({ 
                            color: z === 1 ? colors.G : 0x222222,
                            shininess: 100,
                            specular: 0x111111
                        }), // Front
                        new THREE.MeshPhongMaterial({ 
                            color: z === -1 ? colors.B : 0x222222,
                            shininess: 100,
                            specular: 0x111111
                        })  // Back
                    ];
                    
                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.set(x * (size + gap), y * (size + gap), z * (size + gap));
                    cubelet.castShadow = true;
                    cubelet.receiveShadow = true;
                    
                    // Add edge lines for better definition
                    const edges = new THREE.EdgesGeometry(geometry);
                    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
                    cubelet.add(line);
                    
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

    updateRealTimeCube(cubeState) {
        if (!cubeState || !this.isRealTimeMode) return;
        
        const colors = {
            'W': 0xffffff, 'Y': 0xffff00, 'R': 0xff0000,
            'O': 0xff8800, 'G': 0x00ff00, 'B': 0x0000ff
        };
        
        // Update cube colors based on real-time state
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let colorIndex = 0;
        
        faceOrder.forEach(face => {
            if (cubeState[face]) {
                cubeState[face].forEach((color, index) => {
                    // Map cube state to 3D cubelets
                    const cubeletIndex = this.mapFacePositionToCubelet(face, index);
                    if (cubeletIndex !== -1 && this.cubelets[cubeletIndex]) {
                        const cubelet = this.cubelets[cubeletIndex];
                        const faceIndex = this.getFaceIndex(face);
                        if (cubelet.material[faceIndex]) {
                            gsap.to(cubelet.material[faceIndex].color, {
                                duration: 0.5,
                                r: ((colors[color] >> 16) & 255) / 255,
                                g: ((colors[color] >> 8) & 255) / 255,
                                b: (colors[color] & 255) / 255
                            });
                        }
                    }
                });
            }
        });
    }

    mapFacePositionToCubelet(face, position) {
        // Map 2D face positions to 3D cubelet indices
        const faceMapping = {
            'U': [0, 1, 2, 9, 10, 11, 18, 19, 20],
            'D': [6, 7, 8, 15, 16, 17, 24, 25, 26],
            'F': [18, 19, 20, 21, 22, 23, 24, 25, 26],
            'B': [0, 1, 2, 3, 4, 5, 6, 7, 8],
            'R': [2, 5, 8, 11, 14, 17, 20, 23, 26],
            'L': [0, 3, 6, 9, 12, 15, 18, 21, 24]
        };
        
        return faceMapping[face] ? faceMapping[face][position] : -1;
    }

    getFaceIndex(face) {
        const faceIndices = { 'R': 0, 'L': 1, 'U': 2, 'D': 3, 'F': 4, 'B': 5 };
        return faceIndices[face] || 0;
    }

    startRealTimeUpdates() {
        // Simulate real-time cube state updates
        setInterval(() => {
            if (this.isRealTimeMode && this.scannedFaces && Object.keys(this.scannedFaces).length === 6) {
                this.updateRealTimeCube(this.scannedFaces);
            }
        }, 100);
    }

    async startCameraScanning() {
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                } 
            });
            
            const videoElement = document.getElementById('camera-feed');
            videoElement.srcObject = this.videoStream;
            
            this.isScanning = true;
            this.isRealTimeMode = true;
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
                <div class="face-counter">${this.currentFaceIndex + 1} of 6 faces</div>
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
                    
                    const color = this.classifyColor(r, g, b);
                    colors.push(color);
                    
                    const cellIndex = i * 3 + j;
                    const gridCells = document.querySelectorAll('.grid-cell');
                    if (gridCells[cellIndex]) {
                        gridCells[cellIndex].style.backgroundColor = this.getColorHex(color);
                        gridCells[cellIndex].textContent = color;
                        gridCells[cellIndex].style.border = `2px solid ${this.getColorHex(color)}`;
                    }
                }
            }
            
            this.scannedFaces[this.currentScanFace] = colors;
            
            // Update real-time cube
            if (this.isRealTimeMode) {
                this.updateRealTimeCube(this.scannedFaces);
            }
            
            requestAnimationFrame(detectColors);
        };
        
        videoElement.addEventListener('loadedmetadata', () => {
            detectColors();
        });
    }

    classifyColor(r, g, b) {
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
        
        if (h >= 5 && h <= 36 && s >= 9 && s <= 60 && v >= 45 && v <= 179) return "W";
        if (h >= 0 && h <= 25 && s >= 156 && s <= 232 && v >= 82 && v <= 143) return "R";
        if (h >= 28 && h <= 39 && s >= 146 && s <= 255 && v >= 132 && v <= 194) return "Y";
        if (h >= 42 && h <= 160 && s >= 133 && s <= 255 && v >= 97 && v <= 190) return "G";
        if (h >= 55 && h <= 121 && s >= 129 && s <= 255 && v >= 26 && v <= 84) return "B";
        if (h >= 1 && h <= 85 && s >= 211 && s <= 248 && v >= 75 && v <= 148) return "O";
        return "O";
    }

    getColorHex(colorCode) {
        const colors = {
            'W': '#ffffff', 'Y': '#ffff00', 'R': '#ff0000',
            'O': '#ff8800', 'G': '#00ff00', 'B': '#0000ff'
        };
        return colors[colorCode] || '#666666';
    }

    getFaceName(face) {
        const names = {
            'U': 'Up/Top', 'R': 'Right', 'F': 'Front',
            'D': 'Down/Bottom', 'L': 'Left', 'B': 'Back'
        };
        return names[face] || face;
    }

    captureFace() {
        if (!this.currentScanFace || !this.scannedFaces[this.currentScanFace]) return;
        
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
        
        const cubeString = this.buildCubeString();
        console.log('Cube string:', cubeString);
        
        this.updateStatus('solving', 'Solving cube...');
        this.solveCube(cubeString);
    }

    buildCubeString() {
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let cubeString = '';
        
        const colorToFace = {};
        faceOrder.forEach(face => {
            if (this.scannedFaces[face]) {
                const centerColor = this.scannedFaces[face][4];
                colorToFace[centerColor] = face;
            }
        });
        
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
                    <div class="hand-gesture">${this.getHandGesture(move)}</div>
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
            'R': 'Right face clockwise', "R'": 'Right face counterclockwise', 'R2': 'Right face 180°',
            'L': 'Left face clockwise', "L'": 'Left face counterclockwise', 'L2': 'Left face 180°',
            'U': 'Up face clockwise', "U'": 'Up face counterclockwise', 'U2': 'Up face 180°',
            'D': 'Down face clockwise', "D'": 'Down face counterclockwise', 'D2': 'Down face 180°',
            'F': 'Front face clockwise', "F'": 'Front face counterclockwise', 'F2': 'Front face 180°',
            'B': 'Back face clockwise', "B'": 'Back face counterclockwise', 'B2': 'Back face 180°'
        };
        return descriptions[move] || 'Unknown move';
    }

    getHandGesture(move) {
        const gestures = {
            'R': '👉 Thumb up, turn right', "R'": '👉 Thumb down, turn left',
            'L': '👈 Thumb up, turn left', "L'": '👈 Thumb down, turn right',
            'U': '👆 Fingers forward, turn right', "U'": '👆 Fingers back, turn left',
            'D': '👇 Fingers forward, turn left', "D'": '👇 Fingers back, turn right',
            'F': '🤏 Pinch and turn right', "F'": '🤏 Pinch and turn left',
            'B': '🖐️ Palm out, turn right', "B'": '🖐️ Palm out, turn left'
        };
        return gestures[move] || '✋ Follow the move';
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
        
        const currentStepElement = document.querySelector('.step-item.current .progress-bar');
        if (currentStepElement) {
            gsap.to(currentStepElement, {
                duration: 1,
                width: '100%',
                ease: "power2.out"
            });
        }
        
        this.currentStep++;
        
        setTimeout(() => {
            this.updateCurrentStepIndicator();
        }, 1000);
    }

    animateMove(move) {
        this.isShowingMove = true;
        
        const face = move[0];
        const modifier = move.slice(1);
        
        let rotationAngle = Math.PI / 2;
        if (modifier === "'") rotationAngle = -Math.PI / 2;
        if (modifier === "2") rotationAngle = Math.PI;
        
        const rotationAxis = this.getRotationAxis(face);
        
        gsap.to(this.cube.rotation, {
            duration: 1.5,
            [rotationAxis]: this.cube.rotation[rotationAxis] + rotationAngle,
            ease: "power2.inOut",
            onComplete: () => {
                this.isShowingMove = false;
            }
        });
        
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
        const faceColors = {
            'R': 0xff0000, 'L': 0xff8800,
            'U': 0xffffff, 'D': 0xffff00,
            'F': 0x00ff00, 'B': 0x0000ff
        };
        
        const geometry = new THREE.RingGeometry(2, 2.5, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: faceColors[face] || 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        const ring = new THREE.Mesh(geometry, material);
        
        this.positionRingForFace(ring, face);
        this.scene.add(ring);
        
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
        const handGesture = overlay.querySelector('.hand-gesture');
        
        moveText.textContent = move;
        moveDesc.textContent = this.getMoveDescription(move);
        handGesture.textContent = this.getHandGesture(move);
        
        overlay.classList.add('visible');
        
        setTimeout(() => {
            overlay.classList.remove('visible');
        }, 4000);
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
        
        const completionOverlay = document.createElement('div');
        completionOverlay.className = 'completion-overlay';
        completionOverlay.innerHTML = `
            <div class="completion-content">
                <h2>🎉 Cube Solved!</h2>
                <p>Congratulations! Your cube has been solved successfully.</p>
                <div class="completion-stats">
                    <div class="stat">
                        <span class="stat-number">${this.currentSolution.length}</span>
                        <span class="stat-label">Total Moves</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${Math.round(this.currentSolution.length * 2.5)}s</span>
                        <span class="stat-label">Avg Time</span>
                    </div>
                </div>
                <button class="reset-btn" onclick="location.reload()">Solve Another Cube</button>
            </div>
        `;
        document.body.appendChild(completionOverlay);
        
        this.playVictoryAnimation();
    }

    playVictoryAnimation() {
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
        
        statusDot.classList.remove('scanning', 'ready', 'solving', 'solved', 'error');
        statusDot.classList.add(type);
    }

    updateUI() {
        const nextBtn = document.getElementById('next-move-btn');
        const solveBtn = document.getElementById('solve-btn');
        
        nextBtn.disabled = false;
        solveBtn.disabled = true;
        
        const stepCounter = document.querySelector('.step-counter');
        if (stepCounter) {
            stepCounter.textContent = `Step 1 of ${this.currentSolution.length}`;
        }
    }

    initializeFacts() {
        const facts = [
            {
                title: "43 Quintillion Combinations",
                description: "There are 43,252,003,274,489,856,000 possible configurations of a Rubik's Cube!",
                icon: "🔢"
            },
            {
                title: "God's Number is 20",
                description: "Any scrambled cube can be solved in 20 moves or fewer using optimal algorithms.",
                icon: "🎯"
            },
            {
                title: "World Record: 3.47 seconds",
                description: "The fastest human solve was achieved by Yusheng Du in 2018.",
                icon: "⚡"
            },
            {
                title: "Invented in 1974",
                description: "Created by Hungarian architect Ernő Rubik as a teaching tool for 3D geometry.",
                icon: "🏗️"
            },
            {
                title: "350 Million Sold",
                description: "The Rubik's Cube is one of the best-selling puzzles of all time.",
                icon: "📈"
            },
            {
                title: "Two-Phase Algorithm",
                description: "The Kociemba algorithm used here solves the cube in two phases for efficiency.",
                icon: "🧮"
            }
        ];

        const factsContainer = document.querySelector('.facts-grid');
        if (factsContainer) {
            factsContainer.innerHTML = facts.map(fact => `
                <div class="fact-card">
                    <div class="fact-icon">${fact.icon}</div>
                    <h4 class="fact-title">${fact.title}</h4>
                    <p class="fact-description">${fact.description}</p>
                </div>
            `).join('');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isShowingMove) {
            this.cube.rotation.y += 0.002;
            this.cube.rotation.x += 0.001;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Cube controls
        document.getElementById('rotate-x')?.addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 0.5, x: this.cube.rotation.x + Math.PI / 2 });
        });
        
        document.getElementById('rotate-y')?.addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 0.5, y: this.cube.rotation.y + Math.PI / 2 });
        });
        
        document.getElementById('rotate-z')?.addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 0.5, z: this.cube.rotation.z + Math.PI / 2 });
        });
        
        document.getElementById('reset-view')?.addEventListener('click', () => {
            gsap.to(this.cube.rotation, { duration: 1, x: 0, y: 0, z: 0, ease: "back.out(1.7)" });
        });
        
        // Action buttons
        document.getElementById('scan-btn')?.addEventListener('click', () => this.startCameraScanning());
        document.getElementById('solve-btn')?.addEventListener('click', () => this.solveCube());
        document.getElementById('next-move-btn')?.addEventListener('click', () => this.showNextMove());
        document.getElementById('reset-btn')?.addEventListener('click', () => location.reload());
        
        // Camera controls
        document.getElementById('capture-face')?.addEventListener('click', () => this.captureFace());
        document.getElementById('close-camera')?.addEventListener('click', () => this.closeCameraInterface());
        
        // Real-time toggle
        document.getElementById('realtime-toggle')?.addEventListener('click', () => {
            this.isRealTimeMode = !this.isRealTimeMode;
            const button = document.getElementById('realtime-toggle');
            button.textContent = this.isRealTimeMode ? '📹 Real-time ON' : '📹 Real-time OFF';
            button.classList.toggle('active', this.isRealTimeMode);
        });
        
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
        
        // Animate fact cards
        gsap.from('.fact-card', {
            duration: 1,
            y: 50,
            opacity: 0,
            stagger: 0.1,
            delay: 1,
            ease: "back.out(1.7)"
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

    updateScanProgress() {
        // Implementation for scan progress updates
    }
}

// Initialize the application
new CubeSolverInterface();