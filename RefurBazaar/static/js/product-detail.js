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

// Condition options
const CONDITION_OPTIONS = [
  { value: "fair", label: "Fair", description: "Visible wear" },
  { value: "good", label: "Good", description: "Minor wear" },
  { value: "excellent", label: "Excellent", description: "Like new" },
  // { value: "premium", label: "Premium", description: "Perfect", icon: "fas fa-gem" },
]

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
  document.getElementById("productTitle").textContent = productData.name
  document.getElementById("breadcrumbProduct").textContent = `${productData.brand_name} ${productData.name}`

  // Set product image
  const mainImage = document.getElementById("mainImage")
  if (productData.image) {
    mainImage.src = productData.image
  } else {
    mainImage.src = "/static/images/iPhone 16 Pro.png"
  }
  mainImage.alt = `${productData.brand_name} ${productData.name}`

  initializeThumbnailGallery()

  // Set product description
  if (productData.description) {
    document.getElementById("productDescription").textContent = productData.description
  }
}

function initializeThumbnailGallery() {
    const thumbnailWrapper = document.getElementById("thumbnailWrapper");

    // Add main image as first thumbnail
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

    // Initialize Swiper with RESPONSIVE Direction
    if (window.Swiper) {
        // Destroy existing instance if it exists (prevents bugs on resize)
        if (thumbnailSwiper) {
            thumbnailSwiper.destroy(true, true);
        }

        thumbnailSwiper = new window.Swiper(".thumbnailSwiper", {
            spaceBetween: 10,
            freeMode: true,
            watchSlidesProgress: true,
            // Mousewheel control for vertical scrolling on desktop
            mousewheel: {
                releaseOnEdges: true,
            },
            breakpoints: {
                // Mobile settings (Horizontal)
                320: {
                    slidesPerView: "auto",
                    direction: 'horizontal',
                },
                // Desktop settings (Vertical) - Matches Bootstrap 'lg'
                992: {
                    slidesPerView: 5, // Show ~5 thumbs vertically
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
            <div class="condition-radio">
                <input type="radio" name="condition" id="condition-${condition.value}" value="${condition.value}">
                <label for="condition-${condition.value}"></label>
            </div>

            <div class="condition-info d-flex align-items-center">
                <h6>${condition.label}</h6>
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

  attributesData.forEach((attr) => {
    if (attr.is_filter) {
      
      if (attr.available_values.length > 0) {
        // Determine filter type based on attribute name
        const attrNameLower = attr.name.toLowerCase()
  
        if (attrNameLower.includes("storage") || attrNameLower.includes("memory")) {
          // Storage-style filter
          filtersHTML += renderStorageFilter(attr)
        } else if (attrNameLower.includes("color") || attrNameLower.includes("colour")) {
          // Color-style filter
          filtersHTML += renderColorFilter(attr)
        } else {
          // Generic filter
          filtersHTML += renderGenericFilter(attr)
        }
      }
    }
  })

  container.innerHTML = filtersHTML
}

function renderStorageFilter(attr) {
  return `
        <div class="selection-section">
            <div class="section-header">
                <h6>Select ${attr.name}</h6>
            </div>
            <div class="storage-options">
                ${attr.available_values
                  .map(
                    (value) => `
                    <div class="storage-card" data-attribute="${attr.id}" data-value="${value}" 
                         onclick="selectAttribute(${attr.id}, '${value}')">
                        <div class="storage-info">
                            <h6>${value}</h6>
                            <p class="storage-price"></p>
                        </div>
                        <div class="storage-radio">
                            <input type="radio" name="attribute-${attr.id}" id="attr-${attr.id}-${value}" value="${value}">
                            <label for="attr-${attr.id}-${value}"></label>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `
}

function renderColorFilter(attr) {
  const colorMap = {
    black: "#000000",
    white: "#ffffff",
    blue: "#4169e1",
    red: "#ff0000",
    green: "#00ff00",
    pink: "#ff69b4",
    purple: "#8a2be2",
    gold: "#ffd700",
    silver: "#c0c0c0",
    gray: "#808080",
    grey: "#808080",
    "space gray": "#5a5a5a",
    starlight: "#f5f5dc",
  }

  return `
        <div class="selection-section">
            <div class="section-header">
                <h6>Select ${attr.name}</h6>
            </div>
            <div class="color-options">
                ${attr.available_values
                  .map((value) => {
                    const colorValue = colorMap[value.toLowerCase()] || "#cccccc"
                    return `
                        <div class="color-card" data-attribute="${attr.id}" data-value="${value}" 
                             onclick="selectAttribute(${attr.id}, '${value}')">
                            <div class="color-radio">
                                <input type="radio" name="attribute-${attr.id}" id="attr-${attr.id}-${value}" value="${value}">
                                <label for="attr-${attr.id}-${value}"></label>
                            </div>
                            <div class="color-dot" style="background: ${colorValue};"></div>
                            <div class="color-info">
                                <h6>${value}</h6>
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
                    <div class="storage-card" data-attribute="${attr.id}" data-value="${value}" 
                         onclick="selectAttribute(${attr.id}, '${value}')">
                        <div class="storage-info">
                            <h6>${value}</h6>
                            <p class="storage-price"></p>
                        </div>
                        <div class="storage-radio">
                            <input type="radio" name="attribute-${attr.id}" id="attr-${attr.id}-${value}" value="${value}">
                            <label for="attr-${attr.id}-${value}"></label>
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
  // Auto-select first condition (excellent if available, otherwise first)
  const excellentCondition = CONDITION_OPTIONS.find((c) => c.value === "excellent")
  if (excellentCondition) {
    selectCondition("excellent")
  } else {
    selectCondition(CONDITION_OPTIONS[0].value)
  }

  // Auto-select first value for each attribute
  attributesData.forEach((attr) => {
    if (attr.available_values.length > 0) {
      selectAttribute(attr.id, attr.available_values[0])
    }
  })

  // Load units with pre-selected filters
  loadAvailableUnits()
}

function selectCondition(value) {
    // 1. Visual Update (Classes)
    document.querySelectorAll(".condition-card").forEach((card) => {
        card.classList.remove("active");
    });

    const selectedCard = document.querySelector(`.condition-card[data-condition="${value}"]`);
    if (selectedCard) {
        selectedCard.classList.add("active");
    }

    // 2. Logic Update
    selectedFilters["condition"] = value;

    // 3. NEW: Update the Header Label Text
    const conditionObj = CONDITION_OPTIONS.find(c => c.value === value);
    if (conditionObj) {
        // e.g. "Condition: Excellent"
        const labelEl = document.getElementById("selectedConditionLabel");
        if(labelEl) labelEl.textContent = conditionObj.label;

        // e.g. "Like new, no scratches"
        const descEl = document.getElementById("selectedConditionDesc");
        if(descEl) descEl.textContent = `(${conditionObj.description})`;
    }

    // 4. Load Data
    loadAvailableUnits();
}

function selectAttribute(attrId, value) {
  // Remove active class from all cards for this attribute
  document.querySelectorAll(`[data-attribute="${attrId}"]`).forEach((card) => {
    card.classList.remove("active")
    const radio = card.querySelector('input[type="radio"]')
    if (radio) radio.checked = false
  })

  // Add active class to selected card
  const selectedCard = document.querySelector(`[data-attribute="${attrId}"][data-value="${value}"]`)
  if (selectedCard) {
    selectedCard.classList.add("active")
    const radio = selectedCard.querySelector('input[type="radio"]')
    if (radio) radio.checked = true

    // Update selected filters
    selectedFilters[`attribute_${attrId}`] = value

    // Load available units
    loadAvailableUnits()
  }
}

// Load Available Units
async function loadAvailableUnits() {
  // Build query params from selected filters
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

// Render Sellers
function renderSellers() {
  const sellersContainer = document.getElementById("sellersList")

  if (availableUnits.length === 0) {
    sellersContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-box-open" style="font-size: 48px; color: #dee2e6;"></i>
                <p class="text-muted mt-3">No sellers available for the selected options.</p>
                <p class="small text-muted">Try selecting different options.</p>
            </div>
        `
    document.getElementById("addToCartBtn").disabled = true
    updatePrice(null)
    return
  }

  sellersContainer.innerHTML = availableUnits
    .map(
      (unit, index) => `
        <div class="seller-card ${index === 0 ? "selected" : ""}" onclick="selectSeller(${unit.id})">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="seller-name">${unit.refurbisher.name}</div>
                    <div class="seller-attributes small text-muted mt-1">
                        ${unit.condition_display}
                        ${unit.attributes.length > 0 ? " • " + unit.attributes.map((attr) => attr.value).join(" • ") : ""}
                    </div>
                </div>
                <div class="text-end">
                    <div class="seller-price">₹${formatPrice(unit.price)}</div>
                </div>
            </div>
        </div>
    `,
    )
    .join("")

  // Auto-select first unit
  if (availableUnits.length > 0) {
    selectedUnit = availableUnits[0]
    updatePrice(selectedUnit.price)
    document.getElementById("addToCartBtn").disabled = false
  }
}

// Select Seller
function selectSeller(unitId) {
  // Remove selected class from all cards
  document.querySelectorAll(".seller-card").forEach((card) => {
    card.classList.remove("selected")
  })

  // Add selected class to clicked card
  event.currentTarget.classList.add("selected")

  // Update selected unit
  selectedUnit = availableUnits.find((unit) => unit.id === unitId)
  updatePrice(selectedUnit.price)
  document.getElementById("addToCartBtn").disabled = false
}

// Update Price Display
function updatePrice(price) {
  const priceElement = document.getElementById("displayPrice")
  if (price) {
    priceElement.textContent = `₹${formatPrice(price)}`
  } else {
    priceElement.textContent = "₹0"
  }
}

// Add to Cart
document.addEventListener("DOMContentLoaded", () => {
  const addToCartBtn = document.getElementById("addToCartBtn")
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      if (!selectedUnit) {
        showToast("Please select a product option", "warning")
        return
      }

      const payload = {
        listing_unit_id: selectedUnit.id,
      }

      const [success, response] = await window.callApi("POST", cart_api_url, payload, csrf_token)

      if (success && response.success) {
        showToast("Product added to cart!", "success")
        // Update cart count
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
  // Create toast notification
  const toastHTML = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `

  // Add toast container if it doesn't exist
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

  // Remove toast after it's hidden
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove()
  })
}
