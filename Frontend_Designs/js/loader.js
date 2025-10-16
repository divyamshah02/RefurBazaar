// Loader functionality for RefurbTech
document.addEventListener("DOMContentLoaded", () => {
  const spinner = document.getElementById("spinner")
  const loadingText = document.querySelector(".loading-text")

  // Loading messages array
  const loadingMessages = [
    "Loading RefurbTech...",
    "Finding best deals...",
    "Preparing marketplace...",
    "Almost ready...",
  ]

  let messageIndex = 0

  // Change loading text periodically
  const textInterval = setInterval(() => {
    if (loadingText && messageIndex < loadingMessages.length - 1) {
      messageIndex++
      loadingText.textContent = loadingMessages[messageIndex]
    }
  }, 500)

  // Hide loader after content is loaded
  const hideLoader = () => {
    clearInterval(textInterval)
    if (spinner) {
      spinner.classList.add("hidden")

      // Remove loader from DOM after animation completes
      setTimeout(() => {
        if (spinner && spinner.parentNode) {
          spinner.parentNode.removeChild(spinner)
        }
      }, 500)
    }
  }

  // Wait for all images and resources to load
  window.addEventListener("load", () => {
    // Add minimum loading time for better UX
    setTimeout(hideLoader, 1500)
  })

  // Fallback: Hide loader after maximum time
  setTimeout(hideLoader, 5000)
})

// Show loader for page transitions (optional)
function showLoader() {
  const existingSpinner = document.getElementById("spinner")
  if (!existingSpinner) {
    const spinner = document.createElement("div")
    spinner.id = "spinner"
    spinner.className = "spinner-container"
    spinner.innerHTML = `
            <div class="spinner">
                <img src="/static/images/refurbtech-logo.png" alt="RefurbTech Logo" class="spinner-logo" onerror="this.style.display='none'" />
            </div>
            <div class="loading-text">Loading RefurbTech...</div>
        `
    document.body.appendChild(spinner)
  }
}

// Hide loader function (can be called manually)
function hideLoader() {
  const spinner = document.getElementById("spinner")
  if (spinner) {
    spinner.classList.add("hidden")
    setTimeout(() => {
      if (spinner && spinner.parentNode) {
        spinner.parentNode.removeChild(spinner)
      }
    }, 500)
  }
}

// Export functions for use in other scripts
window.showLoader = showLoader
window.hideLoader = hideLoader
