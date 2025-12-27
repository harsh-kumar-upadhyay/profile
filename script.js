// 1. On Page Load: Check local storage and apply theme
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const element = document.getElementById("body");

    if (savedTheme === 'dark') {
        element.classList.add("dark-mode");
        updateIcons(true); // Helper function to set correct icon
    } else {
        updateIcons(false);
    }
});

// 2. Helper function to manage Icon visibility (prevents code duplication)
function updateIcons(isDarkMode) {
    var moon = document.querySelector('.moon-icon');
    var sun = document.querySelector('.sun-icon');

    // Check if elements exist (to prevent errors on pages without the button)
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

// 3. Main Toggle Function (connected to your button)
function myFunction() {
   var element = document.getElementById("body");
   element.classList.toggle("dark-mode");
   
   // Determine if dark mode is now active
   const isDarkMode = element.classList.contains("dark-mode");

   // Save the preference to the browser
   localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
   
   // Update the icons
   updateIcons(isDarkMode);
}

/* =========================================
   DROPDOWN LOGIC (Kept exactly as before)
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