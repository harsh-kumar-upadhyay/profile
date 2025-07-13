function myFunction() {
   var element = document.body;
   element.classList.toggle("dark-mode");
}

document.getElementById("education").onclick = function() {
    location.href = "./education.html";
};
document.getElementById("experience").onclick = function() {
    location.href = "./experience.html";
};

var video = document.getElementById("myVideo");
var btn = document.getElementById("myBtn");
function myFunction() {
  if (video.paused) {
    video.play();
    btn.innerHTML = "Pause";
  } else {
    video.pause();
    btn.innerHTML = "Play";
  }
}