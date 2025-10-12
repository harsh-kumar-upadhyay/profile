function myFunction() {
   var element = document.getElementById("body");
   element.classList.toggle("dark-mode");
   var elem = document.getElementById("mode");
   if (elem.innerHTML=="Dark Mode") elem.innerHTML = "Light Mode";
   else elem.innerHTML = "Dark Mode";
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
