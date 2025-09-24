from rest_framework import serializers
from .models import PreparationWeek, PreparationResource

class PreparationResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreparationResource
        fields = ['id', 'title', 'url']
        read_only_fields = ['id']

class PreparationWeekSerializer(serializers.ModelSerializer):
    """
    Full serializer for preparation week with its resources.
    
    Includes related preparation resources for complete week data.
    Used for read operations and detail views.
    """
    preparation_resources = PreparationResourceSerializer(many=True, read_only=True)
    
    class Meta:
        model = PreparationWeek
        fields = [
            'id', 'course', 'week_number', 'welcome_message',
            'preparation_resources'
        ]
        read_only_fields = ['id']

class PreparationWeekCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating preparation weeks.
    
    Excludes nested resources to avoid complexity during creation.
    Resources are added separately via dedicated endpoints.
    """
    class Meta:
        model = PreparationWeek
        fields = ['id', 'course', 'week_number', 'welcome_message']
        read_only_fields = ['id']