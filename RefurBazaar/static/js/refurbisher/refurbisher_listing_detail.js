// Global variables
let API_URLS = {}
let CSRF_TOKEN = ""
let LISTING_ID = null
let listingData = null
let productModelAttributes = []
let editingUnitId = null
let editingUnitData = null
const bootstrap = window.bootstrap // Declare the bootstrap variable

/**
 * Initialize the listing detail page
 * @param {number} listingId - The listing ID
 * @param {Object} apiUrls - Object containing API endpoint URLs
 * @param {string} csrfToken - CSRF token for API requests
 */
function initListingDetail(listingId, apiUrls, csrfToken) {
  API_URLS = apiUrls
  CSRF_TOKEN = csrfToken
  LISTING_ID = listingId

  // Load data
  loadUserInfo()
  loadListingDetails()

  // Setup event listeners
  setupEventListeners()
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  document.getElementById("add-unit-btn").addEventListener("click", showAddUnitModal)
  document.getElementById("save-unit-btn").addEventListener("click", saveNewUnit)
}

/**
 * Load user information
 */
async function loadUserInfo() {
  try {
    const [success, response] = await callApi("GET", API_URLS.userDetail, null, CSRF_TOKEN)
    if (success && response.success && response.data) {
      const userName =
        response.data.first_name && response.data.last_name
          ? `${response.data.first_name} ${response.data.last_name}`
          : response.data.name || "User"

      // document.getElementById("user-name").textContent = userName
      // document.getElementById("sidebar-user-name").textContent = userName
    }
  } catch (error) {
    console.error("Error loading user info:", error)
  }
}

/**
 * Load listing details
 */
async function loadListingDetails() {
  try {
    const [success, response] = await callApi("GET", `${API_URLS.listings}${LISTING_ID}/`, null, CSRF_TOKEN)

    if (success && response.success && response.data) {
      listingData = response.data

      // Load product model attributes
      await loadProductModelAttributes()

      // Render all sections
      renderListingHeader()
      renderListingStats()
      renderListingInfo()
      renderUnitsTable()
    } else {
      showError("Failed to load listing details")
      setTimeout(() => {
        window.location.href = "refurbisher-listings"
      }, 2000)
    }
  } catch (error) {
    console.error("Error loading listing details:", error)
    showError("Error loading listing details")
  }
}

/**
 * Load product model attributes
 */
async function loadProductModelAttributes() {
  try {
    const [success, response] = await callApi(
      "GET",
      `${API_URLS.productModelAttributes}?model_id=${listingData.model}`,
      null,
      CSRF_TOKEN,
    )

    if (success && response.success && response.data) {
      productModelAttributes = response.data
    }
  } catch (error) {
    console.error("Error loading attributes:", error)
  }
}

/**
 * Render listing header
 */
function renderListingHeader() {
  document.getElementById("listing-title").textContent = listingData.model_name
  document.getElementById("listing-subtitle").textContent =
    `${listingData.brand_name} • ${getCategoryLabel(listingData.category)}`

  const statusBadge = document.getElementById("listing-status-badge")
  statusBadge.innerHTML = getStatusBadge(listingData.status)
}

/**
 * Render listing stats
 */
function renderListingStats() {
  const totalUnits = listingData.units.length
  const availableUnits = listingData.units.filter((u) => u.is_available && !u.is_sold).length
  const soldUnits = listingData.units.filter((u) => u.is_sold).length
  const unavailableUnits = listingData.units.filter((u) => !u.is_available).length

  const statsHTML = `
        <div class="stat-card">
            <div class="stat-icon primary">
                <i class="fas fa-boxes"></i>
            </div>
            <div class="stat-value">${totalUnits}</div>
            <div class="stat-label">Total Units</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon success">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-value">${availableUnits}</div>
            <div class="stat-label">Available</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon danger">
                <i class="fas fa-cart-shopping"></i>
            </div>
            <div class="stat-value">${soldUnits}</div>
            <div class="stat-label">Sold</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warning">
                <i class="fas fa-ban"></i>
            </div>
            <div class="stat-value">${unavailableUnits}</div>
            <div class="stat-label">Unavailable</div>
        </div>
    `

  document.getElementById("listing-stats").innerHTML = statsHTML
}

/**
 * Render listing information
 */
function renderListingInfo() {
  const infoHTML = `
        <div class="info-item mt-3">
            <label>Created</label>
            <div>${formatDate(listingData.created_at)}</div>
        </div>
        <div class="info-item mt-3">
            <label>Last Updated</label>
            <div>${formatDate(listingData.updated_at)}</div>
        </div>
    `

  document.getElementById("listing-info").innerHTML = `
        <h5 class="mb-3">Listing Information</h5>
        ${infoHTML}
    `
}

/**
 * Render units table
 */
function renderUnitsTable() {
  const tbody = document.getElementById("units-table-body")
  const emptyState = document.getElementById("units-empty-state")

  if (listingData.units.length === 0) {
    tbody.innerHTML = ""
    emptyState.style.display = "block"
    return
  }

  emptyState.style.display = "none"

  tbody.innerHTML = listingData.units
    .map((unit) => {
      const attributes = unit.attributes.map((attr) => `${attr.attribute_name}: ${attr.value}`).join(", ")

      const conditionBadge = getConditionBadge(unit.condition)

      let statusBadge = ""
      if (unit.is_sold) {
        statusBadge = '<span class="status-badge status-inactive">Sold</span>'
      } else if (unit.is_available) {
        statusBadge = '<span class="status-badge status-active">Available</span>'
      } else {
        statusBadge = '<span class="status-badge status-pending">Unavailable</span>'
      }

      return `
            <tr>
                <td><strong>#${unit.unit_number}</strong></td>
                <td>${attributes || "No attributes"}</td>
                <td>${conditionBadge}</td>
                <td><strong>₹${Number.parseFloat(unit.price).toLocaleString("en-IN")}</strong></td>
                <td>${statusBadge}</td>
                <td>
                    ${
                      !unit.is_sold
                        ? `
                        <button class="action-btn btn-outline-primary" 
                                onclick="editUnit(${unit.id})" 
                                title="Edit Unit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-${unit.is_available ? "warning" : "success"}" 
                                onclick="toggleUnitAvailability(${unit.id}, ${unit.is_available})" 
                                title="${unit.is_available ? "Mark Unavailable" : "Mark Available"}">
                            <i class="fas fa-${unit.is_available ? "pause" : "play"}"></i>
                        </button>
                        <button class="action-btn btn-info" 
                                onclick="markUnitAsSold(${unit.id})" 
                                title="Mark as Sold">
                            <i class="fas fa-check"></i>
                        </button>
                    `
                        : ""
                    }
                    <button class="action-btn btn-delete" 
                            onclick="deleteUnit(${unit.id}, ${unit.unit_number})" 
                            title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
    })
    .join("")
}

/**
 * Render a single attribute form field using the pma data_type and possible_values
 * (both live on the pma object, not on pma.attribute).
 * @param {Object} pma - ProductModelAttribute object from the API
 * @param {string} currentValue - Pre-fill value when editing an existing unit
 * @returns {string} HTML string for the form field
 */
function renderAttributeField(pma, currentValue = "") {
  const attr      = pma.attribute
  const dataType  = pma.data_type        // on pma, not pma.attribute
  const possVals  = pma.possible_values  // on pma, not pma.attribute
  const required  = pma.is_required ? "required" : ""
  const label     = `${attr.name}${pma.is_required ? " *" : ""}`

  if (dataType === "choice" && possVals && possVals.length > 0) {
    const options = possVals
      .map((v) => `<option value="${v}"${v === currentValue ? " selected" : ""}>${v}</option>`)
      .join("")
    return `
      <div class="mb-3">
        <label class="form-label">${label}</label>
        <select class="form-control" data-attribute-id="${attr.id}" ${required}>
          <option value="">Select ${attr.name}</option>
          ${options}
        </select>
      </div>`
  } else if (dataType === "number") {
    return `
      <div class="mb-3">
        <label class="form-label">${label}</label>
        <input type="number" class="form-control" data-attribute-id="${attr.id}"
               placeholder="Enter ${attr.name}" value="${currentValue}" ${required}>
      </div>`
  } else {
    return `
      <div class="mb-3">
        <label class="form-label">${label}</label>
        <input type="text" class="form-control" data-attribute-id="${attr.id}"
               placeholder="Enter ${attr.name}" value="${currentValue}" ${required}>
      </div>`
  }
}

/**
 * Show add unit modal
 */
function showAddUnitModal() {
  editingUnitId = null
  editingUnitData = null

  document.getElementById("unitModalTitle").textContent = "Add New Unit"

  const container = document.getElementById("unit-attributes-container")
  container.innerHTML = productModelAttributes
    .map((pma) => renderAttributeField(pma, ""))
    .join("")

  document.getElementById("unit-price").value = ""
  document.getElementById("unit-condition").value = ""

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("unitModal"))
  modal.show()
}

/**
 * Edit existing unit
 */
function editUnit(unitId) {
  const unit = listingData.units.find((u) => u.id === unitId)
  if (!unit) {
    showError("Unit not found")
    return
  }

  editingUnitId = unitId
  editingUnitData = unit

  document.getElementById("unitModalTitle").textContent = `Edit Unit #${unit.unit_number}`

  // Populate attribute fields with current values
  const container = document.getElementById("unit-attributes-container")
  container.innerHTML = productModelAttributes
    .map((pma) => {
      // unit.attributes items have shape: {id, attribute (int FK), attribute_name, value}
      const currentAttr = unit.attributes.find((a) => a.attribute === pma.attribute.id)
      const currentValue = currentAttr ? currentAttr.value : ""
      return renderAttributeField(pma, currentValue)
    })
    .join("")

  document.getElementById("unit-price").value = unit.price
  document.getElementById("unit-condition").value = unit.condition

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("unitModal"))
  modal.show()
}

/**
 * Save new unit
 */
async function saveNewUnit() {
  const price = document.getElementById("unit-price").value
  const condition = document.getElementById("unit-condition").value

  if (!price || !condition) {
    showError("Please enter price and select condition")
    return
  }

  // Collect attributes — query all [data-attribute-id] elements (select + input)
  const attributeFields = document.querySelectorAll("#unit-attributes-container [data-attribute-id]")
  const attributes = []

  for (const field of attributeFields) {
    if (!field.value && field.required) {
      showError(`Please fill in ${field.previousElementSibling?.textContent || "a required field"}`)
      return
    }
    if (field.value) {
      attributes.push({
        attribute: Number.parseInt(field.dataset.attributeId),
        value: field.value,
      })
    }
  }

  if (editingUnitId) {
    // Update existing unit
    const unitData = {
      price: Number.parseFloat(price),
      condition: condition,
      attributes: attributes,
    }

    try {
      const [success, response] = await callApi(
        "PATCH",
        `${API_URLS.listings}${LISTING_ID}/update_unit/${editingUnitId}/`,
        unitData,
        CSRF_TOKEN,
      )

      if (success && response.success) {
        showSuccess("Unit updated successfully")

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("unitModal"))
        modal.hide()

        // Reload listing details
        loadListingDetails()
      } else {
        showError("Failed to update unit")
      }
    } catch (error) {
      console.error("Error updating unit:", error)
      showError("Error updating unit. Please try again.")
    }
  } else {
    // Create new unit
    const unitData = {
      price: Number.parseFloat(price),
      condition: condition,
      attributes: attributes,
    }

    try {
      const [success, response] = await callApi(
        "POST",
        `${API_URLS.listings}${LISTING_ID}/add_unit/`,
        unitData,
        CSRF_TOKEN,
      )

      if (success && response.success) {
        showSuccess("Unit added successfully")

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("unitModal"))
        modal.hide()

        // Reload listing details
        loadListingDetails()
      } else {
        showError("Failed to add unit")
      }
    } catch (error) {
      console.error("Error adding unit:", error)
      showError("Error adding unit. Please try again.")
    }
  }
}

/**
 * Toggle unit availability
 */
async function toggleUnitAvailability(unitId, currentStatus) {
  const newStatus = !currentStatus

  try {
    const [success, response] = await callApi(
      "PATCH",
      `${API_URLS.listings}${LISTING_ID}/update_unit/${unitId}/`,
      {
        is_available: newStatus,
      },
      CSRF_TOKEN,
    )

    if (success && response.success) {
      showSuccess(`Unit marked as ${newStatus ? "available" : "unavailable"}`)
      loadListingDetails()
    } else {
      showError("Failed to update unit status")
    }
  } catch (error) {
    console.error("Error updating unit:", error)
    showError("Error updating unit. Please try again.")
  }
}

/**
 * Mark unit as sold
 */
async function markUnitAsSold(unitId) {
  if (!confirm("Are you sure you want to mark this unit as sold?")) {
    return
  }

  try {
    const [success, response] = await callApi(
      "PATCH",
      `${API_URLS.listings}${LISTING_ID}/update_unit/${unitId}/`,
      {
        is_sold: true,
        is_available: false,
      },
      CSRF_TOKEN,
    )

    if (success && response.success) {
      showSuccess("Unit marked as sold")
      loadListingDetails()
    } else {
      showError("Failed to mark unit as sold")
    }
  } catch (error) {
    console.error("Error marking unit as sold:", error)
    showError("Error marking unit as sold. Please try again.")
  }
}

/**
 * Delete unit
 */
async function deleteUnit(unitId, unitNumber) {
  if (!confirm(`Are you sure you want to delete Unit #${unitNumber}?`)) {
    return
  }

  try {
    const [success, response] = await callApi(
      "DELETE",
      `${API_URLS.listings}${LISTING_ID}/delete_unit/${unitId}/`,
      null,
      CSRF_TOKEN,
    )

    if (success && response.success) {
      showSuccess("Unit deleted successfully")
      loadListingDetails()
    } else {
      showError("Failed to delete unit")
    }
  } catch (error) {
    console.error("Error deleting unit:", error)
    showError("Error deleting unit. Please try again.")
  }
}

/**
 * Delete listing
 */
async function deleteListing() {
  if (!confirm("Are you sure you want to delete this listing? This will also delete all associated units.")) {
    return
  }

  try {
    const [success, response] = await callApi("DELETE", `${API_URLS.listings}${LISTING_ID}/`, null, CSRF_TOKEN)

    if (success && response.success) {
      showSuccess("Listing deleted successfully")
      setTimeout(() => {
        window.location.href = "/refurbisher-listings/"
      }, 1500)
    } else {
      showError("Failed to delete listing")
    }
  } catch (error) {
    console.error("Error deleting listing:", error)
    showError("Error deleting listing. Please try again.")
  }
}

/**
 * Get category label from value
 */
function getCategoryLabel(value) {
  const labels = {
    mobile: "Mobile",
    tablet: "Tablet",
    laptop: "Laptop",
  }
  return labels[value] || value
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    active: '<span class="status-badge status-active"><i class="fas fa-check-circle me-1"></i>Active</span>',
    inactive: '<span class="status-badge status-inactive"><i class="fas fa-times-circle me-1"></i>Inactive</span>',
    draft: '<span class="status-badge status-pending"><i class="fas fa-clock me-1"></i>Draft</span>',
    sold: '<span class="status-badge status-inactive"><i class="fas fa-shopping-cart me-1"></i>Sold</span>',
  }
  return badges[status] || `<span class="status-badge">${status}</span>`
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  return date.toLocaleDateString("en-US", options)
}

/**
 * Show success notification
 */
function showSuccess(message) {
  showNotification(message, "success")
}

/**
 * Show error notification
 */
function showError(message) {
  showNotification(message, "danger")
}

/**
 * Show notification
 */
function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}

/**
 * Get condition badge HTML
 */
function getConditionBadge(condition) {
  const badges = {
    excellent: '<span class="badge bg-success">Excellent</span>',
    good: '<span class="badge bg-primary">Good</span>',
    fair: '<span class="badge bg-warning">Fair</span>',
    poor: '<span class="badge bg-danger">Poor</span>',
  }
  return badges[condition] || `<span class="badge bg-secondary">${condition}</span>`
}
