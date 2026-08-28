
import sys
import os

try:
    print("Attempting to import app...")
    from app import app
    print("App imported successfully.")
    
    with app.test_request_context('/api/chat', method='POST', json={"message": "show trends"}):
        print("Simulating request...")
        from flask import request
        from app import chat
        
        # Manually call the view function
        response = chat()
        print(f"Response Status: {response[1]}")
        print(f"Response Body: {response[0].get_data(as_text=True)}")

except Exception as e:
    import traceback
    print("\nCRITICAL FAILURE:")
    traceback.print_exc()
