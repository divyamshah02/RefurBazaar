// Product Detail Page State
let product_detail_url = null
let available_units_url = null
let add_to_cart_url = null
let csrf_token = null

let currentProduct = null
const selectedFilters = {
  condition: null,
  attributes: {},
}
let availableUnits = []

// Initialize Product Detail Page
async function initProductDetail(product_id, endpoints, csrf) {
  product_detail_url = endpoints.product_detail_url
  available_units_url = endpoints.available_units_url
  add_to_cart_url = endpoints.add_to_cart_url
  csrf_token = csrf

  await loadProductDetail(product_id)
  initializeImageGallery()
  initializeConditionsPanel()
}

// Load Product Detail
async function loadProductDetail(product_id) {
  showLoading()

  const [success, response] = await callApi("GET", `${product_detail_url}${product_id}/detail/`, null, csrf_token)

  hideLoading()

  if (success && response.success) {
    currentProduct = response.data
    renderProductDetail(currentProduct)

    // Pre-select first available options
    preselectFilters()

    // Load available units based on pre-selected filters
    await loadAvailableUnits()
  } else {
    showError(response.error || "Failed to load product details")
  }
}

// Render Product Detail
function renderProductDetail(data) {
  const { product, attributes, conditions, price_range } = data

  // Update product title
  document.querySelector(".product-header h1").textContent = `${product.brand_name} ${product.name}`

  // Update breadcrumb
  const breadcrumb = document.querySelector(".breadcrumb")
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <li class="breadcrumb-item"><a href="/">Home</a></li>
      <li class="breadcrumb-item"><a href="/shop">Shop</a></li>
      <li class="breadcrumb-item"><a href="/shop?category=${product.category}">${product.category_display || product.category}</a></li>
      <li class="breadcrumb-item active">${product.brand_name} ${product.name}</li>
    `
  }

  // Update product image if available
  if (product.image) {
    const mainImage = document.getElementById("mainImage")
    if (mainImage) {
      mainImage.src = product.image
    }
  }

  // Render condition options
  renderConditions(conditions)

  // Render attribute filters (storage, color, etc.)
  renderAttributes(attributes)
}

// Render Conditions
function renderConditions(conditions) {
  const conditionGrid = document.querySelector(".condition-grid")
  if (!conditionGrid) return

  // Clear existing conditions
  conditionGrid.innerHTML = ""

  // Sort conditions by price (ascending)
  const sortedConditions = conditions.sort((a, b) => Number.parseFloat(a.min_price) - Number.parseFloat(b.min_price))

  sortedConditions.forEach((cond, index) => {
    const isFirst = index === 0
    const isLast = index === sortedConditions.length - 1
    const conditionValue = cond.condition
    const conditionLabel = conditionValue.charAt(0).toUpperCase() + conditionValue.slice(1)
    const price = Number.parseFloat(cond.min_price)

    const conditionCard = document.createElement("div")
    conditionCard.className = "condition-card"
    conditionCard.dataset.condition = conditionValue
    conditionCard.dataset.price = price
    conditionCard.dataset.count = cond.count

    let priceDisplay = ""
    if (isFirst) {
      priceDisplay = `<p class="condition-price">From $${price.toFixed(2)}</p>`
    } else if (isLast) {
      priceDisplay = `<p class="condition-price">+ $${(price - Number.parseFloat(sortedConditions[0].min_price)).toFixed(2)}</p>`
    } else {
      priceDisplay = `<p class="condition-price">$${price.toFixed(2)}</p>`
    }

    conditionCard.innerHTML = `
      <div class="condition-radio">
        <input type="radio" name="condition" id="condition-${conditionValue}" value="${conditionValue}">
        <label for="condition-${conditionValue}"></label>
      </div>
      <div class="condition-info">
        <h6>${conditionLabel}</h6>
        ${priceDisplay}
      </div>
    `

    conditionCard.addEventListener("click", function () {
      document.querySelectorAll(".condition-card").forEach((c) => c.classList.remove("active"))
      this.classList.add("active")
      this.querySelector('input[type="radio"]').checked = true

      selectedFilters.condition = conditionValue
      loadAvailableUnits()
    })

    conditionGrid.appendChild(conditionCard)
  })
}

// Render Attributes (Storage, Color, RAM, etc.)
function renderAttributes(attributes) {
  // Group attributes by type for better organization
  const storageAttr = attributes.find((attr) => attr.name.toLowerCase() === "storage")
  const colorAttr = attributes.find((attr) => attr.name.toLowerCase() === "color")
  const otherAttrs = attributes.filter(
    (attr) => attr.name.toLowerCase() !== "storage" && attr.name.toLowerCase() !== "color",
  )

  // Render storage if available
  if (storageAttr && storageAttr.available_values.length > 0) {
    renderStorageOptions(storageAttr)
  } else {
    // Hide storage section if not available
    const storageSection = document.querySelector(".selection-section:has(.storage-options)")
    if (storageSection) storageSection.style.display = "none"
  }

  // Render color if available
  if (colorAttr && colorAttr.available_values.length > 0) {
    renderColorOptions(colorAttr)
  } else {
    // Hide color section if not available
    const colorSection = document.querySelector(".selection-section:has(.color-options)")
    if (colorSection) colorSection.style.display = "none"
  }

  // Render other attributes dynamically
  renderOtherAttributes(otherAttrs)
}

// Render Storage Options
function renderStorageOptions(storageAttr) {
  const storageOptions = document.querySelector(".storage-options")
  if (!storageOptions) return

  storageOptions.innerHTML = ""

  storageAttr.available_values.forEach((value, index) => {
    const storageCard = document.createElement("div")
    storageCard.className = "storage-card"
    storageCard.dataset.storage = value.toLowerCase().replace(/\s+/g, "-")
    storageCard.dataset.attributeId = storageAttr.id
    storageCard.dataset.value = value

    storageCard.innerHTML = `
      <div class="storage-info">
        <h6>${value}</h6>
        <p class="storage-price">Available</p>
      </div>
      <div class="storage-radio">
        <input type="radio" name="storage" id="storage-${value.replace(/\s+/g, "-")}" value="${value}">
        <label for="storage-${value.replace(/\s+/g, "-")}"></label>
      </div>
    `

    storageCard.addEventListener("click", function () {
      document.querySelectorAll(".storage-card").forEach((c) => c.classList.remove("active"))
      this.classList.add("active")
      this.querySelector('input[type="radio"]').checked = true

      selectedFilters.attributes[storageAttr.id] = value
      loadAvailableUnits()
    })

    storageOptions.appendChild(storageCard)
  })
}

// Render Color Options
function renderColorOptions(colorAttr) {
  const colorOptions = document.querySelector(".color-options")
  if (!colorOptions) return

  colorOptions.innerHTML = ""

  const colorMap = {
    black: "#000000",
    white: "#FFFFFF",
    blue: "#4169e1",
    red: "#dc3545",
    green: "#28a745",
    yellow: "#ffc107",
    pink: "#ff69b4",
    purple: "#8a2be2",
    "space gray": "#5a5a5a",
    silver: "#c0c0c0",
    gold: "#ffd700",
    starlight: "#f5f5dc",
    midnight: "#191970",
  }

  colorAttr.available_values.forEach((value, index) => {
    const colorCard = document.createElement("div")
    colorCard.className = "color-card"
    colorCard.dataset.color = value.toLowerCase().replace(/\s+/g, "-")
    colorCard.dataset.attributeId = colorAttr.id
    colorCard.dataset.value = value

    const colorCode = colorMap[value.toLowerCase()] || "#6c757d"

    colorCard.innerHTML = `
      <div class="color-radio">
        <input type="radio" name="color" id="color-${value.replace(/\s+/g, "-")}" value="${value}">
        <label for="color-${value.replace(/\s+/g, "-")}"></label>
      </div>
      <div class="color-dot" style="background: ${colorCode};"></div>
      <div class="color-info">
        <h6>${value}</h6>
        <p class="color-price">Available</p>
      </div>
    `

    colorCard.addEventListener("click", function () {
      document.querySelectorAll(".color-card").forEach((c) => c.classList.remove("active"))
      this.classList.add("active")
      this.querySelector('input[type="radio"]').checked = true

      selectedFilters.attributes[colorAttr.id] = value
      loadAvailableUnits()
    })

    colorOptions.appendChild(colorCard)
  })
}

// Render Other Attributes (RAM, Processor, etc.)
function renderOtherAttributes(attributes) {
  const productDetails = document.querySelector(".product-details")
  if (!productDetails) return

  // Find the sellers section to insert before it
  const sellersSection = document.querySelector(".sellers-section")

  attributes.forEach((attr) => {
    if (attr.available_values.length === 0) return

    // Create a new selection section
    const section = document.createElement("div")
    section.className = "selection-section"
    section.innerHTML = `
      <div class="section-header">
        <h6>Select ${attr.name}</h6>
      </div>
      <div class="attribute-options" data-attribute-id="${attr.id}"></div>
    `

    const optionsContainer = section.querySelector(".attribute-options")

    attr.available_values.forEach((value) => {
      const optionCard = document.createElement("div")
      optionCard.className = "storage-card"
      optionCard.dataset.attributeId = attr.id
      optionCard.dataset.value = value

      optionCard.innerHTML = `
        <div class="storage-info">
          <h6>${value}</h6>
          <p class="storage-price">Available</p>
        </div>
        <div class="storage-radio">
          <input type="radio" name="attr-${attr.id}" id="attr-${attr.id}-${value.replace(/\s+/g, "-")}" value="${value}">
          <label for="attr-${attr.id}-${value.replace(/\s+/g, "-")}"></label>
        </div>
      `

      optionCard.addEventListener("click", function () {
        optionsContainer.querySelectorAll(".storage-card").forEach((c) => c.classList.remove("active"))
        this.classList.add("active")
        this.querySelector('input[type="radio"]').checked = true

        selectedFilters.attributes[attr.id] = value
        loadAvailableUnits()
      })

      optionsContainer.appendChild(optionCard)
    })

    // Insert before sellers section
    if (sellersSection) {
      productDetails.insertBefore(section, sellersSection)
    } else {
      productDetails.appendChild(section)
    }
  })
}

// Pre-select first available options
function preselectFilters() {
  // Pre-select first condition
  const firstCondition = document.querySelector(".condition-card")
  if (firstCondition) {
    firstCondition.click()
  }

  // Pre-select first storage
  const firstStorage = document.querySelector(".storage-card")
  if (firstStorage) {
    firstStorage.click()
  }

  // Pre-select first color
  const firstColor = document.querySelector(".color-card")
  if (firstColor) {
    firstColor.click()
  }

  // Pre-select first option for other attributes
  document.querySelectorAll(".attribute-options").forEach((container) => {
    const firstOption = container.querySelector(".storage-card")
    if (firstOption) {
      firstOption.click()
    }
  })
}

// Load Available Units based on selected filters
async function loadAvailableUnits() {
  if (!selectedFilters.condition) return

  // Build query params
  const params = new URLSearchParams()
  params.append("condition", selectedFilters.condition)

  // Add attribute filters
  Object.entries(selectedFilters.attributes).forEach(([attrId, value]) => {
    params.append(`attribute_${attrId}`, value)
  })

  const url = `${available_units_url}${currentProduct.product.id}/available-units/?${params.toString()}`

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    availableUnits = response.data.units
    renderSellers(availableUnits)
    updatePriceDisplay(availableUnits)
  } else {
    renderSellers([])
    showError("No units available for selected options")
  }
}

// Render Sellers
function renderSellers(units) {
  const sellersList = document.getElementById("sellersList")
  if (!sellersList) return

  if (units.length === 0) {
    sellersList.innerHTML = '<p class="text-muted">No sellers available for this configuration</p>'
    return
  }

  sellersList.innerHTML = units
    .map(
      (unit, index) => `
    <div class="seller-card ${index === 0 ? "selected" : ""}" data-unit-id="${unit.id}" onclick="selectSeller(this)">
      <div class="seller-header">
        <div class="seller-info">
          <h6>${unit.refurbisher.name}</h6>
          <div class="seller-rating">
            <div class="stars">
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star-half-alt"></i>
            </div>
            <span>4.5/5</span>
          </div>
        </div>
        <div class="seller-price">
          <div class="price">$${Number.parseFloat(unit.price).toFixed(2)}</div>
          <div class="shipping">Free shipping</div>
        </div>
      </div>
      <div class="seller-features">
        <div class="seller-feature">
          <i class="fas fa-check"></i>
          <span>${unit.condition_display} condition</span>
        </div>
        <div class="seller-feature">
          <i class="fas fa-check"></i>
          <span>1-year warranty</span>
        </div>
        <div class="seller-feature">
          <i class="fas fa-check"></i>
          <span>Free returns</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("")
}

// Update Price Display
function updatePriceDisplay(units) {
  if (units.length === 0) return

  const lowestPrice = Math.min(...units.map((u) => Number.parseFloat(u.price)))
  const priceElement = document.querySelector(".option-header .price")

  if (priceElement) {
    priceElement.textContent = `$${lowestPrice.toFixed(2)}`
  }
}

// Select Seller
function selectSeller(sellerCard) {
  document.querySelectorAll(".seller-card").forEach((card) => {
    card.classList.remove("selected")
  })
  sellerCard.classList.add("selected")

  // Update price in purchase section
  const price = sellerCard.querySelector(".price").textContent
  const priceElement = document.querySelector(".option-header .price")
  if (priceElement) {
    priceElement.textContent = price
  }
}

// Add to Cart
async function addToCart() {
  const selectedSeller = document.querySelector(".seller-card.selected")
  if (!selectedSeller) {
    showError("Please select a seller")
    return
  }

  const unitId = selectedSeller.dataset.unitId

  const requestData = {
    listing_unit_id: Number.parseInt(unitId),
    quantity: 1,
  }

  const [success, response] = await callApi("POST", add_to_cart_url, requestData, csrf_token)

  if (success && response.success) {
    showSuccess("Product added to cart!")

    // Update cart badge
    const cartBadge = document.querySelector("#cartCount")
    if (cartBadge) {
      const currentCount = Number.parseInt(cartBadge.textContent) || 0
      cartBadge.textContent = currentCount + 1
    }
  } else {
    showError(response.error || "Failed to add to cart")
  }
}

// Initialize Image Gallery
function initializeImageGallery() {
  if (typeof Swiper !== "undefined") {
    new Swiper(".thumbnailSwiper", {
      spaceBetween: 10,
      slidesPerView: 4,
      freeMode: true,
      watchSlidesProgress: true,
      breakpoints: {
        320: { slidesPerView: 3 },
        768: { slidesPerView: 4 },
      },
    })
  }
}

// Change Main Image
function changeMainImage(src) {
  const mainImage = document.getElementById("mainImage")
  if (mainImage) {
    mainImage.src = src
  }
}

// Initialize Conditions Panel
function initializeConditionsPanel() {
  // Carousel functionality
  let currentSlide = 0
  const totalSlides = 7

  window.toggleConditionsPanel = () => {
    const panel = document.getElementById("conditionsPanel")
    panel.classList.toggle("active")

    if (panel.classList.contains("active")) {
      document.body.style.overflow = "hidden"
      currentSlide = 0
      updateSlideDisplay()
      updateCarouselNavigation()
    } else {
      document.body.style.overflow = ""
    }
  }

  window.nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      currentSlide++
      updateSlideDisplay()
      updateCarouselNavigation()
    }
  }

  window.previousSlide = () => {
    if (currentSlide > 0) {
      currentSlide--
      updateSlideDisplay()
      updateCarouselNavigation()
    }
  }

  window.goToSlide = (slideIndex) => {
    if (slideIndex >= 0 && slideIndex < totalSlides) {
      currentSlide = slideIndex
      updateSlideDisplay()
      updateCarouselNavigation()
    }
  }

  function updateSlideDisplay() {
    const slides = document.querySelectorAll(".carousel-slide")
    slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === currentSlide)
    })

    const dots = document.querySelectorAll(".dot")
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide)
    })
  }

  function updateCarouselNavigation() {
    const prevBtn = document.querySelector(".carousel-btn.prev")
    const nextBtn = document.querySelector(".carousel-btn.next")

    if (prevBtn) prevBtn.disabled = currentSlide === 0
    if (nextBtn) nextBtn.disabled = currentSlide === totalSlides - 1
  }

  // Initialize dot navigation
  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.addEventListener("click", () => window.goToSlide(index))
  })
}

// UI Helper Functions
function showLoading() {
  // Add loading spinner to product details
  const productDetails = document.querySelector(".product-details")
  if (productDetails) {
    productDetails.style.opacity = "0.5"
    productDetails.style.pointerEvents = "none"
  }
}

function hideLoading() {
  const productDetails = document.querySelector(".product-details")
  if (productDetails) {
    productDetails.style.opacity = "1"
    productDetails.style.pointerEvents = "auto"
  }
}

function showError(message) {
  console.error(message)
  // You can implement a toast notification here
  alert(message)
}

function showSuccess(message) {
  console.log(message)
  // You can implement a toast notification here
  alert(message)
}

// Make functions globally available
window.addToCart = addToCart
window.selectSeller = selectSeller
window.changeMainImage = changeMainImage
