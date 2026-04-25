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
  initCategoryFromQueryParam()

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
  const minPriceRange = document.getElementById("minPriceRange")
  const maxPriceRange = document.getElementById("maxPriceRange")
  const minPriceDisplay = document.getElementById("minPriceDisplay")
  const maxPriceDisplay = document.getElementById("maxPriceDisplay")
  const minPriceInput = document.getElementById("minPrice")
  const maxPriceInput = document.getElementById("maxPrice")

  let priceTimeout

  const updatePriceDisplay = () => {
    const minVal = Number.parseInt(minPriceRange.value)
    const maxVal = Number.parseInt(maxPriceRange.value)

    // Ensure min is not greater than max
    if (minVal > maxVal) {
      minPriceRange.value = maxVal
    }

    // Update display
    minPriceDisplay.textContent = formatPrice(minVal)
    maxPriceDisplay.textContent = formatPrice(maxVal)

    // Update hidden inputs for API
    minPriceInput.value = minVal
    maxPriceInput.value = maxVal

    // Clear existing timeout and set new one
    clearTimeout(priceTimeout)
    priceTimeout = setTimeout(async () => {
      minPrice = minVal
      maxPrice = maxVal
      await loadShopData()
    }, 300)
  }

  minPriceRange.addEventListener("input", updatePriceDisplay)
  maxPriceRange.addEventListener("input", updatePriceDisplay)
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
      (product) => {
        // Extract storage/attributes info
        const storage = product.storage || "128GB"
        const colorVariants = product.colors || ["#000000", "#E5C8A8", "#C0C0C0"]
        const colorName = product.color_name || "Black"
        
        // Color circles HTML
        const colorCircles = colorVariants.slice(0, 3).map(color => {
          return `<span class="color-dot" style="background-color: ${color};"></span>`
        }).join("")
        
        // Calculate original price (30% markup for display)
        const originalPrice = Math.round(product.min_price * 1.3)

        return `
    <div class="product-grid-item">
      <div class="product-card" onclick="window.location.href='/product/${product.id}/'">
        <div class="product-badge">
          <i class="fas fa-bolt"></i>
        </div>
        <div class="wishlist-btn" onclick="event.stopPropagation(); addToWishlist(${product.id}, this)">
          <i class="far fa-heart"></i>
        </div>
        <img src="${product.image || "/static/images/iPhone 16 Pro.png"}" 
             alt="${product.brand_name} ${product.name}" class="product-img">
        
        <h5 class="product-title">${product.brand_name} ${product.name}</h5>
        
        <div class="product-variants">
          <div class="color-options mb-2">
            ${colorCircles}
            <span class="color-text">+2</span>
          </div>
          <div class="product-specs">${storage}</div>
        </div>
        
        <div class="product-pricing">
          <span class="price-original">₹${formatPrice(originalPrice)}</span>
          <span class="product-price">₹${formatPrice(product.min_price)}</span>
        </div>

        <div style="position:absolute; bottom:0; right:0; width:0; height:0; border-bottom:60px solid #e53935; border-left:60px solid transparent;"></div>
        <div style="position:absolute; bottom:8px; right:6px; color:white; font-size:12px; font-weight:bold; transform:rotate(-45deg);">23%</div>
        
      </div>
    </div>
  `
      },
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
  document.getElementById("minPriceRange").value = min
  document.getElementById("maxPriceRange").value = max
  document.getElementById("minPrice").value = min
  document.getElementById("maxPrice").value = max
  document.getElementById("minPriceDisplay").textContent = formatPrice(min)
  document.getElementById("maxPriceDisplay").textContent = formatPrice(max)
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
  document.getElementById("minPriceRange").value = 0
  document.getElementById("maxPriceRange").value = 250000
  document.getElementById("minPrice").value = 0
  document.getElementById("maxPrice").value = 250000
  document.getElementById("minPriceDisplay").textContent = formatPrice(0)
  document.getElementById("maxPriceDisplay").textContent = formatPrice(250000)
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

// Add to Wishlist
// function addToWishlist(productId) {
//   console.log(`[v0] Adding product ${productId} to wishlist`)
  
//   // Update wishlist badge
//   const wishlistBadge = document.getElementById("wishlistCount")
//   if (wishlistBadge) {
//     const currentCount = Number.parseInt(wishlistBadge.textContent) || 0
//     wishlistBadge.textContent = currentCount + 1
//     wishlistBadge.style.display = "inline-block"
//   }
  
//   // Show toast notification (optional)
//   showToast("Added to wishlist!", "success")
// }

// Add to Wishlist (Connected to API)
async function addToWishlist(productId, btnElement) {
  console.log(`[v0] Toggling product ${productId} in wishlist`);
  
  try {
      // Make the API call to your backend
      const response = await callApi(
          'POST', 
          '/cart/wishlist-api/toggle/', // Change to /api/cart/wishlist-api/toggle/ if your URLs require it
          { listing_unit_id: productId }, // Sending the ID to the backend
          csrf_token
      );
      
      if(response && response.success) {
          const icon = btnElement.querySelector("i");
          
          if (response.data.action === "added") {
              // Animate: Add to wishlist
              icon.classList.remove("far");
              icon.classList.add("fas");
              btnElement.style.background = "#ec4899"; // Pink background
              btnElement.style.color = "white";
              btnElement.style.transform = "scale(1.2)";
              setTimeout(() => { btnElement.style.transform = "scale(1)"; }, 200);
              
              showToast("Added to wishlist!", "success");
              
              // Update badge count if it exists
              const wishlistBadge = document.getElementById("wishlistCount");
              if (wishlistBadge) {
                  const currentCount = Number.parseInt(wishlistBadge.textContent) || 0;
                  wishlistBadge.textContent = currentCount + 1;
                  wishlistBadge.style.display = "inline-block";
              }
          } else {
              // Animate: Remove from wishlist
              icon.classList.remove("fas");
              icon.classList.add("far");
              btnElement.style.background = "white";
              btnElement.style.color = "#1a1a1a";
              
              showToast("Removed from wishlist!", "info");
              
              // Update badge count if it exists
              const wishlistBadge = document.getElementById("wishlistCount");
              if (wishlistBadge) {
                  const currentCount = Number.parseInt(wishlistBadge.textContent) || 1;
                  wishlistBadge.textContent = Math.max(0, currentCount - 1);
                  if (wishlistBadge.textContent === "0") wishlistBadge.style.display = "none";
              }
          }
      } else {
          // If the user is not logged in, the API will fail and we catch it here
          showToast("Please log in to save items.", "error");
          setTimeout(() => {
              window.location.href = '/login/'; 
          }, 1500);
      }
  } catch (error) {
      console.error("Wishlist Error:", error);
      showToast("Something went wrong.", "error");
  }
}

// Show Toast Notification
function showToast(message, type = "info") {
  const alertClass = type === "success" ? "alert-success" : type === "error" ? "alert-danger" : "alert-info"
  
  const toast = document.createElement("div")
  toast.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`
  toast.style.zIndex = "9999"
  toast.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>${message}
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 3000)
}

/* =========================================
   AUTO-SELECT CATEGORY FROM QUERY PARAM
   ========================================= */
function initCategoryFromQueryParam() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  
  console.log('[v0] Checking for category query param:', categoryParam);
  
  if (categoryParam) {
    // Get the category select element
    const categorySelect = document.getElementById('categorySelect');
    
    if (categorySelect) {
      // Set the select value to the category param
      categorySelect.value = categoryParam;
      
      // Trigger change event to update filters
      categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('[v0] Category auto-selected:', categoryParam);
      
      // Scroll to the products section
      setTimeout(() => {
        const productsSection = document.querySelector('.products-header');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }
}

// Call this function when the page loads
// document.addEventListener('DOMContentLoaded', initCategoryFromQueryParam);