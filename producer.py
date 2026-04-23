from kafka import KafkaProducer
import json
import time
import random

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

complaints = ["wifi", "water", "electricity"]
categories = ["food", "travel", "shopping"]

while True:
    data = {
        "complaint": random.choice(complaints),
        "expense": random.randint(100, 500),
        "category": random.choice(categories),
        "rating": random.randint(1, 5)
    }

    producer.send("hostel-data", data)
    print("Sent:", data)

    time.sleep(2)