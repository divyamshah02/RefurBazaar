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
  // const colorDots = document.querySelectorAll(".color-dot")
  // colorDots.forEach((dot) => {
  //   dot.addEventListener("click", function () {
  //     // Remove active class from siblings
  //     const siblings = this.parentElement.querySelectorAll(".color-dot")
  //     siblings.forEach((s) => (s.style.outline = "none"))

  //     // Add active state
  //     this.style.outline = "3px solid #6fba2c"
  //     this.style.outlineOffset = "2px"
  //   })
  // })

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
   COMBINED CALCULATOR & IMPACT LOGIC
   ========================================= */
  const deviceSelect = document.getElementById("deviceSelect");

  if (deviceSelect) {
    // Function to calculate and update UI
    const updateCalculator = () => {
      // 1. Get Values from Select Option (Format: "RefurbPrice,NewPrice")
      const values = deviceSelect.value.split(",");
      const refurbPrice = Number.parseInt(values[0]);
      const newPrice = Number.parseInt(values[1]);

      // 2. Calculate Financial Savings
      const savings = newPrice - refurbPrice;
      const discountPercent = Math.round((savings / newPrice) * 100);
      const payPercent = Math.round((refurbPrice / newPrice) * 100);

      // 3. Calculate Environmental Impact (Estimates based on price/weight proxy)
      // CO2: approx 0.26g per Rupee of value (proxy for manufacturing complexity)
      const co2Val = Math.round(newPrice * 0.00026);

      // E-Waste: approx weight proxy
      const wasteVal = (newPrice * 0.000014).toFixed(1);

      // Water: New Calculation! (approx 60L per dollar/value equivalent)
      // Simplified logic: higher value = more complex chip fab = more water
      const waterVal = Math.round(newPrice * 0.15).toLocaleString();

      // 4. Update the DOM Elements
      // Prices
      document.querySelector(".new-price-display").textContent = `₹${newPrice.toLocaleString()}`;
      document.querySelector(".refurb-price").textContent = `₹${refurbPrice.toLocaleString()}`;
      document.querySelector(".savings").textContent = `₹${savings.toLocaleString()}`;
      document.querySelector(".discount-percent").textContent = `${discountPercent}%`;

      // Progress Bar
      const savingsBar = document.getElementById("savingsBar");
      if (savingsBar) {
        savingsBar.style.width = `${payPercent}%`;
      }

      // Impact Stats (Right Panel)
      document.querySelector(".co2").textContent = `${co2Val} kg`;
      document.querySelector(".waste").textContent = `${wasteVal} kg`;
      document.querySelector(".water").textContent = `${waterVal} L`;
    };

    // Listen for changes
    deviceSelect.addEventListener("change", updateCalculator);

    // Run once on load to set initial state
    updateCalculator();
  }

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

  document.addEventListener('click', closeQualityModal);

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

  /* =========================================
     LIVE COUNTDOWN TIMER (Fixed Date)
     ========================================= */
  function startCountdown() {
    // -----------------------------------------------------------------
    // CONFIGURATION: Set your specific end date here
    // Format: (Year, MonthIndex, Day, Hour, Minute, Second)
    // IMPORTANT: Month is 0-indexed (0 = Jan, 1 = Feb, ... 11 = Dec)
    // Example below: February 14, 2026 at 11:59:59 PM
    // -----------------------------------------------------------------
    const deadline = new Date(2026, 1, 14, 23, 59, 59);

    function updateTimer() {
      const now = new Date().getTime();
      const t = deadline.getTime() - now;

      // If the sale is over
      if (t < 0) {
      const timerInterval = setInterval(updateTimer, 1000);
        clearInterval(timerInterval);

        // Optional: Change text to "EXPIRED" or "00"
        const parts = document.querySelectorAll('.timer-part');
        parts.forEach(part => part.textContent = "00");

        const mobileTimer = document.querySelector('.compact-timer.d-md-none span');
        if (mobileTimer) mobileTimer.textContent = "Sale Ended";

        return;
      }

      // Calculate time parts
      const days = Math.floor(t / (1000 * 60 * 60 * 24));
      const hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((t % (1000 * 60)) / 1000);

      // Update Desktop Timer (The red boxes)
      const parts = document.querySelectorAll('.timer-part');
      if (parts.length >= 4) {
        parts[0].textContent = days.toString().padStart(2, '0');
        parts[1].textContent = hours.toString().padStart(2, '0');
        parts[2].textContent = minutes.toString().padStart(2, '0');
        parts[3].textContent = seconds.toString().padStart(2, '0');
      }

      // Update Mobile Timer (The text strip)
      const mobileTimer = document.querySelector('.compact-timer.d-md-none span');
      if (mobileTimer) {
        mobileTimer.textContent = `Ends in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
      }
    }

    updateTimer(); // Run immediately so there is no 1-second delay
    const timerInterval = setInterval(updateTimer, 1000);
  }

  startCountdown(); // Start the countdown timer when the DOM is loaded

  /* =========================================
     CONTACT FORM HANDLER
     ========================================= */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        phone: document.getElementById('contactPhone').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
      };

      console.log('[v0] Contact form submitted:', formData);

      // Show success message
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '✓ Message Sent!';
      submitBtn.disabled = true;
      submitBtn.style.background = 'var(--primary-green)';
      submitBtn.style.transform = 'scale(1.05)';

      // Add success animation
      contactForm.style.opacity = '0.8';

      // Reset form after 2 seconds
      setTimeout(() => {
        contactForm.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.background = '';
        submitBtn.style.transform = '';
        contactForm.style.opacity = '1';
      }, 2000);
    });
  }

  /* =========================================
     INQUIRY FORM HANDLER (Updated)
     ========================================= */
  const inquiryForm = document.getElementById('inquiryForm');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // REMOVED experience & specialization from this object
      const formData = {
        name: document.getElementById('inquiryName').value,
        email: document.getElementById('inquiryEmail').value,
        phone: document.getElementById('inquiryPhone').value,
        location: document.getElementById('inquiryLocation').value,
        message: document.getElementById('inquiryMessage').value
      };

      console.log('[v0] Inquiry form submitted:', formData);

      // Show success message
      const submitBtn = inquiryForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '✓ Application Submitted!';
      submitBtn.disabled = true;
      submitBtn.style.background = 'var(--success)';
      submitBtn.style.transform = 'scale(1.05)';

      // Add success animation
      inquiryForm.style.opacity = '0.8';

      // Reset form after 2 seconds
      setTimeout(() => {
        inquiryForm.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.background = '';
        submitBtn.style.transform = '';
        inquiryForm.style.opacity = '1';
      }, 2000);
    });
  }

  /* =========================================
     FORM INPUT ANIMATIONS
     ========================================= */
  const formInputs = document.querySelectorAll('.contact-input, .inquiry-input');
  formInputs.forEach(input => {
    input.addEventListener('focus', function () {
      this.parentElement.style.transform = 'scale(1.02)';
      this.parentElement.style.transformOrigin = 'center';
    });

    input.addEventListener('blur', function () {
      this.parentElement.style.transform = 'scale(1)';
    });
  });

  /* =========================================
     TESTIMONIAL SCROLL LOGIC (3-2-1 Layout)
     ========================================= */
  const track = document.getElementById('testimonialTrack');
  const btnPrev = document.getElementById('testPrevBtn');
  const btnNext = document.getElementById('testNextBtn');

  if (track && btnPrev && btnNext) {
    
    // Scroll Function
    const scrollTrack = (direction) => {
      // Get the width of one card (including gap)
      const cardWidth = track.querySelector('.testimonial-slide').offsetWidth + 24; // 24 is the gap
      
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      
      track.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    };

    btnPrev.addEventListener('click', () => scrollTrack('left'));
    btnNext.addEventListener('click', () => scrollTrack('right'));
  }

  /* =========================================
     UNIVERSAL PRODUCT SLIDER LOGIC
     ========================================= */
  function setupProductSlider(trackId, prevBtnId, nextBtnId) {
    const track = document.getElementById(trackId);
    const btnPrev = document.getElementById(prevBtnId);
    const btnNext = document.getElementById(nextBtnId);

    if (track && btnPrev && btnNext) {
      
      const scrollAmount = () => {
        // Scroll by the width of one slide (including padding)
        const slide = track.querySelector('.product-slide');
        return slide ? slide.offsetWidth : 300;
      };

      btnPrev.addEventListener('click', () => {
        track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
      });

      btnNext.addEventListener('click', () => {
        track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
      });
    }
  }

  // Initialize ALL Product Sliders
  setupProductSlider('hotDealsTrack', 'hotPrev', 'hotNext');     // Section 9
  setupProductSlider('endOfYearTrack', 'eoyPrev', 'eoyNext');    // Section 10
  setupProductSlider('recommendedTrack', 'recPrev', 'recNext');  // Section 13
  setupProductSlider('expressTrack', 'expressPrev', 'expressNext'); // Section 14

})
