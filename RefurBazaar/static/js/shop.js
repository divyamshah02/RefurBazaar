// ============================================================
// Shop Page State
// ============================================================
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

// Price range bounds (set from API)
let globalMinPrice = 0
let globalMaxPrice = 250000

// Price section collapse state
let priceSectionOpen = true

// ============================================================
// Initialize Shop Page
// ============================================================
async function initShop(api_url, csrf) {
  shop_api_url = api_url
  csrf_token = csrf

  setupCategoryFilter()
  setupBrandFilters()
  setupPriceFilters()
  setupConditionFilters()
  setupSortFilter()
  initCategoryFromQueryParam()

  await loadShopData()
}

// ============================================================
// Setup Category Filter
// ============================================================
function setupCategoryFilter() {
  const categorySelect = document.getElementById("categorySelect")
  categorySelect.addEventListener("change", async (e) => {
    currentCategory = e.target.value
    updateCategoryTitle()
    // Reset price bounds on category change
    minPrice = null
    maxPrice = null
    await loadShopData()
  })
}

// ============================================================
// Setup Brand Filters
// ============================================================
function setupBrandFilters() {
  document.getElementById("brandFilters").addEventListener("change", async (e) => {
    if (e.target.classList.contains("brand-filter")) {
      const brandId = parseInt(e.target.value)
      if (e.target.checked) {
        if (!selectedBrands.includes(brandId)) selectedBrands.push(brandId)
      } else {
        selectedBrands = selectedBrands.filter((id) => id !== brandId)
      }
      await loadShopData()
    }
  })
}

// ============================================================
// Setup Price Filters
// ============================================================
function setupPriceFilters() {
  const minRange = document.getElementById("minPriceRange")
  const maxRange = document.getElementById("maxPriceRange")
  const minInputBox = document.getElementById("minPriceInputBox")
  const maxInputBox = document.getElementById("maxPriceInputBox")

  let priceTimeout

  // Slider → everything else
  const onSliderChange = () => {
    let minVal = parseInt(minRange.value)
    let maxVal = parseInt(maxRange.value)

    if (minVal > maxVal) {
      if (document.activeElement === minRange) {
        minRange.value = maxVal
        minVal = maxVal
      } else {
        maxRange.value = minVal
        maxVal = minVal
      }
    }

    updatePriceUI(minVal, maxVal)
    updateTrackFill()
    clearActivePills()

    clearTimeout(priceTimeout)
    priceTimeout = setTimeout(async () => {
      minPrice = minVal
      maxPrice = maxVal
      await loadShopData()
    }, 400)
  }

  minRange.addEventListener("input", onSliderChange)
  maxRange.addEventListener("input", onSliderChange)

  // Input boxes → slider + API
  const onInputBoxChange = () => {
    let minVal = parseInt(minInputBox.value) || globalMinPrice
    let maxVal = parseInt(maxInputBox.value) || globalMaxPrice

    minVal = Math.max(globalMinPrice, Math.min(minVal, globalMaxPrice))
    maxVal = Math.max(globalMinPrice, Math.min(maxVal, globalMaxPrice))

    if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal]

    minRange.value = minVal
    maxRange.value = maxVal
    updatePriceUI(minVal, maxVal)
    updateTrackFill()
    clearActivePills()

    clearTimeout(priceTimeout)
    priceTimeout = setTimeout(async () => {
      minPrice = minVal
      maxPrice = maxVal
      await loadShopData()
    }, 600)
  }

  minInputBox.addEventListener("change", onInputBoxChange)
  maxInputBox.addEventListener("change", onInputBoxChange)
}

// ============================================================
// Price UI helpers
// ============================================================
function updatePriceUI(minVal, maxVal) {
  document.getElementById("minPriceDisplay").textContent = formatPrice(minVal)
  document.getElementById("maxPriceDisplay").textContent = formatPrice(maxVal)
  document.getElementById("minPrice").value = minVal
  document.getElementById("maxPrice").value = maxVal

  const minInputBox = document.getElementById("minPriceInputBox")
  const maxInputBox = document.getElementById("maxPriceInputBox")
  if (minInputBox) minInputBox.value = minVal
  if (maxInputBox) maxInputBox.value = maxVal
}

function updateTrackFill() {
  const minRange = document.getElementById("minPriceRange")
  const maxRange = document.getElementById("maxPriceRange")
  const fill = document.getElementById("rangeTrackFill")
  if (!fill) return

  const min = parseInt(minRange.min)
  const max = parseInt(minRange.max)
  const minVal = parseInt(minRange.value)
  const maxVal = parseInt(maxRange.value)

  const leftPct = ((minVal - min) / (max - min)) * 100
  const rightPct = ((maxVal - min) / (max - min)) * 100

  fill.style.left = leftPct + "%"
  fill.style.width = (rightPct - leftPct) + "%"
}

function clearActivePills() {
  document.querySelectorAll(".price-pill.active").forEach(p => p.classList.remove("active"))
}

function initPriceRange(minP, maxP) {
  globalMinPrice = Math.floor(minP || 0)
  globalMaxPrice = Math.ceil(maxP || 250000)

  const minRange = document.getElementById("minPriceRange")
  const maxRange = document.getElementById("maxPriceRange")

  minRange.min = globalMinPrice
  minRange.max = globalMaxPrice
  minRange.step = Math.max(100, Math.floor((globalMaxPrice - globalMinPrice) / 200))
  maxRange.min = globalMinPrice
  maxRange.max = globalMaxPrice
  maxRange.step = minRange.step

  // Only reset slider positions if no active price filter
  if (minPrice === null) {
    minRange.value = globalMinPrice
    maxRange.value = globalMaxPrice
    updatePriceUI(globalMinPrice, globalMaxPrice)
  }

  updateTrackFill()
  renderPricePills()
  renderPriceHistogram()
}

function renderPricePills() {
  const container = document.getElementById("pricePills")
  if (!container) return

  const range = globalMaxPrice - globalMinPrice
  const pills = []

  // Generate sensible quick-filter pills based on the actual price range
  const thresholds = [20000, 30000, 50000, 75000, 100000, 150000]
  thresholds.forEach(t => {
    if (t > globalMinPrice && t < globalMaxPrice) {
      pills.push({ label: `Under ₹${t >= 100000 ? (t / 100000).toFixed(0) + "L" : (t / 1000) + "K"}`, max: t })
    }
  })

  // Cap at 3 pills
  const shown = pills.slice(0, 3)
  container.innerHTML = shown.map(p =>
    `<button class="price-pill" onclick="setPriceRangeQuick(${globalMinPrice}, ${p.max}, this)">${p.label}</button>`
  ).join("")
}

function renderPriceHistogram() {
  const container = document.getElementById("priceHistogram")
  if (!container) return

  // Generate 12 representative bars with slight variation (static visual)
  const heights = [20, 35, 50, 68, 82, 100, 95, 78, 60, 42, 28, 14]
  container.innerHTML = heights.map(h =>
    `<div class="histogram-bar" style="height:${h}%"></div>`
  ).join("")
}

// ============================================================
// Setup Condition Filters
// ============================================================
function setupConditionFilters() {
  document.querySelectorAll(".condition-filter").forEach((checkbox) => {
    checkbox.addEventListener("change", async (e) => {
      const condition = e.target.value
      if (e.target.checked) {
        if (!selectedConditions.includes(condition)) selectedConditions.push(condition)
      } else {
        selectedConditions = selectedConditions.filter((c) => c !== condition)
      }
      await loadShopData()
    })
  })
}

// ============================================================
// Setup Sort Filter
// ============================================================
function setupSortFilter() {
  document.getElementById("sortBy").addEventListener("change", async (e) => {
    sortBy = e.target.value
    await loadShopData()
  })
}

// ============================================================
// Load Shop Data from API
// ============================================================
async function loadShopData() {
  showLoading()

  const params = new URLSearchParams({ category: currentCategory, sort_by: sortBy })

  if (selectedBrands.length > 0) params.append("brand_ids", selectedBrands.join(","))
  if (selectedConditions.length > 0) params.append("conditions", selectedConditions.join(","))
  if (minPrice !== null) params.append("min_price", minPrice)
  if (maxPrice !== null) params.append("max_price", maxPrice)

  const url = `${shop_api_url}?${params.toString()}`
  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    const data = response.data
    allProducts = data.products
    allBrands = data.brands
    conditionCounts = data.conditions

    // Set price range bounds from API on first load (or category change)
    if (data.price_range && minPrice === null && maxPrice === null) {
      initPriceRange(data.price_range.min_price, data.price_range.max_price)
    }

    renderBrandFilters()
    renderConditionCounts()
    renderProducts()
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        bootstrap.Tooltip.getOrCreateInstance(el, {
            html: true,
            container: 'body'
        });
    });
    updateResultsCount()
  } else {
    showError("Failed to load products. Please try again.")
  }
}

// ============================================================
// Render Brand Filters
// ============================================================
function renderBrandFilters() {
  const container = document.getElementById("brandFilters")
  if (allBrands.length === 0) {
    container.innerHTML = '<p class="text-muted small">No brands available</p>'
    return
  }
  container.innerHTML = allBrands.map((brand) => `
    <div class="form-check">
      <input class="form-check-input brand-filter" type="checkbox"
             id="brand${brand.id}" value="${brand.id}"
             ${selectedBrands.includes(brand.id) ? "checked" : ""}>
      <label class="form-check-label" for="brand${brand.id}">
        ${brand.name} <span class="count">(${brand.count})</span>
      </label>
    </div>
  `).join("")
}

// ============================================================
// Render Condition Counts
// ============================================================
function renderConditionCounts() {
  document.getElementById("excellentCount").textContent = `(${conditionCounts.excellent || 0})`
  document.getElementById("goodCount").textContent = `(${conditionCounts.good || 0})`
  document.getElementById("fairCount").textContent = `(${conditionCounts.fair || 0})`
}

// ============================================================
// Render Products
// The card shows main-section attributes from model_attributes:
//   - If attribute name includes "color/colour" → color dot (uses matching
//     "Colour Hex Codes" attribute for the actual hex value)
//   - Otherwise → text chip
// ============================================================
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

  productsContainer.innerHTML = allProducts.map((product) => {
    const mainAttrs = (product.model_attributes || []).filter(a => a.section === "main")

    // Locate color and hex-code attributes
    const colorAttr = mainAttrs.find(a =>
      a.attribute_name.toLowerCase().includes("color") ||
      a.attribute_name.toLowerCase().includes("colour") &&
      !a.attribute_name.toLowerCase().includes("hex")
    )
    const hexAttr = mainAttrs.find(a =>
      a.attribute_name.toLowerCase().includes("colour hex") ||
      a.attribute_name.toLowerCase().includes("color hex")
    )

    // Chip attributes: everything in main that is NOT the hex attribute
    const chipAttrs = mainAttrs.filter(a =>
      !a.attribute_name.toLowerCase().includes("colour hex") &&
      !a.attribute_name.toLowerCase().includes("color hex") &&
      !a.attribute_name.toLowerCase().includes("color") &&
      !a.attribute_name.toLowerCase().includes("colour")
    )

    // Build color dots HTML (max 4, show +N if more)
    let colorDotsHtml = ""
    if (colorAttr && colorAttr.possible_values && colorAttr.possible_values.length > 0) {
      const colors = colorAttr.possible_values
      const hexValues = (hexAttr && hexAttr.possible_values) ? hexAttr.possible_values : []
      const maxShow = 4
      const shown = colors.slice(0, maxShow)
      const extra = colors.length - maxShow

      const dots = shown.map((colorName, i) => {
        const hex = hexValues[i] || nameToHex(colorName)
        return `<span class="color-dot" style="background-color:${hex};" title="${colorName}"></span>`
      }).join("")

      const extraBadge = extra > 0
        ? `<span class="color-extra-badge">+${extra}</span>`
        : ""

      colorDotsHtml = `
        <div class="card-colors">
          ${dots}${extraBadge}
        </div>`
    }

    // Build spec chips (first 2 chip attrs)
    let chipsHtml = ""
    if (chipAttrs.length > 0) {
      const shown = chipAttrs.slice(0, 2)
      chipsHtml = `<div class="card-chips">` +
        shown.map(a => {
          const val = a.possible_values && a.possible_values.length > 0
            ? a.possible_values[0]
            : ""
          return val ? `<span class="card-chip">${escapeHtml(val)}</span>` : ""
        }).join("") +
        `</div>`
    }

    // Discount ribbon: calculate ~30% savings
    const originalPrice = Math.round(product.min_price * 1.3)
    const discountPct = Math.round(((originalPrice - product.min_price) / originalPrice) * 100)
    let product_title = escapeHtml(product.name)
    let extraSpecs = ""
    if (product.category == 'laptop') {
      product_title = `${escapeHtml(product.brand_name)} ${product_title} | Intel Core i6 13th Gen | 14" FHD Display | Windows 11 Pro`
      chipsHtml = ''
      extraSpecs = `<div class="card-chips">
                    <span class="card-chip">32 GB RAM </span>
                    <span class="card-chip">512GB SSD </span>
                    </div>`
    }
    return `
      <div class="product-grid-item">
        <div class="product-card" onclick="window.location.href='/product/${product.id}/'">
          <div class="product-badge" data-bs-toggle="tooltip" data-bs-placement="right"
              data-bs-custom-class="custom-tooltip"
              data-bs-html="true"
              data-bs-title="
                  <div class='text-start'>
                      <div class='fw-bold mb-1' style='font-size:18px !important;'>
                          🛡️ RecarvIt Guarantee
                      </div>

                      <div style='font-size:9px !important; line-height:1'>
                          Every asset is professionally inspected,
                          cleaned &amp; tested.
                          Comes with a <strong>6-month warranty</strong>
                          and a <strong>7-day easy return.</strong>
                      </div>
                  </div>
              ">              
            <i class="fas fa-shield-halved"></i>
          </div>
          <div class="wishlist-btn" onclick="event.stopPropagation(); addToWishlist(${product.id}, this)">
            <i class="far fa-heart"></i>
          </div>

          <img src="${product.image || "/static/images/placeholder-product.png"}"
               alt="${escapeHtml(product.brand_name)} ${escapeHtml(product.name)}"
               class="product-img">

          <h5 class="product-title mb-0">${escapeHtml(product.brand_name)}</h5>
          <h3 class="product-title" style="font-size: 18px">${product_title}</h3>

          <div class="product-variants">
            ${colorDotsHtml}
            ${chipsHtml}
            ${extraSpecs}
          </div>

          <div class="product-pricing">
            <span class="price-original">&#8377;${formatPrice(originalPrice)}</span>
            <span class="product-price">&#8377;${formatPrice(product.min_price)}</span>
            <span class="discount-badge">${discountPct}% off</span>
          </div>
        </div>
      </div>
    `
  }).join("")
}

// ============================================================
// Utility: fallback color name → hex
// ============================================================
function nameToHex(name) {
  const map = {
    black: "#1a1a1a", white: "#f5f5f5", blue: "#3b82f6", red: "#ef4444",
    green: "#22c55e", pink: "#ec4899", gold: "#d97706", silver: "#9ca3af",
    gray: "#6b7280", grey: "#6b7280", "space gray": "#4b5563",
    starlight: "#f5f0e8", midnight: "#1c2437", purple: "#8b5cf6",
    yellow: "#eab308", orange: "#f97316", titanium: "#8a8f94",
    graphite: "#4a4a4a", "sierra blue": "#6b9fca", "pacific blue": "#1d6fa4",
    "product red": "#e3001c",
  }
  return map[name.toLowerCase()] || "#cccccc"
}

function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ============================================================
// Update Results Count
// ============================================================
function updateResultsCount() {
  const el = document.getElementById("resultsCount")
  const total = allProducts.length
  if (total === 0) el.textContent = "No results found"
  else if (total === 1) el.textContent = "Showing 1 result"
  else el.textContent = `Showing ${total} results`
}

// ============================================================
// Update Category Title
// ============================================================
function updateCategoryTitle() {
  const map = { mobile: "Smartphones", laptop: "Laptops", tablet: "Tablets", accessory: "Accessories" }
  document.getElementById("categoryTitle").textContent = map[currentCategory] || "Products"
}

// ============================================================
// Set Price Range (from quick pills)
// ============================================================
function setPriceRange(min, max) {
  const minRange = document.getElementById("minPriceRange")
  const maxRange = document.getElementById("maxPriceRange")
  minRange.value = min
  maxRange.value = max
  updatePriceUI(min, max)
  updateTrackFill()
  minPrice = min
  maxPrice = max
  loadShopData()
}

function setPriceRangeQuick(min, max, btnEl) {
  // Toggle active state on pills
  document.querySelectorAll(".price-pill").forEach(p => p.classList.remove("active"))
  if (btnEl) btnEl.classList.add("active")
  setPriceRange(min, max)
}

// ============================================================
// Toggle Price Section (collapsible)
// ============================================================
function togglePriceSection() {
  priceSectionOpen = !priceSectionOpen
  const body = document.getElementById("priceFilterBody")
  const chevron = document.getElementById("priceChevron")
  if (body) body.style.display = priceSectionOpen ? "block" : "none"
  if (chevron) {
    chevron.style.transform = priceSectionOpen ? "rotate(0deg)" : "rotate(180deg)"
  }
}

// ============================================================
// Clear All Filters
// ============================================================
function clearFilters() {
  selectedBrands = []
  selectedConditions = []
  minPrice = null
  maxPrice = null
  sortBy = "featured"

  const minRange = document.getElementById("minPriceRange")
  const maxRange = document.getElementById("maxPriceRange")
  minRange.value = globalMinPrice
  maxRange.value = globalMaxPrice

  updatePriceUI(globalMinPrice, globalMaxPrice)
  updateTrackFill()
  clearActivePills()

  document.getElementById("sortBy").value = "featured"
  document.querySelectorAll(".brand-filter").forEach((cb) => (cb.checked = false))
  document.querySelectorAll(".condition-filter").forEach((cb) => (cb.checked = false))

  loadShopData()
}

// ============================================================
// Mobile Filter Drawer
// ============================================================
function toggleMobileFilters() {
  const sidebar = document.getElementById("filtersSidebar")
  const overlay = document.getElementById("filterOverlay")
  const isOpen = sidebar.classList.contains("mobile-open")
  if (isOpen) {
    closeMobileFilters()
  } else {
    sidebar.classList.add("mobile-open")
    overlay.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function closeMobileFilters() {
  const sidebar = document.getElementById("filtersSidebar")
  const overlay = document.getElementById("filterOverlay")
  sidebar.classList.remove("mobile-open")
  overlay.classList.remove("active")
  document.body.style.overflow = ""
}

// ============================================================
// View Toggle Functions
// ============================================================
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

// ============================================================
// Loading / Error helpers
// ============================================================
function showLoading() {
  document.getElementById("productsContainer").innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>`
}

function hideLoading() { /* loading hidden when products render */ }

function showError(message) {
  document.getElementById("productsContainer").innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-exclamation-circle me-2"></i>${message}
      </div>
    </div>`
}

// ============================================================
// Format price (Indian locale)
// ============================================================
function formatPrice(price) {
  return new Intl.NumberFormat("en-IN").format(Math.round(price))
}

// ============================================================
// Auto-select category from query param
// ============================================================
function initCategoryFromQueryParam() {
  const urlParams = new URLSearchParams(window.location.search)
  const categoryParam = urlParams.get("category")
  if (categoryParam) {
    const categorySelect = document.getElementById("categorySelect")
    if (categorySelect) {
      categorySelect.value = categoryParam
      currentCategory = categoryParam
      updateCategoryTitle()
    }
  }
}

// ============================================================
// Add to Wishlist
// ============================================================
async function addToWishlist(productId, btnElement) {
  try {
    const [success, response] = await callApi(
      "POST",
      "/cart/wishlist-api/toggle/",
      { listing_unit_id: productId },
      csrf_token
    )

    if (success && response && response.success) {
      const icon = btnElement.querySelector("i")
      if (response.data.action === "added") {
        icon.classList.replace("far", "fas")
        btnElement.style.background = "#ec4899"
        btnElement.style.color = "white"
        btnElement.style.transform = "scale(1.2)"
        setTimeout(() => { btnElement.style.transform = "scale(1)" }, 200)
        showToast("Added to wishlist!", "success")
        const badge = document.getElementById("wishlistCount")
        if (badge) {
          badge.textContent = (parseInt(badge.textContent) || 0) + 1
          badge.style.display = "inline-block"
        }
      } else {
        icon.classList.replace("fas", "far")
        btnElement.style.background = "white"
        btnElement.style.color = "#1a1a1a"
        showToast("Removed from wishlist!", "info")
      }
    } else {
      showToast("Please log in to save items.", "error")
      setTimeout(() => { window.location.href = "/login/" }, 1500)
    }
  } catch (error) {
    showToast("Something went wrong.", "error")
  }
}

// ============================================================
// Toast notification
// ============================================================
function showToast(message, type = "info") {
  const alertClass = type === "success" ? "alert-success" : type === "error" ? "alert-danger" : "alert-info"
  const toast = document.createElement("div")
  toast.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`
  toast.style.zIndex = "9999"
  toast.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}
