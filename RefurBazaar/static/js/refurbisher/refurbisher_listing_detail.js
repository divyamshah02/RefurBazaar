// Global variables
let API_URLS = {}
let CSRF_TOKEN = ""
let LISTING_ID = null
let listingData = null
let productModelAttributes = []
let editingUnitId = null
let editingUnitData = null
const bootstrap = window.bootstrap // Declare the bootstrap variable

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Same naming used on the add-listing page.
function attributeLabel(name) {
  if (name === "Colour Options") return "Colour Name"
  if (name === "Colour Hex Codes") return "Colour options"
  return name
}

// Attributes the refurbisher chooses while adding a listing (is_required on the model link).
function getEditableAttributeIds() {
  return new Set(productModelAttributes.filter((pma) => pma.is_required).map((pma) => pma.attribute.id))
}

function getEditableProductAttributes() {
  return productModelAttributes.filter((pma) => pma.is_required)
}

function isHexColour(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim())
}

function isLightColour(value) {
  const hex = String(value || "").trim().replace("#", "")
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return false
  const r = Number.parseInt(full.substring(0, 2), 16)
  const g = Number.parseInt(full.substring(2, 4), 16)
  const b = Number.parseInt(full.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

// Same round swatch look as the add-listing page.
function ensureColorSwatchStyles() {
  if (document.getElementById("colorSwatchStyles")) return
  const style = document.createElement("style")
  style.id = "colorSwatchStyles"
  style.textContent = `
    .color-swatch-group { display: flex; flex-wrap: wrap; gap: 12px; padding: 4px 0; }
    .color-swatch { position: relative; margin: 0; cursor: pointer; }
    .color-swatch input[type="radio"] { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
    .color-swatch-dot {
      display: block; width: 52px; height: 52px; border-radius: 50%;
      border: 4px solid #d9d9d9; box-shadow: inset 0 0 0 4px #fff;
      transition: border-color .15s ease, transform .15s ease;
    }
    .color-swatch-dot.is-light { outline: 1px solid rgba(0, 0, 0, .12); outline-offset: -5px; }
    .color-swatch:hover .color-swatch-dot { transform: scale(1.06); }
    .color-swatch input:checked + .color-swatch-dot { border-color: #333; }
    .color-swatch input:focus-visible + .color-swatch-dot { outline: 2px solid #0d6efd; outline-offset: 2px; }
  `
  document.head.appendChild(style)
}

function renderAttributeValue(attr) {
  const value = escapeHtml(attr.value)
  const swatch = isHexColour(attr.value)
    ? `<span class="attr-swatch" style="background:${escapeHtml(attr.value)}"></span>`
    : ""
  return `${swatch}<span class="attribute-pill-value">${value}</span>`
}


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
      const editableIds = getEditableAttributeIds()
      const unitAttributes = unit.attributes || []
      const options = unitAttributes.filter((attr) => editableIds.has(attr.attribute))
      const fixedSpecs = unitAttributes.filter((attr) => !editableIds.has(attr.attribute))

      const optionPills =
        options.length > 0
          ? options
              .map(
                (attr) =>
                  `<span class="attribute-pill"><span class="attribute-pill-label">${escapeHtml(attributeLabel(attr.attribute_name))}</span>${renderAttributeValue(attr)}</span>`,
              )
              .join("")
          : '<span class="text-muted small">No options</span>'

      const specsButton =
        fixedSpecs.length > 0
          ? `<button type="button" class="spec-info-btn" onclick="showUnitSpecs(${unit.id})" title="View all specifications" aria-label="View all specifications for unit ${unit.unit_number}"><i class="fas fa-info"></i></button>`
          : ""

      const attributes = `<div class="attribute-pills">${optionPills}${specsButton}</div>`

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
  ensureColorSwatchStyles()
  const attr      = pma.attribute
  let dataType    = pma.data_type        // on pma, not pma.attribute
  let possVals    = pma.possible_values  // on pma, not pma.attribute
  if (typeof possVals === "string") {
    try { possVals = JSON.parse(possVals) } catch (e) { possVals = possVals.split(",").map((s) => s.trim()).filter(Boolean) }
  }
  const required  = pma.is_required ? "required" : ""
  const label     = `${attributeLabel(attr.name)}${pma.is_required ? " *" : ""}`
  const isHexAttribute = String(attr.name || "").trim().toLowerCase() === "colour hex codes"

  // Colour Hex Codes always renders as round swatches. If the model has no stored
  // choice list, fall back to every hex already used on this listing's units.
  if (isHexAttribute && (!Array.isArray(possVals) || possVals.length === 0)) {
    const used = new Set()
    ;((listingData && listingData.units) || []).forEach((u) =>
      (u.attributes || []).forEach((a) => {
        if (a.attribute === attr.id && a.value) used.add(a.value)
      }),
    )
    if (currentValue) used.add(currentValue)
    possVals = Array.from(used)
    dataType = "choice"
  }

  if (isHexAttribute && Array.isArray(possVals) && possVals.length > 0) {
    const groupName = `color_${attr.id}_${Math.random().toString(36).slice(2, 8)}`
    const swatches = possVals
      .map(
        (v) => `
          <label class="color-swatch" title="${escapeHtml(v)}">
            <input type="radio" name="${groupName}" value="${escapeHtml(v)}" aria-label="${escapeHtml(v)}"${v === currentValue ? " checked" : ""}
                   onchange="this.closest('.color-swatch-group').querySelector('[data-attribute-id]').value = this.value">
            <span class="color-swatch-dot${isLightColour(v) ? " is-light" : ""}" style="background-color: ${escapeHtml(v)};"></span>
          </label>`,
      )
      .join("")
    return `
      <div class="mb-3">
        <label class="form-label">${label}</label>
        <div class="color-swatch-group" role="radiogroup" aria-label="${escapeHtml(attributeLabel(attr.name))}">
          <input type="hidden" data-attribute-id="${attr.id}" value="${escapeHtml(currentValue)}" ${required}>
          ${swatches}
        </div>
      </div>`
  }

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
  container.innerHTML = getEditableProductAttributes()
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
  container.innerHTML = getEditableProductAttributes()
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
 * Show the read-only specifications (everything the refurbisher cannot change)
 */
function showUnitSpecs(unitId) {
  const unit = listingData.units.find((u) => u.id === unitId)
  if (!unit) {
    showError("Unit not found")
    return
  }

  const editableIds = getEditableAttributeIds()
  const fixedSpecs = (unit.attributes || []).filter((attr) => !editableIds.has(attr.attribute))

  document.getElementById("specsModalTitle").textContent = `${listingData.model_name} - Unit #${unit.unit_number}`

  document.getElementById("specs-list").innerHTML =
    fixedSpecs.length > 0
      ? fixedSpecs
          .map(
            (attr) => `
        <div class="spec-row">
          <span class="spec-name">${escapeHtml(attributeLabel(attr.attribute_name))}</span>
          <span class="spec-value">${renderAttributeValue(attr)}</span>
        </div>`,
          )
          .join("")
      : '<p class="text-muted mb-0">No additional specifications.</p>'

  new bootstrap.Modal(document.getElementById("specsModal")).show()
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
      const labelText = field.closest(".mb-3")?.querySelector("label")?.textContent?.replace("*", "").trim()
      showError(`Please fill in ${labelText || "a required field"}`)
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
