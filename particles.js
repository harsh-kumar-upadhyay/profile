(() => {
    "use strict";

    const CONFIG = {
        gridCellSize: 28,         // Contour marching-squares resolution (fast & smooth)
        contourLevels: 9,         // Number of topographic level sets
        optimizerCount: 22,       // Active gradient descent trajectories
        trailLength: 28,          // Sleek trajectory ribbon length
        learningRate: 2.8,        // Step size \eta
        momentum: 0.86,           // Heavy-ball momentum \beta
        cursorRadius: 210,        // Pointer landscape perturbation radius
        cursorStrength: 0.75,     // Local potential-well depth around pointer
        frameInterval: 1000 / 60
    };

    const THEMES = {
        dark: {
            rgb: "170, 186, 210", // Crisp silver-slate
            contourAlpha: 0.14,   // Fine topographic level sets
            majorAlpha: 0.22,     // Every 3rd major contour line
            trailAlpha: 0.42,     // Gradient descent trajectory
            headAlpha: 0.85,      // Optimizer iterate dot x_k
            lineWidth: 0.95
        },
        light: {
            rgb: "88, 105, 128",  // Academic slate
            contourAlpha: 0.12,
            majorAlpha: 0.19,
            trailAlpha: 0.34,
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
    let field = [];
    let optimizers = [];
    let animationId = null;
    let lastFrame = 0;
    let time = 0;
    let dpr = 1;

    const mouse = { x: -1000, y: -1000, active: false };

    // Smooth non-convex loss landscape f(x, y, t) with shifting basins & saddle points
    function evaluateLoss(x, y, t) {
        const nx = (x / Math.max(width, 1)) * 3.6;
        const ny = (y / Math.max(height, 1)) * 2.6;

        // Primary global basin on the right-center + secondary local minima
        const d1x = nx - (2.45 + Math.sin(t * 0.6) * 0.22);
        const d1y = ny - (1.55 + Math.cos(t * 0.5) * 0.18);
        const basin1 = -1.25 * Math.exp(-(d1x * d1x + d1y * d1y) * 1.4);

        const d2x = nx - (1.15 + Math.cos(t * 0.45) * 0.2);
        const d2y = ny - (1.95 + Math.sin(t * 0.55) * 0.15);
        const basin2 = -0.85 * Math.exp(-(d2x * d2x + d2y * d2y) * 1.8);

        // Smooth wave coupling for saddle regions
        const saddle = 0.28 * Math.sin(nx * 2.1 + t * 0.4) * Math.cos(ny * 2.2 - t * 0.35);

        let val = basin1 + basin2 + saddle;

        // Pointer creates a live local attractor basin in the loss surface
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

    // Finite-difference gradient \nabla f(x, y)
    function evaluateGradient(x, y, t) {
        const eps = 4.0;
        const dfdx = (evaluateLoss(x + eps, y, t) - evaluateLoss(x - eps, y, t)) / (2 * eps);
        const dfdy = (evaluateLoss(x, y + eps, t) - evaluateLoss(x, y - eps, t)) / (2 * eps);
        return { gx: dfdx, gy: dfdy };
    }

    class OptimizerParticle {
        constructor(prewarm = false, customPos = null) {
            this.reset(prewarm, customPos);
        }

        reset(prewarm = false, customPos = null) {
            if (customPos) {
                const angle = Math.random() * Math.PI * 2;
                const spread = 8 + Math.random() * 24;
                this.x = customPos.x + Math.cos(angle) * spread;
                this.y = customPos.y + Math.sin(angle) * spread;
            } else {
                // Bias spawns toward right and lower regions to keep left bio clean
                this.x = width * (0.28 + Math.random() * 0.68);
                this.y = height * (0.12 + Math.random() * 0.82);
            }

            this.vx = 0;
            this.vy = 0;
            this.maxLife = 170 + Math.random() * 140;
            this.life = prewarm ? Math.floor(this.maxLife * Math.random() * 0.6) : 0;
            this.history = [];
            this.isTemporary = Boolean(customPos);

            if (prewarm) {
                for (let i = 0; i < CONFIG.trailLength; i++) {
                    this.step();
                }
            }
        }

        step() {
            const { gx, gy } = evaluateGradient(this.x, this.y, time);
            const gradNorm = Math.hypot(gx, gy);

            // Normalize gradient lightly so trajectories glide smoothly even on flat plateaus
            const scale = gradNorm > 1e-5 ? CONFIG.learningRate / Math.max(gradNorm, 0.0025) : 0;

            this.vx = CONFIG.momentum * this.vx - gx * scale * 0.35;
            this.vy = CONFIG.momentum * this.vy - gy * scale * 0.35;

            // Cap max velocity for silky curve rendering
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 4.2) {
                this.vx = (this.vx / speed) * 4.2;
                this.vy = (this.vy / speed) * 4.2;
            }

            this.x += this.vx;
            this.y += this.vy;

            this.history.push({ x: this.x, y: this.y });
            if (this.history.length > CONFIG.trailLength) {
                this.history.shift();
            }
        }

        update() {
            this.life++;
            if (this.life > this.maxLife) {
                if (this.isTemporary) return false;
                this.reset(false);
                return true;
            }

            this.step();

            if (this.x < -30 || this.x > width + 30 || this.y < -30 || this.y > height + 30) {
                if (this.isTemporary) return false;
                this.reset(false);
            }
            return true;
        }

        draw(theme) {
            if (this.history.length < 2) return;

            const ratio = this.life / this.maxLife;
            let envelope = 1;
            if (ratio < 0.12) envelope = ratio / 0.12;
            else if (ratio > 0.8) envelope = (1 - ratio) / 0.2;

            for (let i = 1; i < this.history.length; i++) {
                const p0 = this.history[i - 1];
                const p1 = this.history[i];
                const segAlpha = (i / this.history.length) * theme.trailAlpha * envelope;

                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.strokeStyle = `rgba(${theme.rgb}, ${segAlpha})`;
                ctx.lineWidth = theme.lineWidth * 1.25;
                ctx.stroke();
            }

            const head = this.history[this.history.length - 1];
            ctx.beginPath();
            ctx.arc(head.x, head.y, 1.9, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${theme.rgb}, ${theme.headAlpha * envelope})`;
            ctx.fill();
        }
    }

    // Marching Squares contour renderer for topographic level sets
    function drawContours(theme) {
        const cell = CONFIG.gridCellSize;
        for (let r = 0; r < rows; r++) {
            const y = r * cell;
            for (let c = 0; c < cols; c++) {
                field[r * cols + c] = evaluateLoss(c * cell, y, time);
            }
        }

        const minVal = -1.35;
        const maxVal = 0.35;

        for (let l = 0; l < CONFIG.contourLevels; l++) {
            const threshold = minVal + ((l + 0.5) / CONFIG.contourLevels) * (maxVal - minVal);
            const isMajor = l % 3 === 1;

            ctx.beginPath();
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
                            ctx.moveTo(x0, leftY);
                            ctx.lineTo(topX, y0);
                            break;
                        case 2:
                        case 13:
                            ctx.moveTo(topX, y0);
                            ctx.lineTo(x1, rightY);
                            break;
                        case 3:
                        case 12:
                            ctx.moveTo(x0, leftY);
                            ctx.lineTo(x1, rightY);
                            break;
                        case 4:
                        case 11:
                            ctx.moveTo(x1, rightY);
                            ctx.lineTo(bottomX, y1);
                            break;
                        case 5:
                            ctx.moveTo(x0, leftY);
                            ctx.lineTo(topX, y0);
                            ctx.moveTo(x1, rightY);
                            ctx.lineTo(bottomX, y1);
                            break;
                        case 6:
                        case 9:
                            ctx.moveTo(topX, y0);
                            ctx.lineTo(bottomX, y1);
                            break;
                        case 7:
                        case 8:
                            ctx.moveTo(x0, leftY);
                            ctx.lineTo(bottomX, y1);
                            break;
                        case 10:
                            ctx.moveTo(topX, y0);
                            ctx.lineTo(x1, rightY);
                            ctx.moveTo(x0, leftY);
                            ctx.lineTo(bottomX, y1);
                            break;
                    }
                }
            }

            ctx.strokeStyle = `rgba(${theme.rgb}, ${isMajor ? theme.majorAlpha : theme.contourAlpha})`;
            ctx.lineWidth = isMajor ? theme.lineWidth * 1.1 : theme.lineWidth * 0.75;
            ctx.stroke();
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.ceil(width / CONFIG.gridCellSize) + 2;
        rows = Math.ceil(height / CONFIG.gridCellSize) + 2;
        field = new Float32Array(cols * rows);

        if (optimizers.length === 0) {
            for (let i = 0; i < CONFIG.optimizerCount; i++) {
                optimizers.push(new OptimizerParticle(true));
            }
        }
    }

    function getActiveTheme() {
        return document.body.classList.contains("dark-mode")
            ? THEMES.dark
            : THEMES.light;
    }

    function animate(timestamp) {
        animationId = requestAnimationFrame(animate);

        if (timestamp - lastFrame < CONFIG.frameInterval) {
            return;
        }

        lastFrame = timestamp;
        time += 0.012;
        ctx.clearRect(0, 0, width, height);

        const theme = getActiveTheme();

        drawContours(theme);

        for (let i = optimizers.length - 1; i >= 0; i--) {
            const alive = optimizers[i].update();
            if (!alive) {
                optimizers.splice(i, 1);
            } else {
                optimizers[i].draw(theme);
            }
        }
    }

    function updatePointer(x, y) {
        mouse.x = x;
        mouse.y = y;
        mouse.active = true;
    }

    function deactivatePointer() {
        mouse.active = false;
        mouse.x = -1000;
        mouse.y = -1000;
    }

    window.addEventListener("mousemove", e => updatePointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener("mouseleave", deactivatePointer);

    // Clicking empty background drops a fresh batch of gradient descent trajectories
    window.addEventListener("click", e => {
        if (e.target.closest("a, button")) return;
        for (let i = 0; i < 4; i++) {
            if (optimizers.length < CONFIG.optimizerCount + 12) {
                optimizers.push(new OptimizerParticle(false, { x: e.clientX, y: e.clientY }));
            }
        }
    }, { passive: true });

    window.addEventListener("touchstart", e => {
        if (e.touches.length > 0) {
            const t = e.touches[0];
            updatePointer(t.clientX, t.clientY);
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
            cancelAnimationFrame(animationId);
            animationId = null;
        } else if (!animationId) {
            lastFrame = 0;
            animationId = requestAnimationFrame(animate);
        }
    });

    resize();
    // Instant frame-0 render on page open
    animate(performance.now());
})();