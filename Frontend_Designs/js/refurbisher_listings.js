// Listings management functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeListings()
  setupFilters()
  setupSearch()
})

function initializeListings() {
  // Load listings data
  loadListings()

  // Setup action buttons
  setupActionButtons()
}

function loadListings() {
  // Simulate loading listings from API
  console.log("Loading product listings...")
  // In real implementation, this would fetch from API
}

function setupFilters() {
  const categoryFilter = document.querySelector("select")
  const statusFilter = document.querySelectorAll("select")[1]

  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
      filterListings()
    })
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      filterListings()
    })
  }
}

function setupSearch() {
  const searchInput = document.querySelector('input[placeholder*="Search"]')

  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        searchListings(this.value)
      }, 300)
    })
  }
}

function filterListings() {
  // Implement filtering logic
  console.log("Filtering listings...")
  // In real implementation, this would filter the listings table
}

function searchListings(query) {
  // Implement search logic
  console.log("Searching listings for:", query)
  // In real implementation, this would search through listings
}

function setupActionButtons() {
  // Edit buttons
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", function () {
      const row = this.closest("tr")
      const productName = row.querySelector(".fw-bold").textContent
      console.log("Edit product:", productName)
      // Redirect to edit page or open modal
    })
  })

  // View buttons
  document.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", function () {
      const row = this.closest("tr")
      const productName = row.querySelector(".fw-bold").textContent
      console.log("View product:", productName)
      // Redirect to product detail page
    })
  })

  // Delete buttons
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", function () {
      const row = this.closest("tr")
      const productName = row.querySelector(".fw-bold").textContent

      if (confirm(`Are you sure you want to delete "${productName}"?`)) {
        console.log("Delete product:", productName)
        // Call delete API
        deleteProduct(productName)
      }
    })
  })
}

function deleteProduct(productName) {
  // Simulate product deletion
  console.log("Deleting product:", productName)
  // In real implementation, this would call delete API

  // Show success message
  showNotification("Product deleted successfully", "success")
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}
