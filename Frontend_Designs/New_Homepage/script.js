// RefurBazaar - Custom JavaScript
// ===================================

document.addEventListener("DOMContentLoaded", () => {
  // Declare AOS variable before using it
  const AOS = window.AOS

  // ===================================
  // Initialize AOS (Animate On Scroll)
  // ===================================
  AOS.init({
    duration: 800,
    easing: "ease-in-out",
    once: true,
    offset: 100,
  })

  // ===================================
  // Navbar Scroll Effect
  // ===================================
  const navbar = document.querySelector(".navbar")
  let lastScroll = 0

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset

    if (currentScroll > 100) {
      navbar.classList.add("scrolled")
    } else {
      navbar.classList.remove("scrolled")
    }

    lastScroll = currentScroll
  })

  // ===================================
  // Close Announcement Bar
  // ===================================
  const closeAnnouncementBtn = document.querySelector(".btn-close-announcement")
  const announcementBar = document.querySelector(".announcement-bar")

  if (closeAnnouncementBtn && announcementBar) {
    closeAnnouncementBtn.addEventListener("click", () => {
      announcementBar.style.transform = "translateY(-100%)"
      announcementBar.style.opacity = "0"
      setTimeout(() => {
        announcementBar.style.display = "none"
      }, 300)
    })
  }

  // ===================================
  // Back to Top Button
  // ===================================
  const backToTopBtn = document.getElementById("backToTop")

  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 500) {
      backToTopBtn.classList.add("visible")
    } else {
      backToTopBtn.classList.remove("visible")
    }
  })

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  })

  // ===================================
  // Smooth Scroll for Anchor Links
  // ===================================
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href")

      // Skip if it's just "#" or a Bootstrap toggle
      if (href === "#" || this.hasAttribute("data-bs-toggle")) {
        return
      }

      e.preventDefault()
      const target = document.querySelector(href)

      if (target) {
        const offsetTop = target.offsetTop - 80
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        })
      }
    })
  })

  // ===================================
  // Product Card Wishlist Toggle
  // ===================================
  const wishlistBtns = document.querySelectorAll(".btn-action")

  wishlistBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault()
      const icon = this.querySelector("i")

      if (icon && icon.classList.contains("bi-heart")) {
        if (icon.classList.contains("bi-heart-fill")) {
          icon.classList.remove("bi-heart-fill")
          icon.classList.add("bi-heart")
        } else {
          icon.classList.remove("bi-heart")
          icon.classList.add("bi-heart-fill")
        }
      }
    })
  })

  // ===================================
  // Add to Cart Animation
  // ===================================
  const addToCartBtns = document.querySelectorAll(".product-card .btn-primary")
  const cartBadge = document.querySelector(".cart-badge")
  let cartCount = 0

  addToCartBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault()

      // Update cart count
      cartCount++
      cartBadge.textContent = cartCount

      // Add animation to cart icon
      const cartIcon = document.querySelector(".btn-icon .bi-bag")
      if (cartIcon) {
        cartIcon.parentElement.style.animation = "none"
        setTimeout(() => {
          cartIcon.parentElement.style.animation = "cartBounce 0.5s ease"
        }, 10)
      }

      // Change button text temporarily
      const originalText = this.innerHTML
      this.innerHTML = '<i class="bi bi-check-circle"></i> Added!'
      this.style.background = "#10B981"

      setTimeout(() => {
        this.innerHTML = originalText
        this.style.background = ""
      }, 2000)
    })
  })

  // ===================================
  // Newsletter Form Submission
  // ===================================
  const newsletterForm = document.querySelector(".newsletter-form")

  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault()

      const emailInput = this.querySelector('input[type="email"]')
      const submitBtn = this.querySelector('button[type="submit"]')
      const originalBtnText = submitBtn.innerHTML

      // Simulate form submission
      submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Subscribed!'
      submitBtn.disabled = true
      emailInput.value = ""

      setTimeout(() => {
        submitBtn.innerHTML = originalBtnText
        submitBtn.disabled = false
      }, 3000)
    })
  }

  // ===================================
  // Lazy Loading Images
  // ===================================
  const images = document.querySelectorAll("img[data-src]")

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.removeAttribute("data-src")
        observer.unobserve(img)
      }
    })
  })

  images.forEach((img) => imageObserver.observe(img))

  // ===================================
  // Product Quick View Modal (Placeholder)
  // ===================================
  const quickViewBtns = document.querySelectorAll(".btn-action .bi-eye")

  quickViewBtns.forEach((btn) => {
    btn.parentElement.addEventListener("click", (e) => {
      e.preventDefault()
      // In a real implementation, this would open a modal with product details
      console.log("Quick view clicked")
    })
  })

  // ===================================
  // Search Functionality (Placeholder)
  // ===================================
  const searchBtn = document.querySelector(".navbar-actions .bi-search")

  if (searchBtn) {
    searchBtn.parentElement.addEventListener("click", (e) => {
      e.preventDefault()
      // In a real implementation, this would open a search modal or expand search bar
      console.log("Search clicked")
    })
  }

  // ===================================
  // Mobile Menu Close on Link Click
  // ===================================
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link")
  const navbarToggler = document.querySelector(".navbar-toggler")
  const navbarCollapse = document.querySelector(".navbar-collapse")

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 992 && navbarCollapse.classList.contains("show")) {
        navbarToggler.click()
      }
    })
  })

  // ===================================
  // Parallax Effect for Hero Section
  // ===================================
  const heroSection = document.querySelector(".hero-section")

  if (heroSection) {
    window.addEventListener("scroll", () => {
      const scrolled = window.pageYOffset
      const parallaxSpeed = 0.5

      if (scrolled < window.innerHeight) {
        heroSection.style.transform = `translateY(${scrolled * parallaxSpeed}px)`
      }
    })
  }

  // ===================================
  // Counter Animation for Stats
  // ===================================
  const counters = document.querySelectorAll(".stat-item h3, .trust-indicator h3")

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const counter = entry.target
          const target = counter.textContent

          // Extract number from text (e.g., "50K+" -> 50)
          const match = target.match(/[\d.]+/)
          if (match) {
            const targetNumber = Number.parseFloat(match[0])
            const suffix = target.replace(/[\d.]+/, "")
            let current = 0
            const increment = targetNumber / 50

            const updateCounter = () => {
              current += increment
              if (current < targetNumber) {
                counter.textContent = Math.floor(current) + suffix
                requestAnimationFrame(updateCounter)
              } else {
                counter.textContent = target
              }
            }

            updateCounter()
          }

          counterObserver.unobserve(counter)
        }
      })
    },
    { threshold: 0.5 },
  )

  counters.forEach((counter) => counterObserver.observe(counter))

  // ===================================
  // Product Filter Animation (Placeholder)
  // ===================================
  const categoryCards = document.querySelectorAll(".category-card")

  categoryCards.forEach((card) => {
    card.addEventListener("click", function () {
      const category = this.querySelector("h3").textContent
      console.log(`Filtering by category: ${category}`)
      // In a real implementation, this would filter products
    })
  })

  // ===================================
  // Toast Notifications (Utility Function)
  // ===================================
  window.showToast = (message, type = "success") => {
    const toast = document.createElement("div")
    toast.className = `toast-notification toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === "success" ? "#10B981" : "#EF4444"};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease"
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  // ===================================
  // Add CSS Animations
  // ===================================
  const style = document.createElement("style")
  style.textContent = `
        @keyframes cartBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(20px);
            }
        }
        
        .setup-device img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
        }
        
        .setup-device-info {
            flex: 1;
        }
        
        .setup-device-info h6 {
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .setup-device-info p {
            font-size: 16px;
            font-weight: 700;
            color: var(--primary-green);
            margin: 0;
        }
        
        .btn-remove {
            width: 32px;
            height: 32px;
            background: var(--error);
            color: var(--white);
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-remove:hover {
            transform: scale(1.1);
            background: #DC2626;
        }
    `
  document.head.appendChild(style)

  // ===================================
  // Device Finder Quiz
  // ===================================
  let quizAnswers = {}
  let currentQuestion = 1
  const totalQuestions = 3

  document.querySelectorAll(".quiz-option").forEach((option) => {
    option.addEventListener("click", function () {
      const question = this.closest(".quiz-question")
      const questionNum = question.dataset.question
      const value = this.dataset.value

      quizAnswers[`q${questionNum}`] = value

      // Move to next question or show results
      if (currentQuestion < totalQuestions) {
        question.classList.remove("active")
        const nextQuestion = document.querySelector(`[data-question="${currentQuestion + 1}"]`)
        if (nextQuestion) {
          nextQuestion.classList.add("active")
          currentQuestion++
          updateQuizProgress()
        }
      } else {
        // Show results
        question.classList.remove("active")
        document.getElementById("quizResults").classList.add("active")
        updateQuizProgress()
      }
    })
  })

  function updateQuizProgress() {
    const progress = (currentQuestion / totalQuestions) * 100
    document.getElementById("quizProgress").style.width = progress + "%"
  }

  function resetQuiz() {
    quizAnswers = {}
    currentQuestion = 1
    document.getElementById("quizResults").classList.remove("active")
    document.querySelector('[data-question="1"]').classList.add("active")
    updateQuizProgress()
  }

  // ===================================
  // Calculator Functionality
  // ===================================
  const newPriceInput = document.getElementById("newPrice")
  const deviceSelect = document.getElementById("deviceSelect")
  if (deviceSelect) {
    deviceSelect.addEventListener("change", function () {
      const prices = this.value.split(",")
      const refurbPrice = Number.parseInt(prices[0])
      const newPrice = Number.parseInt(prices[1])
      const savings = newPrice - refurbPrice
      const discountPercent = Math.round(((newPrice - refurbPrice) / newPrice) * 100)
      const co2 = Math.round((newPrice / 100) * 2.25)
      const waste = ((newPrice / 1000) * 1.15).toFixed(1)

      // Update calculator results
      document.querySelector(".new-price-display").textContent = "₹" + newPrice.toLocaleString("en-IN")
      document.querySelector(".refurb-price").textContent = "₹" + refurbPrice.toLocaleString("en-IN")
      document.querySelector(".savings").textContent = "₹" + savings.toLocaleString("en-IN")
      document.querySelector(".discount-percent").textContent = discountPercent + "%"
      document.querySelector(".co2").textContent = co2 + " kg"
      document.querySelector(".waste").textContent = waste + " kg"

      // Update comparison cards
      document.querySelector(".new-price-card").textContent = "₹" + newPrice.toLocaleString("en-IN")
      document.querySelector(".refurb-price-card").textContent = "₹" + refurbPrice.toLocaleString("en-IN")
      document.querySelector(".savings-card").textContent = "₹" + savings.toLocaleString("en-IN")
    })

    // Trigger initial calculation
    deviceSelect.dispatchEvent(new Event("change"))
  }

  // ===================================
  // Build Your Setup - Drag and Drop
  // ===================================
  const setupCanvas = document.getElementById("setupCanvas")
  const deviceLibrary = document.getElementById("deviceLibrary")
  let setupTotal = 0
  let setupDevices = []

  if (deviceLibrary) {
    // Make devices draggable
    document.querySelectorAll(".library-device").forEach((device) => {
      device.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            name: this.querySelector("h5").textContent,
            price: this.dataset.price,
            image: this.querySelector("img").src,
          }),
        )
      })

      // Also add click to add
      device.addEventListener("click", function () {
        addDeviceToSetup({
          name: this.querySelector("h5").textContent,
          price: this.dataset.price,
          image: this.querySelector("img").src,
        })
      })
    })
  }

  if (setupCanvas) {
    setupCanvas.addEventListener("dragover", function (e) {
      e.preventDefault()
      this.style.borderColor = "var(--primary-green)"
    })

    setupCanvas.addEventListener("dragleave", function (e) {
      this.style.borderColor = "var(--gray-300)"
    })

    setupCanvas.addEventListener("drop", function (e) {
      e.preventDefault()
      this.style.borderColor = "var(--gray-300)"

      const deviceData = JSON.parse(e.dataTransfer.getData("text/plain"))
      addDeviceToSetup(deviceData)
    })
  }

  function addDeviceToSetup(deviceData) {
    // Remove empty state
    const emptyState = setupCanvas.querySelector(".empty-state")
    if (emptyState) {
      emptyState.remove()
    }

    // Create device element
    const deviceEl = document.createElement("div")
    deviceEl.className = "setup-device"
    deviceEl.innerHTML = `
            <img src="${deviceData.image}" alt="${deviceData.name}">
            <div class="setup-device-info">
                <h6>${deviceData.name}</h6>
                <p>₹${Number.parseInt(deviceData.price).toLocaleString("en-IN")}</p>
            </div>
            <button class="btn-remove" onclick="removeDeviceFromSetup(this, ${deviceData.price})">
                <i class="bi bi-x"></i>
            </button>
        `

    // Add styles
    deviceEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--white);
            border: 2px solid var(--primary-green);
            border-radius: var(--radius-md);
            position: relative;
            animation: slideIn 0.3s ease;
        `

    setupCanvas.appendChild(deviceEl)

    // Update total
    setupTotal += Number.parseInt(deviceData.price)
    setupDevices.push(deviceData)
    updateSetupTotal()
  }

  function removeDeviceFromSetup(btn, price) {
    const device = btn.closest(".setup-device")
    device.style.animation = "slideOut 0.3s ease"
    setTimeout(() => {
      device.remove()
      setupTotal -= Number.parseInt(price)
      updateSetupTotal()

      // Add empty state if no devices
      if (setupCanvas.children.length === 0) {
        setupCanvas.innerHTML = `
                    <div class="empty-state">
                        <i class="bi bi-plus-circle"></i>
                        <p>Drag devices here to build your setup</p>
                    </div>
                `
      }
    }, 300)
  }

  function updateSetupTotal() {
    const totalEl = document.getElementById("setupTotal")
    if (totalEl) {
      totalEl.textContent = "₹" + setupTotal.toLocaleString("en-IN")

      // Calculate savings (assuming 40% off)
      const savings = Math.round(setupTotal * 0.67)
      const savingsBadge = document.querySelector(".savings-badge")
      if (savingsBadge) {
        savingsBadge.textContent = "Save ₹" + savings.toLocaleString("en-IN")
      }
    }
  }

  function clearSetup() {
    setupCanvas.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-plus-circle"></i>
                <p>Drag devices here to build your setup</p>
            </div>
        `
    setupTotal = 0
    setupDevices = []
    updateSetupTotal()
  }

  function saveSetup() {
    if (setupDevices.length === 0) {
      alert("Please add devices to your setup first!")
      return
    }
    alert("Setup saved! You can access it from your account.")
  }

  function checkoutSetup() {
    if (setupDevices.length === 0) {
      alert("Please add devices to your setup first!")
      return
    }
    alert(
      "Proceeding to checkout with " + setupDevices.length + " devices totaling ₹" + setupTotal.toLocaleString("en-IN"),
    )
  }

  // Category filter for device library
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"))
      this.classList.add("active")

      const category = this.dataset.category
      document.querySelectorAll(".library-device").forEach((device) => {
        if (category === "all" || device.dataset.category === category) {
          device.style.display = "flex"
        } else {
          device.style.display = "none"
        }
      })
    })
  })

  // ===================================
  // Impact Counter Animation
  // ===================================
  const impactNumbers = document.querySelectorAll(".impact-number")
  const impactObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = Number.parseInt(entry.target.dataset.target)
          animateCounter(entry.target, target)
          impactObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 },
  )

  impactNumbers.forEach((num) => impactObserver.observe(num))

  function animateCounter(element, target) {
    let current = 0
    const increment = target / 100
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        element.textContent = target.toLocaleString()
        clearInterval(timer)
      } else {
        element.textContent = Math.floor(current).toLocaleString()
      }
    }, 20)
  }

  // ===================================
  // Impact Chart (using Chart.js)
  // ===================================
  const impactChartCanvas = document.getElementById("impactChart")
  if (impactChartCanvas) {
    const Chart = window.Chart
    const ctx = impactChartCanvas.getContext("2d")
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "CO₂ Saved (kg)",
            data: [300, 450, 600, 800, 1200, 2500],
            borderColor: "#6BA843",
            backgroundColor: "rgba(107, 168, 67, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    })
  }

  // ===================================
  // Countdown Timer for Deals Ticker
  // ===================================
  function updateCountdowns() {
    document.querySelectorAll(".countdown").forEach((countdown) => {
      const endDate = new Date(countdown.dataset.end).getTime()
      const now = new Date().getTime()
      const distance = endDate - now

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))

      if (distance > 0) {
        countdown.textContent = `${hours}h ${minutes}m`
      } else {
        countdown.textContent = "Expired"
      }
    })
  }

  // Update countdowns every minute
  setInterval(updateCountdowns, 60000)
  updateCountdowns()

  // Make functions global
  window.resetQuiz = resetQuiz
  window.clearSetup = clearSetup
  window.saveSetup = saveSetup
  window.checkoutSetup = checkoutSetup
  window.removeDeviceFromSetup = removeDeviceFromSetup

  // ===================================
  // AI Shopping Assistant Step Toggle
  // ===================================
  document.querySelectorAll(".ai-step .step-header").forEach((header) => {
    header.addEventListener("click", function () {
      const step = this.closest(".ai-step")
      const content = step.querySelector(".step-content")
      const toggle = step.querySelector(".step-toggle i")
      const isActive = step.classList.contains("active")

      // Close all steps
      document.querySelectorAll(".ai-step").forEach((s) => {
        s.classList.remove("active")
        s.querySelector(".step-content").style.display = "none"
        s.querySelector(".step-toggle i").classList.remove("bi-dash")
        s.querySelector(".step-toggle i").classList.add("bi-plus")
      })

      // Open clicked step if it wasn't active
      if (!isActive) {
        step.classList.add("active")
        content.style.display = "block"
        toggle.classList.remove("bi-plus")
        toggle.classList.add("bi-dash")
      }
    })
  })

  // ===================================
  // Console Welcome Message
  // ===================================
  console.log("%c🌿 Welcome to RefurBazaar! 🌿", "color: #6BA843; font-size: 20px; font-weight: bold;")
  console.log("%cSave money, save the planet! 🌍", "color: #1E4D8B; font-size: 14px;")
  console.log(
    "%c🚀 RefurBazaar Homepage Loaded Successfully! 🚀",
    "color: #6BA843; font-size: 16px; font-weight: bold;",
  )
})
