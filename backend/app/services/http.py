from fastapi import HTTPException

from app.services.exceptions import ServiceError


def raise_http(exc: ServiceError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)
