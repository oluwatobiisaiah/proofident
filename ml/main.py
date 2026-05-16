import uvicorn
from src.config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "src.api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development",
        log_level=settings.log_level,
    )
