# backend/services/rate_limiter.py
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g

class RateLimiter:
    """
    Basit in-memory rate limiter.
    Production'da Redis kullanılmalı.
    """
    
    def __init__(self):
        self.requests = {}  # {ip: [(timestamp, endpoint), ...]}
        self.cleanup_interval = timedelta(minutes=5)
        self.last_cleanup = datetime.utcnow()
    
    def _cleanup(self):
        """Eski kayıtları temizle."""
        now = datetime.utcnow()
        if now - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff = now - timedelta(minutes=10)
        for ip in list(self.requests.keys()):
            self.requests[ip] = [
                (ts, ep) for ts, ep in self.requests[ip] 
                if ts > cutoff
            ]
            if not self.requests[ip]:
                del self.requests[ip]
        
        self.last_cleanup = now
    
    def is_rate_limited(self, ip, endpoint, max_requests, window_seconds):
        """
        Rate limit kontrolü yapar.
        Returns: (is_limited, remaining, reset_time)
        """
        self._cleanup()
        
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        if ip not in self.requests:
            self.requests[ip] = []
        
        # Bu endpoint için son istekleri say
        recent = [
            (ts, ep) for ts, ep in self.requests[ip]
            if ts > window_start and ep == endpoint
        ]
        
        count = len(recent)
        remaining = max(0, max_requests - count - 1)
        
        if count >= max_requests:
            # Rate limited
            oldest = min(ts for ts, ep in recent)
            reset_time = oldest + timedelta(seconds=window_seconds)
            return True, 0, reset_time
        
        # İsteği kaydet
        self.requests[ip].append((now, endpoint))
        return False, remaining, now + timedelta(seconds=window_seconds)


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests=60, window_seconds=60, per_endpoint=True):
    """
    Rate limit decorator.
    
    Args:
        max_requests: Pencere içinde izin verilen maksimum istek sayısı
        window_seconds: Pencere süresi (saniye)
        per_endpoint: True ise endpoint bazlı, False ise genel
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr or 'unknown'
            endpoint = request.endpoint if per_endpoint else 'global'
            
            is_limited, remaining, reset_time = rate_limiter.is_rate_limited(
                ip, endpoint, max_requests, window_seconds
            )
            
            if is_limited:
                response = jsonify({
                    'success': False,
                    'error': 'Çok fazla istek gönderdiniz. Lütfen bekleyin.',
                    'retry_after': int((reset_time - datetime.utcnow()).total_seconds())
                })
                response.status_code = 429
                response.headers['Retry-After'] = str(int((reset_time - datetime.utcnow()).total_seconds()))
                response.headers['X-RateLimit-Limit'] = str(max_requests)
                response.headers['X-RateLimit-Remaining'] = '0'
                return response
            
            # Rate limit headers ekle
            response = f(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(max_requests)
                response.headers['X-RateLimit-Remaining'] = str(remaining)
            
            return response
        return decorated_function
    return decorator


# Preset rate limiters
def strict_rate_limit(f):
    """Hassas endpoint'ler için sıkı rate limit (10 req/min)"""
    return rate_limit(max_requests=10, window_seconds=60)(f)

def normal_rate_limit(f):
    """Normal endpoint'ler için rate limit (60 req/min)"""
    return rate_limit(max_requests=60, window_seconds=60)(f)

def relaxed_rate_limit(f):
    """Sık kullanılan endpoint'ler için gevşek rate limit (120 req/min)"""
    return rate_limit(max_requests=120, window_seconds=60)(f)
