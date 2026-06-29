"""Reset demo user passwords (admin / expert). Run after DB is migrated."""

import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.utils.security import hash_password

DEMO_USERS = [
    ("admin@padisaar.com", "admin123"),
    ("expert@padisaar.com", "expert123"),
]


async def reset_passwords() -> None:
    async with AsyncSessionLocal() as db:
        for email, password in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user:
                print(f"  User not found: {email}")
                continue
            user.hashed_password = hash_password(password)
            print(f"  Password reset: {email}")
        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(reset_passwords())
