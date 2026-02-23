window.onload = function() {
    if (!localStorage.getItem('force_reloaded')) {
        localStorage.setItem('force_reloaded', 'true');
        location.reload(true); // 'true' forces a reload from the server, ignoring cache
    }
}

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
    if (path.includes('calendar.html')) initCalendar();
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
    
    // Now it ONLY turns dark if explicitly saved as 'dark'
    if (savedTheme === 'dark') {
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
            closeTimer = setTimeout(closeModal, 1000);
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
   GOOGLE SHEET INTEGRATION & CALENDAR
   ========================================= */

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/12j44Lp8e53Zkz62_bapJmo82g9imT7BulegRduIBsgw/edit?gid=0#gid=0';
const CACHE_KEY = 'calendar_data_cache';
let FETCHED_CALENDAR_DATA = {}; 
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// 1. INITIALIZE (Called on page load)
async function initCalendar() {
    const container = document.getElementById('calendar-container');
    
    // Check for cached data first to load INSTANTLY
    const cachedCSV = localStorage.getItem(CACHE_KEY);
    
    if (cachedCSV) {
        FETCHED_CALENDAR_DATA = parseCSVToCalendarData(cachedCSV);
        renderCalendarYearView();
    } else {
        // RENDER SKELETON LOADER instead of text
        if(container) {
            container.className = "calendar-wrapper year-grid";
            container.innerHTML = Array(6).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-text skeleton-title"></div>
                    <div class="skeleton-text skeleton-line"></div>
                    <div class="skeleton-text skeleton-line-short"></div>
                </div>
            `).join('');
        }
    }
    
    // Fetch fresh data in the background
    await fetchAndCacheData(cachedCSV);
}

// 2. FETCH & CACHE (Background Process)
async function fetchAndCacheData(oldData) {
    try {
        // Fetch fresh data (using timestamp to avoid browser caching the request)
        const response = await fetch(SHEET_URL + '&t=' + Date.now());
        const newCSV = await response.text();
        
        // Compare: Only re-render if data has actually changed
        if (newCSV !== oldData) {
            console.log("New updates found, refreshing calendar...");
            localStorage.setItem(CACHE_KEY, newCSV);
            FETCHED_CALENDAR_DATA = parseCSVToCalendarData(newCSV);
            renderCalendarYearView();
        } else {
            console.log("Data is up to date.");
        }
    } catch (error) {
        console.error("Background fetch failed:", error);
    }
}

// 3. PARSER (Converts CSV text to Object)
function parseCSVToCalendarData(csvText) {
    const rows = csvText.split(/\r?\n/); 
    const calendarData = {};
    const monthMap = { "January":0, "February":1, "March":2, "April":3, "May":4, "June":5, "July":6, "August":7, "September":8, "October":9, "November":10, "December":11 };

    for (let i = 1; i < rows.length; i++) {
        const rowText = rows[i];
        if (!rowText.trim()) continue; 

        const cols = [];
        let inQuote = false;
        let currentVal = '';
        
        for (let j = 0; j < rowText.length; j++) {
            const char = rowText[j];
            if (char === '"') { inQuote = !inQuote; }
            else if (char === ',' && !inQuote) { cols.push(currentVal.trim()); currentVal = ''; }
            else { currentVal += char; }
        }
        cols.push(currentVal.trim());

        if (cols.length < 4) continue; 

        const year = cols[0];
        const monthStr = cols[1];
        const day = cols[2];
        const updateText = cols[3].replace(/^"|"$/g, ''); 
        const learningText = cols[4] ? cols[4].replace(/^"|"$/g, '') : "";
        const mentorName = cols[5] ? cols[5].replace(/^"|"$/g, '') : "";
        const mentorLink = cols[6] ? cols[6].replace(/^"|"$/g, '') : "";

        const month = monthMap[monthStr];
        if (month === undefined) continue;

        // Build Structure
        if (!calendarData[year]) calendarData[year] = { months: {} };
        if (!calendarData[year].months[month]) calendarData[year].months[month] = { days: {} };
        
        let dayEntry = calendarData[year].months[month].days[day];
        if (!dayEntry) {
            dayEntry = { text: updateText, learnings: [] };
            calendarData[year].months[month].days[day] = dayEntry;
        }

        // Add Learning
        let learning = dayEntry.learnings.find(l => l.text === learningText);
        if (!learning && learningText && learningText.toLowerCase() !== "nothing") {
            learning = { text: learningText, mentors: [] };
            dayEntry.learnings.push(learning);
        }

        // Add Mentor
        if (mentorName && mentorName.toLowerCase() !== "no one" && learning) {
            learning.mentors.push({ name: mentorName, link: mentorLink || '#' });
        }
    }
    return calendarData;
}

// 4. RENDERERS (Display the Data)

function renderCalendarYearView() {
    const container = document.getElementById('calendar-container');
    const title = document.getElementById('calendar-title');
    if (!container) return;

    const years = Object.keys(FETCHED_CALENDAR_DATA).sort((a,b) => b-a);
    title.innerText = "Year Overview";
    title.onclick = null;
    title.style.cursor = "default";
    
    if (years.length === 0) {
        container.innerHTML = "<div style='text-align:center; padding:20px;'>No updates found in the Google Sheet yet.<br><small>Make sure you published to CSV!</small></div>";
        return;
    }

    container.className = "calendar-wrapper year-grid";
    container.innerHTML = years.map(year => `
        <div class="time-card" onclick="renderCalendarMonthView(${year})">
            <div><h2>${year}</h2><p>Click to view progress</p></div>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--accent);">View Months →</span>
        </div>
    `).join('');
}

function renderCalendarMonthView(year) {
    const container = document.getElementById('calendar-container');
    const title = document.getElementById('calendar-title');
    const yearData = FETCHED_CALENDAR_DATA[year];
    
    title.innerHTML = `<span style="opacity:0.5; cursor:pointer" onclick="renderCalendarYearView()">Years</span> / ${year}`;
    container.className = "calendar-wrapper month-grid";
    
    let html = "";
    MONTH_NAMES.forEach((name, index) => {
        const hasData = yearData.months && yearData.months[index];
        const style = hasData ? "" : "opacity: 0.4; pointer-events: none;"; 
        html += `
            <div class="time-card" style="${style}" onclick="renderCalendarDayView(${year}, ${index})">
                <div><h3 style="margin:0; font-size: 1.5rem;">${name}</h3>${hasData ? '<span style="color:var(--accent); font-size:0.8rem">Has Updates</span>' : ''}</div>
            </div>`;
    });
    container.innerHTML = html;
}

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
    
    const monthData = FETCHED_CALENDAR_DATA[year]?.months?.[month]?.days || {};
    
    for (let day = 1; day <= daysInMonth; day++) {
        const data = monthData[day];
        const hasUpdateClass = data ? "day-has-update" : "";
        const preview = data ? `<div class="day-preview">${data.text}</div>` : "";
        html += `<div class="day-cell ${hasUpdateClass}" onclick="openDayModal('${year}', '${month}', '${day}')"><div class="day-number">${day}</div>${preview}</div>`;
    }
    container.innerHTML = html;
}

/* =========================================
   WIDESCREEN MODAL LOGIC (With Link Auto-Fix)
   ========================================= */

function openDayModal(year, month, day) {
    const data = FETCHED_CALENDAR_DATA[year]?.months?.[month]?.days?.[day];
    if (!data) return;
    
    const modal = document.getElementById('dayModal');
    const contentBox = document.getElementById('modalContent');
    const dateTitle = document.getElementById('modalDate');
    
    // Weekday Logic
    const dateObj = new Date(year, month, day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // HEADER HTML
    dateTitle.innerHTML = `
        <div class="modal-date-group">
            <span class="modal-year">${year}</span>
            <span class="modal-date-row">${MONTH_NAMES[month]} ${day}</span>
            <span class="modal-weekday">${dayName}</span>
        </div>
    `;
    
    // Close Button Logic
    if (!document.querySelector('.close-modal-btn')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-modal-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = (e) => window.closeDayModal(e);
        document.querySelector('.modal-wrapper').appendChild(closeBtn);
    }
    
    const COLORS = [
        { border: '#ff9500', bg: 'rgba(255, 149, 0, 0.08)' },
        { border: '#007aff', bg: 'rgba(0, 122, 255, 0.08)' },
        { border: '#32d74b', bg: 'rgba(50, 215, 75, 0.08)' },
        { border: '#bf5af2', bg: 'rgba(191, 90, 242, 0.08)' },
        { border: '#ff375f', bg: 'rgba(255, 55, 95, 0.08)' }
    ];

    let htmlContent = `<div class="modal-main-text">${data.text}</div>`;

    if (data.learnings && Array.isArray(data.learnings)) {
        data.learnings.forEach((item, index) => {
            const theme = COLORS[index % COLORS.length];
            
            htmlContent += `
                <div class="modal-learning-box" style="border-left-color: ${theme.border}; background-color: ${theme.bg};">
                    <div class="modal-label" style="color: ${theme.border}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>
                        KEY INSIGHT
                    </div>
                    <p>${item.text}</p>
            `;

            if (item.mentors && item.mentors.length > 0) {
                htmlContent += `
                    <div class="modal-mentors-box">
                        <span class="modal-label" style="margin-bottom:5px; color:var(--text-muted); opacity:0.7">Learned from</span>
                        <div class="mentor-tags">
                `;
                item.mentors.forEach(m => {
                    // --- THE FIX IS HERE ---
                    // Check if link starts with http:// or https://. If not, add https://
                    let cleanLink = m.link.trim();
                    if (cleanLink && !cleanLink.match(/^https?:\/\//)) {
                        cleanLink = 'https://' + cleanLink;
                    }

                    htmlContent += `
                        <a href="${cleanLink}" target="_blank" class="mentor-tag">
                            <img src="https://www.google.com/s2/favicons?domain=${cleanLink}" width="14" height="14" style="opacity:0.7; border-radius:2px;">
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

// Close Modal Logic (Ensure this is available globally or attached to window)
// Updated Close Logic to allow Background OR Button clicks
window.closeDayModal = function(e) {
    const modal = document.getElementById('dayModal');
    
    // logic: If we clicked inside the content box (and NOT on the X button), ignore the click
    if (e && e.target !== modal && !e.target.closest('.close-modal-btn')) {
        return;
    }

    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

/* =========================================
   RESPONSIVE NAVIGATION LOGIC (Aggressive)
   ========================================= */

/* =========================================
   RESPONSIVE NAVIGATION LOGIC (Fixed)
   ========================================= */

function initResponsiveNav() {
    const header = document.querySelector('.home-header');
    const menuContainer = document.getElementById('nav-overflow-menu');
    const menuContent = document.getElementById('nav-overflow-content');
    
    if (!header || !menuContainer || !menuContent) return;

    function checkOverflow() {
        // 1. RESET: Move everything back to the main header
        const hiddenItems = Array.from(menuContent.children);
        // Reverse to keep original order when putting back
        hiddenItems.reverse().forEach(item => {
            // We insert them before the menuContainer to maintain order
            header.insertBefore(item, menuContainer);
        });
        
        // Hide menu initially
        menuContainer.style.display = 'none';
        
        // 2. MEASURE
        const darkModeBtn = document.getElementById('mode');
        if(!darkModeBtn) return;

        // --- FIX IS HERE: Select ONLY direct children using .children property ---
        const getDirectNavLinks = () => {
            return Array.from(header.children).filter(child => 
                child.tagName === 'A' && child.classList.contains('button')
            );
        };

        let links = getDirectNavLinks();
        if (links.length === 0) return;

        // Establish the "Top Row" Y-position from the first link
        const firstItemTop = links[0].offsetTop;

        // 3. LOOP
        // While Dark Mode button is on a new line (lower Y position)...
        while (darkModeBtn.offsetTop > firstItemTop + 10) { 
            // Show the menu button
            menuContainer.style.display = 'inline-block';

            // Re-check available links
            links = getDirectNavLinks();
            
            // Stop if no links left to move
            if (links.length === 0) break;

            // Move the LAST link into the dropdown (prepend to top of menu)
            const itemToHide = links[links.length - 1];
            menuContent.insertBefore(itemToHide, menuContent.firstChild);
        }
    }

    // Run on load and resize
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(checkOverflow, 100);
    });
    
    // Initial checks
    checkOverflow();
    setTimeout(checkOverflow, 300);
}

function toggleOverflowMenu() {
    document.getElementById("nav-overflow-content").classList.toggle("show");
}

// Close menu when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', initResponsiveNav);