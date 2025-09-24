from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    """ 
    Serializer for the User model.
    Handles the serialization and deserialization of User instances,
    including proper password hashing when creating or updating users.
    """
    
    # Password field should only be writable and requires a minimum length
    password = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        """
        Meta class defines the model and the fields to include in serialization.
        """
        model = User
        fields = ['id', 'name', 'email', 'password', 'role']
    
    def create(self, validated_data):
        """
        Create a new User instance with a hashed password.
        
        Args:
            validated_data (dict): The validated data from the serializer.
        
        Returns:
            User: The created User instance.
        """
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # Hash the password before saving
        user.save()
        return user
    
    def update(self, instance, validated_data):
        """
        Update an existing User instance.
        If a new password is provided, hash it before saving.
        
        Args:
            instance (User): The User instance to update.
            validated_data (dict): The validated data from the serializer.
        
        Returns:
            User: The updated User instance.
        """
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        # Call the superclass method to handle other fields
        return super().update(instance, validated_data)
