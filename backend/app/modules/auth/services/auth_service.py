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
    ):
        await self.user_service.register_user(
            email=email, password=password, role="candidate",
            first_name=first_name, last_name=last_name,
        )
        user = await self.user_service.get_active_user_by_email(email)
        token_pair = self.token_service.create_pair(
            user_id=str(user["id"]), email=user["email"], role=str(user["role"]),
        )
        await self.session_service.create_session(user["id"], token_pair)
        return token_pair, user

    async def register_recruiter(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        company_name: str,
        position: str,
    ):
        await self.user_service.register_user(
            email=email, password=password, role="recruiter",
            first_name=first_name, last_name=last_name,
            company_name=company_name, position=position,
        )
        user = await self.user_service.get_active_user_by_email(email)
        token_pair = self.token_service.create_pair(
            user_id=str(user["id"]), email=user["email"], role=str(user["role"]),
        )
        await self.session_service.create_session(user["id"], token_pair)
        return token_pair, user

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

    async def request_email_change(self, user_id: str, new_email: str) -> None:
        # Ensure new email is not already taken
        await self.user_service.ensure_email_available(new_email)
        # Store pending change in email_verifications keyed by new_email
        # payload carries user_id so we can look it up on confirm
        await self.email_code_service.create_pending_registration(
            email=new_email,
            payload={"purpose": "change_email", "user_id": user_id},
        )

    async def confirm_email_change(self, user_id: str, new_email: str, code: str) -> None:
        payload = await self.email_code_service.verify_registration_code(new_email, code)
        if payload.get("purpose") != "change_email" or payload.get("user_id") != user_id:
            from app.exceptions import EDSServiceException
            raise EDSServiceException(
                code="CODE_INVALID",
                message_ru="Неверный код подтверждения",
                message_kz="Растау коды қате",
                message_en="Invalid verification code",
            )
        await self.user_service.update_email(user_id, new_email)
        # Revoke all sessions so user re-logs in with new email
        await self.session_service.revoke_by_email(new_email)

    async def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        await self.user_service.change_password(user_id, current_password, new_password)

    async def logout(self, access_token: str) -> None:
        await self.session_service.revoke_by_access_token(access_token)

    def decode_token(self, token: str) -> dict:
        return self.token_service.decode(token)

    async def get_all_users(self):
        return await self.user_service.get_all_users()
