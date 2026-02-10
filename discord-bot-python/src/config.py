"""Configuration settings for the Discord bot."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Discord
    discord_bot_token: str
    discord_client_id: str

    # Google AI
    google_api_key: str

    # MCP Server
    mcp_server_url: str = "http://localhost:8080"
    mcp_auth_token: str = ""

    # Debug settings
    debug: bool = False
    log_level: str = "INFO"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


settings = Settings()
