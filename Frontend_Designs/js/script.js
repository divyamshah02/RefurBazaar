// Import Swiper from CDN or local file
// Assuming Swiper is imported via CDN, no need to declare it here

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Swiper for Hero Slider
  const heroSwiper = new window.Swiper(".heroSwiper", {
    loop: true,
    autoplay: {
      delay: 4000, // Auto-slide every 4 seconds
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
      dynamicBullets: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    effect: "fade",
    fadeEffect: {
      crossFade: true,
    },
    speed: 1000,
    on: {
      init: () => {
        console.log("Hero slider initialized successfully for vertical layout")
      },
      slideChange: function () {
        // Enhanced slide change animations
        const activeSlide = this.slides[this.activeIndex]
        const slideContent = activeSlide.querySelector(".slide-content")
        if (slideContent) {
          slideContent.style.opacity = "0"
          slideContent.style.transform = "translateY(30px)"
          setTimeout(() => {
            slideContent.style.transition = "all 0.8s ease"
            slideContent.style.opacity = "1"
            slideContent.style.transform = "translateY(0)"
          }, 200)
        }
      },
    },
  })

  // Enhanced search functionality
  const searchInput = document.querySelector(".search-input")
  const searchBtn = document.querySelector(".search-btn")

  if (searchInput && searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault()
      const query = searchInput.value.trim()
      if (query) {
        console.log("Search query:", query)
        showToast(`Searching for "${query}"...`, "info")
        // Simulate search redirect
        setTimeout(() => {
          window.location.href = `products.html?search=${encodeURIComponent(query)}`
        }, 1000)
      }
    })

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBtn.click()
      }
    })

    // Search suggestions
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim()
      if (query.length > 2) {
        // Show search suggestions (placeholder)
        console.log("Showing suggestions for:", query)
      }
    })
  }

  const filterBtns = document.querySelectorAll(".filter-btn")
  const productsGrid = document.getElementById("productsGrid")
  const productCards = document.querySelectorAll("#productsGrid .col-lg-3")

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Remove active from all buttons
      filterBtns.forEach((b) => b.classList.remove("active"))
      this.classList.add("active")

      const filter = this.dataset.filter
      let visibleCount = 0

      // Filter products with animation
      productCards.forEach((card, index) => {
        const category = card.dataset.category

        setTimeout(() => {
          if (filter === "all" || category === filter) {
            card.style.display = "block"
            card.style.opacity = "0"
            card.style.transform = "translateY(20px)"

            setTimeout(() => {
              card.style.transition = "all 0.5s ease"
              card.style.opacity = "1"
              card.style.transform = "translateY(0)"
            }, 50)

            visibleCount++
          } else {
            card.style.transition = "all 0.3s ease"
            card.style.opacity = "0"
            card.style.transform = "translateY(-20px)"

            setTimeout(() => {
              card.style.display = "none"
            }, 300)
          }
        }, index * 50)
      })

      // Show filter results
      // setTimeout(() => {
      //   if (typeof showToast === "function") {
      //     showToast(`Found ${visibleCount} products`, "success")
      //   }
      // }, 500)
    })
  })

  const calculatorForm = document.getElementById("priceCalculatorForm")
  if (calculatorForm) {
    const categorySelect = document.getElementById("deviceCategory")
    const brandSelect = document.getElementById("deviceBrand")
    const modelSelect = document.getElementById("deviceModel")
    const conditionSelect = document.getElementById("deviceCondition")

    // Enhanced device data for price calculation
    const deviceData = {
      "": {},
      smartphone: {
        "": [],
        Apple: [
          "iPhone 15 Pro Max",
          "iPhone 15 Pro",
          "iPhone 15",
          "iPhone 14 Pro Max",
          "iPhone 14 Pro",
          "iPhone 14",
          "iPhone 13 Pro",
          "iPhone 13",
          "iPhone 12 Pro",
          "iPhone 12",
        ],
        Samsung: [
          "Galaxy S24 Ultra",
          "Galaxy S24+",
          "Galaxy S24",
          "Galaxy S23 Ultra",
          "Galaxy S23+",
          "Galaxy S23",
          "Galaxy S22 Ultra",
          "Galaxy Note 20",
          "Galaxy S21",
        ],
        OnePlus: ["OnePlus 12", "OnePlus 11", "OnePlus 10 Pro", "OnePlus 9 Pro", "OnePlus 8T", "OnePlus Nord"],
        Google: ["Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7", "Pixel 6 Pro", "Pixel 6"],
      },
      laptop: {
        "": [],
        Apple: [
          'MacBook Pro M3 16"',
          'MacBook Pro M3 14"',
          'MacBook Pro M2 16"',
          'MacBook Pro M2 14"',
          "MacBook Air M2",
          "MacBook Pro M1",
          "MacBook Air M1",
        ],
        Dell: ["XPS 13 Plus", "XPS 15", "XPS 17", "Inspiron 15 3000", "Latitude 7420", "Alienware m15"],
        HP: ["Spectre x360", "Pavilion 15", "EliteBook 840", "Omen 15", "Envy 13", "ProBook 450"],
        Lenovo: ["ThinkPad X1 Carbon", "IdeaPad 5", "Legion 5", "Yoga 9i", "ThinkBook 15", "ThinkPad T14"],
      },
      tablet: {
        "": [],
        Apple: ['iPad Pro 12.9" M2', 'iPad Pro 11" M2', "iPad Air 5th Gen", "iPad 10th Gen", "iPad Mini 6th Gen"],
        Samsung: ["Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab A8", "Galaxy Tab S8"],
        Microsoft: ["Surface Pro 9", "Surface Pro 8", "Surface Go 3", "Surface Book 3"],
      },
      gaming: {
        "": [],
        Sony: ["PlayStation 5", "PlayStation 4 Pro", "PlayStation 4 Slim", "PlayStation VR2"],
        Microsoft: ["Xbox Series X", "Xbox Series S", "Xbox One X", "Xbox One S"],
        Nintendo: ["Nintendo Switch OLED", "Nintendo Switch", "Nintendo Switch Lite"],
      },
    }

    // Price ranges for different devices
    const priceRanges = {
      "iPhone 15 Pro Max": { min: 120000, max: 150000 },
      "iPhone 14 Pro Max": { min: 85000, max: 120000 },
      "iPhone 14 Pro": { min: 75000, max: 105000 },
      "iPhone 13 Pro": { min: 65000, max: 85000 },
      "Galaxy S24 Ultra": { min: 80000, max: 110000 },
      "Galaxy S23 Ultra": { min: 70000, max: 95000 },
      'MacBook Pro M3 16"': { min: 200000, max: 280000 },
      'MacBook Pro M2 16"': { min: 180000, max: 250000 },
      "MacBook Air M2": { min: 85000, max: 120000 },
      'iPad Pro 12.9" M2': { min: 85000, max: 120000 },
      "PlayStation 5": { min: 45000, max: 55000 },
      "Xbox Series X": { min: 42000, max: 52000 },
    }

    categorySelect.addEventListener("change", function () {
      const category = this.value
      brandSelect.innerHTML = '<option value="">Select brand</option>'
      modelSelect.innerHTML = '<option value="">Select model</option>'

      if (deviceData[category]) {
        Object.keys(deviceData[category]).forEach((brand) => {
          if (brand !== "") {
            const option = document.createElement("option")
            option.value = brand
            option.textContent = brand
            brandSelect.appendChild(option)
          }
        })
      }
    })

    brandSelect.addEventListener("change", function () {
      const category = categorySelect.value
      const brand = this.value
      modelSelect.innerHTML = '<option value="">Select model</option>'

      if (deviceData[category] && deviceData[category][brand]) {
        deviceData[category][brand].forEach((model) => {
          const option = document.createElement("option")
          option.value = model
          option.textContent = model
          modelSelect.appendChild(option)
        })
      }
    })

    calculatorForm.addEventListener("submit", function (e) {
      e.preventDefault()
      const category = categorySelect.value
      const brand = brandSelect.value
      const model = modelSelect.value
      const condition = conditionSelect.value

      if (category && brand && model && condition) {
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]')
        const originalText = submitBtn.textContent
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Calculating...'
        submitBtn.disabled = true

        setTimeout(() => {
          // Calculate price based on model
          const basePrice = priceRanges[model]
            ? Math.floor(Math.random() * (priceRanges[model].max - priceRanges[model].min) + priceRanges[model].min)
            : Math.floor(Math.random() * 50000) + 10000

          // Adjust price based on condition
          const conditionMultiplier = {
            excellent: 0.85,
            good: 0.75,
            fair: 0.65,
          }

          const finalPrice = Math.floor(basePrice * conditionMultiplier[condition])

          // Show price result
          const priceResult = document.getElementById("priceResult")
          const estimatedPrice = document.getElementById("estimatedPrice")

          if (priceResult && estimatedPrice) {
            estimatedPrice.textContent = `₹${finalPrice.toLocaleString()}`
            priceResult.style.display = "block"
            priceResult.scrollIntoView({ behavior: "smooth", block: "nearest" })
          }

          showToast(`Estimated price: ₹${finalPrice.toLocaleString()}`, "success")

          // Reset button
          submitBtn.innerHTML = originalText
          submitBtn.disabled = false
        }, 2000)
      } else {
        showToast("Please fill all fields to get price quote", "warning")
      }
    })
  }
  // Enhanced shopping cart functionality
  const cart = JSON.parse(localStorage.getItem("refurbtech_cart")) || []
  updateCartCounter()

  function updateCartCounter() {
    const cartCounter = document.getElementById("cartCount")
    if (cartCounter) {
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
      cartCounter.textContent = totalItems
    }
  }

  const categoryItems = document.querySelectorAll(".category-item-wrapper")

  categoryItems.forEach((item) => {
    const dropdown = item.querySelector(".category-dropdown")
    let hoverTimeout

    if (dropdown) {
      item.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimeout)
        dropdown.style.display = "block"
        dropdown.style.opacity = "0"
        dropdown.style.transform = "translateY(-10px)"

        setTimeout(() => {
          dropdown.style.transition = "all 0.3s ease"
          dropdown.style.opacity = "1"
          dropdown.style.transform = "translateY(0)"
        }, 10)
      })

      item.addEventListener("mouseleave", () => {
        hoverTimeout = setTimeout(() => {
          dropdown.style.transition = "all 0.3s ease"
          dropdown.style.opacity = "0"
          dropdown.style.transform = "translateY(-10px)"

          setTimeout(() => {
            dropdown.style.display = "none"
          }, 300)
        }, 100)
      })

      // Keep dropdown open when hovering over it
      dropdown.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimeout)
      })

      dropdown.addEventListener("mouseleave", () => {
        hoverTimeout = setTimeout(() => {
          dropdown.style.transition = "all 0.3s ease"
          dropdown.style.opacity = "0"
          dropdown.style.transform = "translateY(-10px)"

          setTimeout(() => {
            dropdown.style.display = "none"
          }, 300)
        }, 100)
      })
    }
  })

  // Enhanced smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        const offsetTop = target.offsetTop - 100 // Account for fixed navbar
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        })
      }
    })
  })

  function startSaleTimer() {
    const timerElements = {
      days: document.getElementById("days"),
      hours: document.getElementById("hours"),
      minutes: document.getElementById("minutes"),
      seconds: document.getElementById("seconds"),
    }

    // Set sale end date (7 days from now)
    const saleEndDate = new Date()
    saleEndDate.setDate(saleEndDate.getDate() + 7)

    function updateTimer() {
      const now = new Date().getTime()
      const distance = saleEndDate.getTime() - now

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)

        if (timerElements.days) timerElements.days.textContent = days.toString().padStart(2, "0")
        if (timerElements.hours) timerElements.hours.textContent = hours.toString().padStart(2, "0")
        if (timerElements.minutes) timerElements.minutes.textContent = minutes.toString().padStart(2, "0")
        if (timerElements.seconds) timerElements.seconds.textContent = seconds.toString().padStart(2, "0")
      } else {
        // Sale ended
        Object.values(timerElements).forEach((element) => {
          if (element) element.textContent = "00"
        })
      }
    }

    updateTimer()
    setInterval(updateTimer, 1000)
  }

  startSaleTimer()
})

window.addToCart = (productId) => {
  const cart = JSON.parse(localStorage.getItem("refurbtech_cart")) || []

  const productCard =
    document.querySelector(`[data-product-id="${productId}"]`) ||
    document.querySelector(`button[onclick="addToCart('${productId}')"]`).closest(".product-card")

  if (productCard) {
    const productTitle = productCard.querySelector(".product-title").textContent
    const productPrice = productCard.querySelector(".current-price").textContent
    const productImage = productCard.querySelector("img").src

    const productData = {
      id: productId,
      title: productTitle,
      price: productPrice,
      image: productImage,
      quantity: 1,
      addedAt: new Date().toISOString(),
    }

    // Check if item already in cart
    const existingItem = cart.find((item) => item.id === productId)
    if (existingItem) {
      existingItem.quantity += 1
      showToast("Quantity updated in cart", "info")
    } else {
      cart.push(productData)
      showToast("Added to cart", "success")
    }

    localStorage.setItem("refurbtech_cart", JSON.stringify(cart))

    // Update cart counter
    const cartCounter = document.getElementById("cartCount")
    if (cartCounter) {
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
      cartCounter.textContent = totalItems
    }

    // Enhanced visual feedback
    const button = document.querySelector(`button[onclick="addToCart('${productId}')"]`)
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
}

window.proceedToSell = () => {
  showToast("Redirecting to sell process...", "info")
  setTimeout(() => {
    // In a real app, this would redirect to a sell form
    window.location.href = "#sell"
  }, 1000)
}

// Initialize AOS animations
if (typeof window.AOS !== "undefined") {
  window.AOS.init({
    duration: 1000,
    once: true,
    offset: 100,
    easing: "ease-out-cubic",
  })
}

// Enhanced navbar scroll effect
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar")
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled")
  } else {
    navbar.classList.remove("scrolled")
  }
})

// Counter animation for hero stats
function animateCounters() {
  const counters = document.querySelectorAll(".stat-number")

  counters.forEach((counter) => {
    const target = counter.textContent
    const numericValue = Number.parseInt(target.replace(/[^\d]/g, ""))
    const suffix = target.replace(/[\d]/g, "")

    let current = 0
    const increment = numericValue / 100
    const timer = setInterval(() => {
      current += increment
      if (current >= numericValue) {
        counter.textContent = target
        clearInterval(timer)
      } else {
        counter.textContent = Math.floor(current) + suffix
      }
    }, 30)
  })
}

// Trigger counter animation when hero section is visible
const heroSection = document.querySelector(".hero-section")
if (heroSection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setTimeout(animateCounters, 1000)
        observer.unobserve(entry.target)
      }
    })
  })
  observer.observe(heroSection)
}

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
  const bsToast = new window.bootstrap.Toast(toast, {
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
  container.style.marginTop = "80px" // Account for navbar
  document.body.appendChild(container)
  return container
}

// Enhanced parallax effects
let scrollTimeout
window.addEventListener("scroll", () => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  scrollTimeout = setTimeout(() => {
    // Parallax effect for floating elements
    const scrolled = window.pageYOffset
    const parallaxElements = document.querySelectorAll(".floating-badge")
    const speed = 0.5

    parallaxElements.forEach((element) => {
      const yPos = -(scrolled * speed)
      element.style.transform = `translateY(${yPos}px)`
    })
  }, 10)
})

// Enhanced card hover effects
document.querySelectorAll(".product-card, .category-card, .review-card, .trust-card").forEach((card) => {
  card.addEventListener("mouseenter", function () {
    this.style.transform = "translateY(-10px) scale(1.02)"
  })

  card.addEventListener("mouseleave", function () {
    this.style.transform = ""
  })
})

// Service Worker registration for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}

// Dark mode toggle (if implemented)
const darkModeToggle = document.getElementById("darkModeToggle")
if (darkModeToggle) {
  const currentTheme = localStorage.getItem("refurbtech_theme") || "light"
  document.documentElement.setAttribute("data-theme", currentTheme)

  darkModeToggle.addEventListener("click", () => {
    const theme = document.documentElement.getAttribute("data-theme")
    const newTheme = theme === "dark" ? "light" : "dark"

    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("refurbtech_theme", newTheme)

    showToast(`Switched to ${newTheme} mode`, "success")
  })
}

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

// Performance optimization: Intersection Observer for animations
const animatedElements = document.querySelectorAll("[data-aos]")
const animationObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("aos-animate")
      }
    })
  },
  {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  },
)

animatedElements.forEach((element) => {
  animationObserver.observe(element)
})

console.log("🚀 RefurbTech marketplace initialized successfully!")
console.log("📱 Features: Enhanced search, wishlist, cart, price calculator")
console.log("🌱 Sustainable technology for a better tomorrow")

function initializeSwiper() {
  // Check if Swiper is loaded
  if (typeof window.Swiper === "undefined") {
    console.warn("Swiper not loaded, retrying in 500ms...")
    setTimeout(initializeSwiper, 500)
    return
  }

  // Initialize brand slider with better configuration
  const brandSwiperEl = document.querySelector(".brandsSwiper")
  if (brandSwiperEl && !brandSwiperEl.swiper) {
    try {
      const brandSwiper = new window.Swiper(".brandsSwiper", {
        slidesPerView: 2,
        spaceBetween: 20,
        loop: true,
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        },
        pagination: {
          el: ".brandsSwiper .swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: ".brandsSwiper .swiper-button-next",
          prevEl: ".brandsSwiper .swiper-button-prev",
        },
        breakpoints: {
          640: {
            slidesPerView: 3,
          },
          768: {
            slidesPerView: 4,
          },
          1024: {
            slidesPerView: 6,
          },
        },
        on: {
          init: () => {
            console.log("Brand slider initialized successfully")
          },
        },
      })
    } catch (error) {
      console.error("Error initializing brand slider:", error)
    }
  }

  const categorySwiperEl = document.querySelector(".categorySwiper")
  if (categorySwiperEl && !categorySwiperEl.swiper) {
    try {
      const categorySwiper = new window.Swiper(".categorySwiper", {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        loopFillGroupWithBlank: true,
        centeredSlides: false,
        autoplay: {
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        },
        pagination: {
          el: ".categorySwiper .swiper-pagination",
          clickable: true,
          dynamicBullets: true,
        },
        navigation: {
          nextEl: ".categorySwiper .swiper-button-next",
          prevEl: ".categorySwiper .swiper-button-prev",
        },
        breakpoints: {
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 20,
          },
          1200: {
            slidesPerView: 5,
            spaceBetween: 20,
          },
        },
        on: {
          init: () => {
            console.log("Category slider initialized successfully with continuous loop")
          },
          slideChange: () => {
            // Ensure smooth transitions
            const swiper = categorySwiperEl.swiper
            if (swiper && swiper.autoplay) {
              swiper.autoplay.start()
            }
          },
        },
      })
    } catch (error) {
      console.error("Error initializing category slider:", error)
    }
  }
}

// Initialize sliders after DOM is ready with multiple attempts
setTimeout(initializeSwiper, 100)
setTimeout(initializeSwiper, 1000) // Retry after 1 second
setTimeout(initializeSwiper, 2000) // Retry after 2 seconds
