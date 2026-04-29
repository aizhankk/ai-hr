from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """
    Интерфейс хранилища файлов.
    Реализации: LocalStorage, SpacesStorage.
    """

    @abstractmethod
    async def save(self, content: bytes, filename: str, folder: str) -> tuple:
        """
        Сохраняет файл, возвращает (file_uuid: str, url_path: str).
        file_uuid — уникальный идентификатор объекта (UUID строка).
        url_path  — путь/ключ для скачивания файла.
        """

    @abstractmethod
    async def read(self, url_path: str) -> bytes:
        """Читает и возвращает содержимое файла по его url_path."""

    @abstractmethod
    async def delete(self, url_path: str) -> None:
        """Удаляет файл по его URL-пути."""

    @abstractmethod
    def public_url(self, url_path: str) -> str:
        """Возвращает полный публичный URL файла."""