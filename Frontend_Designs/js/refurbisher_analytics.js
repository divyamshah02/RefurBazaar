import { Chart } from "@/components/ui/chart"
// RefurBazar Analytics Dashboard JavaScript
// Uses Chart.js library loaded via CDN

document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] Analytics dashboard initializing...")
  initializeAnalytics()
  setupCharts()
})

function initializeAnalytics() {
  loadAnalyticsData()
  setupDateFilter()
  setupExportButton()
}

function loadAnalyticsData() {
  // Simulate loading analytics data from Django API
  console.log("[v0] Loading analytics data...")

  // In real implementation, this would fetch from your Django API
  const analyticsData = {
    totalRevenue: 2400000,
    totalOrders: 156,
    averageOrderValue: 15384,
    conversionRate: 3.2,
    topProducts: [
      { name: "iPhone 12 Pro", sales: 45, revenue: 2025000 },
      { name: "Samsung Galaxy S21", sales: 32, revenue: 1216000 },
      { name: "MacBook Air M1", sales: 18, revenue: 1170000 },
    ],
  }

  updateDashboardStats(analyticsData)
}

function updateDashboardStats(data) {
  // Update stat cards with real data
  const statCards = document.querySelectorAll(".stat-card")
  if (statCards.length >= 4) {
    statCards[0].querySelector(".stat-value").textContent = `₹${(data.totalRevenue / 100000).toFixed(1)}L`
    statCards[1].querySelector(".stat-value").textContent = data.totalOrders
    statCards[2].querySelector(".stat-value").textContent = `₹${(data.averageOrderValue / 1000).toFixed(0)}K`
    statCards[3].querySelector(".stat-value").textContent = `${data.conversionRate}%`
  }
}

function setupDateFilter() {
  const dateFilter = document.querySelector("select")
  if (dateFilter) {
    dateFilter.addEventListener("change", function () {
      updateAnalytics(this.value)
    })
  }
}

function setupExportButton() {
  const exportBtn = document.querySelector(".btn-outline-primary")
  if (exportBtn && exportBtn.textContent.includes("Export")) {
    exportBtn.addEventListener("click", exportReport)
  }
}

function updateAnalytics(period) {
  console.log("[v0] Updating analytics for period:", period)

  // Update all charts and metrics based on selected period
  updateCharts(period)

  // Show loading state
  showNotification("Updating analytics data...", "info")

  // Simulate API call
  setTimeout(() => {
    showNotification("Analytics updated successfully!", "success")
  }, 1000)
}

function setupCharts() {
  // Wait for Chart.js to be available
  if (typeof Chart === "undefined") {
    console.log("[v0] Chart.js not loaded yet, retrying...")
    setTimeout(setupCharts, 100)
    return
  }

  console.log("[v0] Setting up charts...")
  setupRevenueChart()
  setupOrdersChart()
  setupCategoryChart()
}

function setupRevenueChart() {
  const ctx = document.getElementById("revenueChart")
  if (!ctx) {
    console.log("[v0] Revenue chart canvas not found")
    return
  }

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [
        {
          label: "Revenue (₹)",
          data: [180000, 220000, 190000, 250000, 280000, 240000, 300000, 320000, 290000, 350000, 380000, 240000],
          borderColor: "rgb(107, 176, 68)",
          backgroundColor: "rgba(107, 176, 68, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "rgb(107, 176, 68)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "rgb(107, 176, 68)",
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "₹" + value / 1000 + "K",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  })

  console.log("[v0] Revenue chart initialized")
}

function setupOrdersChart() {
  const ctx = document.getElementById("ordersChart")
  if (!ctx) {
    console.log("[v0] Orders chart canvas not found")
    return
  }

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Delivered", "Processing", "Pending", "Cancelled"],
      datasets: [
        {
          data: [120, 25, 8, 3],
          backgroundColor: ["rgb(16, 185, 129)", "rgb(59, 130, 246)", "rgb(245, 158, 11)", "rgb(239, 68, 68)"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
    },
  })

  console.log("[v0] Orders chart initialized")
}

function setupCategoryChart() {
  const ctx = document.getElementById("categoryChart")
  if (!ctx) {
    console.log("[v0] Category chart canvas not found")
    return
  }

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Smartphones", "Laptops", "Tablets", "Smartwatches", "Audio"],
      datasets: [
        {
          label: "Sales (₹)",
          data: [1560000, 980000, 420000, 280000, 180000],
          backgroundColor: [
            "rgba(107, 176, 68, 0.8)",
            "rgba(26, 70, 133, 0.8)",
            "rgba(245, 158, 11, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(236, 72, 153, 0.8)",
          ],
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "₹" + value / 100000 + "L",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  })

  console.log("[v0] Category chart initialized")
}

function updateCharts(period) {
  console.log("[v0] Updating charts for period:", period)

  // In real implementation, this would fetch new data based on period
  // and update existing charts with new datasets

  // For now, just log the update
  const charts = Chart.getChart ? Object.values(Chart.instances || {}) : []
  charts.forEach((chart) => {
    if (chart && chart.update) {
      chart.update("none") // Update without animation
    }
  })
}

function exportReport() {
  console.log("[v0] Exporting analytics report...")

  // Show loading state
  const btn = event.target
  const originalText = btn.innerHTML
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...'
  btn.disabled = true

  // Simulate report generation
  setTimeout(() => {
    // In real app, this would call your Django API to generate PDF/Excel report
    showNotification("Analytics report exported successfully!", "success")

    // Reset button
    btn.innerHTML = originalText
    btn.disabled = false

    console.log("[v0] Report export completed")
  }, 2000)
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

  console.log(`[v0] Notification: ${message}`)
}

// Make functions available globally for HTML onclick handlers
window.exportReport = exportReport
