from fastapi import status


class AppException(Exception):
    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, "UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, "FORBIDDEN", status.HTTP_403_FORBIDDEN)


class NotFoundException(AppException):
    def __init__(self, message: str = "Data tidak ditemukan"):
        super().__init__(message, "NOT_FOUND", status.HTTP_404_NOT_FOUND)
