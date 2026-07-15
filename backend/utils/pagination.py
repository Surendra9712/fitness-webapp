from fastapi import Request


def parse_page_params(request: Request, default_size: int = 20, max_size: int = 200) -> tuple[int, int, int]:
    """Extract page, page_size, and offset from request query args."""
    page      = max(1, int(request.query_params.get('page', 1)))
    page_size = max(1, min(max_size, int(request.query_params.get('page_size', default_size))))
    offset    = (page - 1) * page_size
    return page, page_size, offset


def paginated_response(items: list, total: int, page: int, page_size: int):
    """Return a standard paginated JSON response."""
    return {
        'items': items,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': max(1, -(-total // page_size)),
    }
