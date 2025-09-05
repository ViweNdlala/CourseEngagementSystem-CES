from django.db import models

class Course(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200)

    

# Create your models here.
