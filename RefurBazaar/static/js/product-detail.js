// Product Detail Page State
let detail_api_url = null
let units_api_url = null
let cart_api_url = null
let csrf_token = null
let product_id = null

let productData = null
let attributesData = []
const selectedFilters = {}
let availableUnits = []
let selectedUnit = null
let thumbnailSwiper = null

// Extended warranty price per product category — mirrors Product/utils.py
// WARRANTY_PRICES on the backend. This is display-only: the price actually
// charged is always recomputed server-side from the listing's category.
const WARRANTY_PRICES = {
  mobile: 1499,
  laptop: 2999,
  tablet: 1999,
  accessory: 799,
}
const DEFAULT_WARRANTY_PRICE = 999

function getWarrantyPrice(category) {
  return WARRANTY_PRICES[category] ?? DEFAULT_WARRANTY_PRICE
}

// Condition options
const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent", description: "Like new" },
  { value: "good", label: "Good", description: "Light micro-scratches" },
  { value: "fair", label: "Fair", description: "Light cosmetic wear" },
]

// Condition detail descriptions for the conditions panel
const CONDITION_DETAILS = {
  excellent: {
    title: "Excellent",
    bullets: [
      "Like new condition and appearance. Technical condition and durability are the highest possible.",
      "Battery Health is 95% and above.",
      "All devices are 100% tested in depth and functional.",
    ],
  },
  good: {
    title: "Very Good",
    bullets: [
      "Light scratches, slightly visible from 20cm away. Technical condition is above average.",
      "Battery Health is 90% and above.",
      "All devices are 100% tested in depth and functional.",
    ],
  },
  fair: {
    title: "Good",
    bullets: [
      "Visible scratches and possible dents. Technical condition is within the average.",
      "Battery Health is 85% and above.",
      "All devices are 100% tested in depth and functional.",
    ],
  },
}

// Icon map for spec attributes — keyed by lowercase keyword fragments
const SPEC_ICON_MAP = [
  { keys: ["processor", "cpu", "chipset", "chip"], icon: "fas fa-microchip" },
  { keys: ["ram", "memory"], icon: "fas fa-memory" },
  { keys: ["storage", "ssd", "hdd", "disk", "drive"], icon: "fas fa-hdd" },
  { keys: ["sim"], icon: "fas fa-sim-card" },
  { keys: ["screen", "display", "monitor", "resolution", "refresh", "pixel", "ppi", "oled", "lcd", "amoled"], icon: "fas fa-desktop" },
  { keys: ["camera", "photo", "rear camera", "front camera", "video"], icon: "fas fa-camera" },
  { keys: ["battery", "capacity", "charging", "wireless charging", "fast charging"], icon: "fas fa-battery-full" },
  { keys: ["wi-fi", "wifi", "bluetooth", "nfc", "5g", "4g", "network", "connectivity", "usb"], icon: "fas fa-wifi" },
  { keys: ["os", "android", "ios", "windows", "launch os", "max os", "security update"], icon: "fas fa-code" },
  { keys: ["weight", "dimension", "body", "material", "water", "depth", "height", "width"], icon: "fas fa-ruler-combined" },
  { keys: ["color", "colour"], icon: "fas fa-palette" },
  { keys: ["fingerprint", "biometric", "face", "sensor"], icon: "fas fa-fingerprint" },
  { keys: ["speaker", "audio", "sound", "mic", "headphone"], icon: "fas fa-volume-up" },
  { keys: ["gps", "location", "navigation"], icon: "fas fa-map-marker-alt" },
  { keys: ["brand", "model", "series", "generation"], icon: "fas fa-tag" },
]

function getSpecIcon(attrName) {
  const lower = attrName.toLowerCase()
  for (const entry of SPEC_ICON_MAP) {
    if (entry.keys.some((k) => lower.includes(k))) {
      return entry.icon
    }
  }
  return "fas fa-info-circle"
}

// Initialize Product Detail Page
async function initProductDetail(detail_url, units_url, cart_url, csrf, prod_id) {
  detail_api_url = detail_url
  units_api_url = units_url
  cart_api_url = cart_url
  csrf_token = csrf
  product_id = prod_id

  await loadProductDetail()
}

// Load Product Detail
async function loadProductDetail() {
  showLoading()

  const [success, response] = await window.callApi("GET", detail_api_url, null, csrf_token)

  if (success && response.success) {
    productData = response.data.product
    attributesData = response.data.attributes

    renderProductInfo()
    renderFilters()
    autoSelectFilters()
    hideLoading()
  } else {
    showError()
  }
}

// Render Product Info
function renderProductInfo() {
  document.getElementById("productTitle").textContent = `${productData.brand_name} ${productData.name}`
  document.getElementById("breadcrumbProduct").textContent = `${productData.brand_name} ${productData.name}`

  // Update brand tag
  const brandTag = document.getElementById("productBrandTag")
  if (brandTag) brandTag.innerHTML = `<i class="fas fa-recycle" style="font-size:0.7rem;"></i> ${escapeHtml(productData.brand_name)}`

  // Show gallery certified badge
  const galBadge = document.getElementById("galleryConditionBadge")
  if (galBadge) galBadge.style.display = ""

  // Set product image
  const mainImage = document.getElementById("mainImage")
  if (productData.image) {
    mainImage.src = productData.image
  } else {
    mainImage.src = "/static/images/iPhone 16 Pro.png"
  }
  mainImage.alt = `${productData.brand_name} ${productData.name}`

  // Populate sticky bar product info
  const stickyImg = document.getElementById("stickyProductImg")
  const stickyName = document.getElementById("stickyProductName")
  if (stickyImg) stickyImg.src = productData.image || "/static/images/iPhone 16 Pro.png"
  if (stickyName) stickyName.textContent = `${productData.brand_name} ${productData.name}`

  initializeThumbnailGallery()

  // Set product description in specs tab
  const descEl = document.getElementById("productDescription")
  const descWrap = document.getElementById("specsDescription")
  if (productData.description && descEl) {
    descEl.textContent = productData.description
    if (descWrap) descWrap.style.display = "block"
  }

  renderSpecsSections()
  renderSpecsPanel()

  // Extended warranty price depends on the product's category
  const warrantyPriceLabel = document.getElementById("warrantyPriceLabel")
  if (warrantyPriceLabel) {
    warrantyPriceLabel.textContent = `+ ₹${formatPrice(getWarrantyPrice(productData.category))}`
  }
}

function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Build spec grid with icons for each attribute card.
 */
function renderSpecsSections() {
  const mainAttrs = attributesData.filter((a) => a.section === "main")
  const secondaryAttrs = attributesData.filter((a) => a.section === "secondary")

  function buildCard(attr) {
    // Deduplicate and clean values — the API sometimes returns duplicates
    const uniqueVals = [...new Set(
      (attr.available_values || []).map(v => String(v).trim()).filter(Boolean)
    )]
    const hint = uniqueVals.join(" / ")
    const icon = getSpecIcon(attr.name)
    return `
      <div class="spec-card-item">
        <div class="spec-icon-wrap">
          <i class="${icon}"></i>
        </div>
        <div class="spec-card-body">
          <span class="spec-label">${escapeHtml(attr.name)}</span>
          <strong class="spec-value">${escapeHtml(hint)}</strong>
        </div>
      </div>`
  }

  const secGrid = document.getElementById("specsSecondaryGrid")
  const secBtn = document.getElementById("specsSecondaryTabBtn")
  const section = document.getElementById("specsSection")

  if (secGrid) {
    if (secondaryAttrs.length > 0) {
      secGrid.innerHTML = secondaryAttrs.map(buildCard).join("")
      // if (secBtn) secBtn.style.display = ""
    } else {
      if (secBtn) secBtn.style.display = "none"
    }
  }

  if (section && (mainAttrs.length > 0 || secondaryAttrs.length > 0 || productData.description)) {
    section.style.display = ""
  }
}

function initializeThumbnailGallery() {
  const thumbnailWrapper = document.getElementById("thumbnailWrapper");

  let thumbnailsHTML = `
        <div class="swiper-slide">
            <img src="${productData.image || "/static/images/iPhone 16 Pro.png"}" 
                 alt="Main view" 
                 onclick="changeMainImage(this.src)">
        </div>
    `;

  if (Array.isArray(productData.images)) {
    productData.images.forEach(img => {
      if (img.image) {
        thumbnailsHTML += `
                <div class="swiper-slide">
                    <img src="${img.image}" 
                         alt="Product view" 
                         onclick="changeMainImage(this.src)">
                </div>
            `;
      }
    });
  }

  thumbnailWrapper.innerHTML = thumbnailsHTML;

  if (window.Swiper) {
    if (thumbnailSwiper) {
      thumbnailSwiper.destroy(true, true);
    }

    thumbnailSwiper = new window.Swiper(".thumbnailSwiper", {
      spaceBetween: 10,
      freeMode: true,
      watchSlidesProgress: true,
      mousewheel: {
        releaseOnEdges: true,
      },
      breakpoints: {
        320: {
          slidesPerView: "auto",
          direction: 'horizontal',
        },
        992: {
          slidesPerView: 5,
          direction: 'vertical',
        },
      },
    });
  }
}

function changeMainImage(src) {
  document.getElementById("mainImage").src = src
}

// Render Filters
function renderFilters() {
  renderConditionFilter()
  renderAttributeFilters()
}

function renderConditionFilter() {
  const conditionGrid = document.getElementById("conditionGrid");

  const conditionHTML = CONDITION_OPTIONS.map(
    (condition) => `
        <div class="condition-card" data-condition="${condition.value}" onclick="selectCondition('${condition.value}')">
            <div class="condition-info d-flex align-items-center">
                <h6>${condition.label === "Excellent" ? 'Superb' : `${condition.label}`}</h6>
            </div>
        </div>
    `
  ).join("");

  conditionGrid.innerHTML = conditionHTML;
}

function renderAttributeFilters() {
  const container = document.getElementById("attributeFiltersContainer")

  if (attributesData.length === 0) {
    container.innerHTML = ""
    return
  }

  let filtersHTML = ""

  const colorHexAttr = attributesData.find(
    (a) => a.name.toLowerCase() === "colour hex codes"
  )

  attributesData.forEach((attr) => {
    // Only real per-unit variant attributes (RAM, Storage, Colour, ...) are
    // rendered as selectable filter chips. Fixed model specs (Processor,
    // Screen Size, SIM Slots, ...) have is_required=false and a single
    // default_value copied onto every unit — they're shown in the read-only
    // Specifications section, never as a pickable filter.
    if (!attr.is_filter || !attr.is_required) return
    if (attr.available_values.length === 0) return

    const attrNameLower = attr.name.toLowerCase()

    if (attrNameLower === "colour hex codes") return
    if (attrNameLower === "refurb price range") return

    if (attrNameLower.includes("storage") || attrNameLower.includes("memory")) {
      filtersHTML += renderStorageFilter(attr)
    } else if (attrNameLower.includes("color") || attrNameLower.includes("colour")) {
      filtersHTML += renderColorFilter(attr, colorHexAttr)
    } else {
      filtersHTML += renderGenericFilter(attr)
    }
  })

  container.innerHTML = filtersHTML
}

function renderStorageFilter(attr) {
  return `
        <div class="selection-section">
            <div class="section-header">
                <h6>${escapeHtml(attr.name)}</h6>
            </div>
            <div class="storage-options">
                ${attr.available_values
      .map(
        (value) => `
                    <div class="storage-card" data-attribute="${attr.id}" data-value="${escapeHtml(value)}" 
                         onclick="selectAttribute(${attr.id}, '${escapeHtml(value).replace(/'/g, "\\'")}')">
                        <div class="storage-info">
                            <h6>${escapeHtml(value)}</h6>
                            <p class="storage-price"></p>
                        </div>
                    </div>
                `,
      )
      .join("")}
            </div>
        </div>
    `
}

function renderColorFilter(attr, colorHexAttr) {
  return `
    <div class="selection-section">
      <div class="section-header">
        <h6>Select ${attr.name}</h6>
      </div>
      <div class="color-options">
        ${attr.available_values
      .map((value, index) => {
        let colorValue = "#cccccc"
        if (colorHexAttr && colorHexAttr.available_values[index]) {
          colorValue = colorHexAttr.available_values[index]
        }
        return `
              <div class="color-card"
                   data-attribute="${attr.id}"
                   data-value="${escapeHtml(value)}"
                   onclick="selectAttribute(${attr.id}, '${escapeHtml(value).replace(/'/g, "\\'")}')">
                <div class="color-dot me-2" style="background:${colorValue};"></div>
                &nbsp;
                <div class="color-info">
                  <h6>${escapeHtml(value)}</h6>
                  <p class="color-price"></p>
                </div>
              </div>
            `
      })
      .join("")}
      </div>
    </div>
  `
}

function renderGenericFilter(attr) {
  return `
        <div class="selection-section">
            <div class="section-header">
                <h6>Select ${attr.name}</h6>
            </div>
            <div class="storage-options">
                ${attr.available_values
      .map(
        (value) => `
                    <div class="storage-card" data-attribute="${attr.id}" data-value="${escapeHtml(value)}" 
                         onclick="selectAttribute(${attr.id}, '${escapeHtml(value).replace(/'/g, "\\'")}')">
                        <div class="storage-info">
                            <h6>${escapeHtml(value)}</h6>
                            <p class="storage-price"></p>
                        </div>
                    </div>
                `,
      )
      .join("")}
            </div>
        </div>
    `
}

function autoSelectFilters() {
  const excellentCondition = CONDITION_OPTIONS.find((c) => c.value === "excellent")
  if (excellentCondition) {
    selectCondition("excellent")
  } else {
    selectCondition(CONDITION_OPTIONS[0].value)
  }

  attributesData.forEach((attr) => {
    // Same scoping as renderAttributeFilters — only auto-select real
    // per-unit variant attributes, not fixed model specs.
    if (attr.is_filter && attr.is_required && attr.available_values.length > 0) {
      selectAttribute(attr.id, attr.available_values[0])
    }
  })

  loadAvailableUnits()
}

function selectCondition(value) {
  document.querySelectorAll(".condition-card").forEach((card) => {
    card.classList.remove("active");
  });

  const selectedCard = document.querySelector(`.condition-card[data-condition="${value}"]`);
  if (selectedCard) {
    selectedCard.classList.add("active");
  }

  selectedFilters["condition"] = value;

  const conditionObj = CONDITION_OPTIONS.find(c => c.value === value);
  if (conditionObj) {
    const labelEl = document.getElementById("selectedConditionLabel");
    // if(labelEl) labelEl.textContent = if conditionObj.label ==="Excellent" ? 'Superb' : `${conditionObj.label }`
    if (labelEl) labelEl.textContent = conditionObj.label === "Excellent" ? "Superb" : conditionObj.label;

    const descEl = document.getElementById("selectedConditionDesc");
    if (descEl) descEl.textContent = `(${conditionObj.description})`;
  }

  loadAvailableUnits();
}

function selectAttribute(attrId, value) {
  document.querySelectorAll(`[data-attribute="${attrId}"]`).forEach((card) => {
    card.classList.remove("active")
    const radio = card.querySelector('input[type="radio"]')
    if (radio) radio.checked = false
  })

  // Escape the value for safe use inside a CSS attribute selector — values
  // can contain quotes (e.g. Screen Size = 6.72") which would otherwise
  // produce an invalid selector and throw.
  const selectedCard = document.querySelector(
    `[data-attribute="${attrId}"][data-value="${CSS.escape(String(value))}"]`,
  )
  if (selectedCard) {
    selectedCard.classList.add("active")
    const radio = selectedCard.querySelector('input[type="radio"]')
    if (radio) radio.checked = true

    selectedFilters[`attribute_${attrId}`] = value

    loadAvailableUnits()
  }
}

// Load Available Units
async function loadAvailableUnits() {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(selectedFilters)) {
    params.append(key, value)
  }

  const url = `${units_api_url}?${params.toString()}`

  const [success, response] = await window.callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    availableUnits = response.data.units
    renderSellers()
  } else {
    showSellersError()
  }
}

// Render Sellers — auto-selects cheapest, shows all as compact selectable options
function renderSellers() {
  const sellersContainer = document.getElementById("sellersList")

  if (availableUnits.length === 0) {
    sellersContainer.innerHTML = `
      <div class="no-sellers-state">
        <i class="fas fa-box-open"></i>
        <p class="fw-semibold mb-1">Out Of Stock</p>
        <p class="small">Try selecting different options above.</p>
      </div>
    `
    document.getElementById("addToCartBtn").disabled = true
    updatePrice(null)
    updateStickyBar(null)
    showOutOfStock()
    document.getElementById("custom-out-of-stock-label").style.display = ""
    return
  }
  document.getElementById("custom-out-of-stock-label").style.display = "none"
  hideOutOfStock()

  // Sort by price ascending — cheapest first / auto-selected
  const sorted = [...availableUnits].sort((a, b) => parseFloat(a.price) - parseFloat(b.price))

  sellersContainer.innerHTML = sorted
    .map(
      (unit, index) => {
        const isCheapest = index === 0
        return `
        <div class="seller-option ${isCheapest ? "selected" : ""}" 
             data-unit-id="${unit.id}"
             onclick="selectSeller(${unit.id})">
          <div class="seller-option-left">
            <div class="seller-option-check">
              <i class="fas fa-check"></i>
            </div>
            <div class="seller-option-info">
              <span class="seller-option-name">${escapeHtml(unit.refurbisher.name)}</span>
              ${isCheapest ? '<span class="seller-badge-best">Best Price</span>' : ''}
            </div>
          </div>
          <div class="seller-option-price">
            ₹${formatPrice(unit.price)}
          </div>
        </div>
      `}
    )
    .join("")

  // Auto-select cheapest
  selectedUnit = sorted[0]
  updatePrice(selectedUnit.price)
  updateStickyBar(selectedUnit)
  document.getElementById("addToCartBtn").disabled = false
}

// Select Seller
function selectSeller(unitId) {
  document.querySelectorAll(".seller-option").forEach((card) => {
    card.classList.remove("selected")
  })

  const clickedCard = document.querySelector(`.seller-option[data-unit-id="${unitId}"]`)
  if (clickedCard) clickedCard.classList.add("selected")

  selectedUnit = availableUnits.find((unit) => unit.id === unitId)
  if (selectedUnit) {
    updatePrice(selectedUnit.price)
    updateStickyBar(selectedUnit)
    document.getElementById("addToCartBtn").disabled = false
  }
}

// Update sticky bar info
function updateStickyBar(unit) {
  const stickyPrice = document.getElementById("stickyBarPrice")
  if (!stickyPrice) return

  if (unit) {
    stickyPrice.textContent = `₹${formatPrice(unit.price)}`
  } else {
    stickyPrice.textContent = "₹0"
  }
}

// Update Price Display
function updatePrice(price) {
  const priceElement = document.getElementById("displayPrice");
  const stickyPriceElement = document.getElementById("stickyMobilePrice");
  const warrantyToggle = document.getElementById("warrantyToggle");
  const warrantyCost = getWarrantyPrice(productData && productData.category);

  let finalPrice = price || 0;

  if (warrantyToggle && warrantyToggle.checked) {
    finalPrice += warrantyCost;
  }

  if (finalPrice > 0) {
    const formatted = `₹${formatPrice(finalPrice)}`;
    priceElement.textContent = formatted;
    if (stickyPriceElement) stickyPriceElement.textContent = formatted;
  } else {
    priceElement.textContent = "₹0";
    if (stickyPriceElement) stickyPriceElement.textContent = "₹0";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Listen for Warranty Toggle clicks
  const warrantyToggle = document.getElementById("warrantyToggle");
  if (warrantyToggle) {
    warrantyToggle.addEventListener("change", () => {
      if (selectedUnit) {
        updatePrice(selectedUnit.price);
      }
    });
  }

  // Initialize Reviews Swiper (Full Width)
  if (document.querySelector('.reviewsSwiper')) {
    new Swiper('.reviewsSwiper', {
      slidesPerView: 1.1,
      spaceBetween: 16,
      navigation: {
        nextEl: '.review-next',
        prevEl: '.review-prev',
      },
      breakpoints: {
        768: { slidesPerView: 2.2, spaceBetween: 20 },
        1024: { slidesPerView: 3.2, spaceBetween: 24 }
      }
    });
  }

  // Sticky buy bar — show when main add-to-cart is out of view
  const mainBuyBtn = document.getElementById('addToCartBtn');
  const stickyBar = document.querySelector('.sticky-buy-bar');

  if (mainBuyBtn && stickyBar) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          stickyBar.classList.add('visible');
        } else {
          stickyBar.classList.remove('visible');
        }
      });
    }, { threshold: 0 });
    observer.observe(mainBuyBtn);
  }
})

// Add to Cart
document.addEventListener("DOMContentLoaded", () => {
  const addToCartBtn = document.getElementById("addToCartBtn")
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      if (!selectedUnit) {
        showToast("Please select a product option", "warning")
        return
      }

      const warrantyToggle = document.getElementById("warrantyToggle")

      const payload = {
        listing_unit_id: selectedUnit.id,
        has_extended_warranty: !!(warrantyToggle && warrantyToggle.checked),
      }

      const [success, response] = await window.callApi("POST", cart_api_url, payload, csrf_token)

      if (success && response.success) {
        showToast(
          payload.has_extended_warranty
            ? "Product added to cart with extended warranty!"
            : "Product added to cart!",
          "success"
        )
        const cartCount = document.getElementById("cartCount")
        if (cartCount) {
          cartCount.textContent = Number.parseInt(cartCount.textContent) + 1
        }
      } else {
        showToast(response.error || "Failed to add to cart", "danger")
      }
    })
  }
})

// Helper Functions
function showLoading() {
  document.getElementById("loadingState").style.display = "block"
  document.getElementById("productContent").style.display = "none"
  document.getElementById("errorState").style.display = "none"
}

function hideLoading() {
  document.getElementById("loadingState").style.display = "none"
  document.getElementById("productContent").style.display = "block"
}

function showError() {
  document.getElementById("loadingState").style.display = "none"
  document.getElementById("productContent").style.display = "none"
  document.getElementById("errorState").style.display = "block"
}

function showSellersError() {
  const sellersContainer = document.getElementById("sellersList")
  sellersContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>Failed to load sellers. Please try again.
        </div>
    `
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN").format(Math.round(price))
}

function showToast(message, type = "info") {
  const toastHTML = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `

  let toastContainer = document.querySelector(".toast-container")
  if (!toastContainer) {
    toastContainer = document.createElement("div")
    toastContainer.className = "toast-container position-fixed top-0 end-0 p-3"
    document.body.appendChild(toastContainer)
  }

  toastContainer.insertAdjacentHTML("beforeend", toastHTML)
  const toastElement = toastContainer.lastElementChild
  const toast = new window.bootstrap.Toast(toastElement)
  toast.show()

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove()
  })
}

// Render Dynamic Specifications in Side Panel
function renderSpecsPanel() {
  const specsGrid = document.getElementById("dynamicSpecsGrid");
  if (!specsGrid) return;

  let specsHTML = `
      <li class="minimal-spec-item"><span>Brand</span><strong>${productData.brand_name || 'N/A'}</strong></li>
      <li class="minimal-spec-item"><span>Model</span><strong>${productData.name || 'N/A'}</strong></li>
  `;

  if (attributesData && attributesData.length > 0) {
    attributesData.forEach(attr => {
      if (attr.available_values && attr.available_values.length > 0) {
        const uniqueVals = [...new Set(
          (attr.available_values).map(v => String(v).trim()).filter(Boolean)
        )]
        specsHTML += `<li class="minimal-spec-item"><span>${escapeHtml(attr.name)}</span><strong>${escapeHtml(uniqueVals.join(' / '))}</strong></li>`;
      }
    });
  }

  specsGrid.innerHTML = specsHTML;
}

// Out of Stock Overlay
function showOutOfStock() {
  let overlay = document.getElementById("outOfStockOverlay")
  if (overlay) {
    overlay.style.display = "flex"
    overlay.style.opacity = "0"
    requestAnimationFrame(() => { overlay.style.opacity = "1" })
  }
}

function hideOutOfStock() {
  const overlay = document.getElementById("outOfStockOverlay")
  if (overlay) {
    overlay.style.opacity = "0"
    setTimeout(() => { overlay.style.display = "none" }, 300)
  }
}

// Update conditions panel when condition tab is clicked
function selectConditionPanelTab(value) {
  // Update active tab in panel
  document.querySelectorAll(".cond-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cond === value)
  })

  const detail = CONDITION_DETAILS[value]
  if (!detail) return

  const descContainer = document.getElementById("condPanelDesc")
  if (descContainer) {
    descContainer.innerHTML = `
      <h6 class="cond-panel-desc-title">Condition Description</h6>
      <ul class="cond-panel-bullets">
        ${detail.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>
    `
  }
}
