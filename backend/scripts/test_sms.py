"""Send a test SMS through the configured gateway. Run from backend folder:

    .\\venv\\Scripts\\python scripts\\test_sms.py 09121234567 "تست پیامک"

"""
import asyncio
import sys

from app.services.sms_service import send_sms


async def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python scripts/test_sms.py <mobile> <message>")
        sys.exit(1)
    mobile = sys.argv[1]
    message = sys.argv[2]
    await send_sms(mobile, message)
    print(f"OK — SMS sent to {mobile}")


if __name__ == "__main__":
    asyncio.run(main())
