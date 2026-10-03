// Admin Add Products Management
let csrfToken = '';
let brandsApiUrl = '';
let productsApiUrl = '';
let attributesApiUrl = '';
let allBrands = [];
let selectedAttributes = new Map(); // To track selected attributes

function InitializeAddProductForm(csrf, brands_url, products_url, attributes_url) {
    csrfToken = csrf;
    brandsApiUrl = brands_url;
    productsApiUrl = products_url;
    attributesApiUrl = attributes_url;
    
    console.log('Initializing Add Product Form');
    console.log('CSRF Token:', csrfToken);
    console.log('Products API URL:', productsApiUrl);
    
    loadBrands();
    setupEventListeners();
}

function setupEventListeners() {
    // Category change
    document.getElementById('category').addEventListener('change', function() {
        updateSummary();
        if (this.value) {
            loadAttributesForCategory();
        }
    });

    // Brand change
    document.getElementById('brand').addEventListener('change', function() {
        updateSummary();
    });

    // Product name change
    document.getElementById('productName').addEventListener('input', function() {
        updateSummary();
    });
}

async function loadBrands() {
    try {
        console.log('Loading brands from:', brandsApiUrl);
        const [success, response] = await window.callApi('GET', brandsApiUrl, null, csrfToken);
        
        console.log('Brands API Response:', response);
        
        if (success && response.success && response.data) {
            allBrands = response.data;
            populateBrandDropdown();
        } else {
            showError('Failed to load brands');
        }
    } catch (error) {
        console.error('Error loading brands:', error);
        showError('Failed to load brands');
    }
}

function populateBrandDropdown() {
    const brandSelect = document.getElementById('brand');
    const currentValue = brandSelect.value;
    
    // Keep the default option
    const defaultOption = brandSelect.querySelector('option:first-child');
    brandSelect.innerHTML = '';
    brandSelect.appendChild(defaultOption);
    
    // Add brands
    allBrands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.id;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
    });
    
    if (currentValue) {
        brandSelect.value = currentValue;
    }
}

async function loadAttributesForCategory() {
    const category = document.getElementById('category').value;
    
    if (!category) {
        document.getElementById('attributesContainer').style.display = 'none';
        document.getElementById('noAttributesMessage').style.display = 'block';
        document.getElementById('loadingAttributes').classList.remove('active');
        return;
    }
    
    console.log('Loading attributes for category:', category);
    
    // Show loading spinner
    document.getElementById('loadingAttributes').classList.add('active');
    document.getElementById('attributesContainer').style.display = 'none';
    document.getElementById('noAttributesMessage').style.display = 'none';
    
    try {
        const url = `${attributesApiUrl}?category=${category}`;
        console.log('Attributes URL:', url);
        
        const [success, response] = await window.callApi('GET', url, null, csrfToken);
        
        console.log('Attributes API Response:', response);
        
        if (success && response.success && response.data) {
            const attributes = response.data;
            
            if (attributes.length === 0) {
                document.getElementById('noAttributesMessage').style.display = 'block';
                document.getElementById('loadingAttributes').classList.remove('active');
            } else {
                renderAttributes(attributes);
                document.getElementById('attributesContainer').style.display = 'block';
                document.getElementById('noAttributesMessage').style.display = 'none';
                document.getElementById('loadingAttributes').classList.remove('active');
            }
        } else {
            showError('Failed to load attributes');
            document.getElementById('loadingAttributes').classList.remove('active');
        }
    } catch (error) {
        console.error('Error loading attributes:', error);
        showError('Failed to load attributes');
        document.getElementById('loadingAttributes').classList.remove('active');
    }
}

function renderAttributes(attributes) {
    const container = document.getElementById('attributesContainer');
    container.innerHTML = '';

    attributes.forEach(attr => {
        const attrDiv = document.createElement('div');
        attrDiv.className = 'attribute-card';
        attrDiv.dataset.dataType = attr.data_type || 'text';
        attrDiv.dataset.possibleValues = JSON.stringify(attr.possible_values || []);

        const topRow = document.createElement('div');
        topRow.className = 'd-flex align-items-center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.id = `attr_${attr.id}`;
        checkbox.value = attr.id;
        checkbox.dataset.attrName = attr.name;

        const label = document.createElement('label');
        label.className = 'form-check-label ms-2';
        label.htmlFor = `attr_${attr.id}`;
        let labelText = attr.name;
        if (attr.data_type) {
            labelText += ` <span class="small text-muted">(${attr.data_type})</span>`;
        }
        label.innerHTML = labelText;

        topRow.appendChild(checkbox);
        topRow.appendChild(label);
        attrDiv.appendChild(topRow);

        // Value input — shown once the attribute is selected, admin fills it in directly
        const valueWrap = document.createElement('div');
        valueWrap.className = 'mt-2';
        valueWrap.id = `attr_value_wrap_${attr.id}`;
        valueWrap.style.display = 'none';

        let valueInput;
        if (attr.data_type === 'select' && attr.possible_values && attr.possible_values.length > 0) {
            valueInput = document.createElement('select');
            valueInput.className = 'form-select form-select-sm';
            const blankOpt = document.createElement('option');
            blankOpt.value = '';
            blankOpt.textContent = 'Select value...';
            valueInput.appendChild(blankOpt);
            attr.possible_values.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                valueInput.appendChild(opt);
            });
        } else {
            valueInput = document.createElement('input');
            valueInput.type = attr.data_type === 'number' ? 'number' : 'text';
            valueInput.className = 'form-control form-control-sm';
            valueInput.placeholder = `Enter ${attr.name.toLowerCase()} value`;
        }
        valueInput.id = `attr_value_${attr.id}`;
        valueInput.dataset.attrId = attr.id;
        if (attr.default_value) valueInput.value = attr.default_value;

        valueWrap.appendChild(valueInput);
        attrDiv.appendChild(valueWrap);

        checkbox.addEventListener('change', function() {
            valueWrap.style.display = this.checked ? 'block' : 'none';
            updateSummary();
        });

        // Restore checked/visible state when editing an already-selected attribute
        if (attr.default_value) {
            checkbox.checked = true;
            valueWrap.style.display = 'block';
        }

        container.appendChild(attrDiv);
    });
}

function updateSummary() {
    // Update category
    const category = document.getElementById('category').value;
    const categoryLabel = category ? document.querySelector(`#category option[value="${category}"]`).textContent : 'Not selected';
    document.getElementById('summaryCategory').textContent = categoryLabel;
    document.getElementById('summaryCategory').className = category ? 'badge bg-primary' : 'badge bg-secondary';
    
    // Update brand
    const brand = document.getElementById('brand').value;
    const brandLabel = brand ? document.querySelector(`#brand option[value="${brand}"]`).textContent : 'Not selected';
    document.getElementById('summaryBrand').textContent = brandLabel;
    document.getElementById('summaryBrand').className = brand ? 'badge bg-primary' : 'badge bg-secondary';
    
    // Update product name
    const productName = document.getElementById('productName').value;
    document.getElementById('summaryProduct').textContent = productName || 'Not entered';
    document.getElementById('summaryProduct').className = productName ? 'text-dark fw-500' : 'text-muted';
    
    // Update attribute count
    const selectedCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
    document.getElementById('summaryAttributeCount').textContent = `${selectedCount} selected`;
    document.getElementById('summaryAttributeCount').className = selectedCount > 0 ? 'badge bg-success' : 'badge bg-info';
    
    // Enable submit button if all required fields are filled
    const isValid = category && brand && productName;
    document.getElementById('submitBtn').disabled = !isValid;
}

function previewImage() {
    const imageInput = document.getElementById('image');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');
    
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'flex';
            previewContainer.classList.add('has-image');
        };
        
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        previewContainer.style.display = 'none';
        previewContainer.classList.remove('has-image');
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    
    console.log('Form submission started');
    
    // Gather form data
    const category = document.getElementById('category').value;
    const brandId = document.getElementById('brand').value;
    const productName = document.getElementById('productName').value;
    const releaseYear = document.getElementById('releaseYear').value;
    const description = document.getElementById('description').value;
    const imageInput = document.getElementById('image');
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    // Get selected attributes, along with the value the admin entered directly
    const selectedAttrCheckboxes = document.querySelectorAll('#attributesContainer input[type="checkbox"]:checked');
    const attributes = Array.from(selectedAttrCheckboxes).map(checkbox => {
        const attrId = checkbox.value;
        const card = checkbox.closest('.attribute-card');
        const valueInput = document.getElementById(`attr_value_${attrId}`);
        const value = valueInput ? valueInput.value.trim() : '';
        return {
            attribute_id: parseInt(attrId),
            is_required: false,
            data_type: card ? card.dataset.dataType : 'text',
            possible_values: card ? JSON.parse(card.dataset.possibleValues || '[]') : [],
            default_value: value || null
        };
    });
    
    console.log('Form Data:', {
        category,
        brandId,
        productName,
        releaseYear,
        description,
        attributesCount: attributes.length,
        attributes
    });
    
    // Validation
    if (!category || !brandId || !productName) {
        showError('Please fill all required fields (Category, Brand, Product Name)');
        return;
    }
    
    try {
        // Create FormData for multipart request (to handle file upload)
        const formData = new FormData();
        formData.append('brand_id', brandId);
        formData.append('name', productName);
        formData.append('category', category);
        formData.append('description', description);
        
        if (releaseYear) {
            formData.append('release_year', releaseYear);
        }
        
        if (imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }
        
        // Add attributes as JSON string
        if (attributes.length > 0) {
            formData.append('attributes', JSON.stringify(attributes));
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"><span class="visually-hidden">Loading...</span></span>Creating...';
        
        console.log('Sending API request to:', productsApiUrl);
        
        // Use custom fetch for FormData
        const response = await fetch(productsApiUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            },
            body: formData
        });
        
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success) {
            // Show success message
            document.getElementById('productNameSuccess').textContent = productName;
            document.getElementById('successAlert').classList.add('show');
            
            // Reset form after 2 seconds
            setTimeout(() => {
                resetForm();
                // Optionally redirect
                // window.location.href = '/admin-products/';
            }, 2000);
        } else {
            showError(data.error || 'Failed to create product');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error creating product:', error);
        showError('Failed to create product: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function resetForm() {
    document.getElementById('addProductForm').reset();
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('successAlert').classList.remove('show');
    selectedAttributes.clear();
    updateSummary();
    console.log('Form reset');
}

function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorAlert.style.display = 'block';
    
    console.error('Error:', message);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/refurbisher-logout/';
    }
}

// Export for HTML usage
window.InitializeAddProductForm = InitializeAddProductForm;
window.handleSubmit = handleSubmit;
window.resetForm = resetForm;
window.loadAttributesForCategory = loadAttributesForCategory;
window.previewImage = previewImage;
window.logout = logout;
