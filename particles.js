(() => {
    "use strict";

    const CONFIG = {
        gridCellSize: 26,         // Smooth contour curvature without extra CPU cost
        contourLevels: 5,         // Minimalist topographic level sets
        areaPerOptimizer: 72000,  // Responsive density: ~7 on mobile, ~12–15 on desktop
        minOptimizers: 3,
        maxOptimizers: 7,
        trailLength: 22,          // Slightly longer trail to showcase the overshoot arc
        learningRate: 145.0,      // Force gain proportional to true gradient steepness
        momentum: 0.935,          // High heavy-ball inertia for realistic basin overshoot
        cursorRadius: 200,        // Pointer landscape perturbation radius
        cursorStrength: 0.80,     // Local potential-well depth around pointer
        frameInterval: 1000 / 60
    };

    const THEMES = {
        dark: {
            rgb: "170, 186, 210",
            contourAlpha: 0.13,
            majorAlpha: 0.21,
            trailAlpha: 0.40,
            headAlpha: 0.85,
            lineWidth: 0.95
        },
        light: {
            rgb: "88, 105, 128",
            contourAlpha: 0.11,
            majorAlpha: 0.18,
            trailAlpha: 0.32,
            headAlpha: 0.75,
            lineWidth: 0.85
        }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "particle-network";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
        canvas.remove();
        return;
    }

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let field = new Float32Array(0);
    let optimizers = [];
    let animationId = null;
    let lastFrame = 0;
    let frameCount = 0;
    let time = 0;
    let dpr = 1;

    let activeTheme = document.body.classList.contains("dark-mode") ? THEMES.dark : THEMES.light;
    const themeObserver = new MutationObserver(() => {
        activeTheme = document.body.classList.contains("dark-mode") ? THEMES.dark : THEMES.light;
        contourDirty = true;
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const contourCanvas = document.createElement("canvas");
    const contourCtx = contourCanvas.getContext("2d", { alpha: true });
    let contourDirty = true;

    const mouse = { x: -1000, y: -1000, active: false };

    function getTargetOptimizerCount() {
        const scaled = Math.floor((width * height) / CONFIG.areaPerOptimizer);
        return Math.min(CONFIG.maxOptimizers, Math.max(CONFIG.minOptimizers, scaled));
    }

    function evaluateLoss(x, y, t) {
        const w = width || 1;
        const h = height || 1;
        const nx = (x / w) * 3.4;
        const ny = (y / h) * 2.5;

        const d1x = nx - (2.35 + Math.sin(t * 0.6) * 0.22);
        const d1y = ny - (1.50 + Math.cos(t * 0.5) * 0.18);
        const basin1 = -1.25 * Math.exp(-(d1x * d1x + d1y * d1y) * 1.35);

        const d2x = nx - (1.15 + Math.cos(t * 0.45) * 0.2);
        const d2y = ny - (1.90 + Math.sin(t * 0.55) * 0.15);
        const basin2 = -0.85 * Math.exp(-(d2x * d2x + d2y * d2y) * 1.7);

        const saddle = 0.24 * Math.sin(nx * 2.0 + t * 0.4) * Math.cos(ny * 2.1 - t * 0.35);
        let val = basin1 + basin2 + saddle;

        if (mouse.active) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const radSq = CONFIG.cursorRadius * CONFIG.cursorRadius;
            if (distSq < radSq) {
                val -= CONFIG.cursorStrength * Math.exp(-distSq / (radSq * 0.32));
            }
        }

        return val;
    }

    function evaluateGradient(x, y, t, out) {
        const eps = 4.0;
        const inv = 1 / (2 * eps);
        out.gx = (evaluateLoss(x + eps, y, t) - evaluateLoss(x - eps, y, t)) * inv;
        out.gy = (evaluateLoss(x, y + eps, t) - evaluateLoss(x, y - eps, t)) * inv;
    }

    const gradScratch = { gx: 0, gy: 0 };

    class OptimizerParticle {
        constructor(prewarm = false, customPos = null) {
            this.trailX = new Float32Array(CONFIG.trailLength);
            this.trailY = new Float32Array(CONFIG.trailLength);
            this.headIdx = 0;
            this.count = 0;
            this.reset(prewarm, customPos);
        }

        reset(prewarm = false, customPos = null) {
            if (customPos) {
                const angle = Math.random() * Math.PI * 2;
                const spread = 12 + Math.random() * 24;
                this.x = customPos.x + Math.cos(angle) * spread;
                this.y = customPos.y + Math.sin(angle) * spread;
            } else {
                this.x = width * (0.28 + Math.random() * 0.68);
                this.y = height * (0.12 + Math.random() * 0.82);
            }

            // Give slight initial tangential velocity so descent arcs swirl & overshoot cleanly
            const initAngle = Math.random() * Math.PI * 2;
            const initKick = 0.6 + Math.random() * 0.8;
            this.vx = Math.cos(initAngle) * initKick;
            this.vy = Math.sin(initAngle) * initKick;

            this.stagnantFrames = 0;
            this.maxLife = 180 + Math.floor(Math.random() * 120);
            this.life = prewarm ? Math.floor(this.maxLife * Math.random() * 0.45) : 0;
            this.isTemporary = Boolean(customPos);

            this.headIdx = 0;
            this.count = 0;

            if (prewarm) {
                for (let i = 0; i < CONFIG.trailLength; i++) {
                    this.step();
                }
            }
        }

        pushTrail(x, y) {
            this.trailX[this.headIdx] = x;
            this.trailY[this.headIdx] = y;
            this.headIdx = (this.headIdx + 1) % CONFIG.trailLength;
            if (this.count < CONFIG.trailLength) {
                this.count++;
            }
        }

        step() {
            evaluateGradient(this.x, this.y, time, gradScratch);
            const gx = gradScratch.gx;
            const gy = gradScratch.gy;
            const gradNorm = Math.hypot(gx, gy);

            // Minimum baseline pull ensures particles on flat plateaus still accelerate into basins
            const minPull = gradNorm > 1e-6 && gradNorm < 0.0012 ? 0.0012 / gradNorm : 1.0;

            this.vx = CONFIG.momentum * this.vx - gx * minPull * CONFIG.learningRate;
            this.vy = CONFIG.momentum * this.vy - gy * minPull * CONFIG.learningRate;

            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 5.2) {
                const invSpeed = 5.2 / speed;
                this.vx *= invSpeed;
                this.vy *= invSpeed;
            }

            // Only mark stagnant after full overshoot oscillations settle near the minimum
            if (speed < 0.14 && gradNorm < 0.0015) {
                this.stagnantFrames++;
            } else {
                this.stagnantFrames = 0;
            }

            this.x += this.vx;
            this.y += this.vy;
            this.pushTrail(this.x, this.y);
        }

        update() {
            this.life++;

            const outOfBounds =
                !Number.isFinite(this.x) ||
                !Number.isFinite(this.y) ||
                this.x < -40 || this.x > width + 40 ||
                this.y < -40 || this.y > height + 40;

            if (this.life > this.maxLife || this.stagnantFrames > 36 || outOfBounds) {
                if (this.isTemporary) return false;
                this.reset(false);
                return true;
            }

            this.step();
            return true;
        }

        draw(theme) {
            if (this.count < 3) return;

            const ratio = this.life / this.maxLife;
            let envelope = 1;
            if (ratio < 0.12) envelope = ratio / 0.12;
            else if (ratio > 0.8) envelope = (1 - ratio) / 0.2;

            const startIdx = (this.headIdx - this.count + CONFIG.trailLength) % CONFIG.trailLength;
            ctx.lineWidth = theme.lineWidth * 1.2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            let i0 = startIdx;
            let i1 = (startIdx + 1) % CONFIG.trailLength;
            let prevMidX = (this.trailX[i0] + this.trailX[i1]) * 0.5;
            let prevMidY = (this.trailY[i0] + this.trailY[i1]) * 0.5;

            for (let i = 1; i < this.count - 1; i++) {
                const currIdx = (startIdx + i) % CONFIG.trailLength;
                const nextIdx = (startIdx + i + 1) % CONFIG.trailLength;

                const cx = this.trailX[currIdx];
                const cy = this.trailY[currIdx];
                const midX = (cx + this.trailX[nextIdx]) * 0.5;
                const midY = (cy + this.trailY[nextIdx]) * 0.5;

                const segAlpha = (i / this.count) * theme.trailAlpha * envelope;

                ctx.beginPath();
                ctx.moveTo(prevMidX, prevMidY);
                ctx.quadraticCurveTo(cx, cy, midX, midY);
                ctx.strokeStyle = `rgba(${theme.rgb}, ${segAlpha})`;
                ctx.stroke();

                prevMidX = midX;
                prevMidY = midY;
            }

            const lastIdx = (this.headIdx - 1 + CONFIG.trailLength) % CONFIG.trailLength;
            const headX = this.trailX[lastIdx];
            const headY = this.trailY[lastIdx];

            ctx.beginPath();
            ctx.moveTo(prevMidX, prevMidY);
            ctx.lineTo(headX, headY);
            ctx.strokeStyle = `rgba(${theme.rgb}, ${theme.trailAlpha * envelope})`;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(headX, headY, 1.85, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${theme.rgb}, ${theme.headAlpha * envelope})`;
            ctx.fill();
        }
    }

    function renderContoursToCache(theme) {
        if (!contourCtx) return;

        contourCtx.clearRect(0, 0, width, height);
        contourCtx.lineCap = "round";
        contourCtx.lineJoin = "round";

        const cell = CONFIG.gridCellSize;
        for (let r = 0; r < rows; r++) {
            const y = r * cell;
            const rowOffset = r * cols;
            for (let c = 0; c < cols; c++) {
                field[rowOffset + c] = evaluateLoss(c * cell, y, time);
            }
        }

        const minVal = -1.25;
        const maxVal = 0.25;
        const span = maxVal - minVal;

        for (let l = 0; l < CONFIG.contourLevels; l++) {
            const threshold = minVal + ((l + 0.5) / CONFIG.contourLevels) * span;
            const isMajor = l === 2;

            contourCtx.beginPath();
            for (let r = 0; r < rows - 1; r++) {
                const y0 = r * cell;
                const y1 = y0 + cell;
                const rowOffset = r * cols;
                const nextRowOffset = (r + 1) * cols;

                for (let c = 0; c < cols - 1; c++) {
                    const v0 = field[rowOffset + c];
                    const v1 = field[rowOffset + c + 1];
                    const v2 = field[nextRowOffset + c + 1];
                    const v3 = field[nextRowOffset + c];

                    let state = 0;
                    if (v0 >= threshold) state |= 1;
                    if (v1 >= threshold) state |= 2;
                    if (v2 >= threshold) state |= 4;
                    if (v3 >= threshold) state |= 8;

                    if (state === 0 || state === 15) continue;

                    const x0 = c * cell;
                    const x1 = x0 + cell;

                    const topX = x0 + ((threshold - v0) / (v1 - v0 || 1e-6)) * cell;
                    const rightY = y0 + ((threshold - v1) / (v2 - v1 || 1e-6)) * cell;
                    const bottomX = x0 + ((threshold - v3) / (v2 - v3 || 1e-6)) * cell;
                    const leftY = y0 + ((threshold - v0) / (v3 - v0 || 1e-6)) * cell;

                    switch (state) {
                        case 1:
                        case 14:
                            contourCtx.moveTo(x0, leftY);
                            contourCtx.lineTo(topX, y0);
                            break;
                        case 2:
                        case 13:
                            contourCtx.moveTo(topX, y0);
                            contourCtx.lineTo(x1, rightY);
                            break;
                        case 3:
                        case 12:
                            contourCtx.moveTo(x0, leftY);
                            contourCtx.lineTo(x1, rightY);
                            break;
                        case 4:
                        case 11:
                            contourCtx.moveTo(x1, rightY);
                            contourCtx.lineTo(bottomX, y1);
                            break;
                        case 5:
                            contourCtx.moveTo(x0, leftY);
                            contourCtx.lineTo(topX, y0);
                            contourCtx.moveTo(x1, rightY);
                            contourCtx.lineTo(bottomX, y1);
                            break;
                        case 6:
                        case 9:
                            contourCtx.moveTo(topX, y0);
                            contourCtx.lineTo(bottomX, y1);
                            break;
                        case 7:
                        case 8:
                            contourCtx.moveTo(x0, leftY);
                            contourCtx.lineTo(bottomX, y1);
                            break;
                        case 10:
                            contourCtx.moveTo(topX, y0);
                            contourCtx.lineTo(x1, rightY);
                            contourCtx.moveTo(x0, leftY);
                            contourCtx.lineTo(bottomX, y1);
                            break;
                    }
                }
            }

            contourCtx.strokeStyle = `rgba(${theme.rgb}, ${isMajor ? theme.majorAlpha : theme.contourAlpha})`;
            contourCtx.lineWidth = isMajor ? theme.lineWidth * 1.1 : theme.lineWidth * 0.75;
            contourCtx.stroke();
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.round(width * dpr);
        const targetH = Math.round(height * dpr);

        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        contourCanvas.width = targetW;
        contourCanvas.height = targetH;
        if (contourCtx) {
            contourCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        cols = Math.ceil(width / CONFIG.gridCellSize) + 2;
        rows = Math.ceil(height / CONFIG.gridCellSize) + 2;
        field = new Float32Array(cols * rows);
        contourDirty = true;

        const targetCount = getTargetOptimizerCount();
        while (optimizers.length < targetCount) {
            optimizers.push(new OptimizerParticle(true));
        }
        if (optimizers.length > targetCount) {
            optimizers.length = targetCount;
        }
    }

    function animate(timestamp) {
        animationId = requestAnimationFrame(animate);

        if (timestamp - lastFrame < CONFIG.frameInterval) {
            return;
        }

        lastFrame = timestamp;
        frameCount++;
        time = (time + 0.012) % (Math.PI * 200);

        ctx.clearRect(0, 0, width, height);

        if (contourDirty || frameCount % 2 === 0) {
            renderContoursToCache(activeTheme);
            contourDirty = false;
        }
        ctx.drawImage(contourCanvas, 0, 0, width, height);

        for (let i = optimizers.length - 1; i >= 0; i--) {
            const alive = optimizers[i].update();
            if (!alive) {
                optimizers.splice(i, 1);
            } else {
                optimizers[i].draw(activeTheme);
            }
        }
    }

    function updatePointer(x, y) {
        mouse.x = x;
        mouse.y = y;
        mouse.active = true;
        contourDirty = true;
    }

    function deactivatePointer() {
        mouse.active = false;
        mouse.x = -1000;
        mouse.y = -1000;
        contourDirty = true;
    }

    window.addEventListener("mousemove", e => updatePointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener("mouseleave", deactivatePointer);

    window.addEventListener("click", e => {
        if (e.target.closest("a, button")) return;
        const maxAllowed = getTargetOptimizerCount() + 6;
        for (let i = 0; i < 3; i++) {
            if (optimizers.length < maxAllowed) {
                optimizers.push(new OptimizerParticle(false, { x: e.clientX, y: e.clientY }));
            }
        }
    }, { passive: true });

    window.addEventListener("touchstart", e => {
        if (e.touches.length > 0) {
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener("touchmove", e => {
        if (e.touches.length > 0) {
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener("touchend", deactivatePointer, { passive: true });
    window.addEventListener("touchcancel", deactivatePointer, { passive: true });
    window.addEventListener("resize", resize, { passive: true });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        } else if (!animationId) {
            lastFrame = performance.now();
            contourDirty = true;
            animationId = requestAnimationFrame(animate);
        }
    });

    resize();
    animate(performance.now());
})();