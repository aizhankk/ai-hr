import os

if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    from app.storage.supabase_storage import SupabaseStorage
    storage = SupabaseStorage()
elif os.getenv("SPACES_KEY") and os.getenv("SPACES_SECRET"):
    from app.storage.spaces_storage import SpacesStorage
    storage = SpacesStorage()
else:
    from app.storage.local_storage import LocalStorage
    storage = LocalStorage()
