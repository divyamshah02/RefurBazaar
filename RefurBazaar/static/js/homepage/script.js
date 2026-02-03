// Initialize Bootstrap carousel with custom settings
document.addEventListener("DOMContentLoaded", () => {
  // Import Bootstrap
  const bootstrap = window.bootstrap

  // Carousel auto-play configuration
  const heroCarousel = document.getElementById("heroCarousel")
  if (heroCarousel) {
    const carousel = new bootstrap.Carousel(heroCarousel, {
      interval: 5000,
      wrap: true,
      pause: "hover",
    })
  }

  const recommendedCarousel = document.getElementById("recommendedCarousel")
  if (recommendedCarousel) {
    new bootstrap.Carousel(recommendedCarousel, {
      interval: false,
      wrap: true,
      pause: false,
    })
  }

  const endOfYearCarousel = document.getElementById("endOfYearCarousel")
  if (endOfYearCarousel) {
    new bootstrap.Carousel(endOfYearCarousel, {
      interval: false,
      wrap: true,
      pause: false,
    })
  }

  // Wishlist functionality
  const wishlistBtns = document.querySelectorAll(".wishlist-btn")
  wishlistBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault()
      const icon = this.querySelector("i")

      if (icon.classList.contains("far")) {
        icon.classList.remove("far")
        icon.classList.add("fas")
        this.style.background = "#ec4899"
        this.style.color = "white"

        // Add to wishlist animation
        this.style.transform = "scale(1.2)"
        setTimeout(() => {
          this.style.transform = "scale(1)"
        }, 200)
      } else {
        icon.classList.remove("fas")
        icon.classList.add("far")
        this.style.background = "white"
        this.style.color = "#1a1a1a"
      }
    })
  })

  // Color selection
  const colorDots = document.querySelectorAll(".color-dot")
  colorDots.forEach((dot) => {
    dot.addEventListener("click", function () {
      // Remove active class from siblings
      const siblings = this.parentElement.querySelectorAll(".color-dot")
      siblings.forEach((s) => (s.style.outline = "none"))

      // Add active state
      this.style.outline = "3px solid #6fba2c"
      this.style.outlineOffset = "2px"
    })
  })

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href")
      if (href !== "#" && href !== "#!") {
        e.preventDefault()
        const target = document.querySelector(href)
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      }
    })
  })

  // Add to cart functionality (placeholder)
  const productCards = document.querySelectorAll(".product-card")
  productCards.forEach((card) => {
    card.addEventListener("click", function (e) {
      // Don't trigger if clicking wishlist or color dots
      if (e.target.closest(".wishlist-btn") || e.target.closest(".color-dot")) {
        return
      }

      // Add subtle click animation
      this.style.transform = "scale(0.98)"
      setTimeout(() => {
        this.style.transform = ""
      }, 100)
    })
  })

  // Search functionality
  const searchInput = document.querySelector(".search-container input")
  const searchBtn = document.querySelector(".btn-search")

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const query = searchInput.value.trim()
      if (query) {
        console.log("Searching for:", query)
        // Add your search logic here
      }
    })

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBtn.click()
      }
    })
  }

  // Scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe sections for scroll animations
  const sections = document.querySelectorAll("section")
  sections.forEach((section) => {
    section.style.opacity = "0"
    section.style.transform = "translateY(30px)"
    section.style.transition = "opacity 0.6s ease, transform 0.6s ease"
    observer.observe(section)
  })

  // Newsletter subscription
  const newsletterForm = document.querySelector(".footer .input-group")
  if (newsletterForm) {
    const subscribeBtn = newsletterForm.querySelector("button")
    const emailInput = newsletterForm.querySelector("input")

    subscribeBtn.addEventListener("click", () => {
      const email = emailInput.value.trim()
      if (email && email.includes("@")) {
        alert("Thank you for subscribing!")
        emailInput.value = ""
      } else {
        alert("Please enter a valid email address")
      }
    })
  }

  // Tab content fade animation
  const tabs = document.querySelectorAll('[data-bs-toggle="pill"]')
  tabs.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", function (e) {
      const targetPane = document.querySelector(this.getAttribute("data-bs-target"))
      if (targetPane) {
        targetPane.style.animation = "fadeIn 0.5s ease"
      }
    })
  })

  const calculatorInputs = document.querySelectorAll(".calculator-input input, .calculator-input select")
  calculatorInputs.forEach((input) => {
    input.addEventListener("input", calculateSavings)
  })

  function calculateSavings() {
    const device = document.getElementById("device-type")?.value || "laptop"
    const price = Number.parseFloat(document.getElementById("device-price")?.value) || 1000
    const condition = document.getElementById("device-condition")?.value || "excellent"

    // Calculate refurbished price based on condition
    let refurbMultiplier = 0.7
    if (condition === "very-good") refurbMultiplier = 0.65
    if (condition === "good") refurbMultiplier = 0.6

    const refurbPrice = price * refurbMultiplier
    const savings = price - refurbPrice
    const savingsPercent = ((savings / price) * 100).toFixed(0)

    // Update display
    document.getElementById("new-price").textContent = `₹${price.toLocaleString()}`
    document.getElementById("refurb-price").textContent = `₹${refurbPrice.toLocaleString()}`
    document.getElementById("total-savings").textContent = `₹${savings.toLocaleString()}`
    document.getElementById("savings-percent").textContent = `${savingsPercent}%`
  }

  // Initialize calculator on page load
  if (document.querySelector(".calculator-widget")) {
    calculateSavings()
  }

  const faqQuestions = document.querySelectorAll(".faq-question")
  faqQuestions.forEach((question) => {
    question.addEventListener("click", function () {
      const answer = this.nextElementSibling

      // Close other FAQs
      faqQuestions.forEach((q) => {
        if (q !== this) {
          q.classList.remove("active")
          q.nextElementSibling.classList.remove("show")
        }
      })

      // Toggle current FAQ
      this.classList.toggle("active")
      answer.classList.toggle("show")
    })
  })

  /* =========================================
     CALCULATOR LOGIC UPDATE
     ========================================= */
  const deviceSelect = document.getElementById("deviceSelect")
  if (deviceSelect) {
    // Function to update UI
    const updateCalculator = () => {
      const values = deviceSelect.value.split(",")
      const refurbPrice = Number.parseInt(values[0])
      const newPrice = Number.parseInt(values[1])

      const savings = newPrice - refurbPrice
      const discountPercent = Math.round((savings / newPrice) * 100)
      
      // Environmental math (approximate)
      const co2 = Math.round(newPrice * 0.00026) 
      const waste = (newPrice * 0.000014).toFixed(1)

      // Update Text
      document.querySelector(".new-price-display").textContent = `₹${newPrice.toLocaleString()}`
      document.querySelector(".refurb-price").textContent = `₹${refurbPrice.toLocaleString()}`
      document.querySelector(".savings").textContent = `₹${savings.toLocaleString()}`
      document.querySelector(".discount-percent").textContent = `${discountPercent}%`
      document.querySelector(".co2").textContent = `${co2} kg`
      document.querySelector(".waste").textContent = `${waste} kg`

      // --- NEW: Animate the Progress Bar ---
      // The bar represents the % of the price you pay vs new
      const payPercent = Math.round((refurbPrice / newPrice) * 100);
      const savingsBar = document.getElementById("savingsBar");
      if(savingsBar) {
          savingsBar.style.width = `${payPercent}%`;
      }
    };

    // Listen for changes
    deviceSelect.addEventListener("change", updateCalculator);
    
    // Run once on load to set initial state
    updateCalculator();
  }

  function animateCounter(element) {
    const target = Number.parseInt(element.getAttribute("data-target"))
    const duration = 2000
    const step = target / (duration / 16)
    let current = 0

    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        element.textContent = target.toLocaleString()
        clearInterval(timer)
      } else {
        element.textContent = Math.floor(current).toLocaleString()
      }
    }, 16)
  }

  // Trigger counter animation when section is visible
  const impactNumbers = document.querySelectorAll(".impact-number")
  if (impactNumbers.length > 0) {
    const impactObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.textContent === "0") {
            animateCounter(entry.target)
          }
        })
      },
      { threshold: 0.5 },
    )

    impactNumbers.forEach((number) => {
      impactObserver.observe(number)
    })
  }
})


/* =========================================
   QUALITY MODAL LOGIC
   ========================================= */
function openQualityModal() {
    const modal = document.getElementById('qualityModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop scrolling
    }
}

function closeQualityModal(event) {
    // Close if clicked on overlay OR close button
    if (event.target.id === 'qualityModal' || event.target.closest('.modal-close-btn')) {
        const modal = document.getElementById('qualityModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto'; // Restore scrolling
        }
    }
}


// Initialize New Category Carousels
const iphonesCarousel = document.getElementById("iphonesCarousel")
if (iphonesCarousel) {
  new bootstrap.Carousel(iphonesCarousel, {
    interval: false, // Don't auto-slide
    wrap: true
  })
}

const samsungCarousel = document.getElementById("samsungCarousel")
if (samsungCarousel) {
  new bootstrap.Carousel(samsungCarousel, {
    interval: false,
    wrap: true
  })
}

/* =========================================
  BACK TO TOP LOGIC
========================================= */
const backToTopBtn = document.getElementById("backToTop");

if (backToTopBtn) {
  // Show button when scrolling down 300px
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  });

  // Smooth scroll to top on click
  backToTopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}