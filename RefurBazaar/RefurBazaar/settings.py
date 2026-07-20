import os
from pathlib import Path
import base64
import dj_database_url

IS_LOCAL = False
LOCAL_DB = True
IS_PAYMENT_TEST_MODE = False

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-%k3^obid8rb5d&z4-7@vm@og#0@x2p%*%3d(h2e_k1gr)^9e(+'

DEBUG = True

ALLOWED_HOSTS = ["*"]

X_FRAME_OPTIONS = 'SAMEORIGIN'
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
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

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
                default="postgresql://bakershub_db_user:75cwuW3lVEn0K4G31l0vZxES96HtVKku@dpg-d5mj8nogjchc738ov0sg-a.singapore-postgres.render.com/bakershub_db",
                conn_max_age=600,
                ssl_require=True,
            )
        }

else:
    DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
    # DATABASES = {
    #     "default": dj_database_url.config(
    #         default=os.environ.get("DATABASE_URL"),
    #         conn_max_age=600,
    #         ssl_require=True,
    #     )
    # }


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


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

# RAZORPAY_KEY_ID = base64_to_text("cnpwX3Rlc3RfUzV6OXlXcFh0d0VkVVg=")
# RAZORPAY_KEY_SECRET = base64_to_text("NTAyaldFeDBWUFE1b2RuSkJQVzNJblNS")


if IS_PAYMENT_TEST_MODE:
    RAZORPAY_KEY_ID = base64_to_text("cnpwX3Rlc3RfUzV6OXlXcFh0d0VkVVg=")
    RAZORPAY_KEY_SECRET = base64_to_text("NTAyaldFeDBWUFE1b2RuSkJQVzNJblNS")


else:
    RAZORPAY_KEY_ID = base64_to_text("cnpwX3Rlc3RfUzV6OXlXcFh0d0VkVVg=")
    RAZORPAY_KEY_SECRET = base64_to_text("NTAyaldFeDBWUFE1b2RuSkJQVzNJblNS")
