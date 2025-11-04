// Shop Page State
let shop_api_url = null
let csrf_token = null
let currentCategory = "mobile"
let selectedBrands = []
let selectedConditions = []
let minPrice = null
let maxPrice = null
let sortBy = "featured"
let allProducts = []
let allBrands = []
let conditionCounts = {}

// Initialize Shop Page
async function initShop(api_url, csrf) {
  shop_api_url = api_url
  csrf_token = csrf

  setupCategoryFilter()
  setupBrandFilters()
  setupPriceFilters()
  setupConditionFilters()
  setupSortFilter()

  // Load initial data
  await loadShopData()
}

// Setup Category Filter
function setupCategoryFilter() {
  const categorySelect = document.getElementById("categorySelect")

  categorySelect.addEventListener("change", async (e) => {
    currentCategory = e.target.value
    updateCategoryTitle()
    await loadShopData()
  })
}

// Setup Brand Filters
function setupBrandFilters() {
  // Event delegation for dynamically created checkboxes
  document.getElementById("brandFilters").addEventListener("change", async (e) => {
    if (e.target.classList.contains("brand-filter")) {
      const brandId = Number.parseInt(e.target.value)

      if (e.target.checked) {
        if (!selectedBrands.includes(brandId)) {
          selectedBrands.push(brandId)
        }
      } else {
        selectedBrands = selectedBrands.filter((id) => id !== brandId)
      }

      await loadShopData()
    }
  })
}

// Setup Price Filters
function setupPriceFilters() {
  const minPriceInput = document.getElementById("minPrice")
  const maxPriceInput = document.getElementById("maxPrice")

  let priceTimeout

  const handlePriceChange = () => {
    clearTimeout(priceTimeout)
    priceTimeout = setTimeout(async () => {
      minPrice = minPriceInput.value ? Number.parseFloat(minPriceInput.value) : null
      maxPrice = maxPriceInput.value ? Number.parseFloat(maxPriceInput.value) : null
      await loadShopData()
    }, 500)
  }

  minPriceInput.addEventListener("input", handlePriceChange)
  maxPriceInput.addEventListener("input", handlePriceChange)
}

// Setup Condition Filters
function setupConditionFilters() {
  const conditionCheckboxes = document.querySelectorAll(".condition-filter")

  conditionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", async (e) => {
      const condition = e.target.value

      if (e.target.checked) {
        if (!selectedConditions.includes(condition)) {
          selectedConditions.push(condition)
        }
      } else {
        selectedConditions = selectedConditions.filter((c) => c !== condition)
      }

      await loadShopData()
    })
  })
}

// Setup Sort Filter
function setupSortFilter() {
  const sortSelect = document.getElementById("sortBy")

  sortSelect.addEventListener("change", async (e) => {
    sortBy = e.target.value
    await loadShopData()
  })
}

// Load Shop Data from API
async function loadShopData() {
  showLoading()

  // Build query parameters
  const params = new URLSearchParams({
    category: currentCategory,
    sort_by: sortBy,
  })

  if (selectedBrands.length > 0) {
    params.append("brand_ids", selectedBrands.join(","))
  }

  if (selectedConditions.length > 0) {
    params.append("conditions", selectedConditions.join(","))
  }

  if (minPrice !== null) {
    params.append("min_price", minPrice)
  }

  if (maxPrice !== null) {
    params.append("max_price", maxPrice)
  }

  const url = `${shop_api_url}?${params.toString()}`

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    const data = response.data
    allProducts = data.products
    allBrands = data.brands
    conditionCounts = data.conditions

    renderBrandFilters()
    renderConditionCounts()
    renderProducts()
    updateResultsCount()
  } else {
    showError("Failed to load products. Please try again.")
    hideLoading()
  }
}

// Render Brand Filters
function renderBrandFilters() {
  const brandFiltersContainer = document.getElementById("brandFilters")

  if (allBrands.length === 0) {
    brandFiltersContainer.innerHTML = '<p class="text-muted small">No brands available</p>'
    return
  }

  brandFiltersContainer.innerHTML = allBrands
    .map(
      (brand) => `
    <div class="form-check">
      <input class="form-check-input brand-filter" type="checkbox" 
             id="brand${brand.id}" value="${brand.id}"
             ${selectedBrands.includes(brand.id) ? "checked" : ""}>
      <label class="form-check-label" for="brand${brand.id}">
        ${brand.name} <span class="count">(${brand.count})</span>
      </label>
    </div>
  `,
    )
    .join("")
}

// Render Condition Counts
function renderConditionCounts() {
  document.getElementById("excellentCount").textContent = `(${conditionCounts.excellent || 0})`
  document.getElementById("goodCount").textContent = `(${conditionCounts.good || 0})`
  document.getElementById("fairCount").textContent = `(${conditionCounts.fair || 0})`
}

// Render Products
function renderProducts() {
  const productsContainer = document.getElementById("productsContainer")
  const emptyState = document.getElementById("emptyState")

  hideLoading()

  if (allProducts.length === 0) {
    productsContainer.innerHTML = ""
    emptyState.style.display = "block"
    return
  }

  emptyState.style.display = "none"

  productsContainer.innerHTML = allProducts
    .map(
      (product) => `
    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
      <div class="product-card">
        <div class="product-image">
          <img src="${product.image || "/static/images/placeholder-product.jpg"}" 
               alt="${product.brand_name} ${product.name}">
          <div class="product-badge">Refurbished</div>
        </div>
        <div class="product-info">
          <div class="product-brand">${product.brand_name}</div>
          <h5 class="product-name">${product.name}</h5>
          <div class="product-price">
            <span class="current-price">₹${formatPrice(product.min_price)}</span>
            <span class="price-label">Starting from</span>
          </div>
          <a href="/product/${product.id}/" class="btn btn-primary btn-sm w-100">
            View Options
          </a>
        </div>
      </div>
    </div>
  `,
    )
    .join("")
}

// Update Results Count
function updateResultsCount() {
  const resultsCount = document.getElementById("resultsCount")
  const total = allProducts.length

  if (total === 0) {
    resultsCount.textContent = "No results found"
  } else if (total === 1) {
    resultsCount.textContent = "Showing 1 result"
  } else {
    resultsCount.textContent = `Showing ${total} results`
  }
}

// Update Category Title
function updateCategoryTitle() {
  const categoryTitle = document.getElementById("categoryTitle")
  const categoryMap = {
    mobile: "Smartphones",
    laptop: "Laptops",
    tablet: "Tablets",
    accessory: "Accessories",
  }

  categoryTitle.textContent = categoryMap[currentCategory] || "Products"
}

// Set Price Range
function setPriceRange(min, max) {
  document.getElementById("minPrice").value = min
  document.getElementById("maxPrice").value = max
  minPrice = min
  maxPrice = max
  loadShopData()
}

// Clear All Filters
function clearFilters() {
  // Reset all filter states
  selectedBrands = []
  selectedConditions = []
  minPrice = null
  maxPrice = null
  sortBy = "featured"

  // Reset UI
  document.getElementById("minPrice").value = ""
  document.getElementById("maxPrice").value = ""
  document.getElementById("sortBy").value = "featured"

  // Uncheck all brand checkboxes
  document.querySelectorAll(".brand-filter").forEach((cb) => (cb.checked = false))

  // Uncheck all condition checkboxes
  document.querySelectorAll(".condition-filter").forEach((cb) => (cb.checked = false))

  // Reload data
  loadShopData()
}

// View Toggle Functions
function setGridView() {
  document.querySelector(".view-toggle .btn:first-child").classList.add("active")
  document.querySelector(".view-toggle .btn:last-child").classList.remove("active")
  document.getElementById("productsContainer").classList.remove("list-view")
}

function setListView() {
  document.querySelector(".view-toggle .btn:last-child").classList.add("active")
  document.querySelector(".view-toggle .btn:first-child").classList.remove("active")
  document.getElementById("productsContainer").classList.add("list-view")
}

// Helper Functions
function showLoading() {
  const productsContainer = document.getElementById("productsContainer")
  productsContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `
}

function hideLoading() {
  // Loading is hidden when products are rendered
}

function showError(message) {
  const productsContainer = document.getElementById("productsContainer")
  productsContainer.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-exclamation-circle me-2"></i>${message}
      </div>
    </div>
  `
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN").format(Math.round(price))
}
