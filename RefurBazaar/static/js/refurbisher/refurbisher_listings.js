// Global variables
let API_URLS = {}
let CSRF_TOKEN = ""
let allListings = []
let filteredListings = []
let currentPage = 1
const itemsPerPage = 10

/**
 * Initialize the listings page
 * @param {Object} apiUrls - Object containing API endpoint URLs
 * @param {string} csrfToken - CSRF token for API requests
 */
function initListings(apiUrls, csrfToken) {
  API_URLS = apiUrls
  CSRF_TOKEN = csrfToken

  // Load initial data
  loadUserInfo()
  loadCategories()
  loadListings()

  // Setup event listeners
  setupEventListeners()
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Filter listeners
  document.getElementById("category-filter").addEventListener("change", applyFilters)
  document.getElementById("status-filter").addEventListener("change", applyFilters)

  // Search listener with debounce
  let searchTimeout
  document.getElementById("search-input").addEventListener("input", () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      applyFilters()
    }, 300)
  })

  document.getElementById("search-btn").addEventListener("click", applyFilters)

  // Refresh button
  document.getElementById("refresh-btn").addEventListener("click", () => {
    loadListings()
  })
}

/**
 * Load user information
 */
async function loadUserInfo() {
  try {
    const [success, response] = await callApi("GET", API_URLS.userDetail)
    if (response.success && response.data) {
      const userName =
        response.data.first_name && response.data.last_name
          ? `${response.data.first_name} ${response.data.last_name}`
          : response.data.name || "User"

      document.getElementById("user-name").textContent = userName
      document.getElementById("sidebar-user-name").textContent = userName
    }
  } catch (error) {
    console.error("[v0] Error loading user info:", error)
  }
}

/**
 * Load categories for filter dropdown
 */
async function loadCategories() {
  try {
    const [success, response] = await callApi("GET", API_URLS.categories)
    if (response.success && response.data) {
      const categoryFilter = document.getElementById("category-filter")
      response.data.forEach((category) => {
        const option = document.createElement("option")
        option.value = category.value
        option.textContent = category.label
        categoryFilter.appendChild(option)
      })
    }
  } catch (error) {
    console.error("[v0] Error loading categories:", error)
  }
}

/**
 * Load all listings from API
 */
async function loadListings() {
  try {
    showLoadingState()

    const [success, response] = await callApi("GET", API_URLS.listings)

    if (response.success && response.data) {
      allListings = response.data
      filteredListings = [...allListings]

      updateStats()
      renderListings()
    } else {
      showError("Failed to load listings")
    }
  } catch (error) {
    console.error("[v0] Error loading listings:", error)
    showError("Error loading listings. Please try again.")
  }
}

/**
 * Update statistics cards
 */
function updateStats() {
  const total = allListings.length
  const active = allListings.filter((l) => l.status === "active").length
  const inactive = allListings.filter((l) => l.status === "inactive").length
  const draft = allListings.filter((l) => l.status === "draft").length

  const statsContainer = document.getElementById("stats-container")
  statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon primary">
                <i class="fas fa-list"></i>
            </div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total Listings</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon success">
                <i class="fas fa-eye"></i>
            </div>
            <div class="stat-value">${active}</div>
            <div class="stat-label">Active Listings</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warning">
                <i class="fas fa-pause"></i>
            </div>
            <div class="stat-value">${inactive}</div>
            <div class="stat-label">Inactive Listings</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon danger">
                <i class="fas fa-clock"></i>
            </div>
            <div class="stat-value">${draft}</div>
            <div class="stat-label">Draft Listings</div>
        </div>
    `
}

/**
 * Apply filters and search
 */
function applyFilters() {
  const categoryFilter = document.getElementById("category-filter").value
  const statusFilter = document.getElementById("status-filter").value
  const searchQuery = document.getElementById("search-input").value.toLowerCase()

  filteredListings = allListings.filter((listing) => {
    // Category filter
    if (categoryFilter && listing.category !== categoryFilter) {
      return false
    }

    // Status filter
    if (statusFilter && listing.status !== statusFilter) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const searchText = `${listing.model_name} ${listing.brand_name}`.toLowerCase()
      if (!searchText.includes(searchQuery)) {
        return false
      }
    }

    return true
  })

  currentPage = 1
  renderListings()
}

/**
 * Render listings table
 */
function renderListings() {
  const tbody = document.getElementById("listings-table-body")
  const emptyState = document.getElementById("empty-state")

  if (filteredListings.length === 0) {
    tbody.innerHTML = ""
    emptyState.style.display = "block"
    document.getElementById("pagination-container").style.display = "none"
    return
  }

  emptyState.style.display = "none"

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedListings = filteredListings.slice(startIndex, endIndex)

  // Render table rows
  tbody.innerHTML = paginatedListings
    .map((listing) => {
      const availableUnits = listing.units.filter((u) => u.is_available && !u.is_sold).length

      return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="product-img-placeholder me-3">
                            <i class="fas fa-mobile-alt"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${listing.model_name}</div>
                            <small class="text-muted">${listing.brand_name} - ${listing.condition}</small>
                        </div>
                    </div>
                </td>
                <td>${listing.category_display || getCategoryLabel(listing.category)}</td>
                <td><strong>₹${Number.parseFloat(listing.price_per_unit).toLocaleString("en-IN")}</strong></td>
                <td>${availableUnits} / ${listing.total_quantity} units</td>
                <td>${getStatusBadge(listing.status)}</td>
                <td>${formatDate(listing.created_at)}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewListing(${listing.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editListing(${listing.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteListing(${listing.id}, '${listing.model_name}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
    })
    .join("")

  // Render pagination
  renderPagination()
}

/**
 * Render pagination controls
 */
function renderPagination() {
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage)

  if (totalPages <= 1) {
    document.getElementById("pagination-container").style.display = "none"
    return
  }

  document.getElementById("pagination-container").style.display = "block"

  const pagination = document.getElementById("pagination")
  let paginationHTML = ""

  // Previous button
  paginationHTML += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
        </li>
    `

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      paginationHTML += `
                <li class="page-item ${i === currentPage ? "active" : ""}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`
    }
  }

  // Next button
  paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
        </li>
    `

  pagination.innerHTML = paginationHTML
}

/**
 * Change page
 */
function changePage(page) {
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage)
  if (page < 1 || page > totalPages) return

  currentPage = page
  renderListings()
  window.scrollTo({ top: 0, behavior: "smooth" })
}

/**
 * View listing details
 */
function viewListing(listingId) {
  window.location.href = `/refurbisher-detail-listing?id=${listingId}`
}

/**
 * Edit listing
 */
function editListing(listingId) {
  window.location.href = `/refurbisher-detail-listing?id=${listingId}`
}

/**
 * Delete listing
 */
async function deleteListing(listingId, productName) {
  if (!confirm(`Are you sure you want to delete "${productName}"? This will also delete all associated units.`)) {
    return
  }

  try {
    const [success, response] = await callApi("DELETE", `${API_URLS.listings}${listingId}/`)

    if (response.success) {
      showSuccess("Listing deleted successfully")
      loadListings() // Reload listings
    } else {
      showError("Failed to delete listing")
    }
  } catch (error) {
    console.error("[v0] Error deleting listing:", error)
    showError("Error deleting listing. Please try again.")
  }
}

/**
 * Get category label from value
 */
function getCategoryLabel(value) {
  const labels = {
    mobile: "Mobile",
    tablet: "Tablet",
    laptop: "Laptop",
  }
  return labels[value] || value
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    active: '<span class="status-badge status-active">Active</span>',
    inactive: '<span class="status-badge status-inactive">Inactive</span>',
    draft: '<span class="status-badge status-pending">Draft</span>',
    sold: '<span class="status-badge status-inactive">Sold</span>',
  }
  return badges[status] || status
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  const options = { year: "numeric", month: "short", day: "numeric" }
  return date.toLocaleDateString("en-US", options)
}

/**
 * Show loading state
 */
function showLoadingState() {
  const tbody = document.getElementById("listings-table-body")
  tbody.innerHTML = `
        <tr class="skeleton-loader">
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
        </tr>
    `.repeat(3)
}

/**
 * Show success notification
 */
function showSuccess(message) {
  showNotification(message, "success")
}

/**
 * Show error notification
 */
function showError(message) {
  showNotification(message, "danger")
}

/**
 * Show notification
 */
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

/**
 * Call API helper function
 * @param {string} method - HTTP method
 * @param {string} url - API endpoint URL
 * @param {Object} data - Data to send in request body (optional)
 */
