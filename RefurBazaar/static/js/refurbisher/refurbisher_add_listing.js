// Global variables
let API_ENDPOINTS = {}
let CSRF_TOKEN = ""
let currentStep = 1
const totalSteps = 2 // Reduced from 4 to 2 steps
let selectedModel = null
let modelAttributes = []
let unitCounter = 0 // Track unit count for unique IDs
const units = []

/**
 * Initialize the add listing page
 */
function initAddListing(apiEndpoints, csrfToken) {
  API_ENDPOINTS = apiEndpoints
  CSRF_TOKEN = csrfToken

  console.log("Initializing add listing page with endpoints:", API_ENDPOINTS)

  updateStepDisplay()
  setupEventListeners()
  loadCategories()
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById("categorySelect").addEventListener("change", onCategoryChange)
  document.getElementById("brandSelect").addEventListener("change", onBrandChange)
  document.getElementById("modelSelect").addEventListener("change", onModelChange)
  document.getElementById("addUnitBtn").addEventListener("click", addNewUnit)
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

      console.log("Loaded categories:", categories)
    }
  } catch (error) {
    console.error("Failed to load categories:", error)
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

      console.log("Loaded brands for category:", category, brands)
    }
  } catch (error) {
    console.error("Failed to load brands:", error)
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

      console.log("Loaded models:", models)
    }
  } catch (error) {
    console.error("Failed to load models:", error)
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
    document.getElementById("selectedDeviceInfo").style.display = "none"
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
      console.log("Selected model:", selectedModel)
      console.log("Model attributes:", modelAttributes)
    }
  } catch (error) {
    console.error("Failed to load model attributes:", error)
    showNotification("Error loading model attributes", "error")
  }
}

/**
 * Add a new unit to the listing
 */
function addNewUnit() {
  unitCounter++
  const unitId = `unit_${unitCounter}`

  const unitCard = document.createElement("div")
  unitCard.className = "card mb-3 border-0 shadow-sm unit-card"
  unitCard.id = unitId
  unitCard.dataset.unitId = unitCounter

  let attributesHtml = ""
  modelAttributes.forEach((attrLink) => {
    const attr = attrLink.attribute
    const isRequired = attrLink.is_required

    if (attr.data_type === "choice" && attr.possible_values && attr.possible_values.length > 0) {
      attributesHtml += `
        <div class="col-md-6">
          <div class="form-group">
            <label class="form-label">${attr.name} ${isRequired ? "*" : ""}</label>
            <select class="form-select" data-attr-id="${attr.id}" ${isRequired ? "required" : ""}>
              <option value="">Select ${attr.name}</option>
              ${attr.possible_values.map((val) => `<option value="${val}">${val}</option>`).join("")}
            </select>
          </div>
        </div>
      `
    } else if (attr.data_type === "number") {
      attributesHtml += `
        <div class="col-md-6">
          <div class="form-group">
            <label class="form-label">${attr.name} ${isRequired ? "*" : ""}</label>
            <input type="number" class="form-control" data-attr-id="${attr.id}" placeholder="Enter ${attr.name}" ${isRequired ? "required" : ""}>
          </div>
        </div>
      `
    } else {
      attributesHtml += `
        <div class="col-md-6">
          <div class="form-group">
            <label class="form-label">${attr.name} ${isRequired ? "*" : ""}</label>
            <input type="text" class="form-control" data-attr-id="${attr.id}" placeholder="Enter ${attr.name}" ${isRequired ? "required" : ""}>
          </div>
        </div>
      `
    }
  })

  unitCard.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0"><i class="fas fa-mobile-alt me-2"></i>Unit #${unitCounter}</h6>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeUnit('${unitId}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label class="form-label">Price (₹) *</label>
            <input type="number" class="form-control" data-field="price" placeholder="Enter price" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label class="form-label">Condition *</label>
            <select class="form-select" data-field="condition" required>
              <option value="">Select Condition</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>
        </div>
      </div>
      
      ${
        attributesHtml
          ? `
        <hr class="my-3">
        <h6 class="mb-3">Device Specifications</h6>
        <div class="row">
          ${attributesHtml}
        </div>
      `
          : ""
      }

      <!-- More Units Section -->
      <div class="mt-4 pt-3 border-top">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" data-field="hasmoreqty" id="moreUnits_${unitCounter}" data-unit-id="${unitCounter}">
          <label class="form-check-label" for="moreUnits_${unitCounter}">
            Have more units? (same specifications & price)
          </label>
        </div>
        
        <div id="quantityContainer_${unitCounter}" style="display: none;" class="mt-3">
          <div class="row">
            <div class="col-md-4">
              <div class="form-group">
                <label class="form-label">Quantity of same units *</label>
                <input type="number" class="form-control" data-field="quantity" min="1" placeholder="e.g., 5" value="1">
                <small class="text-muted">Total units with same specs will be: 1 + quantity entered here</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  document.getElementById("unitsContainer").appendChild(unitCard)
  document.getElementById("emptyUnitsState").style.display = "none"

  // Add event listener for the checkbox
  const checkbox = unitCard.querySelector(`#moreUnits_${unitCounter}`)
  const quantityContainer = unitCard.querySelector(`#quantityContainer_${unitCounter}`)
  
  checkbox.addEventListener("change", function() {
    quantityContainer.style.display = this.checked ? "block" : "none"
  })

  console.log("Added unit:", unitCounter)
}

/**
 * Remove a unit from the listing
 */
function removeUnit(unitId) {
  const unitCard = document.getElementById(unitId)
  if (unitCard) {
    unitCard.remove()
    console.log("Removed unit:", unitId)

    // Show empty state if no units left
    const remainingUnits = document.querySelectorAll(".unit-card")
    if (remainingUnits.length === 0) {
      document.getElementById("emptyUnitsState").style.display = "block"
    }
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

  currentStep = newStep
  updateStepDisplay()

  // If moving to step 2, show device info and auto-add first unit
  if (currentStep === 2) {
    showSelectedDeviceInfo()
    addNewUnit() // Auto-click add unit button
  }
}

/**
 * Show selected device info at the top of step 2
 */
function showSelectedDeviceInfo() {
  const brandName = document.getElementById("brandSelect").options[document.getElementById("brandSelect").selectedIndex].text
  const categoryName = document.getElementById("categorySelect").options[document.getElementById("categorySelect").selectedIndex].text
  document.getElementById("deviceInfoText").textContent = `${categoryName} - ${brandName} ${selectedModel.name}`
  document.getElementById("selectedDeviceInfo").style.display = ""
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

      if (!category || !brand || !model) {
        showNotification("Please select category, brand, and model", "error")
        return false
      }

      return true

    case 2:
      // Validate that at least one unit is added
      const unitCards = document.querySelectorAll(".unit-card")
      if (unitCards.length === 0) {
        showNotification("Please add at least one unit", "error")
        return false
      }

      // Validate each unit
      for (const unitCard of unitCards) {
        const price = unitCard.querySelector('[data-field="price"]')?.value
        const condition = unitCard.querySelector('[data-field="condition"]')?.value

        if (!price || !condition) {
          showNotification("Please fill in price and condition for each unit", "error")
          return false
        }

        // Validate required attributes
        for (const attrLink of modelAttributes) {
          if (attrLink.is_required) {
            const attrValue = unitCard.querySelector(`[data-attr-id="${attrLink.attribute.id}"]`)?.value
            if (!attrValue) {
              showNotification(`Please fill in ${attrLink.attribute.name} for all units`, "error")
              return false
            }
          }
        }
      }
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

    contentElement.style.display = i === currentStep ? "block" : "none"
  }

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

  try {
    // Collect form data
    const formData = collectFormData()

    console.log("Submitting listing:", formData)

    // Show loading state
    const submitBtn = document.getElementById("submitBtn")
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...'

    const [success, response] = await callApi("POST", API_ENDPOINTS.listings, formData, CSRF_TOKEN)

    if (success && response.success) {
      console.log("Listing created successfully:", response.data)
      showNotification("Listing created successfully", "success")

      // Redirect to listings page after 2 seconds
      setTimeout(() => {
        window.location.href = "/refurbisher-listings/"
      }, 2000)
    } else {
      // Check for profile validation errors
      if (window.handleApiError && window.handleApiError(response)) {
        // Restore button state
        const submitBtn = document.getElementById("submitBtn")
        submitBtn.disabled = false
        submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Create Listing'
        return
      }
      throw new Error(response.error || "Failed to create listing")
    }
  } catch (error) {
    console.error("Failed to submit listing:", error)
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
  const modelId = document.getElementById("modelSelect").value
  const unitCards = document.querySelectorAll(".unit-card")

  const units = []

  unitCards.forEach((unitCard) => {
    const price = Number.parseFloat(unitCard.querySelector('[data-field="price"]')?.value)
    const condition = unitCard.querySelector('[data-field="condition"]')?.value
    // const hasMoreUnits = unitCard.querySelector('[data-field="quantity"]')?.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector('input[type="checkbox"]')?.checked || false
    const hasMoreUnits = unitCard.querySelector('[data-field="hasmoreqty"]')?.checked || false
    console.log(hasMoreUnits)
    const quantity = hasMoreUnits ? Number.parseInt(unitCard.querySelector('[data-field="quantity"]')?.value || 1) : 0
    console.log(quantity)

    const attributes = []
    modelAttributes.forEach((attrLink) => {
      const attrValue = unitCard.querySelector(`[data-attr-id="${attrLink.attribute.id}"]`)?.value
      if (attrValue) {
        attributes.push({
          attribute_id: attrLink.attribute.id,
          value: attrValue,
        })
      }
    })

    // Create the base unit
    units.push({
      price: price,
      condition: condition,
      attributes: attributes,
    })

    // If more units selected, create additional units with same specs
    if (hasMoreUnits && quantity > 0) {
      for (let i = 0; i < quantity; i++) {
        units.push({
          price: price,
          condition: condition,
          attributes: attributes,
        })
      }
    }
  })

  return {
    model_id: Number.parseInt(modelId),
    units: units,
  }
}

/**
 * Show a notification to the user
 */
function showNotification(message, type) {
  const notification = document.createElement("div")
  notification.className = `alert alert-${type === "error" ? "danger" : "success"} alert-dismissible fade show`
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

  const notificationContainer = document.getElementById("notificationContainer")
  notificationContainer.innerHTML = ""
  notificationContainer.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, 5000)
}
