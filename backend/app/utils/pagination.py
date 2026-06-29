from pydantic import BaseModel


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20


def paginate_offset(page: int, per_page: int) -> int:
    return (page - 1) * per_page
