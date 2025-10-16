// Account page functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeAccountPage()
  initializeProfileForm()
  initializeAddressManagement()
})

function initializeAccountPage() {
  // Tab navigation
  const tabLinks = document.querySelectorAll(".account-nav .nav-link")
  const tabContents = document.querySelectorAll(".tab-content")

  tabLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetTab = this.getAttribute("data-tab")

      // Remove active class from all tabs and contents
      tabLinks.forEach((l) => l.classList.remove("active"))
      tabContents.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked tab and corresponding content
      this.classList.add("active")
      const targetContent = document.getElementById(targetTab)
      if (targetContent) {
        targetContent.classList.add("active")
      }
    })
  })

  const firstTab = tabLinks[0]
  const firstContent = document.querySelector(".tab-content")
  if (firstTab && firstContent) {
    firstTab.classList.add("active")
    firstContent.classList.add("active")
  }
}

function initializeProfileForm() {
  const profileForm = document.querySelector("#profile-form")
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate)
  }

  const avatarUpload = document.querySelector("#avatar-upload")
  if (avatarUpload) {
    avatarUpload.addEventListener("change", handleAvatarUpload)
  }
}

function handleProfileUpdate(e) {
  e.preventDefault()
  const formData = new FormData(e.target)

  // Simulate API call
  showToast("Profile updated successfully!", "success")

  // Update profile display
  const name = formData.get("name")
  const email = formData.get("email")

  const profileName = document.querySelector(".profile-info h5")
  const profileEmail = document.querySelector(".profile-info p")

  if (profileName && name) profileName.textContent = name
  if (profileEmail && email) profileEmail.textContent = email
}

function handleAvatarUpload(e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const avatarImg = document.querySelector(".profile-avatar img")
      if (avatarImg) {
        avatarImg.src = e.target.result
      }
    }
    reader.readAsDataURL(file)
    showToast("Profile picture updated!", "success")
  }
}

function initializeAddressManagement() {
  const addAddressBtn = document.querySelector(".add-address-card")
  if (addAddressBtn) {
    addAddressBtn.addEventListener("click", showAddAddressModal)
  }
}

function showAddAddressModal() {
  // Create modal HTML if it doesn't exist
  let modal = document.querySelector("#addAddressModal")
  if (!modal) {
    modal = createAddressModal()
    document.body.appendChild(modal)
  }

  const bsModal = new window.bootstrap.Modal(modal)
  bsModal.show()
}

function createAddressModal() {
  const modal = document.createElement("div")
  modal.className = "modal fade"
  modal.id = "addAddressModal"
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Add New Address</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="address-form">
            <div class="mb-3">
              <label class="form-label">Address Type</label>
              <select class="form-select" name="type" required>
                <option value="">Select type</option>
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-control" name="name" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-control" name="phone" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Address Line 1</label>
              <input type="text" class="form-control" name="address1" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Address Line 2</label>
              <input type="text" class="form-control" name="address2">
            </div>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">City</label>
                <input type="text" class="form-control" name="city" required>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">State</label>
                <input type="text" class="form-control" name="state" required>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">PIN Code</label>
                <input type="text" class="form-control" name="pincode" required>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Country</label>
                <select class="form-select" name="country" required>
                  <option value="India">India</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="saveAddress()">Save Address</button>
        </div>
      </div>
    </div>
  `
  return modal
}

function saveAddress() {
  const form = document.querySelector("#address-form")
  const formData = new FormData(form)

  // Create new address card
  const addressGrid = document.querySelector(".addresses-grid")
  const newAddressCard = createAddressCard(formData)

  // Insert before the "Add Address" card
  const addCard = document.querySelector(".add-address-card").parentElement
  addressGrid.insertBefore(newAddressCard, addCard)

  // Close modal
  const modal = window.bootstrap.Modal.getInstance(document.querySelector("#addAddressModal"))
  modal.hide()

  showToast("Address added successfully!", "success")
  form.reset()
}

function createAddressCard(formData) {
  const col = document.createElement("div")
  col.className = "col-md-6 mb-4"

  const type = formData.get("type")
  const name = formData.get("name")
  const phone = formData.get("phone")
  const address1 = formData.get("address1")
  const address2 = formData.get("address2")
  const city = formData.get("city")
  const state = formData.get("state")
  const pincode = formData.get("pincode")

  col.innerHTML = `
    <div class="address-card">
      <div class="address-header">
        <h6>${type.charAt(0).toUpperCase() + type.slice(1)}</h6>
        <span class="badge bg-primary">New</span>
      </div>
      <div class="address-details">
        <p><strong>${name}</strong><br>
        ${address1}<br>
        ${address2 ? address2 + "<br>" : ""}
        ${city}, ${state} - ${pincode}<br>
        Phone: ${phone}</p>
      </div>
      <div class="address-actions">
        <button class="btn btn-outline-primary btn-sm" onclick="editAddress(this)">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteAddress(this)">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `

  return col
}

function editAddress(button) {
  showToast("Edit functionality coming soon!", "info")
}

function deleteAddress(button) {
  if (confirm("Are you sure you want to delete this address?")) {
    const addressCard = button.closest(".col-md-6")
    addressCard.remove()
    showToast("Address deleted successfully!", "info")
  }
}

function viewOrderDetails(orderNumber) {
  let modal = document.querySelector("#orderDetailsModal")
  if (!modal) {
    modal = createOrderDetailsModal()
    document.body.appendChild(modal)
  }

  // Update modal content with order details
  updateOrderDetailsModal(orderNumber)

  const bsModal = new window.bootstrap.Modal(modal)
  bsModal.show()
}

function createOrderDetailsModal() {
  const modal = document.createElement("div")
  modal.className = "modal fade"
  modal.id = "orderDetailsModal"
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Order Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" id="orderDetailsContent">
          <!-- Order details will be loaded here -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" onclick="downloadInvoice()">Download Invoice</button>
        </div>
      </div>
    </div>
  `
  return modal
}

function updateOrderDetailsModal(orderNumber) {
  const content = document.querySelector("#orderDetailsContent")
  content.innerHTML = `
    <div class="order-timeline">
      <h6>Order Status</h6>
      <div class="timeline-item completed">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h6>Order Placed</h6>
          <p>Your order has been placed successfully</p>
        </div>
      </div>
      <div class="timeline-item completed">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h6>Payment Confirmed</h6>
          <p>Payment has been processed</p>
        </div>
      </div>
      <div class="timeline-item completed">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h6>Order Shipped</h6>
          <p>Your order is on the way</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h6>Out for Delivery</h6>
          <p>Order will be delivered today</p>
        </div>
      </div>
    </div>
  `
}

function downloadInvoice() {
  showToast("Invoice download started!", "success")
}

function trackOrder(orderNumber) {
  showToast(`Tracking order ${orderNumber}. Check your email for tracking details.`, "info")
}

function addToWishlist(productId) {
  // Add product to wishlist
  console.log(`Adding product ${productId} to wishlist`)
  showToast("Product added to wishlist!", "success")
}

function removeFromWishlist(productId) {
  // Remove product from wishlist
  const wishlistItem = document.querySelector(`[data-product="${productId}"]`)
  if (wishlistItem) {
    wishlistItem.remove()
  }
  showToast("Product removed from wishlist!", "info")
}

function showToast(message, type = "info") {
  const toastContainer = document.querySelector(".toast-container") || createToastContainer()

  const toast = document.createElement("div")
  toast.className = `toast align-items-center border-0 mb-2`
  toast.setAttribute("role", "alert")

  let bgClass = "bg-primary"
  let icon = "fas fa-info-circle"

  switch (type) {
    case "success":
      bgClass = "bg-success"
      icon = "fas fa-check-circle"
      break
    case "error":
      bgClass = "bg-danger"
      icon = "fas fa-exclamation-circle"
      break
    case "info":
      bgClass = "bg-info"
      icon = "fas fa-info-circle"
      break
  }

  toast.classList.add(bgClass)
  toast.innerHTML = `
    <div class="d-flex text-white">
      <div class="toast-body d-flex align-items-center">
        <i class="${icon} me-2"></i>
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `

  toastContainer.appendChild(toast)
  const bsToast = new window.bootstrap.Toast(toast, { delay: 3000 })
  bsToast.show()

  // Remove toast after it's hidden
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove()
  })
}

function createToastContainer() {
  const container = document.createElement("div")
  container.className = "toast-container position-fixed top-0 end-0 p-3"
  container.style.zIndex = "9999"
  container.style.marginTop = "100px"
  document.body.appendChild(container)
  return container
}
