import os
import logging
import redis
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import Flask
from services.time_series_manager import TimeSeriesManager

class Container:
    def __init__(self):
        self._logger = None
        self._redis_client = None
        self._time_series_manager = None
        self._limiter = None
        self._redis_host = os.environ.get("REDIS_HOST", "redis")
    
    @property
    def redis_url(self):
        return f"redis://{self._redis_host}:6379"

    @property
    def logger(self):
        if not self._logger:
            logging.basicConfig(
                level=logging.DEBUG ,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            self._logger = logging.getLogger("FlaskAPI")
        return self._logger

    @property
    def redis_client(self):
        if not self._redis_client:
            redis_host = os.environ.get("REDIS_HOST", "redis")
            try:
                self._redis_client = redis.Redis(
                    host=redis_host, 
                    port=6379, 
                    decode_responses=True,
                    socket_connect_timeout=2
                )
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
                redis_client=self.redis_client,
                logger=self.logger
            )
        return self._time_series_manager
    
    @property
    def limiter(self):
        if not self._limiter:
            app = Flask(__name__)
            self._limiter = Limiter(
                app=app,
                key_func=get_remote_address,
                default_limits=["200 per day", "50 per hour"]
            )
        return self._limiter
    
container = Container()