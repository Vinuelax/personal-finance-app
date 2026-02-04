from functools import lru_cache
from utils.db import DB


@lru_cache()
def get_db() -> DB:
    return DB()
