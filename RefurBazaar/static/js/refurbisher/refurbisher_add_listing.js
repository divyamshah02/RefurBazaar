// Global variables
let API_ENDPOINTS = {}
let CSRF_TOKEN = ""
let currentStep = 1
const totalSteps = 4
let selectedModel = null
let modelAttributes = []

/**
 * Initialize the add listing page
 * @param {object} apiEndpoints - Object containing all API endpoint URLs
 * @param {string} csrfToken - CSRF token for API requests
 */
function initAddListing(apiEndpoints, csrfToken) {
  API_ENDPOINTS = apiEndpoints
  CSRF_TOKEN = csrfToken

  console.log("[v0] Initializing add listing page with endpoints:", API_ENDPOINTS)

  // Initialize wizard
  updateStepDisplay()
  setupEventListeners()

  // Load initial data
  loadCategories()
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById("categorySelect").addEventListener("change", onCategoryChange)
  document.getElementById("brandSelect").addEventListener("change", onBrandChange)
  document.getElementById("modelSelect").addEventListener("change", onModelChange)
  document.getElementById("quantityInput").addEventListener("change", updateDeviceDetails)
}

/**
 * Load categories from API
 */
async function loadCategories() {
  try {
    const [success, response] = await callApi("GET", API_ENDPOINTS.categories, null, CSRF_TOKEN)

    if (success && response.success) {
      const categories = response.data
      const categorySelect = document.getElementById("categorySelect")

      categorySelect.innerHTML = '<option value="">Select Category</option>'
      categories.forEach((category) => {
        const option = document.createElement("option")
        option.value = category.value
        option.textContent = category.label
        categorySelect.appendChild(option)
      })

      console.log("[v0] Loaded categories:", categories)
    }
  } catch (error) {
    console.error("[v0] Failed to load categories:", error)
    showNotification("Error loading categories", "error")
  }
}

/**
 * Handle category selection change
 */
async function onCategoryChange() {
  const category = document.getElementById("categorySelect").value
  const brandSelect = document.getElementById("brandSelect")
  const modelSelect = document.getElementById("modelSelect")

  // Reset dependent dropdowns
  brandSelect.innerHTML = '<option value="">Select Brand</option>'
  modelSelect.innerHTML = '<option value="">Select Model</option>'
  modelSelect.disabled = true
  selectedModel = null
  modelAttributes = []

  if (!category) {
    brandSelect.disabled = true
    return
  }

  try {
    const [success, response] = await callApi("GET", `${API_ENDPOINTS.brands}?category=${category}`, null, CSRF_TOKEN)

    if (success && response.success) {
      const brands = response.data
      brandSelect.disabled = false
      brands.forEach((brand) => {
        const option = document.createElement("option")
        option.value = brand.id
        option.textContent = brand.name
        brandSelect.appendChild(option)
      })

      console.log("[v0] Loaded brands for category:", category, brands)
    }
  } catch (error) {
    console.error("[v0] Failed to load brands:", error)
    showNotification("Error loading brands", "error")
  }
}

/**
 * Handle brand selection change
 */
async function onBrandChange() {
  const category = document.getElementById("categorySelect").value
  const brandId = document.getElementById("brandSelect").value
  const modelSelect = document.getElementById("modelSelect")

  modelSelect.innerHTML = '<option value="">Select Model</option>'
  selectedModel = null
  modelAttributes = []

  if (!brandId) {
    modelSelect.disabled = true
    return
  }

  try {
    const [success, response] = await callApi(
      "GET",
      `${API_ENDPOINTS.productModels}?category=${category}&brand_id=${brandId}`,
      null,
      CSRF_TOKEN,
    )

    if (success && response.success) {
      const models = response.data
      modelSelect.disabled = false
      models.forEach((model) => {
        const option = document.createElement("option")
        option.value = model.id
        option.textContent = model.name
        modelSelect.appendChild(option)
      })

      console.log("[v0] Loaded models:", models)
    }
  } catch (error) {
    console.error("[v0] Failed to load models:", error)
    showNotification("Error loading models", "error")
  }
}

/**
 * Handle model selection change
 */
async function onModelChange() {
  const modelId = document.getElementById("modelSelect").value

  if (!modelId) {
    selectedModel = null
    modelAttributes = []
    return
  }

  try {
    // Get model details
    const category = document.getElementById("categorySelect").value
    const brandId = document.getElementById("brandSelect").value
    const [success1, response1] = await callApi(
      "GET",
      `${API_ENDPOINTS.productModels}?category=${category}&brand_id=${brandId}`,
      null,
      CSRF_TOKEN,
    )

    if (success1 && response1.success) {
      selectedModel = response1.data.find((m) => m.id == modelId)
    }

    const [success2, response2] = await callApi(
      "GET",
      `${API_ENDPOINTS.productModelAttributes}?model_id=${modelId}`,
      null,
      CSRF_TOKEN,
    )

    if (success2 && response2.success) {
      modelAttributes = response2.data
      console.log("[v0] Selected model:", selectedModel)
      console.log("[v0] Model attributes:", modelAttributes)
    }
  } catch (error) {
    console.error("[v0] Failed to load model attributes:", error)
    showNotification("Error loading model attributes", "error")
  }
}

/**
 * Update device details when quantity changes
 */
function updateDeviceDetails() {
  const quantity = Number.parseInt(document.getElementById("quantityInput").value)
  if (quantity > 0 && modelAttributes.length > 0) {
    generateDeviceDetailForms(quantity)
  }
}

/**
 * Generate device detail forms based on quantity and model attributes
 */
function generateDeviceDetailForms(quantity) {
  const container = document.getElementById("deviceDetailsContainer")
  container.innerHTML = ""

  for (let i = 1; i <= quantity; i++) {
    const deviceForm = document.createElement("div")
    deviceForm.className = "device-form border rounded p-3 mb-3"

    let formHtml = `<h6 class="mb-3">Device ${i} Details</h6><div class="row">`

    // Generate fields for each attribute
    modelAttributes.forEach((attrLink, index) => {
      const attr = attrLink.attribute
      const isRequired = attrLink.is_required

      if (attr.data_type === "choice" && attr.possible_values && attr.possible_values.length > 0) {
        // Dropdown for choice attributes
        formHtml += `
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">${attr.name} ${isRequired ? "*" : ""}</label>
                            <select class="form-select" id="attr_${i}_${attr.id}" ${isRequired ? "required" : ""}>
                                <option value="">Select ${attr.name}</option>
                                ${attr.possible_values.map((val) => `<option value="${val}">${val}</option>`).join("")}
                            </select>
                        </div>
                    </div>
                `
      } else if (attr.data_type === "number") {
        // Number input
        formHtml += `
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">${attr.name} ${isRequired ? "*" : ""}</label>
                            <input type="number" class="form-control" id="attr_${i}_${attr.id}" placeholder="Enter ${attr.name}" ${isRequired ? "required" : ""}>
                        </div>
                    </div>
                `
      } else {
        // Text input
        formHtml += `
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">${attr.name} ${isRequired ? "*" : ""}</label>
                            <input type="text" class="form-control" id="attr_${i}_${attr.id}" placeholder="Enter ${attr.name}" ${isRequired ? "required" : ""}>
                        </div>
                    </div>
                `
      }
    })

    formHtml += "</div>"
    deviceForm.innerHTML = formHtml
    container.appendChild(deviceForm)
  }
}

/**
 * Generate quality assessment forms
 */
function generateQualityAssessment() {
  const quantity = Number.parseInt(document.getElementById("quantityInput").value)
  const category = document.getElementById("categorySelect").value
  const container = document.getElementById("qualityAssessmentContainer")
  container.innerHTML = ""

  // Quality check questions based on category
  const qualityQuestions = {
    mobile: [
      "Screen condition",
      "Camera functionality",
      "Battery health",
      "Charging port",
      "Speaker/Microphone",
      "Physical damage",
      "Water damage",
      "Touch responsiveness",
    ],
    laptop: [
      "Screen condition",
      "Keyboard functionality",
      "Trackpad/Mouse",
      "Battery health",
      "Charging port",
      "Physical damage",
      "Performance issues",
      "Overheating",
    ],
    tablet: [
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

  const questions = qualityQuestions[category] || qualityQuestions.mobile

  for (let i = 1; i <= quantity; i++) {
    const assessmentForm = document.createElement("div")
    assessmentForm.className = "assessment-form border rounded p-3 mb-3"
    assessmentForm.innerHTML = `
            <h6 class="mb-3">Device ${i} Quality Assessment</h6>
            <div class="quality-check-grid">
                ${questions
                  .map((question) => {
                    const fieldName = question.toLowerCase().replace(/\s+/g, "_")
                    return `
                        <div class="quality-check-item mb-4">
                            <label class="form-label fw-bold d-block mb-2">${question}</label>
                            <div class="d-flex flex-wrap gap-2">
                                <input type="radio" class="btn-check" name="${fieldName}_${i}" id="${fieldName}_${i}_excellent" value="excellent">
                                <label class="quality-chip excellent" for="${fieldName}_${i}_excellent">Excellent</label>

                                <input type="radio" class="btn-check" name="${fieldName}_${i}" id="${fieldName}_${i}_good" value="good">
                                <label class="quality-chip good" for="${fieldName}_${i}_good">Good</label>

                                <input type="radio" class="btn-check" name="${fieldName}_${i}" id="${fieldName}_${i}_fair" value="fair">
                                <label class="quality-chip fair" for="${fieldName}_${i}_fair">Fair</label>

                                <input type="radio" class="btn-check" name="${fieldName}_${i}" id="${fieldName}_${i}_poor" value="poor">
                                <label class="quality-chip poor" for="${fieldName}_${i}_poor">Poor</label>
                            </div>
                        </div>
                    `
                  })
                  .join("")}
            </div>
        `
    container.appendChild(assessmentForm)
  }
}

/**
 * Change wizard step
 */
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

/**
 * Validate current step
 */
function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      const category = document.getElementById("categorySelect").value
      const brand = document.getElementById("brandSelect").value
      const model = document.getElementById("modelSelect").value
      const quantity = document.getElementById("quantityInput").value

      if (!category || !brand || !model || !quantity) {
        showNotification("Please fill in all required fields", "error")
        return false
      }

      if (Number.parseInt(quantity) < 1) {
        showNotification("Quantity must be at least 1", "error")
        return false
      }

      // Generate device detail forms
      if (modelAttributes.length > 0) {
        generateDeviceDetailForms(Number.parseInt(quantity))
      }
      return true

    case 2:
      // Validate device details - check required attributes
      const quantity2 = Number.parseInt(document.getElementById("quantityInput").value)

      for (let i = 1; i <= quantity2; i++) {
        for (const attrLink of modelAttributes) {
          if (attrLink.is_required) {
            const attrValue = document.getElementById(`attr_${i}_${attrLink.attribute.id}`)?.value
            if (!attrValue) {
              showNotification(`Please fill in all required fields for Device ${i}`, "error")
              return false
            }
          }
        }
      }
      return true

    case 3:
      // Quality assessment is optional, so always return true
      return true

    default:
      return true
  }
}

/**
 * Update step display
 */
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
    contentElement.style.display = i === currentStep ? "block" : "none"
  }

  // Update navigation buttons
  const prevBtn = document.getElementById("prevBtn")
  const nextBtn = document.getElementById("nextBtn")
  const submitBtn = document.getElementById("submitBtn")

  prevBtn.style.display = currentStep === 1 ? "none" : "inline-block"

  if (currentStep === totalSteps) {
    nextBtn.style.display = "none"
    submitBtn.style.display = "inline-block"
  } else {
    nextBtn.style.display = "inline-block"
    submitBtn.style.display = "none"
  }
}

/**
 * Submit listing
 */
async function submitListing() {
  if (!validateCurrentStep()) {
    return
  }

  // Validate final step
  const price = document.getElementById("priceInput").value
  const condition = document.getElementById("conditionSelect").value

  if (!price || !condition) {
    showNotification("Please fill in price and condition", "error")
    return
  }

  try {
    // Collect form data
    const formData = collectFormData()

    console.log("[v0] Submitting listing:", formData)

    // Show loading state
    const submitBtn = document.getElementById("submitBtn")
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...'

    const [success, response] = await callApi("POST", API_ENDPOINTS.listings, formData, CSRF_TOKEN)

    if (success && response.success) {
      console.log("[v0] Listing created successfully:", response.data)
      showNotification("Listing created successfully", "success")

      // Redirect to listings page after 2 seconds
      setTimeout(() => {
        window.location.href = "refurbisher_listings.html"
      }, 2000)
    } else {
      throw new Error(response.error || "Failed to create listing")
    }
  } catch (error) {
    console.error("[v0] Failed to submit listing:", error)
    showNotification("Error: " + error.message, "error")

    // Restore button state
    const submitBtn = document.getElementById("submitBtn")
    submitBtn.disabled = false
    submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Create Listing'
  }
}

/**
 * Collect form data from the listing form
 */
function collectFormData() {
  const quantity = Number.parseInt(document.getElementById("quantityInput").value)
  const modelId = document.getElementById("modelSelect").value
  const price = document.getElementById("priceInput").value
  const condition = document.getElementById("conditionSelect").value

  const units = []

  for (let i = 1; i <= quantity; i++) {
    const unit = {
      quantity: 1,
      attributes: [],
    }

    // Collect attributes for this unit
    modelAttributes.forEach((attrLink) => {
      const attrValue = document.getElementById(`attr_${i}_${attrLink.attribute.id}`)?.value
      if (attrValue) {
        unit.attributes.push({
          attribute_id: attrLink.attribute.id,
          value: attrValue,
        })
      }
    })

    units.push(unit)
  }

  return {
    model_id: Number.parseInt(modelId),
    price_per_unit: Number.parseFloat(price),
    condition: condition,
    units: units,
  }
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('success' or 'error')
 */
function showNotification(message, type) {
  const notification = document.createElement("div")
  notification.className = `notification alert alert-${type}`
  notification.textContent = message

  const notificationContainer = document.getElementById("notificationContainer")
  notificationContainer.innerHTML = "" // Clear previous notifications
  notificationContainer.appendChild(notification)

  // Automatically hide the notification after 3 seconds
  setTimeout(() => {
    notificationContainer.removeChild(notification)
  }, 3000)
}
