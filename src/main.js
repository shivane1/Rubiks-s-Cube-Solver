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
        
        this.init();
        this.setupEventListeners();
        this.startAnimations();
        this.connectToSolver();
    }

    init() {
        this.setupThreeJS();
        this.createCube();
        this.animate();
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

    updateCubeColors(cubeState) {
        if (!cubeState) return;
        
        const colors = {
            'W': 0xffffff,
            'Y': 0xffff00,
            'R': 0xff0000,
            'O': 0xff8800,
            'G': 0x00ff00,
            'B': 0x0000ff
        };
        
        // Update cube colors based on the received state
        // This would need to be adapted based on your cube state format
        this.cubelets.forEach((cubelet, index) => {
            const { x, y, z } = cubelet.userData.gridPosition;
            
            // Update materials based on cube state
            // You'll need to map your cube state to the 3D positions
            cubelet.material.forEach((material, faceIndex) => {
                // This is a simplified example - you'll need to implement
                // the actual mapping from your cube state to face colors
                if (cubeState && cubeState.faces) {
                    // Update based on your actual cube state structure
                }
            });
        });
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

    connectToSolver() {
        // Simulate connection to Python solver
        // In a real implementation, you might use WebSockets or HTTP polling
        this.updateConnectionStatus(true);
        
        // Simulate receiving solution steps
        setTimeout(() => {
            this.receiveSolution("R U R' U' R U R' F' R U R' U' R' F R");
        }, 2000);
    }

    receiveSolution(solutionString) {
        this.currentSolution = solutionString.split(' ');
        this.currentStep = 0;
        this.displaySolutionSteps();
        this.updateUI();
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
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        statusText.textContent = 'Cube Solved! 🎉';
        statusDot.classList.add('solved');
        
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

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        if (connected) {
            statusText.textContent = 'Connected to OpenCV Solver';
            statusDot.classList.add('connected');
        } else {
            statusText.textContent = 'Connecting to Solver...';
            statusDot.classList.remove('connected');
        }
    }

    updateUI() {
        const nextBtn = document.getElementById('next-move-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        nextBtn.disabled = false;
        resetBtn.disabled = false;
        
        // Update step counter
        const stepCounter = document.querySelector('.step-counter');
        if (stepCounter) {
            stepCounter.textContent = `Step ${this.currentStep + 1} of ${this.currentSolution.length}`;
        }
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
        document.getElementById('next-move-btn').addEventListener('click', () => this.showNextMove());
        document.getElementById('reset-btn').addEventListener('click', () => location.reload());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.showNextMove();
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