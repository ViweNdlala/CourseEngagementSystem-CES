from django.db import models
import bcrypt

class User(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=10, null=True)
    
    def set_password(self, plain_password):
        """Hash and set password"""
        hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
        self.password = hashed.decode('utf-8')
    
    def check_password(self, plain_password):
        """Check if plain text password matches hash OR plain text"""
        try:
            # First, check if it's a bcrypt hash (starts with $2b$)
            if self.password.startswith('$2b$'):
                return bcrypt.checkpw(plain_password.encode('utf-8'), self.password.encode('utf-8'))
            else:
                # If it's plain text, compare directly and then upgrade to hash
                if self.password == plain_password:
                    # Upgrade to hashed password for security
                    self.set_password(plain_password)
                    self.save()
                    return True
                return False
        except (ValueError, AttributeError):
            return False
    
    @classmethod
    def migrate_all_passwords(cls):
        """Migrate all plain text passwords to hashed passwords"""
        users = cls.objects.all()
        migrated_count = 0
        
        for user in users:
            # Check if password is plain text (not starting with bcrypt pattern)
            if user.password and not user.password.startswith('$2b$'):
                print(f"Migrating password for user: {user.email}")
                
                # Hash the plain text password
                hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
                user.password = hashed.decode('utf-8')
                user.save()
                
                migrated_count += 1
                print(f"Migrated {user.email}")
            else:
                print(f"{user.email} already hashed")
        
        print(f"\nMigration completed! {migrated_count} users migrated to hashed passwords.")
        return migrated_count