from django.apps import AppConfig

class QuizzesConfig(AppConfig):
    """
    Configuration class for the 'quizzes' app.

    Defines default settings for the app, including the default
    type of auto-generated primary key field.
    """
    # Default primary key type for models in this app
    default_auto_field = 'django.db.models.BigAutoField'

    # Name of the app
    name = 'quizzes'
