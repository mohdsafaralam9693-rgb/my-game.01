
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const overlay = document.getElementById("overlay");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const soundBtn = document.getElementById("soundBtn");
const fullBtn = document.getElementById("fullBtn");

const overlayIcon = document.getElementById("overlayIcon");
const overlayEyebrow = document.getElementById("overlayEyebrow");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDescription = document.getElementById("overlayDescription");

const CELL = 20;

let cols = 0;
let rows = 0;
let snake = [];
let food = { x: 10, y: 10 };

let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

let score = 0;
let best = loadBest();
let gameState = "ready";
let soundEnabled = true;
let lastTime = 0;
let accumulator = 0;
let stepTime = 115;
let audioContext = null;

bestEl.textContent = String(best).padStart(3, "0");

function loadBest() {
    try {
        return Number(localStorage.getItem("snakeArenaBest")) || 0;
    } catch {
        return 0;
    }
}

function saveBest() {
    try {
        localStorage.setItem("snakeArenaBest", best);
    } catch {
        // Game still works if storage is unavailable.
    }
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.max(10, Math.floor(rect.width / CELL));
    rows = Math.max(10, Math.floor(rect.height / CELL));

    if (snake.length) {
        snake = snake.map(part => ({
            x: Math.min(cols - 1, Math.max(0, part.x)),
            y: Math.min(rows - 1, Math.max(0, part.y))
        }));

        placeFood();
    }

    draw();
}

function resetGame() {
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);

    snake = [
        { x: centerX, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX - 2, y: centerY },
        { x: centerX - 3, y: centerY }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };

    score = 0;
    stepTime = 115;
    accumulator = 0;

    updateScore();
    placeFood();
    draw();
}

function placeFood() {
    if (!cols || !rows) return;

    const freeCells = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const occupied = snake.some(
                part => part.x === x && part.y === y
            );

            if (!occupied) freeCells.push({ x, y });
        }
    }

    if (!freeCells.length) {
        winGame();
        return;
    }

    food = freeCells[
        Math.floor(Math.random() * freeCells.length)
    ];
}

function updateScore() {
    scoreEl.textContent = String(score).padStart(3, "0");
    bestEl.textContent = String(best).padStart(3, "0");
}

function playSound(frequency = 440, duration = 0.07) {
    if (!soundEnabled) return;

    try {
        audioContext ??= new (
            window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.07, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch {
        // Sound is optional.
    }
}

function showOverlay(type) {
    overlay.classList.remove("hidden");

    if (type === "ready") {
        overlayIcon.textContent = "🐍";
        overlayEyebrow.textContent = "WELCOME TO THE ARENA";
        overlayTitle.innerHTML = "SNAKE <span>EVOLUTION</span>";
        overlayDescription.textContent =
            "Eat. Grow. Survive. Beat your high score.";
        startBtn.textContent = "▶  START GAME";
        statusEl.textContent = "READY TO PLAY";
    }

    if (type === "paused") {
        overlayIcon.textContent = "Ⅱ";
        overlayEyebrow.textContent = "TAKE YOUR TIME";
        overlayTitle.innerHTML = "GAME <span>PAUSED</span>";
        overlayDescription.textContent =
            "Your snake is waiting. Ready to continue?";
        startBtn.textContent = "▶  RESUME GAME";
        statusEl.textContent = "PAUSED";
    }

    if (type === "over") {
        overlayIcon.textContent = "💥";
        overlayEyebrow.textContent = "THAT WAS A GOOD RUN";
        overlayTitle.innerHTML = "GAME <span>OVER</span>";
        overlayDescription.textContent =
            `Your score: ${score}  •  Best: ${best}`;
        startBtn.textContent = "↻  PLAY AGAIN";
        statusEl.textContent = "GAME OVER";
    }

    if (type === "win") {
        overlayIcon.textContent = "🏆";
        overlayEyebrow.textContent = "INCREDIBLE PERFORMANCE";
        overlayTitle.innerHTML = "YOU <span>WIN!</span>";
        overlayDescription.textContent =
            "You filled the entire arena!";
        startBtn.textContent = "↻  PLAY AGAIN";
        statusEl.textContent = "VICTORY";
    }
}

function startGame() {
    if (gameState === "over" || gameState === "won") {
        resetGame();
    }

    if (gameState === "ready") {
        resetGame();
    }

    if (gameState === "paused") {
        gameState = "playing";
    } else {
        gameState = "playing";
    }

    overlay.classList.add("hidden");
    statusEl.textContent = "● LIVE";
    pauseBtn.textContent = "Ⅱ";
    lastTime = 0;
    accumulator = 0;

    playSound(520, 0.08);
}

function togglePause() {
    if (gameState === "playing") {
        gameState = "paused";
        showOverlay("paused");
        pauseBtn.textContent = "▶";
    } else if (gameState === "paused") {
        startGame();
    }
}

function endGame() {
    gameState = "over";
    playSound(140, 0.25);
    showOverlay("over");
    draw();
}

function winGame() {
    gameState = "won";
    showOverlay("win");
    draw();
}

function changeDirection(x, y) {
    if (gameState !== "playing") {
        if (gameState === "ready") {
            startGame();
        } else {
            return;
        }
    }

    // Prevent turning directly back into the snake.
    if (x === -direction.x && y === -direction.y) return;

    nextDirection = { x, y };
}

function update() {
    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Wall collision.
    if (
        head.x < 0 || head.x >= cols ||
        head.y < 0 || head.y >= rows
    ) {
        endGame();
        return;
    }

    const eating = head.x === food.x && head.y === food.y;

    // The tail moves away on a normal step, so entering
    // its current cell is allowed if the snake isn't eating.
    const bodyToCheck = eating ? snake : snake.slice(0, -1);

    if (bodyToCheck.some(
        part => part.x === head.x && part.y === head.y
    )) {
        endGame();
        return;
    }

    snake.unshift(head);

    if (eating) {
        score += 10;

        if (score > best) {
            best = score;
            saveBest();
        }

        updateScore();
        playSound(660, 0.09);

        stepTime = Math.max(55, 115 - Math.floor(score / 50) * 5);

        placeFood();

        if (gameState === "won") return;
    } else {
        snake.pop();
    }
}

function draw() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#080f12";
    ctx.fillRect(0, 0, width, height);

    // Background grid.
    ctx.strokeStyle = "#15241f";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x <= width; x += CELL) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    for (let y = 0; y <= height; y += CELL) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();

    // Food.
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;

    ctx.save();
    ctx.shadowColor = "#ff627d";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ff627d";
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ffd0d9";
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Snake body, tail to head.
    snake.forEach((part, index) => {
        const inset = index === 0 ? 1.5 : 2.5;
        const x = part.x * CELL + inset;
        const y = part.y * CELL + inset;
        const size = CELL - inset * 2;

        ctx.save();

        if (index === 0) {
            ctx.shadowColor = "#a8ff60";
            ctx.shadowBlur = 13;
            ctx.fillStyle = "#c3ff85";
        } else {
            const alpha = Math.max(0.42, 1 - index * 0.012);
            ctx.fillStyle = `rgba(88, 220, 78, ${alpha})`;
        }

        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 5);
        ctx.fill();
        ctx.restore();
    });

    // Eyes on the snake's head.
    if (snake.length) {
        const head = snake[0];
        const cx = head.x * CELL + CELL / 2;
        const cy = head.y * CELL + CELL / 2;

        let eye1, eye2;

        if (direction.x === 1) {
            eye1 = [cx + 4, cy - 4];
            eye2 = [cx + 4, cy + 4];
        } else if (direction.x === -1) {
            eye1 = [cx - 4, cy - 4];
            eye2 = [cx - 4, cy + 4];
        } else if (direction.y === -1) {
            eye1 = [cx - 4, cy - 4];
            eye2 = [cx + 4, cy - 4];
        } else {
            eye1 = [cx - 4, cy + 4];
            eye2 = [cx + 4, cy + 4];
        }

        ctx.fillStyle = "#102315";

        [eye1, eye2].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;

    const delta = Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;

    if (gameState === "playing") {
        accumulator += delta;

        while (accumulator >= stepTime && gameState === "playing") {
            update();
            accumulator -= stepTime;
        }
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Keyboard controls.
document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    const controls = [
        "arrowup", "arrowdown", "arrowleft", "arrowright",
        " ", "w", "a", "s", "d"
    ];

    if (controls.includes(key)) {
        event.preventDefault();
    }

    if (key === " " || key === "enter") {
        if (gameState === "playing") {
            togglePause();
        } else {
            startGame();
        }
        return;
    }

    if (key === "escape") {
        if (gameState === "playing") togglePause();
        return;
    }

    if (key === "p") {
        togglePause();
        return;
    }

    if (key === "arrowup" || key === "w") {
        changeDirection(0, -1);
    } else if (key === "arrowdown" || key === "s") {
        changeDirection(0, 1);
    } else if (key === "arrowleft" || key === "a") {
        changeDirection(-1, 0);
    } else if (key === "arrowright" || key === "d") {
        changeDirection(1, 0);
    }
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

restartBtn.addEventListener("click", () => {
    resetGame();
    startGame();
});

soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? "🔊" : "🔇";

    if (soundEnabled) playSound(500, 0.08);
});

fullBtn.addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch {
        statusEl.textContent = "FULLSCREEN UNAVAILABLE";
    }
});

document.addEventListener("fullscreenchange", () => {
    fullBtn.textContent = document.fullscreenElement ? "⛶" : "⛶";
    setTimeout(resizeCanvas, 100);
});

// Optional swipe controls for touch screens.
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", event => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", event => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 1 : -1, 0);
    } else {
        changeDirection(0, dy > 0 ? 1 : -1);
    }
}, { passive: true });

window.addEventListener("resize", resizeCanvas);

resetGame();
showOverlay("ready");
resizeCanvas();
requestAnimationFrame(gameLoop);
