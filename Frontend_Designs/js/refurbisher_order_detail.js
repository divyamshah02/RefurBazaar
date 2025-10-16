// Order Detail Page JavaScript

document.addEventListener("DOMContentLoaded", () => {
  // Initialize page
  initializeOrderDetail()

  // Set minimum date for pickup scheduling
  const pickupDateInput = document.getElementById("pickupDate")
  if (pickupDateInput) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    pickupDateInput.min = tomorrow.toISOString().split("T")[0]
  }
})

function initializeOrderDetail() {
  console.log("[v0] Order detail page initialized")

  // Load order data (in real app, this would come from API)
  loadOrderData()

  // Setup event listeners
  setupEventListeners()
}

function setupEventListeners() {
  // Status update form
  const statusForm = document.getElementById("statusForm")
  if (statusForm) {
    statusForm.addEventListener("submit", (e) => {
      e.preventDefault()
      updateOrderStatus()
    })
  }

  // Pickup form
  const pickupForm = document.getElementById("pickupForm")
  if (pickupForm) {
    pickupForm.addEventListener("submit", (e) => {
      e.preventDefault()
      schedulePickup()
    })
  }

  // Status change handler
  const newStatusSelect = document.getElementById("newStatus")
  if (newStatusSelect) {
    newStatusSelect.addEventListener("change", function () {
      const trackingField = document.getElementById("trackingNumber")
      if (this.value === "shipped" || this.value === "out-for-delivery") {
        trackingField.required = true
        trackingField.parentElement.style.display = "block"
      } else {
        trackingField.required = false
        trackingField.parentElement.style.display = "none"
      }
    })
  }
}

function loadOrderData() {
  // In a real application, this would fetch data from your Django API
  const orderData = {
    id: "ORD-001",
    status: "processing",
    customer: {
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      phone: "+91 98765 43210",
      totalOrders: 12,
      totalSpent: 245000,
    },
    product: {
      name: "iPhone 12 Pro",
      image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&h=100&fit=crop",
      specs: ["128GB Storage", "Pacific Blue", "Unlocked"],
      condition: "excellent",
      imei: "123456789012345",
      batteryHealth: 89,
      screenCondition: "Perfect",
      cameraCondition: "Working",
    },
    pricing: {
      originalPrice: 50000,
      sellingPrice: 45000,
      gst: 8100,
      discount: 3100,
      total: 50000,
    },
    shipping: {
      method: "Standard Delivery",
      address: {
        name: "Rahul Sharma",
        line1: "Flat 301, Green Valley Apartments",
        line2: "Sector 18, Noida",
        city: "Noida",
        state: "Uttar Pradesh",
        pincode: "201301",
        country: "India",
      },
      instructions: "Please call before delivery. Security gate code: 1234",
    },
  }

  console.log("[v0] Order data loaded:", orderData)
}

function downloadInvoice() {
  console.log("[v0] Downloading invoice...")

  // Show loading state
  const btn = event.target.closest("button")
  const originalText = btn.innerHTML
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...'
  btn.disabled = true

  // Simulate API call
  setTimeout(() => {
    // In real app, this would call your Django API to generate PDF
    const link = document.createElement("a")
    link.href = "#" // Would be actual PDF URL
    link.download = "invoice-ORD-001.pdf"

    // Show success message
    showNotification("Invoice downloaded successfully!", "success")

    // Reset button
    btn.innerHTML = originalText
    btn.disabled = false

    console.log("[v0] Invoice download completed")
  }, 2000)
}

function downloadShippingLabel() {
  console.log("[v0] Downloading shipping label...")

  // Show loading state
  const btn = event.target.closest("button")
  const originalText = btn.innerHTML
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...'
  btn.disabled = true

  // Simulate API call
  setTimeout(() => {
    // In real app, this would call your Django API to generate shipping label
    const link = document.createElement("a")
    link.href = "#" // Would be actual label URL
    link.download = "shipping-label-ORD-001.pdf"

    // Show success message
    showNotification("Shipping label downloaded successfully!", "success")

    // Reset button
    btn.innerHTML = originalText
    btn.disabled = false

    console.log("[v0] Shipping label download completed")
  }, 2000)
}

function schedulePickup() {
  const pickupDate = document.getElementById("pickupDate").value
  const pickupTime = document.getElementById("pickupTime").value
  const pickupAddress = document.getElementById("pickupAddress").value
  const pickupInstructions = document.getElementById("pickupInstructions").value

  if (!pickupDate || !pickupTime) {
    showNotification("Please fill in all required fields", "error")
    return
  }

  console.log("[v0] Scheduling pickup:", {
    date: pickupDate,
    time: pickupTime,
    address: pickupAddress,
    instructions: pickupInstructions,
  })

  // Show loading state
  const btn = document.querySelector("#schedulePickupModal .btn-primary")
  const originalText = btn.innerHTML
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Scheduling...'
  btn.disabled = true

  // Simulate API call
  setTimeout(() => {
    // In real app, this would call your Django API
    showNotification("Pickup scheduled successfully!", "success")

    // Update pickup status on page
    updatePickupStatus(pickupDate, pickupTime)

    // Close modal
    const modal = document.getElementById("schedulePickupModal")
    modal.classList.remove("show")
    modal.style.display = "none"

    // Reset form
    document.getElementById("pickupForm").reset()

    // Reset button
    btn.innerHTML = originalText
    btn.disabled = false

    console.log("[v0] Pickup scheduled successfully")
  }, 2000)
}

function updateOrderStatus() {
  const newStatus = document.getElementById("newStatus").value
  const trackingNumber = document.getElementById("trackingNumber").value
  const statusNotes = document.getElementById("statusNotes").value

  if (!newStatus) {
    showNotification("Please select a new status", "error")
    return
  }

  if ((newStatus === "shipped" || newStatus === "out-for-delivery") && !trackingNumber) {
    showNotification("Tracking number is required for shipped orders", "error")
    return
  }

  console.log("[v0] Updating order status:", {
    status: newStatus,
    tracking: trackingNumber,
    notes: statusNotes,
  })

  // Show loading state
  const btn = document.querySelector("#updateStatusModal .btn-primary")
  const originalText = btn.innerHTML
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...'
  btn.disabled = true

  // Simulate API call
  setTimeout(() => {
    // In real app, this would call your Django API
    showNotification("Order status updated successfully!", "success")

    // Update status on page
    updatePageStatus(newStatus, trackingNumber)

    // Close modal
    const modal = document.getElementById("updateStatusModal")
    modal.classList.remove("show")
    modal.style.display = "none"

    // Reset form
    document.getElementById("statusForm").reset()

    // Reset button
    btn.innerHTML = originalText
    btn.disabled = false

    console.log("[v0] Order status updated successfully")
  }, 2000)
}

function updatePickupStatus(date, time) {
  const pickupStatusElement = document.querySelector(".pickup-status p")
  if (pickupStatusElement) {
    pickupStatusElement.innerHTML = `<span class="text-success">Scheduled for ${date} (${time})</span>`
    pickupStatusElement.nextElementSibling.textContent = "Pickup will be arranged as scheduled"
  }
}

function updatePageStatus(newStatus, trackingNumber) {
  // Update status banner
  const statusBanner = document.querySelector(".order-status-banner")
  const statusIcon = statusBanner.querySelector(".status-icon i")
  const statusText = statusBanner.querySelector("h4")
  const statusSubtext = statusBanner.querySelector("p")

  // Remove existing status classes
  statusBanner.classList.remove("processing", "shipped", "delivered", "cancelled")

  // Update based on new status
  switch (newStatus) {
    case "confirmed":
      statusBanner.classList.add("processing")
      statusIcon.className = "fas fa-check"
      statusText.textContent = "Order Confirmed"
      statusSubtext.textContent = "Order has been confirmed and is being prepared"
      break
    case "ready-to-ship":
      statusBanner.classList.add("processing")
      statusIcon.className = "fas fa-box"
      statusText.textContent = "Ready to Ship"
      statusSubtext.textContent = "Order is packed and ready for pickup"
      break
    case "shipped":
      statusBanner.classList.add("shipped")
      statusIcon.className = "fas fa-truck"
      statusText.textContent = "Order Shipped"
      statusSubtext.textContent = `Tracking: ${trackingNumber}`
      break
    case "delivered":
      statusBanner.classList.add("delivered")
      statusIcon.className = "fas fa-home"
      statusText.textContent = "Order Delivered"
      statusSubtext.textContent = "Order has been successfully delivered"
      break
    case "cancelled":
      statusBanner.classList.add("cancelled")
      statusIcon.className = "fas fa-times"
      statusText.textContent = "Order Cancelled"
      statusSubtext.textContent = "Order has been cancelled"
      break
  }

  // Update status badge
  const statusBadge = document.querySelector(".status-badge")
  if (statusBadge) {
    statusBadge.className = `status-badge status-${newStatus}`
    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace("-", " ")
  }

  // Update tracking info if provided
  if (trackingNumber) {
    const trackingElement = document.querySelector(".tracking-number .fw-bold")
    if (trackingElement) {
      trackingElement.textContent = trackingNumber
    }
  }
}

function contactCustomer() {
  console.log("[v0] Contacting customer...")

  // In real app, this could open a communication modal or redirect to messaging system
  const customerPhone = "+91 98765 43210"
  const customerEmail = "rahul.sharma@email.com"

  // Show contact options
  const contactOptions = `
        <div class="contact-options">
            <a href="tel:${customerPhone}" class="btn btn-outline-primary me-2">
                <i class="fas fa-phone me-2"></i>Call
            </a>
            <a href="mailto:${customerEmail}" class="btn btn-outline-secondary me-2">
                <i class="fas fa-envelope me-2"></i>Email
            </a>
            <button class="btn btn-outline-info" onclick="openChat()">
                <i class="fas fa-comments me-2"></i>Chat
            </button>
        </div>
    `

  showNotification("Contact customer via phone, email, or chat", "info")
}

function openChat() {
  console.log("[v0] Opening chat with customer...")
  // In real app, this would open a chat interface
  showNotification("Chat feature will be available soon!", "info")
}

function viewOnMap() {
  console.log("[v0] Opening address on map...")

  // In real app, this would open Google Maps or similar
  const address = "Flat 301, Green Valley Apartments, Sector 18, Noida, Uttar Pradesh 201301"
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  window.open(mapsUrl, "_blank")
  showNotification("Opening address on Google Maps...", "info")
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div")
  notification.className = `alert alert-${type === "error" ? "danger" : type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 100px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  // Add to page
  document.body.appendChild(notification)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)

  console.log(`[v0] Notification shown: ${message}`)
}

// Export functions for global access
window.downloadInvoice = downloadInvoice
window.downloadShippingLabel = downloadShippingLabel
window.schedulePickup = schedulePickup
window.updateOrderStatus = updateOrderStatus
window.contactCustomer = contactCustomer
window.viewOnMap = viewOnMap
window.openChat = openChat
