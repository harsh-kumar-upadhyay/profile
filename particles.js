(() => {
    "use strict";

    const CONFIG = {
        particleDensity: 10000, 
        minParticles: 25,
        maxParticles: 100,
        connectionDistance: 200,
        cursorRadius: 100,        // The size of the empty void around the cursor
        repulsionStrength: 0.85,  // Pushes particles firmly to the boundary edge
        frameInterval: 500 / 1000
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "particle-network";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        zIndex: "0",
        pointerEvents: "none"
    });

    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) {
        canvas.remove();
        return;
    }

    let width = 0;
    let height = 0;
    let particles = [];
    let animationId = null;
    let lastFrame = 0;
    let dpr = 1;

    const mouse = {
        x: -1000,
        y: -1000,
        active: false
    };

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;

            // Generate a random angle and a slow, constant drifting speed
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.3 + 0.15; 
            
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;

            this.radius = Math.random() * 1.5 + 1.2;
            this.alpha = Math.random() * 0.4 + 0.2;
        }

        update() {
            // Apply constant movement
            this.x += this.vx;
            this.y += this.vy;

            // Cursor Repulsion (Hard Boundary Effect)
            if (mouse.active) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distanceSquared = dx * dx + dy * dy;
                const radiusSquared = CONFIG.cursorRadius * CONFIG.cursorRadius;

                if (distanceSquared < radiusSquared && distanceSquared > 0.01) {
                    const distance = Math.sqrt(distanceSquared);
                    
                    // Calculate how deep the particle is inside the forbidden zone
                    const overlap = CONFIG.cursorRadius - distance;
                    
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // Shove the particle strictly outward to the boundary perimeter
                    this.x += nx * overlap * CONFIG.repulsionStrength;
                    this.y += ny * overlap * CONFIG.repulsionStrength;
                }
            }

            // Wrap around screen edges smoothly
            const margin = 10;
            if (this.x < -margin) this.x = width + margin;
            if (this.x > width + margin) this.x = -margin;
            if (this.y < -margin) this.y = height + margin;
            if (this.y > height + margin) this.y = -margin;
        }

        draw(color) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${this.alpha})`;
            ctx.fill();
        }
    }

    function getParticleCount() {
        return Math.min(
            CONFIG.maxParticles,
            Math.max(
                CONFIG.minParticles,
                Math.floor((width * height) / CONFIG.particleDensity)
            )
        );
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;

        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = getParticleCount();

        while (particles.length < count) {
            particles.push(new Particle());
        }

        if (particles.length > count) {
            particles.length = count;
        }
    }

    function getParticleColor() {
        const isDark = document.body.classList.contains("dark-mode");
        return isDark ? "57, 255, 20" : "220, 20, 60"; 
    }

    function drawConnections(color) {
        const maxDistance = CONFIG.connectionDistance;
        const maxDistanceSquared = maxDistance * maxDistance;

        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];

            for (let j = i + 1; j < particles.length; j++) {
                const b = particles[j];

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared >= maxDistanceSquared) {
                    continue;
                }

                const distance = Math.sqrt(distanceSquared);
                // Connections become more opaque as particles get closer together
                const opacity = (1 - distance / maxDistance) * 0.25;

                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(${color}, ${opacity})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    function animate(timestamp) {
        animationId = requestAnimationFrame(animate);

        if (timestamp - lastFrame < CONFIG.frameInterval) {
            return;
        }

        lastFrame = timestamp;
        ctx.clearRect(0, 0, width, height);

        const color = getParticleColor();

        particles.forEach(particle => {
            particle.update();
        });

        drawConnections(color);

        particles.forEach(particle => {
            particle.draw(color);
        });
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

    window.addEventListener("mousemove", event => {
        updatePointer(event.clientX, event.clientY);
    }, { passive: true });

    window.addEventListener("mouseleave", deactivatePointer);

    window.addEventListener("touchstart", event => {
        if (event.touches.length > 0) {
            updatePointer(
                event.touches[0].clientX,
                event.touches[0].clientY
            );
        }
    }, { passive: true });

    window.addEventListener("touchmove", event => {
        if (event.touches.length > 0) {
            updatePointer(
                event.touches[0].clientX,
                event.touches[0].clientY
            );
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
    animationId = requestAnimationFrame(animate);
})();