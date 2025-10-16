// Dashboard functionality
document.addEventListener("DOMContentLoaded", () => {
  // Initialize dashboard
  initializeDashboard()

  // Update stats periodically
  setInterval(updateStats, 30000) // Update every 30 seconds
})

function initializeDashboard() {
  // Load recent orders
  loadRecentOrders()

  // Load top products
  loadTopProducts()

  // Check pending actions
  checkPendingActions()
}

function loadRecentOrders() {
  // Simulate loading recent orders
  console.log("Loading recent orders...")
  // In real implementation, this would fetch from API
}

function loadTopProducts() {
  // Simulate loading top products
  console.log("Loading top products...")
  // In real implementation, this would fetch from API
}

function checkPendingActions() {
  // Check for pending profile completion
  const pendingItems = document.querySelectorAll(".pending-card")
  let pendingCount = 0

  pendingItems.forEach((item) => {
    if (!item.classList.contains("completed")) {
      pendingCount++
    }
  })

  // Update pending badge
  const pendingBadge = document.querySelector(".card-header .badge")
  if (pendingBadge) {
    pendingBadge.textContent = `${pendingCount} Items`
  }
}

function updateStats() {
  // Simulate real-time stats update
  console.log("Updating dashboard stats...")
  // In real implementation, this would fetch latest stats from API
}

// Handle pending action clicks
document.addEventListener("click", (e) => {
  if (e.target.closest(".btn-outline-primary")) {
    const button = e.target.closest(".btn-outline-primary")
    const href = button.getAttribute("href")

    if (href && href.includes("profile")) {
      // Track profile completion clicks
      console.log("User clicked to complete profile")
    }
  }
})

// Notification handling
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  document.body.appendChild(notification)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}
