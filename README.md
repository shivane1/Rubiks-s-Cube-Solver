# 🧊 Rubik’s Cube Solver using Computer Vision & Python

This project is a real-time **Rubik’s Cube Solver** that uses a webcam to scan a real cube, classify each sticker's color, solve it using the **Kociemba algorithm**, and visualize the solution step-by-step with an overlay and a 2D state viewer.

---

## 🎥 Features

- 🎥 Webcam-based scanning of all 6 cube faces
- 🌈 HSV-based color classification of stickers
- 🧠 Solves cube using the [Kociemba two-phase algorithm](https://github.com/hkociemba/RubiksCube-TwophaseSolver)
- ➡️ Visual move guidance using arrow overlays
- 🔁 Real-time cube state tracking after every move
- 🖥️ Separate viewer window displaying cube state via sockets

---

## 🧰 Tech Stack & Libraries

- **Python 3.x**
- [`OpenCV`](https://opencv.org/) – Camera input, image display, overlays
- [`NumPy`](https://numpy.org/) – Numerical operations
- [`kociemba`](https://pypi.org/project/kociemba/) – Rubik’s Cube solving algorithm
- `socket` – Real-time communication between solver and viewer
- `pickle` – Serializing cube state data
- `os`, `copy` – Standard library utilities

---

## 📁 Project Structure
├── Main.py # Main script for scanning, solving, and guiding
├── State.py # Viewer script for rendering the current cube state
├── resources/ # Folder containing arrow images and color tiles
│ ├── colors/ # Individual sticker images by color
│ ├── U.png, R.png, ... # Arrows for each move


---

## 🚀 How to Run

### 1. Clone the repository

```bash
git clone https://github.com/Goddbott/Rubiks-s-Cube-Solver
cd rubiks-cube-solver

2. Install dependencies
pip install opencv-python numpy kociemba

3. Run the viewer (in one terminal)
python State.py

4. Run the solver (in another terminal)
python temp.py

🎮 Controls in temp.py
Press U, R, F, D, L, B to scan the respective face

Press ESC when all 6 faces are scanned

During solving, press SPACE to confirm each move

Press ESC to exit at any time

📸 Resources
resources/colors/: PNGs for W, Y, R, O, G, B tiles

resources/*.png: Overlay arrows for moves (R.png, U'.png, etc.)

Built with ❤️ by Aditya Ajay

