from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5434/padisaar_crm"
    SECRET_KEY: str = "change-this-in-production-very-long-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:5174"
    )

    # SMS / OTP login — use SMS_PROVIDER=http with gateway on the SMS server
    SMS_PROVIDER: str = "http"  # http | console | kavenegar
    SMS_API_KEY: str = ""
    SMS_SENDER: str = ""
    SMS_GATEWAY_URL: str = "http://192.168.102.104/sms/send"
    SMS_GATEWAY_API_KEY: str = ""
    SMS_GATEWAY_TIMEOUT_SECONDS: float = 5.0
    SMS_OTP_TEMPLATE: str = "کد ورود پدیسار CRM: {code} اعتبار: {minutes} دقیقه لغو11"
    SMS_DEBUG_RETURN_CODE: bool = False
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_ATTEMPTS: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
