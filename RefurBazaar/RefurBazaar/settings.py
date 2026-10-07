import os
from pathlib import Path
import base64
import dj_database_url

IS_LOCAL = False
LOCAL_DB = False
IS_PAYMENT_TEST_MODE = False

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-%k3^obid8rb5d&z4-7@vm@og#0@x2p%*%3d(h2e_k1gr)^9e(+' # to be kept in env during prod

DEBUG = IS_LOCAL

ALLOWED_HOSTS = ["*"] # to be updated during prod

X_FRAME_OPTIONS = 'SAMEORIGIN'

# Razorpay opens the bank (3-D Secure) page in a popup that must message back
# to this page. Django >= 4.0 defaults COOP to 'same-origin', which severs
# window.opener and breaks that handshake, so allow popups explicitly.
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'
# Default 'same-origin' strips the Referer on requests to checkout.razorpay.com.
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
# X_FRAME_OPTIONS = 'ALLOWALL'
# CORS_ALLOW_ALL_ORIGINS = True  # allow fetch/ajax from anywhere

AUTH_USER_MODEL = 'UserDetail.User'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'UserDetail',
    'Product',
    'ShoppingCart',
    'Order',
    'Admin',
    'FrontEnd'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'Order.middleware.ReleaseExpiredHoldsMiddleware',
]

# Minutes a device stays reserved for an unpaid online-payment order.
CHECKOUT_HOLD_MINUTES = 30

ROOT_URLCONF = 'RefurBazaar.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR, "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'RefurBazaar.wsgi.application'


# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

if IS_LOCAL:
    if LOCAL_DB:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
    else:
        DATABASES = {
            "default": dj_database_url.config(
                default="postgresql://refurbazaar_db_user:m7MPW6TxqBQ0KzqekniD6cXqIGtbjN9L@dpg-db0ad6gu01pc739hc7t0-a.singapore-postgres.render.com/refurbazaar_db", # DB ecternal link
                conn_max_age=600,
                ssl_require=True,
            )
        }

else:
    # DATABASES = {
    #         'default': {
    #             'ENGINE': 'django.db.backends.sqlite3',
    #             'NAME': BASE_DIR / 'db.sqlite3',
    #         }
    #     }
    DATABASES = {
        "default": dj_database_url.config(
            default=os.environ.get("DATABASE_URL"),
            conn_max_age=600,
            ssl_require=True,
        )
    }


# AUTH_PASSWORD_VALIDATORS = [
#     {
#         'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
#     },
# ]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Kolkata'

USE_I18N = True

USE_TZ = True


STATIC_URL = 'static/'
STATICFILES_DIRS = [
   os.path.join(BASE_DIR, 'static'),
]
# STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# Use WhiteNoise to serve static files efficiently on Render
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_AUTOREFRESH = False
WHITENOISE_USE_FINDERS = True


MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR,'media')


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

def base64_to_text(b64_text):
    # Decode the Base64 string back to bytes, then to text
    return base64.b64decode(b64_text.encode()).decode()


# To be kept in env during prod


# RAZORPAY_KEY_ID = base64_to_text("cnpwX3Rlc3RfUzV6OXlXcFh0d0VkVVg=")
# RAZORPAY_KEY_SECRET = base64_to_text("NTAyaldFeDBWUFE1b2RuSkJQVzNJblNS")


if IS_PAYMENT_TEST_MODE:
    RAZORPAY_KEY_ID = base64_to_text("cnpwX3Rlc3RfUzV6OXlXcFh0d0VkVVg=")
    RAZORPAY_KEY_SECRET = base64_to_text("NTAyaldFeDBWUFE1b2RuSkJQVzNJblNS")


else:
    RAZORPAY_KEY_ID = base64_to_text("cnpwX3Rlc3RfUzV6OXlXcFh0d0VkVVg=")
    RAZORPAY_KEY_SECRET = base64_to_text("NTAyaldFeDBWUFE1b2RuSkJQVzNJblNS")



shiprocket_api_email = base64_to_text("aW5mbythcGlAcmVjYXJ2aXQuY29t")
shiprocket_api_pass = base64_to_text("NTBmN2VmMmM5MDU2MmU2NzdkZjgzMmU0MjYwMDRlNmE=")

prod_shiprocket_api_email = base64_to_text("ZGl2eWFtQG1pcmFja2xlLmNvbQ==")
prod_shiprocket_api_pass = base64_to_text("WWhAcUVFaCpNVzd2YjRtYzdtT1lZQVQ5MF5iWCNzRG8=")


# ---------------------------------------------------------------------------
# ShipRocket configuration
# ---------------------------------------------------------------------------
# ShipRocket has a single production API host — there is no separate "sandbox"
# hostname. To test safely, sign up for a second (test) ShipRocket account and
# point SHIPROCKET_MODE=sandbox at its credentials; flip to SHIPROCKET_MODE=
# production (with real credentials) when you're ready to create live pickups.

# SHIPROCKET_MODE = os.environ.get('SHIPROCKET_MODE', 'sandbox')  # 'sandbox' | 'production'
SHIPROCKET_MODE = 'production'  # 'sandbox' | 'production'

# SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external'
# SHIPROCKET_BASE_URL = 'https://api-sandbox.shiprocket.in/v1/external'

# SHIPROCKET_CREDENTIALS = {
#     'sandbox': {
#         'email': os.environ.get('SHIPROCKET_SANDBOX_EMAIL', ''),
#         'password': os.environ.get('SHIPROCKET_SANDBOX_PASSWORD', ''),
#     },
#     'production': {
#         'email': os.environ.get('SHIPROCKET_EMAIL', ''),
#         'password': os.environ.get('SHIPROCKET_PASSWORD', ''),
#     },
# }


SHIPROCKET_CREDENTIALS = {
    'sandbox': {
        'email': shiprocket_api_email,
        'password': shiprocket_api_pass,
        'url': 'https://api-sandbox.shiprocket.in/v1/external'
    },
    'production': {
        'email': prod_shiprocket_api_email,
        'password': prod_shiprocket_api_pass,
        'url': 'https://apiv2.shiprocket.in/v1/external'
    },
}

SHIPROCKET_EMAIL = SHIPROCKET_CREDENTIALS.get(SHIPROCKET_MODE, {}).get('email', '')
SHIPROCKET_PASSWORD = SHIPROCKET_CREDENTIALS.get(SHIPROCKET_MODE, {}).get('password', '')
SHIPROCKET_BASE_URL = SHIPROCKET_CREDENTIALS.get(SHIPROCKET_MODE, {}).get('url', '')

# Fixed default box size per product category (cm / kg). The refurbisher can
# still override these at the "check shipping rates" step for confirmation.
SHIPROCKET_BOX_DEFAULTS_BY_CATEGORY = {
    'mobile': {'length': 20, 'breadth': 15, 'height': 8, 'weight': 0.5},
    'tablet': {'length': 32, 'breadth': 24, 'height': 8, 'weight': 1.0},
    'laptop': {'length': 40, 'breadth': 30, 'height': 10, 'weight': 2.5},
    'accessory': {'length': 20, 'breadth': 15, 'height': 8, 'weight': 0.3},
}
SHIPROCKET_DEFAULT_BOX = {'length': 20, 'breadth': 15, 'height': 8, 'weight': 0.5}


