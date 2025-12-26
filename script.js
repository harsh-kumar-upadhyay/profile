function myFunction() {
   var element = document.getElementById("body");
   element.classList.toggle("dark-mode");
   
   // Toggle Icons
   var moon = document.querySelector('.moon-icon');
   var sun = document.querySelector('.sun-icon');
   
   // Check if elements exist to prevent errors on pages without the button
   if (moon && sun) {
       if (element.classList.contains("dark-mode")) {
           moon.style.display = "none";
           sun.style.display = "block";
       } else {
           moon.style.display = "block";
           sun.style.display = "none";
       }
   }
}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
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
