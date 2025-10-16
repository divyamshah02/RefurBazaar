// Orders management functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeOrders()
  setupFilters()
  setupActionButtons()
})

function initializeOrders() {
  loadOrders()
  updateOrderStats()
}

function loadOrders() {
  // Simulate loading orders from API
  console.log("Loading orders...")
  // In real implementation, this would fetch from API
}

function updateOrderStats() {
  // Update order statistics
  console.log("Updating order statistics...")
  // In real implementation, this would calculate real stats
}

function setupFilters() {
  const statusFilter = document.querySelector("select")
  const dateFilter = document.querySelectorAll("select")[1]
  const dateInput = document.querySelector('input[type="date"]')
  const searchInput = document.querySelector('input[placeholder*="Search"]')

  if (statusFilter) {
    statusFilter.addEventListener("change", filterOrders)
  }

  if (dateFilter) {
    dateFilter.addEventListener("change", filterOrders)
  }

  if (dateInput) {
    dateInput.addEventListener("change", filterOrders)
  }

  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        searchOrders(this.value)
      }, 300)
    })
  }
}

function filterOrders() {
  console.log("Filtering orders...")
  // Implement order filtering logic
}

function searchOrders(query) {
  console.log("Searching orders for:", query)
  // Implement order search logic
}

function setupActionButtons() {
  // Setup dropdown action buttons
  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault()
      const action = this.textContent.trim()
      const orderId = this.closest("tr").querySelector("strong").textContent

      handleOrderAction(action, orderId)
    })
  })
}

function handleOrderAction(action, orderId) {
  switch (action) {
    case "View Details":
      viewOrderDetails(orderId)
      break
    case "Update Status":
      updateOrderStatus(orderId)
      break
    case "Track Shipment":
      trackShipment(orderId)
      break
    case "Cancel Order":
      cancelOrder(orderId)
      break
    case "Request Review":
      requestReview(orderId)
      break
    case "Download Invoice":
      downloadInvoice(orderId)
      break
    case "Confirm Order":
      confirmOrder(orderId)
      break
    case "Cancellation Reason":
      viewCancellationReason(orderId)
      break
    case "Refund Status":
      viewRefundStatus(orderId)
      break
    default:
      console.log("Unknown action:", action)
  }
}

function viewOrderDetails(orderId) {
  console.log("Viewing details for order:", orderId)
  // Open order details modal or redirect to details page
}

function updateOrderStatus(orderId) {
  console.log("Updating status for order:", orderId)

  // Show status update modal
  const modal = document.createElement("div")
  modal.className = "modal fade"
  modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Update Order Status</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">New Status</label>
                        <select class="form-select" id="newStatus">
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="form-group mt-3">
                        <label class="form-label">Notes (Optional)</label>
                        <textarea class="form-control" rows="3" placeholder="Add any notes..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveOrderStatus('${orderId}')">Update Status</button>
                </div>
            </div>
        </div>
    `

  document.body.appendChild(modal)
  const bsModal = new window.bootstrap.Modal(modal)
  bsModal.show()

  // Clean up modal after hiding
  modal.addEventListener("hidden.bs.modal", () => {
    modal.remove()
  })
}

function saveOrderStatus(orderId) {
  const newStatus = document.getElementById("newStatus").value
  console.log(`Updating order ${orderId} status to:`, newStatus)

  // Close modal
  const modal = document.querySelector(".modal.show")
  if (modal) {
    window.bootstrap.Modal.getInstance(modal).hide()
  }

  // Show success message
  showNotification("Order status updated successfully", "success")
}

function trackShipment(orderId) {
  console.log("Tracking shipment for order:", orderId)
  // Open tracking modal or redirect to tracking page
}

function cancelOrder(orderId) {
  if (confirm(`Are you sure you want to cancel order ${orderId}?`)) {
    console.log("Cancelling order:", orderId)
    // Call cancel API
    showNotification("Order cancelled successfully", "success")
  }
}

function confirmOrder(orderId) {
  console.log("Confirming order:", orderId)
  // Call confirm API
  showNotification("Order confirmed successfully", "success")
}

function requestReview(orderId) {
  console.log("Requesting review for order:", orderId)
  // Send review request
  showNotification("Review request sent to customer", "info")
}

function downloadInvoice(orderId) {
  console.log("Downloading invoice for order:", orderId)
  // Generate and download invoice
}

function viewCancellationReason(orderId) {
  console.log("Viewing cancellation reason for order:", orderId)
  // Show cancellation reason modal
}

function viewRefundStatus(orderId) {
  console.log("Viewing refund status for order:", orderId)
  // Show refund status modal
}

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
