import * as THREE from 'three';
import { gsap } from 'gsap';
import './style.css';

class RubiksCubeInterface {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.cubelets = [];
        this.currentStep = 0;
        this.isScanning = false;
        this.scannedFaces = new Set();
        
        this.init();
        this.setupEventListeners();
        this.startAnimations();
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
        this.camera.position.set(4, 4, 4);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0x4a90e2, 0.5);
        pointLight.position.set(-5, 5, 5);
        this.scene.add(pointLight);
    }

    createCube() {
        this.cube = new THREE.Group();
        
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
                    
                    // Create materials for each face
                    const materials = [
                        new THREE.MeshLambertMaterial({ color: x === 1 ? colors.R : 0x222222 }), // Right - Red
                        new THREE.MeshLambertMaterial({ color: x === -1 ? colors.O : 0x222222 }), // Left - Orange
                        new THREE.MeshLambertMaterial({ color: y === 1 ? colors.W : 0x222222 }), // Top - White
                        new THREE.MeshLambertMaterial({ color: y === -1 ? colors.Y : 0x222222 }), // Bottom - Yellow
                        new THREE.MeshLambertMaterial({ color: z === 1 ? colors.G : 0x222222 }), // Front - Green
                        new THREE.MeshLambertMaterial({ color: z === -1 ? colors.B : 0x222222 })  // Back - Blue
                    ];
                    
                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.set(x * (size + gap), y * (size + gap), z * (size + gap));
                    cubelet.castShadow = true;
                    cubelet.receiveShadow = true;
                    
                    this.cube.add(cubelet);
                    this.cubelets.push(cubelet);
                }
            }
        }
        
        this.scene.add(this.cube);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Gentle rotation
        this.cube.rotation.y += 0.005;
        this.cube.rotation.x += 0.002;
        
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
        document.getElementById('scan-btn').addEventListener('click', () => this.startScanning());
        document.getElementById('solve-btn').addEventListener('click', () => this.startSolving());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    startScanning() {
        this.isScanning = true;
        const scanBtn = document.getElementById('scan-btn');
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        scanBtn.textContent = 'Scanning...';
        scanBtn.disabled = true;
        statusText.textContent = 'Scanning in Progress';
        statusDot.classList.add('scanning');
        
        // Simulate scanning each face
        const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
        let currentFace = 0;
        
        const scanFace = () => {
            if (currentFace < faces.length) {
                const face = faces[currentFace];
                const faceItem = document.querySelector(`[data-face="${face}"]`);
                const preview = faceItem.querySelector('.face-preview');
                const status = faceItem.querySelector('.scan-status');
                
                // Animate scanning
                faceItem.classList.add('scanning');
                
                setTimeout(() => {
                    // Complete scan
                    faceItem.classList.remove('scanning');
                    faceItem.classList.add('scanned');
                    status.textContent = '✅';
                    this.scannedFaces.add(face);
                    
                    // Add random colors to preview
                    this.generateFacePreview(preview);
                    
                    currentFace++;
                    if (currentFace < faces.length) {
                        setTimeout(scanFace, 800);
                    } else {
                        this.completeScan();
                    }
                }, 2000);
            }
        };
        
        scanFace();
    }

    generateFacePreview(preview) {
        const colors = ['#ffffff', '#ffff00', '#ff0000', '#ff8800', '#00ff00', '#0000ff'];
        preview.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const sticker = document.createElement('div');
            sticker.className = 'sticker';
            sticker.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            preview.appendChild(sticker);
        }
    }

    completeScan() {
        const scanBtn = document.getElementById('scan-btn');
        const solveBtn = document.getElementById('solve-btn');
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        scanBtn.textContent = 'Scan Complete';
        solveBtn.disabled = false;
        statusText.textContent = 'Ready to Solve';
        statusDot.classList.remove('scanning');
        statusDot.classList.add('ready');
        
        // Animate cube completion
        this.animateCubeCompletion();
    }

    animateCubeCompletion() {
        // Flash effect
        this.cubelets.forEach((cubelet, index) => {
            gsap.to(cubelet.scale, {
                duration: 0.3,
                x: 1.1,
                y: 1.1,
                z: 1.1,
                delay: index * 0.02,
                yoyo: true,
                repeat: 1,
                ease: "power2.out"
            });
        });
    }

    startSolving() {
        const solveBtn = document.getElementById('solve-btn');
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        solveBtn.textContent = 'Solving...';
        solveBtn.disabled = true;
        statusText.textContent = 'Solving Cube';
        statusDot.classList.remove('ready');
        statusDot.classList.add('solving');
        
        // Animate solution steps
        this.animateSolutionSteps();
    }

    animateSolutionSteps() {
        const steps = document.querySelectorAll('.step-item');
        
        steps.forEach((step, index) => {
            setTimeout(() => {
                step.classList.add('active');
                const progressBar = step.querySelector('.progress-bar');
                
                gsap.to(progressBar, {
                    duration: 2,
                    width: '100%',
                    ease: "power2.out",
                    onComplete: () => {
                        step.classList.add('completed');
                        step.classList.remove('active');
                        
                        if (index === steps.length - 1) {
                            this.completeSolution();
                        }
                    }
                });
                
                // Animate cube rotation for each step
                this.animateMove(index);
            }, index * 2500);
        });
    }

    animateMove(stepIndex) {
        const moves = [
            { axis: 'y', angle: Math.PI / 2 },
            { axis: 'x', angle: Math.PI / 2 },
            { axis: 'z', angle: Math.PI / 2 }
        ];
        
        const move = moves[stepIndex % moves.length];
        
        gsap.to(this.cube.rotation, {
            duration: 0.8,
            [move.axis]: this.cube.rotation[move.axis] + move.angle,
            ease: "power2.inOut"
        });
    }

    completeSolution() {
        const solveBtn = document.getElementById('solve-btn');
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        solveBtn.textContent = 'Solved!';
        statusText.textContent = 'Cube Solved';
        statusDot.classList.remove('solving');
        statusDot.classList.add('solved');
        
        // Victory animation
        this.playVictoryAnimation();
    }

    playVictoryAnimation() {
        // Confetti-like effect with cubelets
        this.cubelets.forEach((cubelet, index) => {
            gsap.to(cubelet.rotation, {
                duration: 2,
                x: Math.random() * Math.PI * 2,
                y: Math.random() * Math.PI * 2,
                z: Math.random() * Math.PI * 2,
                delay: index * 0.05,
                ease: "power2.out"
            });
            
            gsap.to(cubelet.position, {
                duration: 2,
                y: cubelet.position.y + Math.random() * 2 - 1,
                delay: index * 0.05,
                yoyo: true,
                repeat: 1,
                ease: "power2.out"
            });
        });
    }

    reset() {
        // Reset all states
        this.isScanning = false;
        this.scannedFaces.clear();
        this.currentStep = 0;
        
        // Reset UI
        const scanBtn = document.getElementById('scan-btn');
        const solveBtn = document.getElementById('solve-btn');
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        scanBtn.textContent = 'Start Scanning';
        scanBtn.disabled = false;
        solveBtn.textContent = 'Solve Cube';
        solveBtn.disabled = true;
        statusText.textContent = 'Ready to Scan';
        statusDot.className = 'status-dot';
        
        // Reset face items
        document.querySelectorAll('.face-item').forEach(item => {
            item.className = 'face-item';
            item.querySelector('.scan-status').textContent = '⏳';
            item.querySelector('.face-preview').innerHTML = '';
        });
        
        // Reset step items
        document.querySelectorAll('.step-item').forEach((item, index) => {
            item.className = index === 0 ? 'step-item current' : 'step-item';
            item.querySelector('.progress-bar').style.width = '0%';
        });
        
        // Reset cube animation
        gsap.to(this.cube.rotation, { duration: 1, x: 0, y: 0, z: 0 });
        this.cubelets.forEach(cubelet => {
            gsap.to(cubelet.rotation, { duration: 1, x: 0, y: 0, z: 0 });
            gsap.to(cubelet.position, { duration: 1, x: cubelet.userData?.originalPosition?.x || cubelet.position.x, y: cubelet.userData?.originalPosition?.y || cubelet.position.y, z: cubelet.userData?.originalPosition?.z || cubelet.position.z });
            gsap.to(cubelet.scale, { duration: 1, x: 1, y: 1, z: 1 });
        });
    }

    startAnimations() {
        // Animate floating cubes in background
        document.querySelectorAll('.floating-cube').forEach((cube, index) => {
            gsap.to(cube, {
                duration: 3 + index,
                y: '20px',
                rotation: 360,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut",
                delay: index * 0.5
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
new RubiksCubeInterface();