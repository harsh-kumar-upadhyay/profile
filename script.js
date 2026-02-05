/* =========================================
   DATA SOURCE
   ========================================= */

const BLOG_DATA = [
    {
        id: "1",
        title: "The Neon Horizon",
        date: "Dec 24, 2025",
        readTime: "4 min read",
        preview: "A cinematic perspective on light and isolation within a sprawling digital landscape.",
        content: `<p>The rain in Sector 7 didn't fall; it drifted. It was a fine mist that caught the glare of the holographic billboards, turning the air into a shimmering kaleidoscope of pink and electric blue.</p>
                  <p>Elias adjusted his collar. The dampness was beginning to seep through his synthetic leather jacket. He wasn’t supposed to be this far below the cloud line, but the tip he’d received was too good to ignore.</p>
                  <p>The city groaned above him, a heavy percussion of mag-lev trains and distant industrial sirens. Here, in the gutters of the skyline, time felt different—slower, heavier, and far more dangerous.</p>`
    },
    {
        id: "2",
        title: "Whispers of Oak",
        date: "Jan 02, 2026",
        readTime: "3 min read",
        preview: "Decoding the acoustic secrets hidden within ancient timber and forgotten groves.",
        content: `<p>The old oak stood like a sentinel against the grey sky...</p>`
    },
    {
        id: "3",
        title: "The Last Echo",
        date: "Jan 10, 2026",
        readTime: "5 min read",
        preview: "A final transcription exploring the transition from sound to absolute silence.",
        content: `<p>Silence wasn't just the absence of noise; it was a weight...</p>`
    },
    {
        id: "4",
        title: "The Last Echo (Part 2)",
        date: "Jan 15, 2026",
        readTime: "4 min read",
        preview: "A final transcription exploring the transition from sound to absolute silence.",
        content: `<p>Continuing the journey into the void...</p>`
    }
];

const GALLERY_DATA = [
    { 
        // A single gallery item now has MULTIPLE images
        ids: [
            "1TaoXVddE91IcHJsmM95BBvr7TNOaNA9z", // Image 1 of this event
            "1LrnvcnFidVcBoPIwYMqGBPSZ5_voE3TO",
            "1i0L27j1qYUUSS9buxgpMp8SvByg-M5Si",
            "1-AFUdiLNzhJWcIESAYaq9gATCEcQ-2s1",
            "1Fi6Wqt3daQ-qeGTVpkTAzZoQskdH55Wh",
            "14wJEqcoBTXh_T83NCe6v-YTLg6P39m3j",
            "14wJEqcoBTXh_T83NCe6v-YTLg6P39m3j",
            "1katdTOV9PBGFSeT_6hR6O0ShJDMMyDmJ"
        ], 
        description: "A day with IITH Director."
    },
    { 
        ids: [
            "1W17eEk0uZA36RgJ6Gc-AAddNgmn6uGAS",
            "1wq0JSOlEma6cVCFHSXXHJv1ESPjsoFyM",
            "1oUYJeVoYhtMn_M69fuK11pTIKRwTMOey",
        ], 
        description: "CTO with TRDDC (TCS Research) team."
    },
    { 
        ids: [
            "1_VoevVg_Go4VyV_xGxQA0muZ3CSUoDFm",
            "1wfs5Y9l5RVVw2W4QMnz7WXFBpAeqCdzE",
            "1rUZlvC4WA6wPdQNyGOzNq1EAcfATdPbq",
            "1793G3ZqXiguboLlqNA4YxSnooLEUFO2t"
        ], 
        description: "Jadavpur University Convocation."
    },
    { 
        ids: [
            "1W-y9uqaWDZdkDEdd5mP_KpahifTxsyPW",
            "1Ut7Gz1zJwa-_mPCaoQ890NweruG78_aU",
            "16M5ZwvDdnCy79lGvxsLH5JmST9q_zlFR",
            "1c57Qg4gKyLEu6F42Nnd1gmq3kCQUfPZw"
        ], 
        description: "Awards and Degrees at IIT M." 
    },
];

const PEOPLE_DATA = [
    {
        name: "(Prof.) Saketha Nath Jagarlapuddi",
        role: "PhD Guide",
        img: "https://people.iith.ac.in/saketha/index_files/saketh2015.jpg",
        link: "https://people.iith.ac.in/saketha/",
        desc: "Taught me to think from the first principles. Guiding research in Machine Learning. A mentor beyond academics."
    },
    {
        name: "(Shri.) Sunil and (Smt.) Sudha Upadhyay",
        role: "Parents",
        img: "../assets/parents.png",
        link: "",
        desc: "The pillars of support and inspiration throughout the journey."
    }
];

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
    const path = window.location.pathname;
    if (path.includes('blogs.html')) renderBlogList();
    if (path.includes('post.html')) renderBlogPost();
    if (path.includes('gallery.html')) renderGallery();
    if (path.includes('people.html')) renderPeople();
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