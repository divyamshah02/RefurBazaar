/**
 * ============================================================
 * PRODUCT FINDER — Guided Wizard
 * ============================================================
 * Usage:
 *   window.initProductFinder({ category: 'mobile' })
 *   window.closeProductFinder()
 *
 * Backend API:
 *   GET /product-api/finder/questions/?category=mobile
 *   POST /product-api/finder/results/   { answers: { ... }, category }
 * ============================================================
 */

;(function (global) {
  'use strict'

  // ─── State ────────────────────────────────────────────────
  let _category   = null
  let _questions  = []
  let _answers    = {}
  let _stepIndex  = 0
  let _results    = null
  let _compareSet = new Set()

  // ─── QUESTIONS DEFINITION ─────────────────────────────────
  // If the backend returns no questions we fall back to these built-in flows.
  const BUILT_IN_QUESTIONS = {
    mobile: [
      {
        id: 'use_case',
        question: "What's this phone mainly for?",
        options: [
          { tier: 'EVERYDAY',      label: 'Daily Use',         desc: 'Social media, calls, browsing' },
          { tier: 'PHOTOGRAPHY',   label: 'Photography',       desc: 'Great camera, shooting reels' },
          { tier: 'PERFORMANCE',   label: 'Gaming / Heavy Use', desc: 'Intensive apps, heavy gaming' },
          { tier: 'WORK',          label: 'Work & Productivity', desc: 'Email, docs, video calls' },
        ],
      },
      {
        id: 'budget',
        question: "What's your budget?",
        options: [
          { tier: 'VALUE',    label: 'Under ₹10k',    desc: 'Great everyday phones' },
          { tier: 'MID',      label: '₹10k – ₹25k',   desc: 'Balanced performance' },
          { tier: 'PREMIUM',  label: '₹25k – ₹50k',   desc: 'Flagship-level features' },
          { tier: 'FLAGSHIP', label: 'Above ₹50k',    desc: 'Top of the line' },
        ],
      },
      {
        id: 'brand_pref',
        question: 'Any brand preference?',
        options: [
          { tier: 'APPLE',    label: 'Apple (iPhone)', desc: 'iOS ecosystem' },
          { tier: 'SAMSUNG',  label: 'Samsung',        desc: 'Android premium' },
          { tier: 'OTHER',    label: 'Other Android',  desc: 'Motorola, OnePlus, etc.' },
          { tier: 'NO_PREF',  label: 'No preference',  desc: 'Show me the best deal' },
        ],
      },
    ],
    laptop: [
      {
        id: 'use_case',
        question: "What's this laptop mainly for?",
        options: [
          { tier: 'PRODUCTIVITY', label: 'Work & Office',    desc: 'Email, spreadsheets, meetings' },
          { tier: 'ACADEMICS',    label: 'Study',            desc: 'Assignments, classes, research' },
          { tier: 'EVERYDAY',     label: 'Casual Use',       desc: 'Streaming, browsing, video calls' },
          { tier: 'PERFORMANCE',  label: 'Creative / Design', desc: 'Editing, design, coding' },
        ],
      },
      {
        id: 'budget',
        question: "What's your budget?",
        options: [
          { tier: 'VALUE',    label: 'Under ₹20k',    desc: 'Light tasks' },
          { tier: 'MID',      label: '₹20k – ₹40k',   desc: 'Everyday use' },
          { tier: 'PREMIUM',  label: '₹40k – ₹70k',   desc: 'Power users' },
          { tier: 'FLAGSHIP', label: 'Above ₹70k',    desc: 'Workstation performance' },
        ],
      },
      {
        id: 'portability',
        question: 'Where will you mostly use it?',
        options: [
          { tier: 'STATIONARY', label: 'Mostly at home',   desc: 'Desk or dedicated setup' },
          { tier: 'MOBILE',     label: 'I carry it around', desc: 'Campus, office, travel' },
        ],
      },
      {
        id: 'spec_comfort',
        question: 'How comfortable are you with specs?',
        options: [
          { tier: 'CONCISE',   label: 'Just make it work', desc: 'Explain recommendations simply' },
          { tier: 'ADVANCED',  label: 'I have preferences', desc: 'Show RAM, SSD, and processor details' },
        ],
      },
    ],
    tablet: [
      {
        id: 'use_case',
        question: "What will you mainly use it for?",
        options: [
          { tier: 'MEDIA',        label: 'Media & Entertainment', desc: 'Streaming, reading, games' },
          { tier: 'PRODUCTIVITY', label: 'Work & Study',          desc: 'Notes, documents, email' },
          { tier: 'KIDS',         label: 'Kids & Family',         desc: 'Education apps, parental control' },
          { tier: 'CREATIVE',     label: 'Drawing / Design',       desc: 'Stylus, sketching, art' },
        ],
      },
      {
        id: 'budget',
        question: "What's your budget?",
        options: [
          { tier: 'VALUE',    label: 'Under ₹15k',    desc: 'Basic tablet' },
          { tier: 'MID',      label: '₹15k – ₹35k',   desc: 'Mid-range features' },
          { tier: 'PREMIUM',  label: '₹35k – ₹70k',   desc: 'Premium performance' },
          { tier: 'FLAGSHIP', label: 'Above ₹70k',    desc: 'Pro-grade' },
        ],
      },
    ],
    default: [
      {
        id: 'category',
        question: 'What kind of device are you looking for?',
        options: [
          { tier: 'mobile',  label: 'Smartphone', desc: 'iOS or Android' },
          { tier: 'laptop',  label: 'Laptop',     desc: 'Windows or macOS' },
          { tier: 'tablet',  label: 'Tablet',     desc: 'iPad or Android' },
        ],
      },
      {
        id: 'budget',
        question: "What's your budget?",
        options: [
          { tier: 'VALUE',    label: 'Under ₹20k',    desc: 'Best value picks' },
          { tier: 'MID',      label: '₹20k – ₹50k',   desc: 'Balanced choice' },
          { tier: 'PREMIUM',  label: '₹50k – ₹1L',    desc: 'Premium options' },
          { tier: 'FLAGSHIP', label: 'Above ₹1L',     desc: 'Top-tier' },
        ],
      },
    ],
  }

  // ─── DOM Helpers ──────────────────────────────────────────
  function $(id) { return document.getElementById(id) }

  function ensureModal() {
    if ($('productFinderModal')) return true
    console.warn('[ProductFinder] Modal HTML not found. Include product-finder-modal.html in the page.')
    return false
  }

  // ─── Public API ───────────────────────────────────────────
  global.initProductFinder = function ({ category } = {}) {
    if (!ensureModal()) return
    _category   = category || null
    _questions  = []
    _answers    = {}
    _stepIndex  = 0
    _results    = null
    _compareSet = new Set()

    loadQuestionsAndOpen()
  }

  global.closeProductFinder = function () {
    const modal = $('productFinderModal')
    const card  = $('finderModalCard')
    if (!modal) return
    modal.style.opacity = '0'
    if (card) card.style.transform = 'translateY(40px)'
    setTimeout(() => {
      modal.style.display = 'none'
      document.body.style.overflow = ''
    }, 300)
  }

  global.finderBack = function () {
    if (_stepIndex > 0) {
      _stepIndex--
      renderStep()
    } else {
      global.closeProductFinder()
    }
  }

  global.finderSelectOption = function (stepId, tierValue) {
    _answers[stepId] = tierValue

    // If first question is category selection, update the category for subsequent built-ins
    if (stepId === 'category') {
      _category = tierValue
      _questions = buildQuestionsForCategory(tierValue)
    }

    if (_stepIndex < _questions.length - 1) {
      _stepIndex++
      renderStep()
    } else {
      fetchResults()
    }
  }

  // ─── Load Questions from API ──────────────────────────────
  async function loadQuestionsAndOpen() {
    showModal()

    // Try to fetch dynamic questions from backend
    try {
      const url = _category
        ? `/product-api/finder/questions/?category=${encodeURIComponent(_category)}`
        : '/product-api/finder/questions/'
      const resp = await fetch(url, { credentials: 'same-origin' })
      if (resp.ok) {
        const data = await resp.json()
        if (data.success && Array.isArray(data.data.questions) && data.data.questions.length) {
          _questions = data.data.questions
          if (data.data.category_label) {
            const lbl = $('finderCategoryLabel')
            if (lbl) lbl.textContent = data.data.category_label.toUpperCase()
          }
        } else {
          _questions = buildQuestionsForCategory(_category)
        }
      } else {
        _questions = buildQuestionsForCategory(_category)
      }
    } catch (_) {
      _questions = buildQuestionsForCategory(_category)
    }

    updateCategoryLabel()
    renderStep()
  }

  function buildQuestionsForCategory(cat) {
    return BUILT_IN_QUESTIONS[cat] || BUILT_IN_QUESTIONS.default
  }

  function updateCategoryLabel() {
    const map = { mobile: 'PHONE CONCIERGE', laptop: 'LAPTOP CONCIERGE', tablet: 'TABLET CONCIERGE' }
    const lbl = $('finderCategoryLabel')
    if (lbl && _category) lbl.textContent = map[_category] || 'PRODUCT CONCIERGE'
  }

  // ─── Show/Hide Modal ──────────────────────────────────────
  function showModal() {
    const modal = $('productFinderModal')
    const card  = $('finderModalCard')
    if (!modal) return

    modal.style.display   = 'flex'
    document.body.style.overflow = 'hidden'

    requestAnimationFrame(() => {
      modal.style.opacity = '1'
      if (card) card.style.transform = 'translateY(0)'
    })
  }

  // ─── Render Step ──────────────────────────────────────────
  function renderStep() {
    const q = _questions[_stepIndex]
    if (!q) return

    // Progress
    const total    = _questions.length
    const pct      = Math.round((((_stepIndex + 1) / total) * 100))
    const bar      = $('finderProgressBar')
    const stepLbl  = $('finderStepLabel')
    const backBtn  = $('finderBackBtn')
    const backLbl  = $('finderBackLabel')
    const compFtr  = $('finderCompareFooter')

    if (bar)     bar.style.width   = pct + '%'
    if (stepLbl) stepLbl.textContent = `Step ${_stepIndex + 1} of ${total}`
    if (backLbl) backLbl.textContent = _stepIndex === 0 ? 'Close' : 'Back'
    if (backBtn) backBtn.style.display = 'flex'
    if (compFtr) compFtr.style.display = 'none'
    $('finderProgressWrap').style.display = 'block'

    // Build option cards — 2-column grid
    const cols = q.options.length <= 2 ? 1 : 2
    const selectedVal = _answers[q.id] || null

    const optionsHTML = q.options.map(opt => `
      <div onclick="window.finderSelectOption('${escFinder(q.id)}', '${escFinder(opt.tier)}')"
           style="
             border: 2px solid ${selectedVal === opt.tier ? '#111827' : '#e5e7eb'};
             border-radius: 14px; padding: 16px 18px; cursor: pointer;
             background: ${selectedVal === opt.tier ? '#f9fafb' : '#fff'};
             transition: border-color 0.15s, box-shadow 0.15s;
             position: relative; overflow: hidden;
           "
           class="finder-option-card"
           data-step="${escFinder(q.id)}"
           data-tier="${escFinder(opt.tier)}"
      >
        <div style="
          position:absolute; top:0; left:0; right:0; height: 3px;
          background: ${selectedVal === opt.tier ? '#111827' : '#e5e7eb'};
          transition: background 0.15s;
        " class="finder-top-bar"></div>
        <p style="margin:0 0 3px; font-size:0.67rem; font-weight:800; text-transform:uppercase; letter-spacing:0.7px; color:#9ca3af;">${escHtmlFinder(opt.tier)}</p>
        <p style="margin:0 0 4px; font-size:1rem; font-weight:800; color:#111827; line-height:1.2;">${escHtmlFinder(opt.label)}</p>
        <p style="margin:0; font-size:0.8rem; color:#6b7280; line-height:1.35;">${escHtmlFinder(opt.desc)}</p>
      </div>
    `).join('')

    const body = $('finderBody')
    if (!body) return

    body.innerHTML = `
      <h3 style="
        font-size: 1.25rem; font-weight: 800; color: #111827;
        margin: 0 0 20px; line-height: 1.3;
      ">${escHtmlFinder(q.question)}</h3>
      <div style="
        display: grid;
        grid-template-columns: repeat(${cols}, 1fr);
        gap: 12px;
      ">
        ${optionsHTML}
      </div>
    `

    // Hover effects via event delegation
    body.querySelectorAll('.finder-option-card').forEach(card => {
      card.addEventListener('mouseenter', function () {
        if (this.dataset.tier !== (_answers[this.dataset.step] || null)) {
          this.style.borderColor = '#111827'
          this.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'
          this.querySelector('.finder-top-bar').style.background = '#111827'
        }
      })
      card.addEventListener('mouseleave', function () {
        if (this.dataset.tier !== (_answers[this.dataset.step] || null)) {
          this.style.borderColor = '#e5e7eb'
          this.style.boxShadow = 'none'
          this.querySelector('.finder-top-bar').style.background = '#e5e7eb'
        }
      })
    })
  }

  // ─── Fetch Results from API ───────────────────────────────
  async function fetchResults() {
    const body = $('finderBody')
    if (!body) return

    // Show loading
    body.innerHTML = `
      <div style="text-align:center; padding: 40px 0;">
        <div style="
          width: 44px; height: 44px; border: 4px solid #e5e7eb;
          border-top-color: #111827; border-radius: 50%;
          animation: finderSpin 0.7s linear infinite;
          margin: 0 auto 16px;
        "></div>
        <p style="font-size:0.9rem; color:#6b7280; font-weight:600;">Finding your best matches...</p>
      </div>
      <style>
        @keyframes finderSpin { to { transform: rotate(360deg); } }
      </style>
    `

    $('finderProgressWrap').style.display = 'none'

    try {
      const resp = await fetch('/product-api/finder/results/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ answers: _answers, category: _category }),
      })

      const data = await resp.json()

      if (data.success && Array.isArray(data.data.products) && data.data.products.length) {
        _results = data.data.products
        renderResults(data.data)
      } else if (data.success && data.data.products && data.data.products.length === 0) {
        renderNoMatch()
      } else {
        renderNoMatch()
      }
    } catch (err) {
      renderNoMatch()
    }
  }

  // ─── Render Results ───────────────────────────────────────
  function renderResults(data) {
    const products  = data.products || []
    const summaryParts = Object.values(_answers)
      .filter(v => v !== 'NO_PREF' && v !== 'CONCISE' && v !== 'ADVANCED')
      .slice(0, 3)

    const backBtn  = $('finderBackBtn')
    const progWrap = $('finderProgressWrap')
    const compFtr  = $('finderCompareFooter')
    if (backBtn)  backBtn.style.display = 'flex'
    if (progWrap) progWrap.style.display = 'none'
    if (compFtr)  compFtr.style.display = 'block'

    const body = $('finderBody')
    if (!body) return

    const productsHTML = products.map((p, i) => `
      <div style="
        border: 1.5px solid ${i === 0 ? '#111827' : '#e5e7eb'};
        border-radius: 14px; padding: 16px; margin-bottom: 14px;
        transition: border-color 0.2s;
        background: ${i === 0 ? '#fafafa' : '#fff'};
      " class="finder-result-card">
        <div style="display:flex; align-items:flex-start; gap:14px;">
          <div style="
            width: 64px; height: 64px; border-radius: 10px;
            background: #f3f4f6; flex-shrink: 0; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
          ">
            ${p.image
              ? `<img src="${escHtmlFinder(p.image)}" alt="${escHtmlFinder(p.name)}" style="width:100%;height:100%;object-fit:contain;padding:6px;">`
              : `<i class="fas fa-mobile-alt" style="color:#9ca3af;font-size:1.4rem;"></i>`
            }
          </div>
          <div style="flex:1; min-width:0;">
            ${i === 0 ? `<span style="
              display:inline-block; background:#111827; color:#fff;
              font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;
              padding: 3px 10px; border-radius: 20px; margin-bottom: 6px;
            ">BEST MATCH</span>` : ''}
            <p style="margin:0 0 5px; font-size:0.88rem; font-weight:700; color:#111827; line-height:1.3;">
              ${escHtmlFinder(p.name)}
            </p>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:1rem; font-weight:800; color:#111827;">
                ₹${formatFinderPrice(p.price)}
              </span>
              ${p.original_price ? `<span style="font-size:0.8rem; color:#9ca3af; text-decoration:line-through;">₹${formatFinderPrice(p.original_price)}</span>` : ''}
            </div>
            ${p.match_reason ? `<p style="margin: 6px 0 0; font-size:0.78rem; color:#6b7280; font-style:italic; line-height:1.4;">"${escHtmlFinder(p.match_reason)}"</p>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:14px;">
          <a href="${escHtmlFinder(p.url || `/product/${p.id}/`)}"
             style="
               flex:1; display:block; text-align:center;
               padding: 9px 14px; border-radius: 50px;
               background: #111827; color: #fff;
               font-size: 0.82rem; font-weight: 700; text-decoration: none;
               transition: background 0.2s;
             "
             onmouseover="this.style.background='#1f2937'"
             onmouseout="this.style.background='#111827'"
          >View product</a>
          <button onclick="window.finderToggleCompare(${p.id}, '${escFinder(p.name)}')"
             id="finderCmp_${p.id}"
             style="
               padding: 9px 16px; border-radius: 50px;
               border: 2px solid #e5e7eb; background: #fff;
               font-size: 0.82rem; font-weight: 700; color: #374151;
               cursor: pointer; transition: all 0.2s; white-space: nowrap;
             "
             onmouseover="this.style.borderColor='#111827';this.style.color='#111827'"
             onmouseout="if(!this.classList.contains('cmp-active')){this.style.borderColor='#e5e7eb';this.style.color='#374151';}"
          >Compare</button>
        </div>
      </div>
    `).join('')

    body.innerHTML = `
      <div style="
        background: #111827; border-radius: 14px; padding: 16px 18px; margin-bottom: 20px;
      ">
        <p style="margin:0 0 3px; font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; color:rgba(255,255,255,0.45);">RECOMMENDATIONS</p>
        <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:800; color:#fff;">Your best matches</h3>
        ${summaryParts.length ? `<p style="margin:0; font-size:0.78rem; color:rgba(255,255,255,0.5);">Based on: ${summaryParts.slice(0,3).map(escHtmlFinder).join(' · ')}</p>` : ''}
      </div>
      ${productsHTML}
    `
  }

  global.finderToggleCompare = function (id, name) {
    const btn = $(`finderCmp_${id}`)
    if (_compareSet.has(id)) {
      _compareSet.delete(id)
      if (btn) {
        btn.classList.remove('cmp-active')
        btn.style.background = '#fff'
        btn.style.color = '#374151'
        btn.style.borderColor = '#e5e7eb'
        btn.textContent = 'Compare'
      }
    } else {
      if (_compareSet.size >= 2) {
        alert('You can compare up to 2 models.')
        return
      }
      _compareSet.add(id)
      if (btn) {
        btn.classList.add('cmp-active')
        btn.style.background = '#111827'
        btn.style.color = '#fff'
        btn.style.borderColor = '#111827'
        btn.textContent = 'Added'
      }
    }

    const compText = $('finderCompareText')
    const needed   = 2 - _compareSet.size
    if (compText) {
      compText.textContent = _compareSet.size === 0
        ? 'Add 2 models to compare'
        : needed === 1
          ? 'Add 1 more to compare'
          : 'Compare selected →'
    }
  }

  // ─── Render No Match ──────────────────────────────────────
  function renderNoMatch() {
    const progWrap = $('finderProgressWrap')
    const backBtn  = $('finderBackBtn')
    const compFtr  = $('finderCompareFooter')
    if (progWrap) progWrap.style.display = 'none'
    if (backBtn)  backBtn.style.display  = 'flex'
    if (compFtr)  compFtr.style.display  = 'none'

    const body = $('finderBody')
    if (!body) return

    body.innerHTML = `
      <div style="
        border: 1.5px solid #e5e7eb; border-radius: 16px; padding: 28px 20px;
        text-align: center; margin-bottom: 16px;
      ">
        <span style="
          display:inline-block; background: #f3f4f6; color:#6b7280;
          font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:0.8px;
          padding:4px 14px; border-radius:20px; margin-bottom: 14px;
        ">NO EXACT MATCH</span>
        <p style="font-size:0.95rem; font-weight:800; color:#111827; margin:0 0 6px;">
          Nothing in stock right now for that combination.
        </p>
        <p style="font-size:0.82rem; color:#9ca3af; margin: 0 0 20px;">Try adjusting your answers:</p>

        <button onclick="window.finderRetry('budget')"
          style="
            display:block; width:100%; padding:13px; border-radius:10px;
            border: 1.5px solid #e5e7eb; background:#fff;
            font-size:0.88rem; font-weight:600; color:#374151;
            cursor:pointer; transition:all 0.2s; margin-bottom:10px;
            text-align:center;
          "
          onmouseover="this.style.borderColor='#111827';this.style.color='#111827'"
          onmouseout="this.style.borderColor='#e5e7eb';this.style.color='#374151'"
        >Try a slightly higher budget</button>

        <button onclick="window.finderRetry('use_case')"
          style="
            display:block; width:100%; padding:13px; border-radius:10px;
            border: 1.5px solid #e5e7eb; background:#fff;
            font-size:0.88rem; font-weight:600; color:#374151;
            cursor:pointer; transition:all 0.2s; margin-bottom:14px;
            text-align:center;
          "
          onmouseover="this.style.borderColor='#111827';this.style.color='#111827'"
          onmouseout="this.style.borderColor='#e5e7eb';this.style.color='#374151'"
        >Broaden my use case</button>

        <a href="/shop/"
          style="
            display:block; width:100%; padding:14px; border-radius:10px;
            background: #111827; color:#fff;
            font-size:0.9rem; font-weight:800; text-decoration:none;
            text-align:center; transition:background 0.2s;
          "
          onmouseover="this.style.background='#1f2937'"
          onmouseout="this.style.background='#111827'"
        >See all products →</a>
      </div>
    `
  }

  global.finderRetry = function (fromStepId) {
    const idx = _questions.findIndex(q => q.id === fromStepId)
    _stepIndex = idx !== -1 ? idx : 0
    delete _answers[_questions[_stepIndex]?.id]
    $('finderProgressWrap').style.display = 'block'
    renderStep()
  }

  // ─── Helpers ──────────────────────────────────────────────
  function escHtmlFinder(str) {
    if (!str && str !== 0) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function escFinder(str) {
    return String(str || '').replace(/'/g, "\\'")
  }

  function formatFinderPrice(price) {
    return new Intl.NumberFormat('en-IN').format(Math.round(parseFloat(price) || 0))
  }

  function getCsrfToken() {
    const name  = 'csrftoken'
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.getAttribute('content') : ''
  }

})(window)
