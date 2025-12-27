import os
import logging
import redis
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from services.time_series_manager import TimeSeriesManager


class Container:
    def __init__(self):
        self._logger = None
        self._redis_client = None
        self._time_series_manager = None
        self._limiter = None
        self._redis_host = os.environ.get("REDIS_HOST", "redis")
        self._redis_pool = redis.ConnectionPool(
            host=self._redis_host,
            port=6379,
            decode_responses=True,
            db=0,
            max_connections=80,
            socket_connect_timeout=2,
        )

    @property
    def redis_url(self):
        return f"redis://{self._redis_host}:6379"

    @property
    def logger(self):
        if not self._logger:
            logging.basicConfig(
                level=logging.DEBUG,
                format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            )
            self._logger = logging.getLogger("FlaskAPI")
        return self._logger

    @property
    def limiter(self):
        if not self._limiter:
            # ZMIANA: Nie przekazujemy 'app' tutaj!
            # Przekazujemy tylko konfigurację (storage_uri).
            self._limiter = Limiter(
                key_func=get_remote_address,
                storage_uri=self.redis_url,  # Pobiera adres z kontenera (DRY)
                default_limits=["5000 per day", "500 per hour"],
                strategy="fixed-window",
            )
        return self._limiter

    @property
    def redis_client(self):
        if not self._redis_client:
            redis_host = os.environ.get("REDIS_HOST", "redis")
            try:
                self._redis_client = redis.Redis(connection_pool=self._redis_pool)
                self._redis_client.ping()
                self.logger.info(f"Connected to Redis at {redis_host}")
            except Exception as e:
                self.logger.error(f"Failed to connect to Redis: {e}")
                raise e
        return self._redis_client

    @property
    def time_series_manager(self):
        if not self._time_series_manager:
            self._time_series_manager = TimeSeriesManager(
                redis_client=self.redis_client, logger=self.logger
            )
        return self._time_series_manager


container = Container()
