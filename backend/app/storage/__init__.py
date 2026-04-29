from app.storage.local_storage import LocalStorage

# Единая точка доступа к хранилищу.
# Чтобы переключиться на MinIO — заменить LocalStorage на MinioStorage здесь.
storage = LocalStorage()