function myFunction() {
   var element = document.getElementById("bodyElm");
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
document.getElementById("people").onclick = function() {
    location.href = "routes/people.html";
};

var video = document.getElementById("myVideo");
var btn = document.getElementById("myBtn");
function PFunction() {
  if (video.paused) {
    video.play();
    btn.innerHTML = "Pause";
  } else {
    video.pause();
    btn.innerHTML = "Play";
  }
}