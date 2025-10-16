// Add listing wizard functionality
let currentStep = 1
const totalSteps = 4
const deviceData = {}

// Sample data for categories, brands, and models
const categoryData = {
  smartphones: {
    brands: ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi"],
    models: {
      Apple: ["iPhone 12 Pro", "iPhone 12", "iPhone 11 Pro", "iPhone 11", "iPhone SE"],
      Samsung: ["Galaxy S21", "Galaxy S20", "Galaxy Note 20", "Galaxy A52", "Galaxy A32"],
      Google: ["Pixel 6", "Pixel 5", "Pixel 4a", "Pixel 4"],
      OnePlus: ["OnePlus 9 Pro", "OnePlus 9", "OnePlus 8T", "OnePlus 8"],
      Xiaomi: ["Mi 11", "Mi 10T", "Redmi Note 10", "Redmi 9"],
    },
  },
  laptops: {
    brands: ["Apple", "Dell", "HP", "Lenovo", "Asus"],
    models: {
      Apple: ["MacBook Air M1", 'MacBook Pro 13"', 'MacBook Pro 16"'],
      Dell: ["XPS 13", "XPS 15", "Inspiron 15", "Latitude 7420"],
      HP: ["Spectre x360", "EliteBook 840", "Pavilion 15", "Envy 13"],
      Lenovo: ["ThinkPad X1", "ThinkPad T14", "IdeaPad 5", "Legion 5"],
      Asus: ["ZenBook 14", "VivoBook S15", "ROG Strix", "TUF Gaming"],
    },
  },
  tablets: {
    brands: ["Apple", "Samsung", "Microsoft", "Lenovo"],
    models: {
      Apple: ['iPad Pro 12.9"', 'iPad Pro 11"', "iPad Air", "iPad"],
      Samsung: ["Galaxy Tab S7", "Galaxy Tab S6", "Galaxy Tab A7"],
      Microsoft: ["Surface Pro 8", "Surface Pro 7", "Surface Go 3"],
      Lenovo: ["Tab P11", "Tab M10", "Tab P10"],
    },
  },
  smartwatches: {
    brands: ["Apple", "Samsung", "Garmin", "Fitbit"],
    models: {
      Apple: ["Apple Watch Series 7", "Apple Watch SE", "Apple Watch Series 6"],
      Samsung: ["Galaxy Watch 4", "Galaxy Watch Active 2", "Galaxy Watch 3"],
      Garmin: ["Forerunner 945", "Fenix 6", "Vivoactive 4"],
      Fitbit: ["Versa 3", "Sense", "Charge 5"],
    },
  },
  audio: {
    brands: ["Apple", "Sony", "Bose", "JBL", "Sennheiser"],
    models: {
      Apple: ["AirPods Pro", "AirPods Max", "AirPods 3rd Gen"],
      Sony: ["WH-1000XM4", "WF-1000XM4", "WH-CH720N"],
      Bose: ["QuietComfort 45", "SoundLink Revolve+", "Sport Earbuds"],
      JBL: ["Live 650BTNC", "Tune 750BTNC", "Flip 5"],
      Sennheiser: ["Momentum 3", "HD 450BT", "CX 400BT"],
    },
  },
}

document.addEventListener("DOMContentLoaded", () => {
  initializeWizard()
})

function initializeWizard() {
  updateStepDisplay()
  setupEventListeners()
}

function setupEventListeners() {
  // Category selection
  document.getElementById("categorySelect").addEventListener("change", loadBrands)
  document.getElementById("brandSelect").addEventListener("change", loadModels)
  document.getElementById("quantityInput").addEventListener("change", updateDeviceDetails)
}

function loadBrands() {
  const category = document.getElementById("categorySelect").value
  const brandSelect = document.getElementById("brandSelect")
  const modelSelect = document.getElementById("modelSelect")

  // Clear previous selections
  brandSelect.innerHTML = '<option value="">Select Brand</option>'
  modelSelect.innerHTML = '<option value="">Select Model</option>'
  modelSelect.disabled = true

  if (category && categoryData[category]) {
    brandSelect.disabled = false
    categoryData[category].brands.forEach((brand) => {
      const option = document.createElement("option")
      option.value = brand
      option.textContent = brand
      brandSelect.appendChild(option)
    })
  } else {
    brandSelect.disabled = true
  }
}

function loadModels() {
  const category = document.getElementById("categorySelect").value
  const brand = document.getElementById("brandSelect").value
  const modelSelect = document.getElementById("modelSelect")

  modelSelect.innerHTML = '<option value="">Select Model</option>'

  if (category && brand && categoryData[category] && categoryData[category].models[brand]) {
    modelSelect.disabled = false
    categoryData[category].models[brand].forEach((model) => {
      const option = document.createElement("option")
      option.value = model
      option.textContent = model
      modelSelect.appendChild(option)
    })
  } else {
    modelSelect.disabled = true
  }
}

function updateDeviceDetails() {
  const quantity = Number.parseInt(document.getElementById("quantityInput").value)
  if (quantity > 0) {
    generateDeviceDetailForms(quantity)
  }
}

function generateDeviceDetailForms(quantity) {
  const container = document.getElementById("deviceDetailsContainer")
  container.innerHTML = ""

  for (let i = 1; i <= quantity; i++) {
    const deviceForm = document.createElement("div")
    deviceForm.className = "device-form border rounded p-3 mb-3"
    deviceForm.innerHTML = `
            <h6 class="mb-3">Device ${i} Details</h6>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">IMEI/Serial Number *</label>
                        <input type="text" class="form-control" name="imei_${i}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">Storage Capacity</label>
                        <select class="form-select" name="storage_${i}">
                            <option value="">Select Storage</option>
                            <option value="64GB">64GB</option>
                            <option value="128GB">128GB</option>
                            <option value="256GB">256GB</option>
                            <option value="512GB">512GB</option>
                            <option value="1TB">1TB</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">Color</label>
                        <input type="text" class="form-control" name="color_${i}" placeholder="e.g., Space Gray, Blue">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">Purchase Date</label>
                        <input type="date" class="form-control" name="purchase_date_${i}">
                    </div>
                </div>
            </div>
        `
    container.appendChild(deviceForm)
  }
}

function generateQualityAssessment() {
  const quantity = Number.parseInt(document.getElementById("quantityInput").value)
  const category = document.getElementById("categorySelect").value
  const container = document.getElementById("qualityAssessmentContainer")
  container.innerHTML = ""

  // Quality check questions based on category
  const qualityQuestions = {
    smartphones: [
      "Screen condition",
      "Camera functionality",
      "Battery health",
      "Charging port",
      "Speaker/Microphone",
      "Physical damage",
      "Water damage",
      "Touch responsiveness",
    ],
    laptops: [
      "Screen condition",
      "Keyboard functionality",
      "Trackpad/Mouse",
      "Battery health",
      "Charging port",
      "Physical damage",
      "Performance issues",
      "Overheating",
    ],
    tablets: [
      "Screen condition",
      "Touch responsiveness",
      "Camera functionality",
      "Battery health",
      "Charging port",
      "Physical damage",
      "Water damage",
      "Performance issues",
    ],
  }

  const questions = qualityQuestions[category] || qualityQuestions.smartphones

  for (let i = 1; i <= quantity; i++) {
    const assessmentForm = document.createElement("div")
    assessmentForm.className = "assessment-form border rounded p-3 mb-3"
    assessmentForm.innerHTML = `
    <h6 class="mb-3">Device ${i} Quality Assessment</h6>
    <div class="quality-check-grid">
        ${questions
          .map(
            (question) => `
            <div class="quality-check-item mb-4">
                <label class="form-label fw-bold d-block mb-2">${question}</label>
                <div class="d-flex flex-wrap gap-2">
                    <input type="radio" class="btn-check" name="${question.toLowerCase().replace(/\s+/g, "_")}_${i}" id="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_excellent" value="excellent">
                    <label class="quality-chip excellent" for="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_excellent">Excellent</label>

                    <input type="radio" class="btn-check" name="${question.toLowerCase().replace(/\s+/g, "_")}_${i}" id="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_good" value="good">
                    <label class="quality-chip good" for="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_good">Good</label>

                    <input type="radio" class="btn-check" name="${question.toLowerCase().replace(/\s+/g, "_")}_${i}" id="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_fair" value="fair">
                    <label class="quality-chip fair" for="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_fair">Fair</label>

                    <input type="radio" class="btn-check" name="${question.toLowerCase().replace(/\s+/g, "_")}_${i}" id="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_poor" value="poor">
                    <label class="quality-chip poor" for="${question.toLowerCase().replace(/\s+/g, "_")}_${i}_poor">Poor</label>
                </div>
            </div>
        `,
          )
          .join("")}
    </div>
`


    container.appendChild(assessmentForm)
  }
}

function changeStep(direction) {
  const newStep = currentStep + direction

  if (newStep < 1 || newStep > totalSteps) {
    return
  }

  // Validate current step before proceeding
  if (direction > 0 && !validateCurrentStep()) {
    return
  }

  // Special handling for step 2 to 3 transition
  if (currentStep === 2 && direction > 0) {
    generateQualityAssessment()
  }

  currentStep = newStep
  updateStepDisplay()
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      const category = document.getElementById("categorySelect").value
      const brand = document.getElementById("brandSelect").value
      const model = document.getElementById("modelSelect").value
      const quantity = document.getElementById("quantityInput").value

      if (!category || !brand || !model || !quantity) {
        alert("Please fill in all required fields")
        return false
      }

      if (currentStep === 1 && Number.parseInt(quantity) > 0) {
        generateDeviceDetailForms(Number.parseInt(quantity))
      }
      return true

    case 2:
      // Validate device details
      const imeiInputs = document.querySelectorAll('input[name^="imei_"]')
      for (const input of imeiInputs) {
        if (!input.value.trim()) {
          alert("Please fill in all IMEI/Serial numbers")
          return false
        }
      }
      return true

    case 3:
      // Validate quality assessment
      const quantity3 = Number.parseInt(document.getElementById("quantityInput").value)
      const category3 = document.getElementById("categorySelect").value
      const qualityQuestions = {
        smartphones: 8,
        laptops: 8,
        tablets: 8,
      }
      const expectedQuestions = qualityQuestions[category3] || 8

      for (let i = 1; i <= quantity3; i++) {
        const checkedInputs = document.querySelectorAll(`input[name$="_${i}"]:checked`)
        if (checkedInputs.length < expectedQuestions) {
          alert(`Please complete quality assessment for Device ${i}`)
          return false
        }
      }
      return true

    default:
      return true
  }
}

function updateStepDisplay() {
  // Update step indicators
  for (let i = 1; i <= totalSteps; i++) {
    const stepElement = document.getElementById(`step${i}`)
    const contentElement = document.getElementById(`content${i}`)

    if (i < currentStep) {
      stepElement.classList.add("completed")
      stepElement.classList.remove("active")
    } else if (i === currentStep) {
      stepElement.classList.add("active")
      stepElement.classList.remove("completed")
    } else {
      stepElement.classList.remove("active", "completed")
    }

    // Show/hide content
    if (i === currentStep) {
      contentElement.style.display = "block"
    } else {
      contentElement.style.display = "none"
    }
  }

  // Update navigation buttons
  const prevBtn = document.getElementById("prevBtn")
  const nextBtn = document.getElementById("nextBtn")
  const submitBtn = document.getElementById("submitBtn")

  if (currentStep === 1) {
    prevBtn.style.display = "none"
  } else {
    prevBtn.style.display = "inline-block"
  }

  if (currentStep === totalSteps) {
    nextBtn.style.display = "none"
    submitBtn.style.display = "inline-block"
  } else {
    nextBtn.style.display = "inline-block"
    submitBtn.style.display = "none"
  }
}

function submitListing() {
  if (!validateCurrentStep()) {
    return
  }

  // Collect all form data
  const formData = collectFormData()

  // Simulate API submission
  console.log("Submitting listing:", formData)

  // Show success message
  alert("Listing created successfully!")

  // Redirect to listings page
  window.location.href = "refurbisher_listings.html"
}

function collectFormData() {
  const category = document.getElementById("categorySelect").value
  const brand = document.getElementById("brandSelect").value
  const model = document.getElementById("modelSelect").value
  const quantity = Number.parseInt(document.getElementById("quantityInput").value)
  const price = document.getElementById("priceInput").value
  const discount = document.getElementById("discountInput").value

  const devices = []

  for (let i = 1; i <= quantity; i++) {
    const device = {
      imei: document.querySelector(`input[name="imei_${i}"]`).value,
      storage: document.querySelector(`select[name="storage_${i}"]`).value,
      color: document.querySelector(`input[name="color_${i}"]`).value,
      purchaseDate: document.querySelector(`input[name="purchase_date_${i}"]`).value,
      qualityAssessment: {},
    }

    // Collect quality assessment data
    const qualityInputs = document.querySelectorAll(`input[name$="_${i}"]:checked`)
    qualityInputs.forEach((input) => {
      const questionName = input.name.replace(`_${i}`, "")
      device.qualityAssessment[questionName] = input.value
    })

    devices.push(device)
  }

  return {
    category,
    brand,
    model,
    quantity,
    price,
    discount,
    devices,
  }
}
