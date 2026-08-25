import logging

import httpx

from app.config import settings
from app.services.exceptions import BadRequestError

logger = logging.getLogger(__name__)


async def send_sms(mobile: str, message: str) -> None:
    provider = settings.SMS_PROVIDER.lower()

    if provider == "console":
        logger.info("SMS [%s] -> %s", mobile, message)
        if settings.SMS_DEBUG_RETURN_CODE:
            logger.info("SMS debug mode enabled — code is returned in API response only")
        return

    if provider == "kavenegar":
        await _send_kavenegar(mobile, message)
        return

    if provider == "http":
        await _send_http_gateway(mobile, message)
        return

    raise BadRequestError(f"ارائه‌دهنده پیامک پیکربندی نشده است: {settings.SMS_PROVIDER}")


async def _send_kavenegar(mobile: str, message: str) -> None:
    if not settings.SMS_API_KEY:
        raise BadRequestError("کلید API پیامک (SMS_API_KEY) تنظیم نشده است")
    if not settings.SMS_SENDER:
        raise BadRequestError("شماره فرستنده پیامک (SMS_SENDER) تنظیم نشده است")

    url = f"https://api.kavenegar.com/v1/{settings.SMS_API_KEY}/sms/send.json"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            data={"receptor": mobile, "sender": settings.SMS_SENDER, "message": message},
        )
    if response.status_code >= 400:
        logger.error("Kavenegar error %s: %s", response.status_code, response.text)
        raise BadRequestError("ارسال پیامک با خطا مواجه شد")
    data = response.json()
    if data.get("return", {}).get("status") != 200:
        logger.error("Kavenegar API error: %s", data)
        raise BadRequestError("ارسال پیامک با خطا مواجه شد")


async def _send_http_gateway(mobile: str, message: str) -> None:
    if not settings.SMS_GATEWAY_URL:
        raise BadRequestError("آدرس درگاه پیامک (SMS_GATEWAY_URL) تنظیم نشده است")
    if not settings.SMS_GATEWAY_API_KEY:
        raise BadRequestError("کلید API درگاه پیامک (SMS_GATEWAY_API_KEY) تنظیم نشده است")

    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": settings.SMS_GATEWAY_API_KEY,
    }
    payload = {"mobile": mobile, "message": message}

    timeout = settings.SMS_GATEWAY_TIMEOUT_SECONDS
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                settings.SMS_GATEWAY_URL,
                headers=headers,
                json=payload,
            )
    except httpx.TimeoutException:
        logger.error("SMS gateway timeout after %ss: %s", timeout, settings.SMS_GATEWAY_URL)
        raise BadRequestError("سرور پیامک پاسخ نداد. لطفاً دوباره تلاش کنید")
    except httpx.RequestError as exc:
        logger.error("SMS gateway connection error: %s", exc)
        raise BadRequestError("اتصال به سرور پیامک برقرار نشد")
    except Exception as exc:
        logger.exception("Unexpected SMS gateway error: %s", exc)
        raise BadRequestError("ارسال پیامک با خطا مواجه شد") from exc

    if response.status_code >= 400:
        logger.error("SMS gateway error %s: %s", response.status_code, response.text)
        raise BadRequestError("ارسال پیامک با خطا مواجه شد")

    logger.info("SMS gateway OK %s for %s", response.status_code, mobile)
