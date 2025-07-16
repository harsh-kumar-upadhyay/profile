function myFunction() {
   var element = document.getElementById("body");
   element.classList.toggle("dark-mode");
   var elem = document.getElementById("mode");
   if (elem.innerHTML=="Dark Mode") elem.innerHTML = "Light Mode";
   else elem.innerHTML = "Dark Mode";
}

document.getElementById("education").onclick = function() {
    location.href = "routes/education.html";
};
document.getElementById("experience").onclick = function() {
    location.href = "routes/experience.html";
};
