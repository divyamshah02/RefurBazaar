document.addEventListener("DOMContentLoaded", () => {
  initializeShop()
})

const categoryConfig = {
  Smartphones: {
    brands: ["Apple", "Samsung", "OnePlus", "Google", "Xiaomi", "Realme"],
    additionalFilters: {
      title: "Storage",
      options: ["64GB", "128GB", "256GB", "512GB", "1TB"],
    },
    colors: ["Black", "White", "Blue", "Red", "Green", "Purple"],
  },
  Laptops: {
    brands: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer"],
    additionalFilters: {
      title: "RAM",
      options: ["8GB", "16GB", "32GB", "64GB"],
    },
    colors: ["Silver", "Space Gray", "Black", "White"],
  },
  Desktops: {
    brands: ["Dell", "HP", "Apple", "Lenovo", "ASUS"],
    additionalFilters: {
      title: "Processor",
      options: ["Intel i5", "Intel i7", "Intel i9", "AMD Ryzen 5", "AMD Ryzen 7"],
    },
    colors: ["Black", "Silver", "White"],
  },
  Tablets: {
    brands: ["Apple", "Samsung", "Microsoft", "Lenovo"],
    additionalFilters: {
      title: "Screen Size",
      options: ["7-8 inch", "9-10 inch", "11-12 inch", "13+ inch"],
    },
    colors: ["Space Gray", "Silver", "Gold", "Rose Gold"],
  },
  "Smart Watches": {
    brands: ["Apple", "Samsung", "Fitbit", "Garmin", "Amazfit"],
    additionalFilters: {
      title: "Band Type",
      options: ["Sport Band", "Leather", "Metal", "Fabric"],
    },
    colors: ["Black", "White", "Silver", "Gold", "Rose Gold"],
  },
  Audio: {
    brands: ["Apple", "Sony", "Bose", "JBL", "Sennheiser", "Audio-Technica"],
    additionalFilters: {
      title: "Type",
      options: ["Headphones", "Earbuds", "Speakers", "Soundbars"],
    },
    colors: ["Black", "White", "Silver", "Blue", "Red"],
  },
  Cameras: {
    brands: ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic"],
    additionalFilters: {
      title: "Type",
      options: ["DSLR", "Mirrorless", "Point & Shoot", "Action Camera"],
    },
    colors: ["Black", "Silver", "White"],
  },
  "Gaming Consoles": {
    brands: ["Sony", "Microsoft", "Nintendo"],
    additionalFilters: {
      title: "Storage",
      options: ["500GB", "1TB", "2TB"],
    },
    colors: ["Black", "White", "Blue", "Red"],
  },
  "Accessories & Bundles": {
    brands: ["Apple", "Samsung", "Anker", "Belkin", "Logitech"],
    additionalFilters: {
      title: "Type",
      options: ["Cases", "Chargers", "Cables", "Stands", "Bundles"],
    },
    colors: ["Black", "White", "Clear", "Blue", "Red"],
  },
}

const productsDatabase = [
  // Smartphones
  {
    id: 1,
    category: "Smartphones",
    brand: "Apple",
    name: "iPhone 13 Pro - 128GB Midnight",
    condition: "excellent",
    storage: "128GB",
    color: "Black",
    price: 65999,
    originalPrice: 129900,
    discount: 49,
    rating: 5,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 2,
    category: "Smartphones",
    brand: "Samsung",
    name: "Samsung Galaxy S22 - 128GB",
    condition: "excellent",
    storage: "128GB",
    color: "Black",
    price: 45999,
    originalPrice: 72999,
    discount: 37,
    rating: 5,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 3,
    category: "Smartphones",
    brand: "OnePlus",
    name: "OnePlus 10 Pro - 256GB",
    condition: "good",
    storage: "256GB",
    color: "Black",
    price: 42999,
    originalPrice: 66999,
    discount: 36,
    rating: 4,
    reviews: 45,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 4,
    category: "Smartphones",
    brand: "Google",
    name: "Google Pixel 7 - 128GB",
    condition: "verygood",
    storage: "128GB",
    color: "White",
    price: 38999,
    originalPrice: 59999,
    discount: 35,
    rating: 4,
    reviews: 78,
    image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 5,
    category: "Smartphones",
    brand: "Xiaomi",
    name: "Xiaomi 12 Pro - 256GB",
    condition: "excellent",
    storage: "256GB",
    color: "Blue",
    price: 35999,
    originalPrice: 49999,
    discount: 28,
    rating: 4,
    reviews: 92,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 6,
    category: "Smartphones",
    brand: "Realme",
    name: "Realme GT 2 Pro - 128GB",
    condition: "verygood",
    storage: "128GB",
    color: "Green",
    price: 28999,
    originalPrice: 42999,
    discount: 33,
    rating: 4,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },

  // Laptops
  {
    id: 7,
    category: "Laptops",
    brand: "Apple",
    name: "MacBook Air M1 - 256GB Silver",
    condition: "verygood",
    ram: "8GB",
    color: "Silver",
    price: 89999,
    originalPrice: 114900,
    discount: 22,
    rating: 4,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 8,
    category: "Laptops",
    brand: "Dell",
    name: "Dell XPS 13 - 512GB",
    condition: "excellent",
    ram: "16GB",
    color: "Silver",
    price: 75999,
    originalPrice: 95999,
    discount: 21,
    rating: 4,
    reviews: 134,
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 9,
    category: "Laptops",
    brand: "HP",
    name: "HP Spectre x360 - 1TB",
    condition: "good",
    ram: "16GB",
    color: "Black",
    price: 68999,
    originalPrice: 89999,
    discount: 23,
    rating: 4,
    reviews: 76,
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },

  // Tablets
  {
    id: 10,
    category: "Tablets",
    brand: "Apple",
    name: "iPad Air - 64GB WiFi",
    condition: "verygood",
    screenSize: "9-10 inch",
    color: "Space Gray",
    price: 39999,
    originalPrice: 54900,
    discount: 27,
    rating: 4,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 11,
    category: "Tablets",
    brand: "Samsung",
    name: "Samsung Galaxy Tab S8 - 128GB",
    condition: "excellent",
    screenSize: "11-12 inch",
    color: "Silver",
    price: 45999,
    originalPrice: 62999,
    discount: 27,
    rating: 4,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1561154464828-5e560c06d30e?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },

  // Audio
  {
    id: 12,
    category: "Audio",
    brand: "Apple",
    name: "AirPods Pro (2nd Generation)",
    condition: "excellent",
    type: "Earbuds",
    color: "White",
    price: 18999,
    originalPrice: 24900,
    discount: 24,
    rating: 5,
    reviews: 203,
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 13,
    category: "Audio",
    brand: "Sony",
    name: "Sony WH-1000XM4 Headphones",
    condition: "verygood",
    type: "Headphones",
    color: "Black",
    price: 22999,
    originalPrice: 29990,
    discount: 23,
    rating: 5,
    reviews: 178,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 14,
    category: "Audio",
    brand: "JBL",
    name: "JBL Charge 5 Speaker",
    condition: "excellent",
    type: "Speakers",
    color: "Blue",
    price: 12999,
    originalPrice: 17999,
    discount: 28,
    rating: 4,
    reviews: 145,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e0?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },

  // Smart Watches
  {
    id: 15,
    category: "Smart Watches",
    brand: "Apple",
    name: "Apple Watch Series 8 - 45mm",
    condition: "excellent",
    bandType: "Sport Band",
    color: "Black",
    price: 35999,
    originalPrice: 45900,
    discount: 22,
    rating: 5,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 16,
    category: "Smart Watches",
    brand: "Samsung",
    name: "Samsung Galaxy Watch 5 - 44mm",
    condition: "verygood",
    bandType: "Metal",
    color: "Silver",
    price: 24999,
    originalPrice: 32999,
    discount: 24,
    rating: 4,
    reviews: 156,
    image: "https://images.unsplash.com/photo-15516986181dfe5d97d256?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },

  // Gaming Consoles
  {
    id: 17,
    category: "Gaming Consoles",
    brand: "Sony",
    name: "PlayStation 5 - 825GB",
    condition: "excellent",
    storage: "1TB",
    color: "White",
    price: 45999,
    originalPrice: 49990,
    discount: 8,
    rating: 5,
    reviews: 289,
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },
  {
    id: 18,
    category: "Gaming Consoles",
    brand: "Microsoft",
    name: "Xbox Series X - 1TB",
    condition: "verygood",
    storage: "1TB",
    color: "Black",
    price: 42999,
    originalPrice: 49990,
    discount: 14,
    rating: 5,
    reviews: 198,
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=250&h=250&fit=crop",
    features: ["5 Days Refund"],
  },

  // Note: Desktops, Cameras, and Accessories & Bundles are intentionally left empty to show empty state
]

let currentCategory = "Smartphones"
let filteredProducts = []

function initializeShop() {
  // Initialize category navigation
  initializeCategoryNavigation()

  initializeCategorySelect()

  // Initialize filters for default category
  updateFiltersForCategory(currentCategory)

  // Load products for default category
  loadProductsForCategory(currentCategory)

  // Initialize event listeners
  initializeEventListeners()
}

function initializeCategorySelect() {
  const categorySelect = document.getElementById("categorySelect")
  if (categorySelect) {
    // Set initial value
    categorySelect.value = currentCategory

    // Add change event listener
    categorySelect.addEventListener("change", (e) => {
      const selectedCategory = e.target.value

      // Update current category
      currentCategory = selectedCategory

      // Update category navigation active state
      updateCategoryNavigation(selectedCategory)

      // Update filters and products
      updateFiltersForCategory(currentCategory)
      loadProductsForCategory(currentCategory)

      console.log("[v0] Category changed to:", selectedCategory)
    })
  }
}

function updateCategoryNavigation(selectedCategory) {
  const categoryItems = document.querySelectorAll(".category-item[data-category]")
  categoryItems.forEach((item) => {
    item.classList.remove("active")
    if (item.dataset.category === selectedCategory) {
      item.classList.add("active")
    }
  })
}

function initializeCategoryNavigation() {
  const categoryItems = document.querySelectorAll(".category-item[data-category]")
  categoryItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()

      // Remove active class from all items
      categoryItems.forEach((cat) => cat.classList.remove("active"))

      // Add active class to clicked item
      item.classList.add("active")

      // Update current category
      currentCategory = item.dataset.category

      const categorySelect = document.getElementById("categorySelect")
      if (categorySelect) {
        categorySelect.value = currentCategory
      }

      // Update filters and products
      updateFiltersForCategory(currentCategory)
      loadProductsForCategory(currentCategory)

      console.log("[v0] Category navigation clicked:", currentCategory)
    })
  })
}

function updateFiltersForCategory(category) {
  const config = categoryConfig[category]
  if (!config) {
    console.log("[v0] No config found for category:", category)
    return
  }

  console.log("[v0] Updating filters for category:", category)

  // Update category title
  document.getElementById("categoryTitle").textContent = category

  // Update brand filters
  updateBrandFilters(config.brands)

  // Update additional filters
  updateAdditionalFilters(config.additionalFilters)
}

function updateBrandFilters(brands) {
  const brandFiltersContainer = document.getElementById("brandFilters")
  brandFiltersContainer.innerHTML = ""

  brands.forEach((brand) => {
    const productCount = productsDatabase.filter((p) => p.category === currentCategory && p.brand === brand).length

    const filterDiv = document.createElement("div")
    filterDiv.className = "form-check"
    filterDiv.innerHTML = `
      <input class="form-check-input" type="checkbox" id="brand-${brand.replace(/\s+/g, "")}">
      <label class="form-check-label" for="brand-${brand.replace(/\s+/g, "")}">
        ${brand} <span class="count">(${productCount})</span>
      </label>
    `
    brandFiltersContainer.appendChild(filterDiv)
  })
}

function updateAdditionalFilters(additionalFilters) {
  const additionalFiltersSection = document.getElementById("additionalFiltersSection")
  const additionalFiltersTitle = document.getElementById("additionalFiltersTitle")
  const additionalFiltersContainer = document.getElementById("additionalFilters")

  if (additionalFilters && additionalFilters.options.length > 0) {
    additionalFiltersSection.style.display = "block"
    additionalFiltersTitle.textContent = additionalFilters.title
    additionalFiltersContainer.innerHTML = ""

    additionalFilters.options.forEach((option) => {
      const filterKey = additionalFilters.title.toLowerCase().replace(/\s+/g, "")
      const productCount = productsDatabase.filter((p) => {
        if (p.category !== currentCategory) return false
        const productValue = p[filterKey] || p[additionalFilters.title.toLowerCase()]
        return productValue === option
      }).length

      const filterDiv = document.createElement("div")
      filterDiv.className = "form-check"
      filterDiv.innerHTML = `
        <input class="form-check-input" type="checkbox" id="additional-${option.replace(/\s+/g, "")}">
        <label class="form-check-label" for="additional-${option.replace(/\s+/g, "")}">
          ${option} <span class="count">(${productCount})</span>
        </label>
      `
      additionalFiltersContainer.appendChild(filterDiv)
    })
  } else {
    additionalFiltersSection.style.display = "none"
  }
}

function loadProductsForCategory(category) {
  const categoryProducts = productsDatabase.filter((p) => p.category === category)
  filteredProducts = categoryProducts

  displayProducts(filteredProducts)
  updateConditionCounts(filteredProducts)
  updateResultsCount(filteredProducts.length)

  // Show empty state if no products
  if (filteredProducts.length === 0) {
    showEmptyState()
  } else {
    hideEmptyState()
  }
}

function displayProducts(products) {
  const productsContainer = document.getElementById("productsContainer")
  productsContainer.innerHTML = ""

  products.forEach((product) => {
    const productCard = createProductCard(product)
    productsContainer.appendChild(productCard)
  })
}

function createProductCard(product) {
  const col = document.createElement("div")
  col.className = "col-lg-3 col-md-6 col-sm-6 mb-4"

  const discountBadgeClass =
    product.condition === "excellent" ? "excellent" : product.condition === "verygood" ? "very-good" : "good"

  const stars = Array(5)
    .fill(0)
    .map((_, i) => `<i class="fa${i < product.rating ? "s" : "r"} fa-star"></i>`)
    .join("")

  col.innerHTML = `
    <div class="product-card" data-category="${product.category}" data-brand="${product.brand}" 
         data-condition="${product.condition}" data-price="${product.price}">
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-badge ${discountBadgeClass}">${product.discount}% OFF</div>
        <div class="product-actions">
          <button class="btn-wishlist" onclick="addToWishlist(${product.id})">
            <i class="fas fa-heart"></i>
          </button>
          <button class="btn-quick-view" onclick="quickView(${product.id})">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
      <div class="product-content">
        <div class="product-rating">
          <div class="stars">${stars}</div>
          <span class="rating-text">(${product.reviews})</span>
        </div>
        <h6 class="product-title"><a href="product-detail.html">${product.name}</a></h6>
        <p class="text-muted">${product.condition.charAt(0).toUpperCase() + product.condition.slice(1)} Condition • ${product.color}</p>
        <div class="product-price">
          <span class="current-price">₹${product.price.toLocaleString()}</span>
          <span class="original-price">₹${product.originalPrice.toLocaleString()}</span>
          <span class="discount">${product.discount}% OFF</span>
        </div>
        <div class="product-features">
          ${product.features
            .map(
              (feature) => `
            <div class="feature">
              <i class="fas fa-shield-alt"></i>
              <span>${feature}</span>
            </div>
          `,
            )
            .join("")}
        </div>
        <button class="btn btn-primary product-btn" onclick="addToCart(${product.id})">Add to Cart</button>
      </div>
    </div>
  `

  return col
}

function updateConditionCounts(products) {
  const excellentCount = products.filter((p) => p.condition === "excellent").length
  const verygoodCount = products.filter((p) => p.condition === "verygood").length
  const goodCount = products.filter((p) => p.condition === "good").length

  document.getElementById("excellentCount").textContent = `(${excellentCount})`
  document.getElementById("verygoodCount").textContent = `(${verygoodCount})`
  document.getElementById("goodCount").textContent = `(${goodCount})`
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById("resultsCount")
  resultsCount.textContent = `Showing 1-${Math.min(24, count)} of ${count} results`
}

function showEmptyState() {
  document.getElementById("emptyState").style.display = "block"
  document.getElementById("productsGrid").style.display = "none"
  document.getElementById("paginationNav").style.display = "none"
}

function hideEmptyState() {
  document.getElementById("emptyState").style.display = "none"
  document.getElementById("productsGrid").style.display = "block"
  document.getElementById("paginationNav").style.display = "block"
}

function initializeEventListeners() {
  // Filter checkboxes
  document.addEventListener("change", (e) => {
    if (e.target.type === "checkbox" && e.target.closest(".filter-options")) {
      applyFilters()
    }
  })

  // Price range inputs
  const minPrice = document.getElementById("minPrice")
  const maxPrice = document.getElementById("maxPrice")

  if (minPrice && maxPrice) {
    minPrice.addEventListener("input", applyFilters)
    maxPrice.addEventListener("input", applyFilters)
  }

  // Sort select
  const sortSelect = document.getElementById("sortBy")
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      sortProducts(this.value)
    })
  }
}

function applyFilters() {
  let filtered = productsDatabase.filter((p) => p.category === currentCategory)

  // Brand filters
  const selectedBrands = getSelectedFilters("brand-")
  if (selectedBrands.length > 0) {
    filtered = filtered.filter((p) =>
      selectedBrands.some((brand) => p.brand.replace(/\s+/g, "") === brand.replace("brand-", "")),
    )
  }

  // Condition filters
  const selectedConditions = getSelectedFilters(["excellent", "verygood", "good"])
  if (selectedConditions.length > 0) {
    filtered = filtered.filter((p) => selectedConditions.includes(p.condition))
  }

  // Price filters
  const minPrice = document.getElementById("minPrice").value
  const maxPrice = document.getElementById("maxPrice").value

  if (minPrice) {
    filtered = filtered.filter((p) => p.price >= Number.parseInt(minPrice))
  }
  if (maxPrice) {
    filtered = filtered.filter((p) => p.price <= Number.parseInt(maxPrice))
  }

  // Additional filters (storage, RAM, etc.)
  const additionalSelected = getSelectedFilters("additional-")
  if (additionalSelected.length > 0) {
    const config = categoryConfig[currentCategory]
    if (config && config.additionalFilters) {
      const filterKey = config.additionalFilters.title.toLowerCase().replace(/\s+/g, "")
      filtered = filtered.filter((p) => {
        const productValue = p[filterKey] || p[config.additionalFilters.title.toLowerCase()]
        return additionalSelected.some(
          (selected) =>
            productValue ===
            selected
              .replace("additional-", "")
              .replace(/([A-Z])/g, " $1")
              .trim(),
        )
      })
    }
  }

  filteredProducts = filtered
  displayProducts(filteredProducts)
  updateResultsCount(filteredProducts.length)

  if (filteredProducts.length === 0) {
    showEmptyState()
  } else {
    hideEmptyState()
  }
}

function getSelectedFilters(prefix) {
  if (Array.isArray(prefix)) {
    return prefix.filter((id) => document.getElementById(id)?.checked)
  }

  const checkboxes = document.querySelectorAll(`input[id^="${prefix}"]:checked`)
  return Array.from(checkboxes).map((cb) => cb.id)
}

function sortProducts(sortBy) {
  const productsGrid = document.querySelector(".products-grid .row")
  const products = Array.from(productsGrid.children)

  products.sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return getPriceFromElement(a) - getPriceFromElement(b)
      case "price-high":
        return getPriceFromElement(b) - getPriceFromElement(a)
      case "rating":
        return getRatingFromElement(b) - getRatingFromElement(a)
      case "newest":
        return 0 // Would implement based on date
      default:
        return 0
    }
  })

  // Re-append sorted products
  products.forEach((product) => productsGrid.appendChild(product))
}

function getPriceFromElement(element) {
  const priceText = element.querySelector(".current-price").textContent
  return Number.parseInt(priceText.replace("₹", "").replace(/,/g, ""))
}

function getRatingFromElement(element) {
  const stars = element.querySelectorAll(".stars .fas.fa-star").length
  return stars
}

function setPriceRange(min, max) {
  document.getElementById("minPrice").value = min
  document.getElementById("maxPrice").value = max
  applyFilters()
}

function clearFilters() {
  // Clear all filter checkboxes
  const checkboxes = document.querySelectorAll('.filter-options input[type="checkbox"]')
  checkboxes.forEach((cb) => (cb.checked = false))

  // Clear price inputs
  document.getElementById("minPrice").value = ""
  document.getElementById("maxPrice").value = ""

  // Reload products for current category
  loadProductsForCategory(currentCategory)

  showToast("Filters cleared!", "info")
}

function setGridView() {
  document.querySelector(".view-toggle .btn:first-child").classList.add("active")
  document.querySelector(".view-toggle .btn:last-child").classList.remove("active")
}

function setListView() {
  document.querySelector(".view-toggle .btn:last-child").classList.add("active")
  document.querySelector(".view-toggle .btn:first-child").classList.remove("active")
}

function addToCart(productId) {
  console.log(`Adding product ${productId} to cart`)
  showToast("Product added to cart!", "success")

  // Update cart badge
  const cartBadge = document.querySelector(".badge")
  if (cartBadge) {
    const currentCount = Number.parseInt(cartBadge.textContent)
    cartBadge.textContent = currentCount + 1
  }
}

function addToWishlist(productId) {
  console.log(`Adding product ${productId} to wishlist`)
  showToast("Product added to wishlist!", "success")
}

function quickView(productId) {
  console.log(`Quick view for product ${productId}`)
}

function showToast(message, type = "info") {
  const toast = document.createElement("div")
  toast.className = `toast align-items-center text-white bg-${type} border-0`
  toast.setAttribute("role", "alert")
  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `

  document.body.appendChild(toast)
  const bsToast = window.bootstrap.Toast(toast)
  bsToast.show()

  // Remove toast after it's hidden
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove()
  })
}
