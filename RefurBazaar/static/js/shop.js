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
let searchQuery = ""
let allProducts = []
let allBrands = []
let conditionCounts = {}

// Pagination (server side; the API returns one page at a time)
const PAGE_SIZE = 12
let currentPage = 1
let totalPages = 1
let totalCount = 0
let shopRequestId = 0

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
  setupPagination()

  // The URL is the source of truth: /shop/?category=laptop&brand_ids=2&conditions=good
  // &min_price=20000&max_price=40000&sort_by=price_low&page=2 restores exactly that view.
  readStateFromUrl()
  window.addEventListener("popstate", async () => {
    readStateFromUrl()
    await loadShopData({ updateUrl: false })
  })

  await loadShopData({ updateUrl: false })
}

// ============================================================
// Setup Category Filter
// ============================================================
function setupCategoryFilter() {
  const categorySelect = document.getElementById("categorySelect")
  categorySelect.addEventListener("change", async (e) => {
    currentCategory = e.target.value
    updateCategoryTitle()
    // Brands and price bounds belong to a category, so they reset when it changes
    selectedBrands = []
    minPrice = null
    maxPrice = null
    currentPage = 1
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
      currentPage = 1
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
    priceTimeout = setTimeout(() => setPriceFilter(minVal, maxVal), 400)
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
    priceTimeout = setTimeout(() => setPriceFilter(minVal, maxVal), 600)
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
  if (globalMaxPrice <= globalMinPrice) globalMaxPrice = globalMinPrice + 1

  const minRange = document.getElementById("minPriceRange")
  const maxRange = document.getElementById("maxPriceRange")

  minRange.min = globalMinPrice
  minRange.max = globalMaxPrice
  minRange.step = Math.max(100, Math.floor((globalMaxPrice - globalMinPrice) / 200))
  maxRange.min = globalMinPrice
  maxRange.max = globalMaxPrice
  maxRange.step = minRange.step

  // Show the active filter (from the URL or the sliders); otherwise the full range.
  const shownMin = minPrice === null ? globalMinPrice : minPrice
  const shownMax = maxPrice === null ? globalMaxPrice : maxPrice
  minRange.value = Math.min(Math.max(shownMin, globalMinPrice), globalMaxPrice)
  maxRange.value = Math.min(Math.max(shownMax, globalMinPrice), globalMaxPrice)
  updatePriceUI(shownMin, shownMax)

  updateTrackFill()
  renderPricePills()
  renderPriceHistogram()
}

/**
 * Apply a price filter chosen with the slider, the boxes or a quick pill.
 * Values that equal the full range mean "no limit", so they are not sent or put in the URL.
 */
function setPriceFilter(minVal, maxVal) {
  minPrice = minVal <= globalMinPrice ? null : minVal
  maxPrice = maxVal >= globalMaxPrice ? null : maxVal
  currentPage = 1
  return loadShopData()
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
  container.innerHTML = shown.map(p => {
    const active = minPrice === null && maxPrice === p.max ? " active" : ""
    return `<button class="price-pill${active}" onclick="setPriceRangeQuick(${globalMinPrice}, ${p.max}, this)">${p.label}</button>`
  }).join("")
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
      currentPage = 1
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
    currentPage = 1
    await loadShopData()
  })
}

// ============================================================
// Load Shop Data from API
// ============================================================
function buildShopParams() {
  const params = new URLSearchParams({ category: currentCategory, sort_by: sortBy, page: currentPage, page_size: PAGE_SIZE })
  if (selectedBrands.length > 0) params.set("brand_ids", selectedBrands.join(","))
  if (selectedConditions.length > 0) params.set("conditions", selectedConditions.join(","))
  if (minPrice !== null) params.set("min_price", minPrice)
  if (maxPrice !== null) params.set("max_price", maxPrice)
  if (searchQuery) params.set("search", searchQuery)
  return params
}

// The address bar mirrors the active view, without the defaults, so it can be shared or bookmarked.
function buildPageParams(page = currentPage) {
  const params = new URLSearchParams()
  if (searchQuery) params.set("search", searchQuery)
  const impliedBySearch = searchQuery && currentCategory === "all"
  if (!impliedBySearch && currentCategory !== "mobile") params.set("category", currentCategory)
  if (selectedBrands.length > 0) params.set("brand_ids", selectedBrands.join(","))
  if (selectedConditions.length > 0) params.set("conditions", selectedConditions.join(","))
  if (minPrice !== null) params.set("min_price", minPrice)
  if (maxPrice !== null) params.set("max_price", maxPrice)
  if (sortBy !== "featured") params.set("sort_by", sortBy)
  if (page > 1) params.set("page", page)
  return params
}

function pageHref(page) {
  const query = buildPageParams(page).toString()
  return query ? `${window.location.pathname}?${query}` : window.location.pathname
}

function syncUrl() {
  const next = pageHref(currentPage)
  if (next !== window.location.pathname + window.location.search) {
    window.history.pushState(null, "", next)
  }
}

async function loadShopData({ updateUrl = true } = {}) {
  // Only the newest request may render: a slow earlier response must not overwrite a newer one.
  const requestId = ++shopRequestId
  showLoading()
  if (updateUrl) syncUrl()

  const url = `${shop_api_url}?${buildShopParams().toString()}`
  const [success, response] = await callApi("GET", url, null, csrf_token)
  if (requestId !== shopRequestId) return

  if (success && response.success) {
    const data = response.data
    allProducts = data.products
    allBrands = data.brands
    conditionCounts = data.conditions

    const pagination = data.pagination || {}
    totalCount = pagination.total_count ?? allProducts.length
    totalPages = pagination.total_pages || 1
    // The server clamps a page that no longer exists (e.g. after filtering); follow it.
    if (pagination.page && pagination.page !== currentPage) {
      currentPage = pagination.page
      if (updateUrl) window.history.replaceState(null, "", pageHref(currentPage))
    }

    // Brands that do not exist in this category would otherwise stay selected without a visible checkbox.
    const unknownBrands = selectedBrands.filter((id) => !allBrands.some((brand) => brand.id === id))
    if (unknownBrands.length > 0) {
      selectedBrands = selectedBrands.filter((id) => !unknownBrands.includes(id))
      currentPage = 1
      return loadShopData({ updateUrl })
    }

    // Bounds come from the API on every load; an active price filter keeps its values.
    if (data.price_range) {
      initPriceRange(data.price_range.min_price, data.price_range.max_price)
    }

    renderBrandFilters()
    renderConditionCounts()
    renderProducts()
    renderPagination()
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      bootstrap.Tooltip.getOrCreateInstance(el, {
        html: true,
        container: 'body'
      });
    });
    updateResultsCount()
  } else {
    totalPages = 1
    renderPagination()
    showError("Failed to load products. Please try again.")
  }
}

// ============================================================
// Pagination
// ============================================================
function setupPagination() {
  const nav = document.getElementById("paginationNav")
  if (!nav) return
  nav.addEventListener("click", (e) => {
    const link = e.target.closest("a.page-link[data-page]")
    if (!link) return
    // Let ctrl/cmd/middle click open the page in a new tab through its real href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
    e.preventDefault()
    const page = parseInt(link.dataset.page, 10)
    const item = link.closest(".page-item")
    if (!page || page === currentPage || (item && item.classList.contains("disabled"))) return
    goToPage(page)
  })
}

function goToPage(page) {
  currentPage = Math.min(Math.max(1, page), totalPages)
  const header = document.querySelector(".products-header")
  if (header) header.scrollIntoView({ behavior: "smooth", block: "start" })
  return loadShopData()
}

// First page, last page and the neighbours of the current page, with gaps shown as an ellipsis.
function pageWindow(current, total) {
  const wanted = new Set([1, total, current - 1, current, current + 1])
  if (current <= 3) { wanted.add(2); wanted.add(3) }
  if (current >= total - 2) { wanted.add(total - 1); wanted.add(total - 2) }
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const result = []
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) result.push("gap")
    result.push(n)
  })
  return result
}

function renderPagination() {
  const nav = document.getElementById("paginationNav")
  const list = document.getElementById("paginationList")
  if (!nav || !list) return

  if (totalPages <= 1) {
    nav.style.display = "none"
    list.innerHTML = ""
    return
  }

  const link = (label, page, { disabled = false, active = false, aria = "" } = {}) => `
    <li class="page-item${disabled ? " disabled" : ""}${active ? " active" : ""}">
      <a class="page-link" href="${pageHref(page)}" data-page="${page}"
         ${aria ? `aria-label="${aria}"` : ""} ${active ? 'aria-current="page"' : ""}
         ${disabled ? 'tabindex="-1" aria-disabled="true"' : ""}>${label}</a>
    </li>`

  const numbers = pageWindow(currentPage, totalPages).map((entry) =>
    entry === "gap"
      ? '<li class="page-item disabled"><span class="page-link">&hellip;</span></li>'
      : link(entry, entry, { active: entry === currentPage, aria: `Page ${entry}` })
  )

  list.innerHTML = [
    link("Previous", currentPage - 1, { disabled: currentPage <= 1, aria: "Previous page" }),
    ...numbers,
    link("Next", currentPage + 1, { disabled: currentPage >= totalPages, aria: "Next page" }),
  ].join("")
  nav.style.display = "block"
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
        ${escapeHtml(brand.name)} <span class="count">(${brand.count})</span>
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
    const heading = emptyState.querySelector("h4")
    if (heading) heading.textContent = searchQuery ? `No results for "${searchQuery}"` : "No products found"
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

    // Spec chips come from the API's per-model card_specs: the memory/storage options that exist on
    // units a customer can buy right now (the same data the product page offers), never a template.
    const cardSpecs = product.card_specs || { fixed: [], options: [] }
    const optionChips = cardSpecs.options.slice(0, 2).map((option) => {
      const values = option.values || []
      if (!values.length) return ""
      const text = values.length === 1 ? values[0] : `${values[0]} – ${values[values.length - 1]}`
      return `<span class="card-chip" title="${escapeHtml(option.name)}">${escapeHtml(text)}</span>`
    }).join("")
    let chipsHtml = optionChips ? `<div class="card-chips">${optionChips}</div>` : ""

    // Discount ribbon: calculate ~30% savings
    const originalPrice = Math.round(product.min_price * 1.3)
    const discountPct = Math.round(((originalPrice - product.min_price) / originalPrice) * 100)
    let product_title = escapeHtml(product.name)
    const extraSpecs = ""
    if (product.category == 'laptop') {
      // Laptops show the model's own fixed specs (processor, display, OS) after its name.
      const fixedSpecs = (cardSpecs.fixed || []).slice(0, 3).map((spec) => escapeHtml(spec.value))
      product_title = [`${escapeHtml(product.brand_name)} ${product_title}`, ...fixedSpecs].join(" | ")
    }
    const isAvailable = product.is_available !== false
    const cardOnClick = isAvailable ? `onclick="window.location.href='/product/${product.id}/'"` : ""
    const outOfStockClass = isAvailable ? "" : " out-of-stock"

    return `
      <div class="product-grid-item">
        <div class="product-card${outOfStockClass}" ${cardOnClick}>
          ${!isAvailable ? '<div class="out-of-stock-overlay"><span class="out-of-stock-label">Out of Stock</span></div>' : ""}
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
  if (totalCount === 0) {
    el.textContent = "No results found"
  } else if (totalCount === 1) {
    el.textContent = "Showing 1 result"
  } else if (totalPages <= 1) {
    el.textContent = `Showing ${totalCount} results`
  } else {
    const first = (currentPage - 1) * PAGE_SIZE + 1
    const last = first + allProducts.length - 1
    el.textContent = `Showing ${first}\u2013${last} of ${totalCount} results`
  }
}

// ============================================================
// Update Category Title
// ============================================================
function updateCategoryTitle() {
  const map = { mobile: "Smartphones", laptop: "Laptops", tablet: "Tablets", accessory: "Accessories", all: "All products" }
  const title = map[currentCategory] || "Products"
  document.getElementById("categoryTitle").textContent = searchQuery ? `Results for "${searchQuery}"` : title
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
  setPriceFilter(min, max)
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
  // Clearing also drops the search, otherwise the page would keep showing an empty result set.
  if (searchQuery) {
    searchQuery = ""
    currentCategory = "mobile"
    const categorySelect = document.getElementById("categorySelect")
    if (categorySelect) categorySelect.value = "mobile"
    window.history.replaceState(null, "", window.location.pathname)
    const headerBox = document.querySelector('#headerSearchForm input[name="search"]')
    if (headerBox) headerBox.value = ""
    updateCategoryTitle()
  }
  selectedBrands = []
  selectedConditions = []
  minPrice = null
  maxPrice = null
  sortBy = "featured"
  currentPage = 1

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
  const count = document.getElementById("resultsCount")
  if (count) count.textContent = "Updating results..."
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
const SHOP_SORTS = ["featured", "price_low", "price_high", "newest"]
const SHOP_CONDITIONS = ["excellent", "good", "fair"]

function parseUrlPrice(value) {
  if (value === null || value.trim() === "") return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null
}

/**
 * Restore every control from the address bar. Anything invalid or unknown is ignored,
 * so a hand-edited or old link never breaks the page.
 */
function readStateFromUrl() {
  const query = new URLSearchParams(window.location.search)

  searchQuery = (query.get("search") || "").trim().slice(0, 100)

  const categorySelect = document.getElementById("categorySelect")
  const validCategories = Array.from(categorySelect.options).map((option) => option.value)
  const categoryParam = query.get("category")
  // A search without a category looks across every category.
  currentCategory = validCategories.includes(categoryParam) ? categoryParam : searchQuery ? "all" : "mobile"
  categorySelect.value = currentCategory

  selectedBrands = [...new Set(
    (query.get("brand_ids") || "").split(",").map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0)
  )]
  selectedConditions = [...new Set(
    (query.get("conditions") || "").split(",").map((c) => c.trim().toLowerCase()).filter((c) => SHOP_CONDITIONS.includes(c))
  )]

  minPrice = parseUrlPrice(query.get("min_price"))
  maxPrice = parseUrlPrice(query.get("max_price"))
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice]

  sortBy = SHOP_SORTS.includes(query.get("sort_by")) ? query.get("sort_by") : "featured"
  currentPage = Math.max(1, parseInt(query.get("page"), 10) || 1)

  document.getElementById("sortBy").value = sortBy
  document.querySelectorAll(".condition-filter").forEach((box) => { box.checked = selectedConditions.includes(box.value) })
  document.querySelectorAll(".brand-filter").forEach((box) => { box.checked = selectedBrands.includes(parseInt(box.value, 10)) })

  const headerBox = document.querySelector('#headerSearchForm input[name="search"]')
  if (headerBox) headerBox.value = searchQuery

  updateCategoryTitle()
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
