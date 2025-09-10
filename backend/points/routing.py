
from django.urls import path
from .consumers import PointsConsumer

websocket_urlpatterns = [
    path("ws/points/", PointsConsumer.as_asgi()),
]
