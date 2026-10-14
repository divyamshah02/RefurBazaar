(function () {
    function cleanLabel(text) {
        return (text || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    }

    function labelFor(field) {
        if (field.id) {
            const explicit = document.querySelector('label[for="' + field.id + '"]');
            if (explicit) return cleanLabel(explicit.textContent);
        }
        const container = field.closest('div');
        const nearby = container && container.querySelector('label');
        return cleanLabel(nearby ? nearby.textContent : field.placeholder);
    }

    function isVisible(field) {
        return !field.closest('.d-none') && !field.disabled;
    }

    function collect(form) {
        const details = {};
        let name = '';
        let email = '';
        let phone = '';
        let message = '';
        const nameCandidates = [];

        form.querySelectorAll('input, select, textarea').forEach(function (field) {
            if (!isVisible(field) || field.type === 'submit' || field.type === 'button') return;

            if (field.type === 'checkbox') {
                if (!field.checked) return;
                const group = field.closest('.mb-4');
                const groupLabel = cleanLabel(group && group.querySelector(':scope > label') ? group.querySelector(':scope > label').textContent : 'Selected options');
                const text = labelFor(field);
                details[groupLabel] = details[groupLabel] ? details[groupLabel] + ', ' + text : text;
                return;
            }

            const value = (field.type === 'select-one' ? (field.selectedOptions[0] ? field.selectedOptions[0].text : '') : field.value).trim();
            if (!value) return;
            const label = labelFor(field) || field.name || 'Field';

            if (field.type === 'email' && !email) { email = value; return; }
            if (field.type === 'tel' && !phone) { phone = value; return; }
            if (field.tagName === 'TEXTAREA' && !message) { message = value; return; }
            if (field.type === 'text' && /name|contact person/i.test(label)) nameCandidates.push({ label: label, value: value });

            details[label] = value;
        });

        const preferred = nameCandidates.find(function (c) { return /contact person|full name|your name/i.test(c.label); }) || nameCandidates[0];
        if (preferred) {
            name = preferred.value;
            delete details[preferred.label];
        }
        return { name: name, email: email, phone: phone, message: message, details: details };
    }

    window.showInquiryError = function (form, message) {
        let box = form.querySelector('.inquiry-error');
        if (!box) {
            box = document.createElement('div');
            box.className = 'inquiry-error text-danger small fw-bold text-center mt-3';
            box.setAttribute('role', 'alert');
            form.appendChild(box);
        }
        box.textContent = message || '';
    };

    window.submitInquiry = async function (form, kind, subject) {
        const payload = collect(form);
        payload.kind = kind;
        payload.subject = subject || '';
        try {
            const response = await fetch('/inquiry/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const body = await response.json().catch(function () { return {}; });
            if (response.ok && body.success) return { ok: true };
            return { ok: false, error: body.error || 'Something went wrong. Please try again.' };
        } catch (err) {
            return { ok: false, error: 'Network error. Please check your connection and try again.' };
        }
    };
})();
