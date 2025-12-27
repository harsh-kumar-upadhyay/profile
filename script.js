/* =========================================
   DARK MODE LOGIC WITH BACK/FORWARD FIX
   ========================================= */

// 1. Define the logic to apply the theme in one reusable function
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const element = document.getElementById("body");
    
    // Safety check: ensure the body element exists
    if (!element) return;

    if (savedTheme === 'dark') {
        element.classList.add("dark-mode");
        updateIcons(true);
    } else {
        // Important: Remove the class if the setting is 'light', 
        // in case the cached page was previously dark.
        element.classList.remove("dark-mode");
        updateIcons(false);
    }
}

// 2. Run on initial page load
document.addEventListener('DOMContentLoaded', applySavedTheme);

// 3. THE FIX: Run whenever the page is shown (including Back/Forward navigation)
window.addEventListener('pageshow', (event) => {
    // This event fires even if the page is loaded from the bfcache
    applySavedTheme();
});

// 4. Helper function to toggle icons (Moon/Sun)
function updateIcons(isDarkMode) {
    var moon = document.querySelector('.moon-icon');
    var sun = document.querySelector('.sun-icon');
    
    // Only run if icons exist on the current page
    if (moon && sun) {
        if (isDarkMode) {
            moon.style.display = "none";
            sun.style.display = "block";
        } else {
            moon.style.display = "block";
            sun.style.display = "none";
        }
    }
}

// 5. Main Toggle Function (connected to your HTML button)
function myFunction() {
   var element = document.getElementById("body");
   element.classList.toggle("dark-mode");
   
   // Check if dark mode is currently active
   const isDarkMode = element.classList.contains("dark-mode");
   
   // Save the preference to browser storage
   localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
   
   // Update the icons
   updateIcons(isDarkMode);
}

/* =========================================
   DROPDOWN LOGIC
   ========================================= */

function myFunctiondrop() {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}