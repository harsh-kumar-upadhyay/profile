(() => {
    "use strict";

    const CONFIG = {
        bundleCount: 3,           // Number of multimodal policy trajectory bundles
        trajectoriesPerBundle: 9, // Sampled trajectories per bundle
        waypoints: 44,            // Smoothness resolution along each trajectory
        cursorRadius: 150,        // Conditioning obstacle radius around pointer
        splitStrength: 68,        // How wide trajectories bifurcate around pointer
        noiseParticleCount: 32,   // Subtle ambient Gaussian noise samples coalescing
        frameInterval: 1000 / 60
    };

    const THEMES = {
        dark: {
            rgb: "170, 186, 210", // Crisp silver-slate
            coreAlpha: 0.42,      // Central denoised mode
            sampleAlpha: 0.16,    // Surrounding posterior trajectory samples
            pulseAlpha: 0.85,     // Action execution pulse dot
            cursorAlpha: 0.25,
            lineWidth: 1.05
        },
        light: {
            rgb: "88, 105, 128",  // Refined academic slate
            coreAlpha: 0.34,
            sampleAlpha: 0.13,
            pulseAlpha: 0.75,
            cursorAlpha: 0.20,
            lineWidth: 0.95
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
    let bundles = [];
    let noiseSamples = [];
    let animationId = null;
    let lastFrame = 0;
    let time = 0;
    let denoiseShock = 0; // Triggered on click/tap
    let dpr = 1;

    const mouse = { x: -1000, y: -1000, active: false };

    class TrajectoryBundle {
        constructor(index, total) {
            this.index = index;
            this.total = total;
            this.phaseOffset = index * 2.1;
            this.speed = 0.008 + index * 0.0015;
            this.pulseT = (index / total); // Staggered action execution pulses

            // Pre-generate trajectory offsets (symmetric multimodal distribution)
            this.samples = [];
            const mid = (CONFIG.trajectoriesPerBundle - 1) / 2;
            for (let i = 0; i < CONFIG.trajectoriesPerBundle; i++) {
                const norm = (i - mid) / (mid || 1); // -1 to +1
                this.samples.push({
                    norm,
                    // Odd/even sign creates natural upper/lower mode bifurcation
                    modeSign: i % 2 === 0 ? 1 : -1,
                    spread: norm * 26,
                    freqOffset: norm * 0.4,
                    isCore: Math.abs(norm) < 0.2
                });
            }
        }

        // Base trajectory curve x(s), y(s) for normalized horizon s in [0, 1]
        getBasePoint(s, t) {
            // Sweeps from bottom-left/mid-bottom across to upper-right/right margin
            const startX = width * (0.15 + this.index * 0.14);
            const endX = width * (0.96 + this.index * 0.03);
            const x = startX + (endX - startX) * s;

            const baseLineY = height * (0.86 - this.index * 0.14) - s * height * (0.48 - this.index * 0.06);
            const wave1 = Math.sin(s * 4.2 + t + this.phaseOffset) * (36 - this.index * 4);
            const wave2 = Math.cos(s * 2.5 - t * 0.7 + this.index) * 20;

            return { x, y: baseLineY + wave1 + wave2 };
        }

        draw(theme, t) {
            this.pulseT = (this.pulseT + 0.0045) % 1;

            for (let sIdx = 0; sIdx < this.samples.length; sIdx++) {
                const sample = this.samples[sIdx];
                const pts = [];

                for (let w = 0; w <= CONFIG.waypoints; w++) {
                    const s = w / CONFIG.waypoints;
                    const base = this.getBasePoint(s, t);

                    // Envelope pinches near start (initial state s_0) and fans out smoothly
                    const envelope = Math.sin(Math.pow(s, 0.75) * Math.PI * 0.92);

                    // Subtle denoising jitter when user clicks to re-sample
                    const shockJitter = denoiseShock > 0.01
                        ? Math.sin(s * 18 + t * 12 + sIdx) * denoiseShock * 18 * envelope
                        : 0;

                    let px = base.x;
                    let py = base.y + sample.spread * envelope + shockJitter;

                    // Multimodal Bifurcation around Pointer Obstacle
                    if (mouse.active) {
                        const dx = px - mouse.x;
                        const dy = py - mouse.y;
                        const distSq = dx * dx + dy * dy;
                        const radSq = CONFIG.cursorRadius * CONFIG.cursorRadius;

                        if (distSq < radSq) {
                            const dist = Math.sqrt(distSq);
                            // Smooth Gaussian-like bell curve deflection
                            const influence = Math.pow(Math.cos((dist / CONFIG.cursorRadius) * (Math.PI / 2)), 2);

                            // Push upper mode above cursor and lower mode below cursor
                            const pushDir = sample.modeSign;
                            py += pushDir * influence * CONFIG.splitStrength;
                            px += (dx / (dist || 1)) * influence * 14;
                        }
                    }

                    pts.push({ x: px, y: py });
                }

                // Draw smooth trajectory curve
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length - 1; i++) {
                    const xc = (pts[i].x + pts[i + 1].x) / 2;
                    const yc = (pts[i].y + pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                }
                const last = pts[pts.length - 1];
                ctx.lineTo(last.x, last.y);

                const alpha = sample.isCore ? theme.coreAlpha : theme.sampleAlpha;
                ctx.strokeStyle = `rgba(${theme.rgb}, ${alpha})`;
                ctx.lineWidth = sample.isCore ? theme.lineWidth * 1.45 : theme.lineWidth * 0.85;
                ctx.stroke();

                // Draw crisp action execution waypoint pulse along the core trajectory
                if (sample.isCore) {
                    const pulseIdx = Math.min(
                        pts.length - 1,
                        Math.floor(this.pulseT * (pts.length - 1))
                    );
                    const pNode = pts[pulseIdx];
                    const edgeFade = Math.sin(this.pulseT * Math.PI);

                    ctx.beginPath();
                    ctx.arc(pNode.x, pNode.y, 2.3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${theme.rgb}, ${theme.pulseAlpha * edgeFade})`;
                    ctx.fill();
                }
            }
        }
    }

    // Ambient Gaussian noise particles that drift and coalesce toward the policy bundles
    class NoiseSample {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = width * (0.25 + Math.random() * 0.75);
            this.y = height * (0.1 + Math.random() * 0.85);
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = 1.1 + Math.random() * 1.1;
            this.phase = Math.random() * Math.PI * 2;
        }

        update(t) {
            this.x += this.vx + Math.cos(t + this.phase) * 0.25;
            this.y += this.vy + Math.sin(t + this.phase) * 0.25;

            if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                this.reset();
            }
        }

        draw(theme, t) {
            const alpha = (0.12 + 0.14 * Math.sin(t * 2 + this.phase));
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${theme.rgb}, ${Math.max(0.04, alpha)})`;
            ctx.fill();
        }
    }

    function drawConditioningHalo(theme) {
        if (!mouse.active) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 22, 0, Math.PI * 2);
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = `rgba(${theme.rgb}, ${theme.cursorAlpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (bundles.length === 0) {
            for (let i = 0; i < CONFIG.bundleCount; i++) {
                bundles.push(new TrajectoryBundle(i, CONFIG.bundleCount));
            }
            for (let i = 0; i < CONFIG.noiseParticleCount; i++) {
                noiseSamples.push(new NoiseSample());
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
        time += 0.008;

        if (denoiseShock > 0.001) {
            denoiseShock *= 0.92;
        } else {
            denoiseShock = 0;
        }

        ctx.clearRect(0, 0, width, height);

        const theme = getActiveTheme();

        for (let i = 0; i < noiseSamples.length; i++) {
            noiseSamples[i].update(time);
            noiseSamples[i].draw(theme, time);
        }

        for (let i = 0; i < bundles.length; i++) {
            bundles[i].draw(theme, time);
        }

        drawConditioningHalo(theme);
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

    // Clicking empty background triggers a quick diffusion re-sampling wave
    window.addEventListener("click", e => {
        if (e.target.closest("a, button")) return;
        denoiseShock = 1.0;
    }, { passive: true });

    window.addEventListener("touchstart", e => {
        if (e.touches.length > 0) {
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
            denoiseShock = 0.7;
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