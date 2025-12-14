# backend/services/cache.py
from datetime import datetime, timedelta
from functools import wraps
from flask import request
import hashlib
import json

class SimpleCache:
    """
    Basit in-memory cache.
    Production'da Redis kullanılmalı.
    """
    
    def __init__(self, default_ttl=300):
        self.cache = {}  # {key: (value, expiry_time)}
        self.default_ttl = default_ttl  # 5 dakika
        self.last_cleanup = datetime.utcnow()
        self.cleanup_interval = timedelta(minutes=1)
    
    def _cleanup(self):
        """Süresi dolmuş cache entry'lerini temizle."""
        now = datetime.utcnow()
        if now - self.last_cleanup < self.cleanup_interval:
            return
        
        expired_keys = [
            key for key, (_, expiry) in self.cache.items()
            if expiry < now
        ]
        for key in expired_keys:
            del self.cache[key]
        
        self.last_cleanup = now
    
    def get(self, key):
        """Cache'den değer al."""
        self._cleanup()
        
        if key not in self.cache:
            return None
        
        value, expiry = self.cache[key]
        if expiry < datetime.utcnow():
            del self.cache[key]
            return None
        
        return value
    
    def set(self, key, value, ttl=None):
        """Cache'e değer yaz."""
        ttl = ttl or self.default_ttl
        expiry = datetime.utcnow() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)
    
    def delete(self, key):
        """Cache'den sil."""
        if key in self.cache:
            del self.cache[key]
    
    def clear_pattern(self, pattern):
        """Pattern'e uyan tüm key'leri sil."""
        keys_to_delete = [
            key for key in self.cache.keys()
            if pattern in key
        ]
        for key in keys_to_delete:
            del self.cache[key]
    
    def clear_all(self):
        """Tüm cache'i temizle."""
        self.cache = {}


# Global cache instance
cache = SimpleCache()


def cached(ttl=300, key_prefix=''):
    """
    Cache decorator for Flask routes.
    
    Args:
        ttl: Cache süresi (saniye)
        key_prefix: Cache key prefix'i
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Cache key oluştur
            key_parts = [key_prefix or f.__name__]
            
            # URL parametrelerini ekle
            if request.args:
                key_parts.append(str(sorted(request.args.items())))
            
            # URL path parametrelerini ekle
            if kwargs:
                key_parts.append(str(sorted(kwargs.items())))
            
            cache_key = hashlib.md5('_'.join(key_parts).encode()).hexdigest()
            
            # Cache'den kontrol et
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Fonksiyonu çalıştır ve cache'le
            result = f(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        return decorated_function
    return decorator


def invalidate_cache(pattern):
    """
    Cache invalidation decorator.
    Write operasyonlarından sonra ilgili cache'i temizler.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            result = f(*args, **kwargs)
            cache.clear_pattern(pattern)
            return result
        return decorated_function
    return decorator


# Kullanım örneği için preset cache'ler
def cache_short(f):
    """Kısa süreli cache (1 dakika)"""
    return cached(ttl=60)(f)

def cache_medium(f):
    """Orta süreli cache (5 dakika)"""
    return cached(ttl=300)(f)

def cache_long(f):
    """Uzun süreli cache (30 dakika)"""
    return cached(ttl=1800)(f)
