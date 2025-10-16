// Enhanced Product Detail JavaScript
document.addEventListener("DOMContentLoaded", () => {
  initializeProductDetail()
})

// Sample seller data
const sellersData = {
  "excellent-256gb-blue": [
    {
      name: "RefurBazar Premium",
      rating: 4.9,
      reviews: 1250,
      price: 430.0,
      shipping: "Free shipping",
      features: ["1-year warranty", "Free returns", "24/7 support"],
      selected: true,
    },
    {
      name: "TechRestore Pro",
      rating: 4.7,
      reviews: 890,
      price: 425.0,
      shipping: "Free shipping",
      features: ["6-month warranty", "Free returns", "Fast delivery"],
      selected: false,
    },
    {
      name: "GreenTech Solutions",
      rating: 4.8,
      reviews: 650,
      price: 435.0,
      shipping: "Free shipping",
      features: ["1-year warranty", "Eco-friendly packaging"],
      selected: false,
    },
  ],
  "good-256gb-blue": [
    {
      name: "RefurBazar Standard",
      rating: 4.6,
      reviews: 980,
      price: 381.0,
      shipping: "Free shipping",
      features: ["6-month warranty", "Free returns"],
      selected: true,
    },
    {
      name: "BudgetTech Store",
      rating: 4.4,
      reviews: 420,
      price: 375.0,
      shipping: "$5.99 shipping",
      features: ["3-month warranty", "Free returns"],
      selected: false,
    },
  ],
  "fair-256gb-blue": [
    {
      name: "ValueTech Outlet",
      rating: 4.3,
      reviews: 320,
      price: 371.0,
      shipping: "Free shipping",
      features: ["3-month warranty", "As-is condition"],
      selected: true,
    },
  ],
  "premium-256gb-blue": [
    {
      name: "RefurBazar Elite",
      rating: 5.0,
      reviews: 450,
      price: 445.0,
      shipping: "Free express shipping",
      features: ["2-year warranty", "Apple certified parts", "Premium support"],
      selected: true,
    },
  ],
}

let currentSlide = 0
const totalSlides = 7

function initializeProductDetail() {
  initializeImageGallery()
  initializeConditionSelection()
  initializeStorageSelection()
  initializeColorSelection()
  updateSellers()
  initializeCarousel()
}

function initializeCarousel() {
  updateSlideDisplay()
  updateCarouselNavigation()
  initializeDotNavigation()
}

function initializeDotNavigation() {
  const dots = document.querySelectorAll(".dot")
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      goToSlide(index)
    })
  })
}

function initializeImageGallery() {
  const Swiper = window.Swiper
  const thumbnailSwiper = new Swiper(".thumbnailSwiper", {
    spaceBetween: 10,
    slidesPerView: 4,
    freeMode: true,
    watchSlidesProgress: true,
    breakpoints: {
      320: {
        slidesPerView: 3,
      },
      768: {
        slidesPerView: 4,
      },
    },
  })
}

function changeMainImage(src) {
  const mainImage = document.getElementById("mainImage")
  mainImage.src = src
}

function initializeConditionSelection() {
  const conditionCards = document.querySelectorAll(".condition-card")

  conditionCards.forEach((card) => {
    card.addEventListener("click", function () {
      // Remove active class from all cards
      conditionCards.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked card
      this.classList.add("active")

      // Update radio button
      const radio = this.querySelector('input[type="radio"]')
      radio.checked = true

      // Update price and selection
      updatePriceAndSelection()
      updateSellers()
    })
  })
}

function initializeStorageSelection() {
  const storageCards = document.querySelectorAll(".storage-card")

  storageCards.forEach((card) => {
    card.addEventListener("click", function () {
      // Remove active class from all cards
      storageCards.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked card
      this.classList.add("active")

      // Update radio button
      const radio = this.querySelector('input[type="radio"]')
      radio.checked = true

      // Update price and selection
      updatePriceAndSelection()
      updateSellers()
    })
  })
}

function initializeColorSelection() {
  const colorCards = document.querySelectorAll(".color-card:not(.disabled)")

  colorCards.forEach((card) => {
    card.addEventListener("click", function () {
      // Remove active class from all cards
      colorCards.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked card
      this.classList.add("active")

      // Update radio button
      const radio = this.querySelector('input[type="radio"]')
      radio.checked = true

      // Update selection display
      updateSelectionDisplay()
      updateSellers()
    })
  })
}

function updatePriceAndSelection() {
  const activeCondition = document.querySelector(".condition-card.active")
  const activeStorage = document.querySelector(".storage-card.active")

  if (activeCondition && activeStorage) {
    const basePrice = Number.parseFloat(activeCondition.dataset.price)
    const storageModifier = Number.parseFloat(activeStorage.dataset.priceModifier)
    const originalPrice = Number.parseFloat(activeCondition.dataset.original)

    const finalPrice = basePrice + storageModifier
    const savings = originalPrice - finalPrice

    // Update price display
    document.getElementById("currentPrice").textContent = `$${finalPrice.toFixed(2)}`
    document.getElementById("originalPrice").textContent = `$${originalPrice.toFixed(2)} new`
    document.getElementById("savingsAmount").textContent = `Save $${savings.toFixed(2)}`

    // Update selection display
    updateSelectionDisplay()
  }
}

function updateSelectionDisplay() {
  const activeCondition = document.querySelector(".condition-card.active")
  const activeStorage = document.querySelector(".storage-card.active")
  const activeColor = document.querySelector(".color-card.active")

  if (activeCondition && activeStorage && activeColor) {
    const condition = activeCondition.querySelector("h6").textContent
    const storage = activeStorage.querySelector("h6").textContent
    const color = activeColor.querySelector("h6").textContent

    const selectionText = `${condition} - ${storage} - ${color} - Wi-Fi`
    const currentSelectionElement = document.getElementById("currentSelection")
    if (currentSelectionElement) {
      currentSelectionElement.textContent = selectionText
    }
  }
}

function updateSellers() {
  const activeCondition = document.querySelector(".condition-card.active")
  const activeStorage = document.querySelector(".storage-card.active")
  const activeColor = document.querySelector(".color-card.active")

  if (activeCondition && activeStorage && activeColor) {
    const condition = activeCondition.dataset.condition
    const storage = activeStorage.dataset.storage
    const color = activeColor.dataset.color

    const key = `${condition}-${storage}-${color}`
    const sellers = sellersData[key] || sellersData["excellent-256gb-blue"]

    renderSellers(sellers)
  }
}

function renderSellers(sellers) {
  const sellersList = document.getElementById("sellersList")

  sellersList.innerHTML = sellers
    .map(
      (seller) => `
        <div class="seller-card ${seller.selected ? "selected" : ""}" onclick="selectSeller(this)">
            <div class="seller-header">
                <div class="seller-info">
                    <h6>${seller.name}</h6>
                    <div class="seller-rating">
                        <div class="stars">
                            ${generateStars(seller.rating)}
                        </div>
                        <span>${seller.rating}/5 (${seller.reviews} reviews)</span>
                    </div>
                </div>
                <div class="seller-price">
                    <div class="price">$${seller.price.toFixed(2)}</div>
                    <div class="shipping">${seller.shipping}</div>
                </div>
            </div>
            <div class="seller-features">
                ${seller.features
                  .map(
                    (feature) => `
                    <div class="seller-feature">
                        <i class="fas fa-check"></i>
                        <span>${feature}</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `,
    )
    .join("")
}

function generateStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  let stars = ""

  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fas fa-star"></i>'
  }

  if (hasHalfStar) {
    stars += '<i class="fas fa-star-half-alt"></i>'
  }

  const emptyStars = 5 - Math.ceil(rating)
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="far fa-star"></i>'
  }

  return stars
}

function selectSeller(sellerCard) {
  // Remove selected class from all seller cards
  document.querySelectorAll(".seller-card").forEach((card) => {
    card.classList.remove("selected")
  })

  // Add selected class to clicked card
  sellerCard.classList.add("selected")

  // Update main price with selected seller's price
  const priceElement = sellerCard.querySelector(".price")
  const price = priceElement.textContent
  document.getElementById("currentPrice").textContent = price
}

function toggleConditionsPanel() {
  const panel = document.getElementById("conditionsPanel")
  panel.classList.toggle("active")

  // Prevent body scroll when panel is open
  if (panel.classList.contains("active")) {
    document.body.style.overflow = "hidden"
    currentSlide = 0
    updateSlideDisplay()
    updateCarouselNavigation()
  } else {
    document.body.style.overflow = ""
  }
}

function nextSlide() {
  if (currentSlide < totalSlides - 1) {
    currentSlide++
    updateSlideDisplay()
    updateCarouselNavigation()
  }
}

function previousSlide() {
  if (currentSlide > 0) {
    currentSlide--
    updateSlideDisplay()
    updateCarouselNavigation()
  }
}

function goToSlide(slideIndex) {
  if (slideIndex >= 0 && slideIndex < totalSlides) {
    currentSlide = slideIndex
    updateSlideDisplay()
    updateCarouselNavigation()
  }
}

function updateSlideDisplay() {
  // Hide all slides
  const slides = document.querySelectorAll(".carousel-slide")
  slides.forEach((slide) => {
    slide.classList.remove("active")
  })

  // Show current slide
  const currentSlideElement = document.querySelector(`[data-slide="${currentSlide}"]`)
  if (currentSlideElement) {
    currentSlideElement.classList.add("active")
  }

  // Update dots
  const dots = document.querySelectorAll(".dot")
  dots.forEach((dot, index) => {
    if (index === currentSlide) {
      dot.classList.add("active")
    } else {
      dot.classList.remove("active")
    }
  })
}

function updateCarouselNavigation() {
  const prevBtn = document.querySelector(".carousel-btn.prev")
  const nextBtn = document.querySelector(".carousel-btn.next")

  if (prevBtn) {
    prevBtn.disabled = currentSlide === 0
  }

  if (nextBtn) {
    nextBtn.disabled = currentSlide === totalSlides - 1
  }
}

function addToCart() {
  const activeCondition = document.querySelector(".condition-card.active")
  const activeStorage = document.querySelector(".storage-card.active")
  const activeColor = document.querySelector(".color-card.active")
  const selectedSeller = document.querySelector(".seller-card.selected")

  if (activeCondition && activeStorage && activeColor && selectedSeller) {
    const condition = activeCondition.querySelector("h6").textContent
    const storage = activeStorage.querySelector("h6").textContent
    const color = activeColor.querySelector("h6").textContent
    const sellerName = selectedSeller.querySelector("h6").textContent
    const price = selectedSeller.querySelector(".price").textContent

    console.log(`Adding to cart: iPhone 12 Pro ${storage} ${color} (${condition}) from ${sellerName} - ${price}`)
    showToast("Product added to cart!", "success")

    // Update cart badge
    const cartBadge = document.querySelector("#cartCount")
    if (cartBadge) {
      const currentCount = Number.parseInt(cartBadge.textContent)
      cartBadge.textContent = currentCount + 1
    }
  }
}

function addToWishlist() {
  console.log("Adding to wishlist")
  showToast("Product added to wishlist!", "success")

  // Update wishlist badge
  const wishlistBadge = document.querySelector("#wishlistCount")
  if (wishlistBadge) {
    const currentCount = Number.parseInt(wishlistBadge.textContent)
    wishlistBadge.textContent = currentCount + 1
  }
}

function showToast(message, type = "info") {
  // Create and show toast notification
  const toast = document.createElement("div")
  toast.className = `toast align-items-center text-white bg-${type} border-0`
  toast.setAttribute("role", "alert")
  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `

  // Add toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container")
  if (!toastContainer) {
    toastContainer = document.createElement("div")
    toastContainer.className = "toast-container position-fixed top-0 end-0 p-3"
    document.body.appendChild(toastContainer)
  }

  toastContainer.appendChild(toast)
  const bootstrap = window.bootstrap
  const bsToast = new bootstrap.Toast(toast)
  bsToast.show()

  // Remove toast after it's hidden
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove()
  })
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Set initial selection display
  updateSelectionDisplay()
})
