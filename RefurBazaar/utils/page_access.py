"""Role-based access control for HTML page views.

API endpoints keep using ``utils.decorators.check_authentication`` (JSON
responses). Page views use ``page_access`` here, which answers with redirects
and an HTML error page instead.

Rules
-----
* Not logged in      -> redirect to the login page of the required role,
                        carrying ``?next=<requested path>``.
* Logged in as a different role -> 403 "access restricted" HTML page.
* Deactivated account -> session is cleared and the user is sent to login.
"""
from functools import wraps
from urllib.parse import urlencode

from django.contrib.auth import logout
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme

ROLE_LABELS = {
    'admin': 'Admin',
    'refurbisher': 'Refurbisher',
    'customer': 'Customer',
}

# Where each role signs in.
ROLE_LOGIN_URLS = {
    'admin': '/admin-login/',
    'refurbisher': '/refurbisher-login/',
    'customer': '/account/',
}

# Where each role lands after signing in (or when sent "back to my area").
ROLE_HOME_URLS = {
    'admin': '/admin-dashboard/',
    'refurbisher': '/refurbisher-listings/',
    'customer': '/account/',
}

# Where each role goes after logging out.
ROLE_LOGOUT_URLS = {
    'admin': '/admin-login/',
    'refurbisher': '/refurbisher-login/',
    'customer': '/',
}

# A ``next`` target is only honoured when it stays inside the role's own area.
ROLE_NEXT_PREFIXES = {
    'admin': ('/admin-',),
    'refurbisher': ('/refurbisher-',),
    'customer': ('/account',),
}


def safe_next_url(request, role, candidate=None):
    """Return a same-site ``next`` path that belongs to ``role``, else None."""
    candidate = candidate if candidate is not None else request.GET.get('next')
    if not candidate or not candidate.startswith('/') or candidate.startswith('//'):
        return None
    if not url_has_allowed_host_and_scheme(
        candidate, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        return None
    prefixes = ROLE_NEXT_PREFIXES.get(role, ())
    if not any(candidate.startswith(p) for p in prefixes):
        return None
    return candidate


def login_redirect_url(request, role):
    """Login URL for ``role`` with the current page preserved as ``next``."""
    base = ROLE_LOGIN_URLS[role]
    if role == 'customer':
        return base
    return f"{base}?{urlencode({'next': request.get_full_path()})}"


def access_denied_response(request, required_role):
    """Render the 403 page explaining which role the page is reserved for."""
    current_role = getattr(request.user, 'role', None)
    context = {
        'required_role': required_role,
        'required_role_label': ROLE_LABELS.get(required_role, required_role.title()),
        'current_role': current_role,
        'current_role_label': ROLE_LABELS.get(current_role, 'Unknown'),
        'required_login_url': ROLE_LOGIN_URLS[required_role],
        'own_home_url': ROLE_HOME_URLS.get(current_role, '/'),
        'own_home_label': f"Go to my {ROLE_LABELS.get(current_role, '')} area".replace('  ', ' ').strip(),
        'logout_url': '/logout/',
        'requested_path': request.path,
    }
    return render(request, 'errors/access_denied.html', context, status=403)


def page_access(required_role, allow_incomplete_profile=False, anonymous_ok=False):
    """Guard an HTML view so only ``required_role`` can open it.

    ``anonymous_ok`` lets logged-out visitors through (used for the customer
    account page, which is itself the customer login page).
    ``allow_incomplete_profile`` lets refurbishers reach pages before their
    company profile is complete (the profile page itself).
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(self, request, *args, **kwargs):
            user = request.user

            if not user.is_authenticated:
                if anonymous_ok:
                    return view_func(self, request, *args, **kwargs)
                return redirect(login_redirect_url(request, required_role))

            if not user.is_active or getattr(user, 'active_user', True) is False:
                logout(request)
                if anonymous_ok:
                    return redirect(ROLE_LOGIN_URLS[required_role])
                return redirect(login_redirect_url(request, required_role))

            if getattr(user, 'role', None) != required_role:
                return access_denied_response(request, required_role)

            if required_role == 'refurbisher' and not allow_incomplete_profile:
                company_profile = getattr(user, 'company_profile', None)
                if not company_profile or not company_profile.is_profile_complete:
                    return redirect('/refurbisher-profile/')

            return view_func(self, request, *args, **kwargs)

        return _wrapped_view
    return decorator
