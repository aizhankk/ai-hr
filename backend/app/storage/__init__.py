import os

if os.getenv("SPACES_KEY") and os.getenv("SPACES_SECRET"):
    from app.storage.spaces_storage import SpacesStorage
    storage = SpacesStorage()
else:
    from app.storage.local_storage import LocalStorage
    storage = LocalStorage()
