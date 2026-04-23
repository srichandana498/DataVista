import json
import time
import random
import threading
import requests
from collections import deque, defaultdict
from datetime import datetime

# Global data storage (same as in app.py)
latest_message   = {}
message_history  = deque(maxlen=50)
expense_history  = deque(maxlen=20)
rating_history   = deque(maxlen=20)
complaint_counts = defaultdict(int)
category_counts  = defaultdict(int)
total_expense    = 0
message_count    = 0

def generate_data():
    """Generate simulated hostel data"""
    complaints = ["wifi", "water", "electricity"]
    categories = ["food", "travel", "shopping"]
    
    return {
        "complaint": random.choice(complaints),
        "expense": random.randint(100, 500),
        "category": random.choice(categories),
        "rating": random.randint(1, 5),
        "timestamp": datetime.now().strftime('%H:%M:%S')
    }

def update_data(data):
    """Update global data structures"""
    global latest_message, total_expense, message_count
    
    latest_message = data
    message_history.appendleft(data)
    expense_history.append(data['expense'])
    rating_history.append(data['rating'])
    complaint_counts[data['complaint']] += 1
    category_counts[data['category']] += 1
    total_expense += data['expense']
    message_count += 1
    
    print(f"[Simulator] Generated: {data}")

def simulate_data():
    """Run continuous data simulation"""
    while True:
        data = generate_data()
        update_data(data)
        time.sleep(2)  # Generate data every 2 seconds

# Start simulation in background thread
threading.Thread(target=simulate_data, daemon=True).start()

print("=== Data Simulator Started ===")
print("Generating simulated Kafka data every 2 seconds...")
print("Press Ctrl+C to stop")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nSimulator stopped")
