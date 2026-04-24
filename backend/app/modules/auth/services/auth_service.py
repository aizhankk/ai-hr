from app.exceptions import EDSServiceException
from app.modules.auth.services.email_code_service import EmailCodeService
from app.modules.auth.services.session_service import SessionService
from app.modules.auth.services.token_service import TokenService
from app.modules.auth.services.user_service import UserService


class AuthService:
    def __init__(self) -> None:
        self.email_code_service = EmailCodeService()
        self.user_service = UserService()
        self.token_service = TokenService()
        self.session_service = SessionService()

    async def register_candidate(
        self, *, email: str, password: str, first_name: str, last_name: str
    ) -> None:
        await self.user_service.ensure_email_available(email)
        password_hash = self.user_service.password_service.hash_password(password)
        await self.email_code_service.create_pending_registration(
            email=email,
            payload={
                "role": "candidate",
                "password_hash": password_hash,
                "first_name": first_name,
                "last_name": last_name,
            },
        )

    async def register_recruiter(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        company_name: str,
        position: str,
    ) -> None:
        await self.user_service.ensure_email_available(email)
        password_hash = self.user_service.password_service.hash_password(password)
        await self.email_code_service.create_pending_registration(
            email=email,
            payload={
                "role": "recruiter",
                "password_hash": password_hash,
                "first_name": first_name,
                "last_name": last_name,
                "company_name": company_name,
                "position": position,
            },
        )

    async def verify_email(self, email: str, code: str):
        payload = await self.email_code_service.verify_registration_code(email, code)
        await self.user_service.create_verified_user_from_payload(email, payload)
        user = await self.user_service.get_active_user_by_email(email)
        token_pair = self.token_service.create_pair(
            user_id=str(user["id"]),
            email=user["email"],
            role=str(user["role"]),
        )
        await self.session_service.create_session(user["id"], token_pair)
        return token_pair, user

    async def resend_code(self, email: str) -> None:
        await self.email_code_service.resend_registration_code(email)

    async def login(self, email: str, password: str):
        user = await self.user_service.authenticate(email, password)
        token_pair = self.token_service.create_pair(
            user_id=str(user["id"]),
            email=user["email"],
            role=str(user["role"]),
        )
        await self.session_service.create_session(user["id"], token_pair)
        return token_pair

    async def refresh(self, refresh_token: str):
        payload = self.token_service.decode(refresh_token)
        if payload.get("type") != "refresh":
            raise EDSServiceException(
                code="TOKEN_INVALID_TYPE",
                message_ru="Неверный тип токена",
                message_kz="Токен түрі қате",
                message_en="Invalid token type",
            )
        session = await self.session_service.find_active_refresh_session(refresh_token)
        token_pair = self.token_service.create_pair(
            user_id=str(session["user_id"]),
            email=session["email"],
            role=str(session["role"]),
        )
        await self.session_service.rotate_session_tokens(session["id"], token_pair)
        return token_pair

    async def request_forgot_code(self, email: str) -> None:
        await self.email_code_service.request_code(email, "forgot_password")

    async def confirm_forgot_password(self, email: str, code: str, new_password: str) -> None:
        await self.email_code_service.verify_code(email, "forgot_password", code)
        await self.user_service.reset_password(email, new_password)
        await self.session_service.revoke_by_email(email)

    async def logout(self, access_token: str) -> None:
        await self.session_service.revoke_by_access_token(access_token)

    def decode_token(self, token: str) -> dict:
        return self.token_service.decode(token)

    async def get_all_users(self):
        return await self.user_service.get_all_users()
