/* =========================================
   GLOBAL VARIABLES (Shared State)
   ========================================= */
let openTimer, closeTimer;
let currentModalImages = [], currentModalIndex = 0;

/* =========================================
   CORE FUNCTIONS
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    injectNavigation();
    
    // Router Logic: Detect page and run appropriate renderer
    // We now check if the DATA exists before trying to render
    const path = window.location.pathname;
    
    if (path.includes('blogs.html') && typeof BLOG_DATA !== 'undefined') renderBlogList();
    if (path.includes('post.html') && typeof BLOG_DATA !== 'undefined') renderBlogPost();
    if (path.includes('gallery.html') && typeof GALLERY_DATA !== 'undefined') renderGallery();
    if (path.includes('people.html') && typeof PEOPLE_DATA !== 'undefined') renderPeople();
    if (path.includes('calendar.html') && typeof CALENDAR_DATA !== 'undefined') renderCalendarYearView();
});

// Fix for Dark Mode on Back/Forward navigation
window.addEventListener('pageshow', () => {
    applySavedTheme();
});

/* =========================================
   1. THEME & NAVIGATION
   ========================================= */
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.getElementById("body");
    if (!body) return;
    
    if (savedTheme === 'dark' || savedTheme === null) {
        body.classList.add("dark-mode");
        updateIcons(true);
    } else {
        body.classList.remove("dark-mode");
        updateIcons(false);
    }
}

function updateIcons(isDarkMode) {
    const moons = document.querySelectorAll('.moon-icon');
    const suns = document.querySelectorAll('.sun-icon');
    moons.forEach(m => m.style.display = isDarkMode ? "none" : "block");
    suns.forEach(s => s.style.display = isDarkMode ? "block" : "none");
}

function toggleTheme() {
    const body = document.getElementById("body");
    body.classList.toggle("dark-mode");
    const isDark = body.classList.contains("dark-mode");
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateIcons(isDark);
}

function injectNavigation() {
    const navContainer = document.getElementById('dynamic-nav');
    if (!navContainer) return;

    const isRoot = !window.location.pathname.includes('/routes/');
    const homePath = isRoot ? "./index.html" : "../index.html";

    navContainer.innerHTML = `
        <div class="nav-buttons">
            <button class="icon-btn" onclick="history.back()" aria-label="Go Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <a href="${homePath}" class="icon-btn" aria-label="Home">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </a>
        </div>
        <button id="mode" class="icon-btn" onclick="toggleTheme()" aria-label="Toggle Dark Mode">
            <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
    `;
}

/* =========================================
   2. GALLERY RENDERER (Updated)
   ========================================= */
function renderGallery() {
    const container = document.getElementById('galleryContainer');
    if(!container) return;

    // Elements
    const modal = document.getElementById('imageModal');
    const modalWrapper = document.querySelector('.modal-wrapper'); 
    const isDesktop = window.matchMedia('(hover: hover)').matches;

    // --- SETUP SAFE ZONE (PREVENT CLOSING) ---
    if (isDesktop && modalWrapper) {
        modal.style.pointerEvents = 'none'; // Allow clicking through background
        modalWrapper.style.pointerEvents = 'auto'; // Re-enable pointer on the wrapper

        modalWrapper.addEventListener('mouseenter', () => {
            clearTimeout(closeTimer);
        });

        modalWrapper.addEventListener('mouseleave', () => {
            closeTimer = setTimeout(closeModal, 300);
        });
    }

    // --- GENERATE GRID ---
    GALLERY_DATA.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const imageStack = document.createElement('div');
        imageStack.className = 'image-stack';
        
        item.ids.forEach((id, index) => {
            const img = document.createElement('img');
            // FIX: Using 0${id} for direct link
            img.src = `https://lh3.googleusercontent.com/d/${id}`;
            img.className = `gallery-image ${index === 0 ? 'visible' : ''}`;
            img.loading = "lazy";
            
            // Disable right click on thumbnails
            img.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
            
            imageStack.appendChild(img);
        });

        if (item.ids.length > 1) startCardSlideshow(imageStack, item.ids.length);

        // --- HOVER LOGIC (DESKTOP) ---
        if (isDesktop) {
            imageStack.addEventListener('mouseenter', () => {
                clearTimeout(closeTimer);
                openTimer = setTimeout(() => { openModal(item.ids); }, 400); 
            });
            imageStack.addEventListener('mouseleave', () => {
                clearTimeout(openTimer);
                // 300ms buffer to reach the modal
                closeTimer = setTimeout(closeModal, 300); 
            });
        } else {
            imageStack.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(item.ids);
            });
        }

        const caption = document.createElement('div');
        caption.className = 'gallery-caption';
        caption.innerHTML = `<p>${item.description}</p>`;
        
        card.appendChild(imageStack);
        card.appendChild(caption);
        container.appendChild(card);
    });
}

function startCardSlideshow(stack, count) {
    let i = 0;
    const imgs = stack.querySelectorAll('img');
    setInterval(() => {
        imgs[i].classList.remove('visible');
        i = (i + 1) % count;
        imgs[i].classList.add('visible');
    }, 3000);
}

// --- MODAL CONTROLS ---

function openModal(ids) {
    const modal = document.getElementById('imageModal');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    currentModalImages = ids;
    currentModalIndex = 0;
    updateModalImage();
    
    // Toggle nav buttons
    const showNav = ids.length > 1 ? 'flex' : 'none';
    if(prevBtn) prevBtn.style.display = showNav;
    if(nextBtn) nextBtn.style.display = showNav;

    modal.style.display = 'flex';
    // Force reflow
    void modal.offsetWidth;
    modal.classList.add('active');
}

function updateModalImage() {
    const modalImg = document.getElementById('modalImg');
    if(modalImg) {
        modalImg.src = `https://lh3.googleusercontent.com/d/${currentModalImages[currentModalIndex]}`;
        // Disable right click on modal image
        modalImg.oncontextmenu = (e) => { e.preventDefault(); return false; };
    }
}

function changeSlide(dir, e) {
    if(e) e.stopPropagation();
    currentModalIndex += dir;
    if (currentModalIndex >= currentModalImages.length) currentModalIndex = 0;
    else if (currentModalIndex < 0) currentModalIndex = currentModalImages.length - 1;
    updateModalImage();
}

function closeModal(e) {
    const modal = document.getElementById('imageModal');
    if(!modal) return;
    if (e && e.target !== modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        const modalImg = document.getElementById('modalImg');
        if(modalImg) modalImg.src = '';
    }, 500);
}

/* =========================================
   3. BLOG & PEOPLE RENDERERS
   ========================================= */
function renderBlogList() {
    const grid = document.getElementById('blog-grid');
    if(!grid) return;
    
    grid.innerHTML = BLOG_DATA.map(post => `
        <a href="post.html?id=${post.id}" class="blog-card">
            <span class="card-index">${post.id.padStart(2, '0')}/</span>
            <h2>${post.title}</h2>
            <p>${post.preview}</p>
            <span class="read-link">Read Entry</span>
        </a>
    `).join('');
}

function renderBlogPost() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const post = BLOG_DATA.find(p => p.id === id);
    
    if (!post) {
        document.querySelector('.article-container').innerHTML = "<h1>Post not found</h1>";
        return;
    }

    document.getElementById('post-title').innerText = post.title;
    document.getElementById('post-meta').innerText = `${post.date} • ${post.readTime}`;
    document.getElementById('storyContent').innerHTML = post.content;
    document.title = `${post.title} — Entry ${id}`;

    setupAudio(post.content.replace(/<[^>]*>/g, ''));
}

function renderPeople() {
    const grid = document.getElementById('people-grid');
    if(!grid) return;

    grid.innerHTML = PEOPLE_DATA.map(p => `
        <a href="${p.link}" ${p.link ? 'target="_blank"' : ''} class="people-card" style="${!p.link ? 'pointer-events:none' : ''}">
            <div class="people-image-wrapper">
                <img src="${p.img}" alt="${p.name}">
            </div>
            <div class="people-info">
                <h3 class="people-name">${p.name}</h3>
                <p class="people-position">${p.role}</p>
            </div>
            <div class="people-description-overlay">
                <p class="people-description-text">${p.desc}</p>
            </div>
        </a>
    `).join('');
}

function setupAudio(text) {
    const btn = document.getElementById('listenBtn');
    const btnText = document.getElementById('btnText');
    if(!btn) return;
    
    let speech = new SpeechSynthesisUtterance(text);
    let isPlaying = false;
    speech.rate = 0.9;

    btn.addEventListener('click', () => {
        if (!isPlaying) {
            window.speechSynthesis.speak(speech);
            btnText.innerText = "Pause";
            isPlaying = true;
        } else {
            window.speechSynthesis.cancel();
            btnText.innerText = "Listen";
            isPlaying = false;
        }
    });

    speech.onend = () => { btnText.innerText = "Listen"; isPlaying = false; };
}

/* =========================================
   4. DROPDOWN UTILITIES
   ========================================= */
function myFunctiondrop() { document.getElementById("myDropdown").classList.toggle("show"); }
window.onclick = function(e) {
  if (!e.target.matches('.dropbtn')) {
    const drops = document.getElementsByClassName("dropdown-content");
    for (let d of drops) if (d.classList.contains('show')) d.classList.remove('show');
  }
}

/* =========================================
   5. CALENDAR LOGIC
   ========================================= */

// 1. RENDER YEARS
function renderCalendarYearView() {
    const container = document.getElementById('calendar-container');
    const title = document.getElementById('calendar-title');
    if (!container) return;

    title.innerText = "Year Overview";
    title.onclick = null; // Already at top level
    title.style.color = "var(--text-main)";

    container.className = "calendar-wrapper year-grid";
    container.innerHTML = Object.keys(CALENDAR_DATA).sort((a,b) => b-a).map(year => `
        <div class="time-card" onclick="renderCalendarMonthView(${year})">
            <div>
                <h2>${year}</h2>
                <p>${CALENDAR_DATA[year].summary || "No summary available."}</p>
            </div>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--accent);">View Months →</span>
        </div>
    `).join('');
}

// 2. RENDER MONTHS
function renderCalendarMonthView(year) {
    const container = document.getElementById('calendar-container');
    const title = document.getElementById('calendar-title');
    const yearData = CALENDAR_DATA[year];
    
    // Breadcrumb Navigation
    title.innerHTML = `<span style="opacity:0.5">Years</span> / ${year}`;
    title.onclick = () => renderCalendarYearView();

    container.className = "calendar-wrapper month-grid";
    
    // Generate 12 months
    let html = "";
    MONTH_NAMES.forEach((name, index) => {
        const hasData = yearData.months && yearData.months[index];
        const summary = hasData ? yearData.months[index].summary : "";
        const style = hasData ? "" : "opacity: 0.6;"; // Dim months with no updates

        html += `
            <div class="time-card" style="${style}" onclick="renderCalendarDayView(${year}, ${index})">
                <div>
                    <h3 style="margin:0; font-size: 1.5rem;">${name}</h3>
                    <p>${summary}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}


// 3. RENDER DAYS (Updated)
function renderCalendarDayView(year, month) {
    const container = document.getElementById('calendar-container');
    const title = document.getElementById('calendar-title');
    
    title.innerHTML = `<span style="opacity:0.5; cursor:pointer" onclick="renderCalendarYearView()">Years</span> / <span style="opacity:0.5; cursor:pointer" onclick="renderCalendarMonthView(${year})">${year}</span> / ${MONTH_NAMES[month]}`;
    
    container.className = "calendar-wrapper day-grid";
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    let html = "";
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => html += `<div class="weekday-header">${d}</div>`);
    
    for (let i = 0; i < firstDayIndex; i++) html += `<div></div>`;
    
    const monthData = CALENDAR_DATA[year]?.months?.[month]?.days || {};
    
    for (let day = 1; day <= daysInMonth; day++) {
        const data = monthData[day];
        // Handle both simple String and new Object format
        const updateText = (typeof data === 'object' && data !== null) ? data.text : data;
        
        const hasUpdateClass = updateText ? "day-has-update" : "";
        const preview = updateText ? `<div class="day-preview">${updateText}</div>` : "";
        
        html += `
            <div class="day-cell ${hasUpdateClass}" onclick="openDayModal('${year}', '${month}', '${day}')">
                <div class="day-number">${day}</div>
                ${preview}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// 4. MODAL UTILS (Updated)

/* =========================================
   UPDATED OPEN MODAL FUNCTION
   ========================================= */

function openDayModal(year, month, day) {
    const data = CALENDAR_DATA[year]?.months?.[month]?.days?.[day];
    if (!data) return;
    
    const modal = document.getElementById('dayModal');
    const contentBox = document.getElementById('modalContent');
    document.getElementById('modalDate').innerText = `${MONTH_NAMES[month]} ${day}, ${year}`;
    
    // Normalize data
    const entry = (typeof data === 'string') ? { text: data, learnings: [] } : data;
    
    // 1. DEFINE COLOR PALETTE (Orange, Blue, Green, Purple, Red)
    const COLORS = [
        { border: '#ff9500', bg: 'rgba(255, 149, 0, 0.1)' },
        { border: '#007aff', bg: 'rgba(0, 122, 255, 0.1)' },
        { border: '#34c759', bg: 'rgba(52, 199, 89, 0.1)' },
        { border: '#af52de', bg: 'rgba(175, 82, 222, 0.1)' },
        { border: '#ff2d55', bg: 'rgba(255, 45, 85, 0.1)' }
    ];

    // 2. Render Main Text
    let htmlContent = `<p class="modal-main-text">${entry.text}</p>`;

    // 3. Render Learnings with Cycling Colors
    if (entry.learnings && Array.isArray(entry.learnings)) {
        entry.learnings.forEach((item, index) => {
            // Pick color based on index (0, 1, 2...)
            const colorTheme = COLORS[index % COLORS.length];
            
            // Apply styles dynamically
            htmlContent += `
                <div class="modal-learning-box" style="border-left-color: ${colorTheme.border}; background-color: ${colorTheme.bg};">
                    <span class="modal-label" style="color: ${colorTheme.border}">💡 Learning ${index + 1}</span>
                    <p>${item.text}</p>
            `;

            if (item.mentors && item.mentors.length > 0) {
                htmlContent += `
                    <div class="modal-mentors-box">
                        <span class="modal-label">Credit / Learned from:</span>
                        <div class="mentor-tags">
                `;
                item.mentors.forEach(m => {
                    htmlContent += `
                        <a href="${m.link}" target="_blank" class="mentor-tag">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            ${m.name}
                        </a>`;
                });
                htmlContent += `</div></div>`; 
            }
            htmlContent += `</div>`; 
        });
    }

    contentBox.innerHTML = htmlContent;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}