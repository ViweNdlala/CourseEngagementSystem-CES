from django.db import models
import bcrypt

"""
 Class: User
 Purpose: Represents a system user with authentication 
          features such as password hashing, verification, 
          and migration from plaintext to hashed passwords.
"""
class User(models.Model):
    # Fields
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)  # Stores hashed password (or legacy plain text)
    role = models.CharField(max_length=10, null=True)

    """ ------------------------------
    Method: set_password
    Purpose: Securely hash and set a new password using bcrypt.
    Params:
      plain_password (str): Raw password provided by the user.
    """
    def set_password(self, plain_password):
        hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
        self.password = hashed.decode("utf-8")

    """ ------------------------------
     Method: check_password
     Purpose: Verify whether the provided password matches 
              the stored password (hashed or plain text).
     Behavior:
       - If password is hashed --> verify using bcrypt.
       - If password is plain text --> compare directly, then upgrade
         it to a hashed password for security.
    Returns:
       bool: True if password matches, False otherwise.
    """
    def check_password(self, plain_password):
        try:
            # Case 1: Stored password is a bcrypt hash
            if self.password.startswith("$2b$"):
                return bcrypt.checkpw(
                    plain_password.encode("utf-8"), self.password.encode("utf-8")
                )

            # Case 2: Stored password is plain text
            if self.password == plain_password:
                # Upgrade plain text password to hashed version
                self.set_password(plain_password)
                self.save()
                return True

            return False

        except (ValueError, AttributeError):
            # Handle invalid or missing password cases safely
            return False

    """
    Class Method: migrate_all_passwords
    Purpose: Convert all existing plain text passwords in the 
             database to securely hashed bcrypt passwords.
    Returns:
      int: Number of users whose passwords were migrated.
    """
    @classmethod
    def migrate_all_passwords(cls):
        users = cls.objects.all()
        migrated_count = 0

        for user in users:
            # Skip users who already have bcrypt-hashed passwords
            if user.password and not user.password.startswith("$2b$"):
                print(f"Migrating password for user: {user.email}")

                # Hash and update password
                hashed = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
                user.password = hashed.decode("utf-8")
                user.save()

                migrated_count += 1
                print(f"Migrated {user.email}")
            else:
                print(f"{user.email} already hashed")

        print(f"\nMigration completed! {migrated_count} users migrated to hashed passwords.")
        return migrated_count
