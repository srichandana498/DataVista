from kafka import KafkaConsumer
import json

latest_data = {}

consumer = KafkaConsumer(
    'hostel-data',
    bootstrap_servers='localhost:9092',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

for message in consumer:
    latest_data = message.value
    print("Updated:", latest_data)