import hmac
import secrets
from hashlib import pbkdf2_hmac


class PasswordService:
    def hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        rounds = 260000
        hashed = pbkdf2_hmac("sha256", password.encode(), salt.encode(), rounds).hex()
        return f"pbkdf2_sha256${rounds}${salt}${hashed}"

    def verify_password(self, password: str, encoded: str) -> bool:
        try:
            algo, rounds_str, salt, expected = encoded.split("$", 3)
            if algo != "pbkdf2_sha256":
                return False
            calculated = pbkdf2_hmac(
                "sha256",
                password.encode(),
                salt.encode(),
                int(rounds_str),
            ).hex()
            return hmac.compare_digest(calculated, expected)
        except Exception:
            return False
