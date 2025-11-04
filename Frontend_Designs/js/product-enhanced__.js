// iPhone 16 Pro Product Data
const productData = {
  id: "iphone-16-pro-128gb-space-grey",
  name: "iPhone 16 Pro",
  brand: "Apple",
  model: "iPhone 16 Pro",
  storage: "128GB",
  color: "Space Grey",
  grade: "Very Good",
  network: "UNLOCKED",
  price: {
    current: 524.99,
    original: 999.99,
    currency: "£",
    discount: 48,
  },
  images: [
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop",
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop",
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop",
  ],
  specifications: {
    Bluetooth: "Bluetooth 5.3",
    Colour: "Space Grey",
    "Front Camera/Webcam Resolution": "12 Megapixels",
    Network: "UNLOCKED",
    "Processor Manufacturer": "Apple",
    "Product Line": "iPhone 16 Pro",
    "Rear Camera": "Yes",
    "Screen Size": '6.3"',
    Width: "77.6 mm",
    "Brand Name": "Apple",
    Depth: "8.25 mm",
    GPS: "Yes",
    "Operating System Platform": "iOS 18",
    "Processor Type": "A18 Pro",
    "Product Name": "iPhone 16 Pro",
    "Rear Camera Resolution": "48 Megapixel",
    "Sensor Type": "Face ID, accelerometer, gyro, proximity, compass, barometer",
    "Wireless LAN": "Yes",
    Size: "128 GB",
    "Front Camera/Webcam": "Yes",
    Height: "159.9 mm",
    "Processor Core": "Hexa-Core (6 cores)",
    "Product Colour": "Space Grey",
    "Product Type": "Smartphone",
    "Screen Resolution": "2556 x 1179",
    "Weight (Approximate)": "227 g",
    "Year of Release": "2024",
  },
  variants: {
    storage: ["128 GB", "256 GB", "512 GB", "1 TB"],
    colors: ["Space Grey", "Blue", "Purple", "Starlight"],
    grades: ["Pristine", "Very Good", "Good"],
  },
  features: [
    "Order by 10pm and get it tomorrow",
    "FREE 12 month warranty",
    "Better for the planet",
    "Own the device outright",
    "Refer a friend and get 10% off",
  ],
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize product page
  initializeProductPage()

  // Initialize image gallery
  initializeImageGallery()

  // Initialize product options
  initializeProductOptions()

  // Initialize purchase options
  initializePurchaseOptions()

  // Initialize tabs
  initializeTabs()

  // Initialize cart functionality
  initializeCart()

  // Update cart counter on page load
  updateCartCounter()
})

function initializeProductPage() {
  // Update page title
  document.title = `${productData.name} ${productData.storage} ${productData.color} - RefurBazar`

  // Update product info
  updateProductInfo()

  // Update specifications table
  updateSpecifications()

  console.log("iPhone 16 Pro product page initialized")
}

function updateProductInfo() {
  // Update product title and subtitle
  const titleElement = document.querySelector(".product-title")
  const subtitleElement = document.querySelector(".product-subtitle")

  if (titleElement) {
    titleElement.textContent = productData.name
  }

  if (subtitleElement) {
    subtitleElement.innerHTML = `
            <span class="network-status">${productData.network}</span> | 
            <span class="storage">${productData.storage}</span> | 
            <span class="color">${productData.color}</span> | 
            <span class="condition">${productData.grade}</span>
        `
  }

  // Update prices
  const priceElements = document.querySelectorAll(".price")
  priceElements.forEach((element) => {
    if (element.textContent.includes("524.99")) {
      element.innerHTML = `${productData.price.currency}${productData.price.current}`
    }
  })
}

function updateSpecifications() {
  const specsContainer = document.querySelector(".specs-table")
  if (!specsContainer) return

  const columns = specsContainer.querySelectorAll(".col-md-4")
  const specs = Object.entries(productData.specifications)
  const specsPerColumn = Math.ceil(specs.length / 3)

  columns.forEach((column, columnIndex) => {
    const startIndex = columnIndex * specsPerColumn
    const endIndex = Math.min(startIndex + specsPerColumn, specs.length)
    const columnSpecs = specs.slice(startIndex, endIndex)

    column.innerHTML = columnSpecs
      .map(
        ([label, value]) => `
            <div class="spec-item">
                <span class="spec-label">${label}</span>
                <span class="spec-value">${value}</span>
            </div>
        `,
      )
      .join("")
  })
}

function initializeImageGallery() {
  const mainImage = document.getElementById("mainProductImage")
  const thumbnails = document.querySelectorAll(".thumbnail")

  // Set main image
  if (mainImage && productData.images[0]) {
    mainImage.src = productData.images[0]
  }

  // Update thumbnails
  thumbnails.forEach((thumbnail, index) => {
    if (productData.images[index]) {
      thumbnail.src = productData.images[index]
      thumbnail.addEventListener("click", function () {
        // Remove active class from all thumbnails
        thumbnails.forEach((t) => t.classList.remove("active"))

        // Add active class to clicked thumbnail
        this.classList.add("active")

        // Update main image
        if (mainImage) {
          mainImage.style.opacity = "0"
          setTimeout(() => {
            mainImage.src = this.src.replace("w=100&h=100", "w=500&h=500")
            mainImage.style.opacity = "1"
          }, 150)
        }
      })
    }
  })
}

function initializeProductOptions() {
  // Storage options
  const sizeButtons = document.querySelectorAll(".size-btn")
  sizeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      sizeButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")

      // Update product data and price (in real app)
      showToast(`Selected ${this.textContent} storage`, "info")
    })
  })

  // Color options
  const colorButtons = document.querySelectorAll(".color-btn")
  colorButtons.forEach((button) => {
    button.addEventListener("click", function () {
      colorButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")

      showToast(`Selected ${this.textContent} color`, "info")
    })
  })

  // Grade options
  const gradeButtons = document.querySelectorAll(".grade-btn")
  gradeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      gradeButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")

      showToast(`Selected ${this.textContent} grade`, "info")
    })
  })

  // Network options
  const networkButtons = document.querySelectorAll(".option-btn")
  networkButtons.forEach((button) => {
    button.addEventListener("click", function () {
      networkButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")
    })
  })

  // Reset filters
  const resetButton = document.querySelector(".filter-actions .btn-outline-secondary")
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      // Reset all options to default
      document.querySelector(".size-btn[data-default]")?.classList.add("active")
      document.querySelector(".color-btn[data-default]")?.classList.add("active")
      document.querySelector(".grade-btn[data-default]")?.classList.add("active")

      showToast("Filters reset to show full range", "success")
    })
  }
}

function initializePurchaseOptions() {
  const purchaseRadios = document.querySelectorAll('input[name="purchase"]')
  const addToBasketBtn = document.querySelector(".btn-primary")

  purchaseRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      const selectedOption = this.id
      console.log(`Selected purchase option: ${selectedOption}`)

      // Update button text based on selection
      if (addToBasketBtn) {
        switch (selectedOption) {
          case "buyNow":
            addToBasketBtn.textContent = "+ Add To Basket"
            break
          case "spreadCost":
            addToBasketBtn.textContent = "Apply for Credit"
            break
          case "rent":
            addToBasketBtn.textContent = "Start Rental"
            break
        }
      }
    })
  })

  // Add to basket functionality
  if (addToBasketBtn) {
    addToBasketBtn.addEventListener("click", () => {
      const selectedOption = document.querySelector('input[name="purchase"]:checked').id

      if (selectedOption === "buyNow") {
        addToCart(productData.id)
      } else {
        showToast(`Redirecting to ${selectedOption} process...`, "info")
        // In real app, redirect to appropriate flow
      }
    })
  }
}

function initializeTabs() {
  const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]')

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetTab = this.getAttribute("data-bs-target")
      console.log(`Switched to tab: ${targetTab}`)

      // Add any tab-specific initialization here
      if (targetTab === "#specs") {
        // Animate spec items
        const specItems = document.querySelectorAll(".spec-item")
        specItems.forEach((item, index) => {
          setTimeout(() => {
            item.style.opacity = "0"
            item.style.transform = "translateX(-20px)"
            setTimeout(() => {
              item.style.transition = "all 0.3s ease"
              item.style.opacity = "1"
              item.style.transform = "translateX(0)"
            }, 50)
          }, index * 50)
        })
      }
    })
  })
}

function initializeCart() {
  // Initialize cart from localStorage
  const cart = JSON.parse(localStorage.getItem("refurbtech_cart")) || []
  updateCartCounter()
}

function addToCart(productId) {
  const cart = JSON.parse(localStorage.getItem("refurbtech_cart")) || []

  const productToAdd = {
    id: productData.id,
    name: productData.name,
    storage: productData.storage,
    color: productData.color,
    grade: productData.grade,
    price: productData.price.current,
    currency: productData.price.currency,
    image: productData.images[0],
    quantity: 1,
    addedAt: new Date().toISOString(),
  }

  // Check if item already in cart
  const existingItem = cart.find((item) => item.id === productId)
  if (existingItem) {
    existingItem.quantity += 1
    showToast("Quantity updated in cart", "info")
  } else {
    cart.push(productToAdd)
    showToast("Added to cart successfully!", "success")
  }

  localStorage.setItem("refurbtech_cart", JSON.stringify(cart))
  updateCartCounter()

  // Visual feedback on button
  const button = document.querySelector(".btn-primary")
  if (button) {
    const originalText = button.textContent
    button.innerHTML = '<i class="fas fa-check me-2"></i>Added!'
    button.style.background = "var(--success-color)"
    button.disabled = true

    setTimeout(() => {
      button.innerHTML = originalText
      button.style.background = ""
      button.disabled = false
    }, 2000)
  }
}

function updateCartCounter() {
  const cart = JSON.parse(localStorage.getItem("refurbtech_cart")) || []
  const cartCounter = document.getElementById("cartCount")

  if (cartCounter) {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
    cartCounter.textContent = totalItems
  }
}

// Search functionality
const searchInput = document.getElementById("searchInput")
const searchBtn = document.querySelector(".search-btn")

if (searchInput && searchBtn) {
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault()
    const query = searchInput.value.trim()
    if (query) {
      showToast(`Searching for "${query}"...`, "info")
      // In real app, redirect to search results
      setTimeout(() => {
        window.location.href = `search.html?q=${encodeURIComponent(query)}`
      }, 1000)
    }
  })

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click()
    }
  })
}

// Wishlist functionality
const wishlistBtn = document.getElementById("wishlistBtn")
if (wishlistBtn) {
  wishlistBtn.addEventListener("click", (e) => {
    e.preventDefault()

    const wishlist = JSON.parse(localStorage.getItem("refurbtech_wishlist")) || []
    const isInWishlist = wishlist.some((item) => item.id === productData.id)

    if (isInWishlist) {
      // Remove from wishlist
      const updatedWishlist = wishlist.filter((item) => item.id !== productData.id)
      localStorage.setItem("refurbtech_wishlist", JSON.stringify(updatedWishlist))
      showToast("Removed from wishlist", "info")
    } else {
      // Add to wishlist
      const updatedWishlist = wishlist // Declare updatedWishlist variable
      updatedWishlist.push({
        id: productData.id,
        name: productData.name,
        price: productData.price.current,
        currency: productData.price.currency,
        image: productData.images[0],
        addedAt: new Date().toISOString(),
      })
      localStorage.setItem("refurbtech_wishlist", JSON.stringify(updatedWishlist))
      showToast("Added to wishlist", "success")
    }

    // Update wishlist counter
    const wishlistCounter = document.getElementById("wishlistCount")
    if (wishlistCounter) {
      const updatedWishlist = JSON.parse(localStorage.getItem("refurbtech_wishlist")) || []
      wishlistCounter.textContent = updatedWishlist.length
    }
  })
}

// Toast notification system
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container") || createToastContainer()

  const toastIcons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  }

  const toastColors = {
    success: "success",
    error: "danger",
    warning: "warning",
    info: "primary",
  }

  const toast = document.createElement("div")
  toast.className = `toast align-items-center text-white bg-${toastColors[type]} border-0 shadow-lg`
  toast.setAttribute("role", "alert")
  toast.setAttribute("aria-live", "assertive")
  toast.setAttribute("aria-atomic", "true")
  toast.style.minWidth = "300px"
  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="${toastIcons[type]} me-2 fs-5"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `

  toastContainer.appendChild(toast)

  // Initialize Bootstrap toast
  const bootstrap = window.bootstrap // Declare bootstrap variable
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 4000,
  })

  // Add entrance animation
  toast.style.transform = "translateX(100%)"
  toast.style.transition = "transform 0.3s ease"

  setTimeout(() => {
    toast.style.transform = "translateX(0)"
  }, 10)

  bsToast.show()

  toast.addEventListener("hidden.bs.toast", () => {
    toast.style.transform = "translateX(100%)"
    setTimeout(() => {
      toast.remove()
    }, 300)
  })
}

function createToastContainer() {
  const container = document.createElement("div")
  container.id = "toast-container"
  container.className = "toast-container position-fixed top-0 end-0 p-3"
  container.style.zIndex = "9999"
  container.style.marginTop = "80px"
  document.body.appendChild(container)
  return container
}

// Navbar scroll effect
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar")
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled")
  } else {
    navbar.classList.remove("scrolled")
  }
})

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault()
    const target = document.querySelector(this.getAttribute("href"))
    if (target) {
      const offsetTop = target.offsetTop - 100
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      })
    }
  })
})

// Enhanced loading states for buttons
document.querySelectorAll("button:not(.no-loading)").forEach((button) => {
  button.addEventListener("click", function () {
    if (!this.disabled && !this.classList.contains("loading")) {
      this.classList.add("loading")

      setTimeout(() => {
        this.classList.remove("loading")
      }, 1000)
    }
  })
})

console.log("🚀 iPhone 16 Pro product detail page initialized successfully!")
console.log("📱 Product:", productData.name, productData.storage, productData.color)
console.log("💰 Price:", productData.price.currency + productData.price.current)
