from fastapi import Depends, HTTPException, Request

from middleware.auth import decode_token_string


class CurrentUser:
    def __init__(self, user_id: int, role: str):
        self.user_id = user_id
        self.role = role


def get_current_user(request: Request) -> CurrentUser:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    data, err = decode_token_string(token)
    if err:
        raise HTTPException(status_code=401, detail=err)
    return CurrentUser(data["user_id"], data["role"])


def require_roles(*roles: str):
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if roles and user.role not in roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return user

    return dependency
