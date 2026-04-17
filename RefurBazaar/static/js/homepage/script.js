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

  // Newsletter subscription (Updated for V2.0 Footer)
  const rcNewsletterForm = document.getElementById("rcNewsletterForm")
  if (rcNewsletterForm) {
    rcNewsletterForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Stop page from refreshing
      const emailInput = document.getElementById("rcNewsletterEmail");
      const email = emailInput.value.trim();
      
      if (email && email.includes("@")) {
        alert("Thank you for subscribing! Check your inbox for deals.");
        emailInput.value = "";
      }
    });
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
     RECARVIT V2.0: CALCULATE YOUR IMPACT LOGIC
     ========================================= */
  const impactSelect = document.getElementById("impactDeviceSelect");

  if (impactSelect) {
    const updateImpactCalculator = () => {
      // Get the comma separated values from the selected option
      // Format: "refurbPrice,newPrice,ewaste,co2,water"
      const values = impactSelect.value.split(",");
      const refurbPrice = parseInt(values[0]);
      const newPrice = parseInt(values[1]);
      const ewaste = values[2];
      const co2 = values[3];
      const water = parseInt(values[4]);

      // Calculate Financials
      const savings = newPrice - refurbPrice;
      const discountPercent = Math.round((savings / newPrice) * 100);

      // Update Financial DOM Elements (using Indian number formatting)
      document.getElementById("impactRefurbPrice").textContent = `₹${refurbPrice.toLocaleString('en-IN')}`;
      document.getElementById("impactNewPrice").textContent = `₹${newPrice.toLocaleString('en-IN')}`;
      document.getElementById("impactSavingsAmount").textContent = `₹${savings.toLocaleString('en-IN')}`;
      document.getElementById("impactSavingsPercent").textContent = discountPercent;

      // Update Environmental DOM Elements
      document.getElementById("impactEwaste").textContent = `${ewaste} kg`;
      document.getElementById("impactCo2").textContent = `${co2} kg`;
      document.getElementById("impactWater").textContent = `${water.toLocaleString('en-IN')} L`;
    };

    // Listen for dropdown changes
    impactSelect.addEventListener("change", updateImpactCalculator);
    
    // Run once on load to populate the initial values
    updateImpactCalculator();
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
      const slide = track.querySelector('.testimonial-slide');
      if (!slide) return;
      
      // Get the width of one card (including gap)
      const cardWidth = slide.offsetWidth + 24; // 24 is the gap
      
      // If moving right and we've reached the end, smoothly scroll back to the start
      if (direction === 'right' && (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10)) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }

      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      
      track.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    };

    btnPrev.addEventListener('click', () => scrollTrack('left'));
    btnNext.addEventListener('click', () => scrollTrack('right'));

    // === Auto-Play Functionality ===
    let autoScrollInterval = setInterval(() => {
      scrollTrack('right');
    }, 3000); // Automatically scrolls every 3.5 seconds

    // Pause auto-scroll when user hovers or touches the track (so they can read)
    const pauseScroll = () => clearInterval(autoScrollInterval);
    const resumeScroll = () => {
      clearInterval(autoScrollInterval);
      autoScrollInterval = setInterval(() => {
        scrollTrack('right');
      }, 3500);
    };

    track.addEventListener('mouseenter', pauseScroll);
    track.addEventListener('mouseleave', resumeScroll);
    track.addEventListener('touchstart', pauseScroll, { passive: true });
    track.addEventListener('touchend', resumeScroll, { passive: true });
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


  /* =========================================
     RECARVIT V2.0: NUMBER COUNTER ANIMATION
     ========================================= */
  const animateCounters = () => {
    const speed = 100; // Adjusted speed for smoother counting

    const startCounting = (counter) => {
      const target = +counter.getAttribute('data-target');
      const hasDecimals = counter.hasAttribute('data-decimals');
      const inc = target / speed;
      
      // Keep track of the exact number in memory, not from the HTML
      let currentCount = 0; 

      const updateCount = () => {
        if (currentCount < target) {
          currentCount += inc; // Add the exact decimal increment
          
          if (hasDecimals) {
            counter.innerText = currentCount.toFixed(1);
          } else {
            counter.innerText = Math.ceil(currentCount).toLocaleString('en-IN');
          }
          setTimeout(updateCount, 15);
        } else {
          // Force exact final number to prevent overshooting
          if (hasDecimals) {
            counter.innerText = target.toFixed(1);
          } else {
            counter.innerText = target.toLocaleString('en-IN');
          }
        }
      };
      updateCount();
    };

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const countersInView = entry.target.querySelectorAll('.counter');
          countersInView.forEach(counter => startCounting(counter));
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const statsSection = document.querySelector('.rc-stats-section');
    if (statsSection) {
      observer.observe(statsSection);
    }
  };

  // Run the function
  animateCounters();


})

/* =========================================
   Interactive Ecoreco Impact Calculator & Animations
   ========================================= */
document.addEventListener("DOMContentLoaded", function() {
    const deviceSelect = document.getElementById('ecoDeviceSelect');
    const qtyRange = document.getElementById('ecoQtyRange');
    const qtyLabel = document.getElementById('ecoQtyLabel');
    
    const co2Display = document.getElementById('ecoCo2Val');
    const wasteDisplay = document.getElementById('ecoWasteVal');
    const waterDisplay = document.getElementById('ecoWaterVal');

    if (!deviceSelect || !qtyRange) return;

    const impactData = {
        smartphone: { co2: 50, waste: 1.9, water: 20000 },
        laptop: { co2: 250, waste: 3.5, water: 45000 },
        tablet: { co2: 120, waste: 2.2, water: 25000 }
    };

    function animateValue(obj, start, end, duration, isDecimal) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentVal = progress * (end - start) + start;
            
            if (isDecimal) {
                obj.innerHTML = currentVal.toFixed(1);
            } else {
                obj.innerHTML = Math.floor(currentVal).toLocaleString('en-IN');
            }
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = isDecimal ? end.toFixed(1) : end.toLocaleString('en-IN');
            }
        };
        window.requestAnimationFrame(step);
    }

    // Function to spawn the visual animations (Trees, Water, Leaves)
    function spawnEcoParticles() {
        const container = document.getElementById('eco-particles');
        if (!container) return;

        const particleTypes = [
            { class: 'fas fa-tree', color: '#4CAF5C', anim: 'growTree' },
            { class: 'fas fa-tint', color: '#4fc3f7', anim: 'dropWater' },
            { class: 'fas fa-leaf', color: '#81c784', anim: 'floatLeaf' }
        ];

        // Create 15 particles per interaction
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('i');
            const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
            
            particle.className = `eco-particle ${type.class}`;
            particle.style.color = type.color;
            
            // Randomize starting position across the container
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Randomize size between 15px and 35px
            const size = Math.random() * 20 + 15;
            particle.style.fontSize = `${size}px`;
            
            // Randomize animation duration between 1.5s and 3s
            const duration = Math.random() * 1.5 + 1.5; 
            particle.style.animation = `${type.anim} ${duration}s ease-out forwards`;
            
            container.appendChild(particle);
            
            // Clean up the particle from the DOM after animation finishes
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, duration * 1000);
        }
    }

    function updateCalculator() {
        const device = deviceSelect.value;
        const qty = parseInt(qtyRange.value);
        
        qtyLabel.innerText = qty === 1 ? "1 Device" : `${qty} Devices`;

        const targetCo2 = impactData[device].co2 * qty;
        const targetWaste = impactData[device].waste * qty;
        const targetWater = impactData[device].water * qty;

        const currentCo2 = parseFloat(co2Display.innerText.replace(/,/g, '')) || 0;
        const currentWaste = parseFloat(wasteDisplay.innerText.replace(/,/g, '')) || 0;
        const currentWater = parseFloat(waterDisplay.innerText.replace(/,/g, '')) || 0;

        animateValue(co2Display, currentCo2, targetCo2, 500, false);
        animateValue(wasteDisplay, currentWaste, targetWaste, 500, true);
        animateValue(waterDisplay, currentWater, targetWater, 500, false);
        
        // Trigger the visual burst!
        spawnEcoParticles();
    }

    deviceSelect.addEventListener('change', updateCalculator);
    qtyRange.addEventListener('input', updateCalculator);
});