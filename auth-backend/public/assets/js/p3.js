// Get elements
const images = document.querySelectorAll('.slider-image');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const sliderWrapper = document.querySelector('.slider-wrapper');

let currentIndex = 0;

// Function to update the slide position
function updateSlider() {
  const offset = -currentIndex * 100; // Move the wrapper to the correct image
  sliderWrapper.style.transform = `translateX(${offset}%)`;
}

// Event listeners for the buttons
prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = images.length - 1; // Loop back to the last image
  }
  updateSlider();
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < images.length - 1) {
    currentIndex++;
  } else {
    currentIndex = 0; // Loop back to the first image
  }
  updateSlider();
});
