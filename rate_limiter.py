import time
from collections import defaultdict
from functools import wraps
from flask import request, jsonify

class RateLimiter:
    """Simple in-memory rate limiter for anti-spam protection"""
    
    def __init__(self):
        # Store request timestamps by IP
        self.requests = defaultdict(list)
        # Store order counts by IP
        self.order_counts = defaultdict(int)
        # Store daily order counts by IP
        self.daily_orders = defaultdict(list)
        
    def is_allowed(self, ip, max_requests=10, window_seconds=3600):
        """Check if IP is allowed to make request"""
        now = time.time()
        
        # Clean old requests
        self.requests[ip] = [t for t in self.requests[ip] if now - t < window_seconds]
        
        # Check if under limit
        if len(self.requests[ip]) >= max_requests:
            return False
        
        # Record this request
        self.requests[ip].append(now)
        return True
    
    def can_create_order(self, ip, max_daily=10, max_hourly=3):
        """Check if IP can create order"""
        now = time.time()
        today = time.strftime('%Y-%m-%d')
        
        # Clean old daily orders
        self.daily_orders[ip] = [
            (date, timestamp) for date, timestamp in self.daily_orders[ip] 
            if date == today and now - timestamp < 86400
        ]
        
        # Check daily limit
        if len(self.daily_orders[ip]) >= max_daily:
            return False, "Daily order limit exceeded"
        
        # Check hourly limit (last hour)
        hourly_orders = [t for date, t in self.daily_orders[ip] if now - t < 3600]
        if len(hourly_orders) >= max_hourly:
            return False, "Hourly order limit exceeded"
        
        # Record this order
        self.daily_orders[ip].append((today, now))
        return True, "Allowed"
    
    def get_remaining_requests(self, ip, max_requests=10, window_seconds=3600):
        """Get remaining requests for IP"""
        now = time.time()
        self.requests[ip] = [t for t in self.requests[ip] if now - t < window_seconds]
        return max_requests - len(self.requests[ip])

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit(max_requests=10, window_seconds=3600):
    """Decorator for rate limiting API endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr or "unknown"
            
            if not rate_limiter.is_allowed(ip, max_requests, window_seconds):
                remaining = rate_limiter.get_remaining_requests(ip, max_requests, window_seconds)
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Please try again later.',
                    'remaining': remaining
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def order_rate_limit(max_daily=10, max_hourly=3):
    """Decorator for order creation rate limiting"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr or "unknown"
            
            can_order, message = rate_limiter.can_create_order(ip, max_daily, max_hourly)
            if not can_order:
                return jsonify({
                    'error': 'Order limit exceeded',
                    'message': message
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
