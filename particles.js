(() => {
    "use strict";

    const CONFIG = {
        gridCellSize: 32,         // Crisp contour resolution with 30% fewer cells
        contourLevels: 8,         // Topographic level sets
        optimizerCount: 22,       // Active gradient descent trajectories
        trailLength: 28,          // Trajectory ribbon length
        learningRate: 2.8,        // Step size \eta
        momentum: 0.86,           // Heavy-ball momentum \beta
        cursorRadius: 210,        // Pointer landscape perturbation radius
        cursorStrength: 0.75,     // Local potential-well depth around pointer
        frameInterval: 1000 / 60
    };

    const THEMES = {
        dark: {
            rgb: "170, 186, 210",
            contourAlpha: 0.14,
            majorAlpha: 0.22,
            trailAlpha: 0.42,
            headAlpha: 0.85,
            lineWidth: 0.95
        },
        light: {
            rgb: "88, 105, 128",
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
    let field = new Float32Array(0);
    let optimizers = [];
    let animationId = null;
    let lastFrame = 0;
    let frameCount = 0;
    let time = 0;
    let dpr = 1;

    // Cache theme via MutationObserver instead of querying DOM 60 times/sec
    let activeTheme = document.body.classList.contains("dark-mode") ? THEMES.dark : THEMES.light;
    const themeObserver = new MutationObserver(() => {
        activeTheme = document.body.classList.contains("dark-mode") ? THEMES.dark : THEMES.light;
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // Offscreen canvas for caching topographic contours every 2nd frame
    const contourCanvas = document.createElement("canvas");
    const contourCtx = contourCanvas.getContext("2d", { alpha: true });
    let contourDirty = true;

    const mouse = { x: -1000, y: -1000, active: false };

    function evaluateLoss(x, y, t) {
        const w = width || 1;
        const h = height || 1;
        const nx = (x / w) * 3.6;
        const ny = (y / h) * 2.6;

        const d1x = nx - (2.45 + Math.sin(t * 0.6) * 0.22);
        const d1y = ny - (1.55 + Math.cos(t * 0.5) * 0.18);
        const basin1 = -1.25 * Math.exp(-(d1x * d1x + d1y * d1y) * 1.4);

        const d2x = nx - (1.15 + Math.cos(t * 0.45) * 0.2);
        const d2y = ny - (1.95 + Math.sin(t * 0.55) * 0.15);
        const basin2 = -0.85 * Math.exp(-(d2x * d2x + d2y * d2y) * 1.8);

        const saddle = 0.28 * Math.sin(nx * 2.1 + t * 0.4) * Math.cos(ny * 2.2 - t * 0.35);
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

    // Reusable gradient scratch object to eliminate per-step allocations
    const gradScratch = { gx: 0, gy: 0 };

    class OptimizerParticle {
        constructor(prewarm = false, customPos = null) {
            // Pre-allocated typed ring buffers (zero garbage collection)
            this.trailX = new Float32Array(CONFIG.trailLength);
            this.trailY = new Float32Array(CONFIG.trailLength);
            this.headIdx = 0;
            this.count = 0;
            this.reset(prewarm, customPos);
        }

        reset(prewarm = false, customPos = null) {
            if (customPos) {
                const angle = Math.random() * Math.PI * 2;
                const spread = 8 + Math.random() * 24;
                this.x = customPos.x + Math.cos(angle) * spread;
                this.y = customPos.y + Math.sin(angle) * spread;
            } else {
                this.x = width * (0.28 + Math.random() * 0.68);
                this.y = height * (0.12 + Math.random() * 0.82);
            }

            this.vx = 0;
            this.vy = 0;
            this.stagnantFrames = 0;
            this.maxLife = 160 + Math.floor(Math.random() * 120);
            this.life = prewarm ? Math.floor(this.maxLife * Math.random() * 0.5) : 0;
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

            const scale = gradNorm > 1e-5 ? CONFIG.learningRate / Math.max(gradNorm, 0.0025) : 0;

            this.vx = CONFIG.momentum * this.vx - gx * scale * 0.35;
            this.vy = CONFIG.momentum * this.vy - gy * scale * 0.35;

            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 4.2) {
                const invSpeed = 4.2 / speed;
                this.vx *= invSpeed;
                this.vy *= invSpeed;
            }

            // Detect convergence into a local minimum so particles don't sit idle
            if (speed < 0.25) {
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

            // Guard against NaN/Infinity or converged stagnation
            const outOfBounds =
                !Number.isFinite(this.x) ||
                !Number.isFinite(this.y) ||
                this.x < -30 || this.x > width + 30 ||
                this.y < -30 || this.y > height + 30;

            if (this.life > this.maxLife || this.stagnantFrames > 22 || outOfBounds) {
                if (this.isTemporary) return false;
                this.reset(false);
                return true;
            }

            this.step();
            return true;
        }

        draw(theme) {
            if (this.count < 2) return;

            const ratio = this.life / this.maxLife;
            let envelope = 1;
            if (ratio < 0.12) envelope = ratio / 0.12;
            else if (ratio > 0.8) envelope = (1 - ratio) / 0.2;

            const startIdx = (this.headIdx - this.count + CONFIG.trailLength) % CONFIG.trailLength;
            ctx.lineWidth = theme.lineWidth * 1.25;

            let prevIdx = startIdx;
            for (let i = 1; i < this.count; i++) {
                const currIdx = (startIdx + i) % CONFIG.trailLength;
                const segAlpha = (i / this.count) * theme.trailAlpha * envelope;

                ctx.beginPath();
                ctx.moveTo(this.trailX[prevIdx], this.trailY[prevIdx]);
                ctx.lineTo(this.trailX[currIdx], this.trailY[currIdx]);
                ctx.strokeStyle = `rgba(${theme.rgb}, ${segAlpha})`;
                ctx.stroke();

                prevIdx = currIdx;
            }

            const lastIdx = (this.headIdx - 1 + CONFIG.trailLength) % CONFIG.trailLength;
            ctx.beginPath();
            ctx.arc(this.trailX[lastIdx], this.trailY[lastIdx], 1.9, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${theme.rgb}, ${theme.headAlpha * envelope})`;
            ctx.fill();
        }
    }

    function renderContoursToCache(theme) {
        if (!contourCtx) return;

        contourCtx.clearRect(0, 0, width, height);

        const cell = CONFIG.gridCellSize;
        for (let r = 0; r < rows; r++) {
            const y = r * cell;
            const rowOffset = r * cols;
            for (let c = 0; c < cols; c++) {
                field[rowOffset + c] = evaluateLoss(c * cell, y, time);
            }
        }

        const minVal = -1.35;
        const maxVal = 0.35;
        const span = maxVal - minVal;

        for (let l = 0; l < CONFIG.contourLevels; l++) {
            const threshold = minVal + ((l + 0.5) / CONFIG.contourLevels) * span;
            const isMajor = l % 3 === 1;

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

        if (optimizers.length === 0) {
            for (let i = 0; i < CONFIG.optimizerCount; i++) {
                optimizers.push(new OptimizerParticle(true));
            }
        }
    }

    function animate(timestamp) {
        animationId = requestAnimationFrame(animate);

        // Clamp large delta spikes when returning from background sleep
        const elapsed = timestamp - lastFrame;
        if (elapsed < CONFIG.frameInterval) {
            return;
        }

        lastFrame = timestamp;
        frameCount++;
        time = (time + 0.012) % (Math.PI * 200); // Prevent unbounded float growth over hours

        ctx.clearRect(0, 0, width, height);

        // Re-render topographic contour cache every 2nd frame (or immediately on pointer move/resize)
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