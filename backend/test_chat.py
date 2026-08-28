#!/usr/bin/env python
import sys
sys.path.insert(0, '/app')

from app import app

with app.test_client() as client:
    response = client.post('/api/chat', json={"message": "show trends"})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.data.decode()}")
