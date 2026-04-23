from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import json, threading, time, random
from collections import deque, defaultdict
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ─── In-memory storage (acts as our database) ───────────────
latest_message   = {}
message_history  = deque(maxlen=50)   # last 50 messages
expense_history  = deque(maxlen=20)   # last 20 expenses for chart
rating_history   = deque(maxlen=20)   # last 20 ratings
complaint_counts = defaultdict(int)   # wifi, water, electricity
category_counts  = defaultdict(int)   # food, travel, shopping
total_expense    = 0
message_count    = 0
start_time       = time.time()
kafka_connected  = False

# Room management system
rooms = {
    101: {"status": "Occupied", "student": "Rahul Kumar"},
    102: {"status": "Occupied", "student": "Priya Sharma"},
    103: {"status": "Available", "student": None},
    104: {"status": "Occupied", "student": "Amit Patel"},
    105: {"status": "Maintenance", "student": None},
    106: {"status": "Available", "student": None},
    107: {"status": "Occupied", "student": "Sneha Reddy"},
    108: {"status": "Available", "student": None},
    109: {"status": "Occupied", "student": "Vikram Singh"},
    110: {"status": "Available", "student": None},
    111: {"status": "Occupied", "student": "Anjali Gupta"},
    112: {"status": "Available", "student": None},
    113: {"status": "Occupied", "student": "Rohit Verma"},
    114: {"status": "Available", "student": None},
    115: {"status": "Occupied", "student": "Kavita Nair"},
    116: {"status": "Available", "student": None}
}

# ─── Kafka Consumer (runs in background thread) ─────────────
def consume_kafka():
    global latest_message, total_expense, message_count, kafka_connected
    try:
        consumer = KafkaConsumer(
            'hostel-data',
            bootstrap_servers='localhost:9092',
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            auto_offset_reset='latest',
            enable_auto_commit=True
        )
        for message in consumer:
            data = message.value
            data['timestamp'] = datetime.now().strftime('%H:%M:%S')
            latest_message = data
            message_history.appendleft(data)
            expense_history.append(data['expense'])
            rating_history.append(data['rating'])
            complaint_counts[data['complaint']] += 1
            category_counts[data['category']]   += 1
            total_expense  += data['expense']
            message_count  += 1
            print(f"[Kafka] Received: {data}")
    except Exception as e:
        print(f"[Kafka] Not connected, using simulated data. Error: {e}")

threading.Thread(target=consume_kafka, daemon=True).start()

# Fallback data generator when Kafka is not available
def generate_fallback_data():
    global latest_message, total_expense, message_count, kafka_connected
    complaints = ["wifi", "water", "electricity"]
    categories = ["food", "travel", "shopping"]
    
    while True:
        if not kafka_connected:
            data = {
                "complaint": random.choice(complaints),
                "expense": random.randint(100, 500),
                "category": random.choice(categories),
                "rating": random.randint(1, 5),
                "timestamp": datetime.now().strftime('%H:%M:%S')
            }
            latest_message = data
            message_history.appendleft(data)
            expense_history.append(data['expense'])
            rating_history.append(data['rating'])
            complaint_counts[data['complaint']] += 1
            category_counts[data['category']] += 1
            total_expense += data['expense']
            message_count += 1
            print(f"[Fallback] Generated: {data}")
        time.sleep(2)

threading.Thread(target=generate_fallback_data, daemon=True).start()

# ─── API ROUTES ─────────────────────────────────────────────

# 0. Root route - show available endpoints
@app.route('/')
def index():
    """Show available API endpoints"""
    return jsonify({
        "message": "DataVista API Server",
        "endpoints": {
            "GET /api/latest": "Latest Kafka message",
            "GET /api/dashboard": "Full dashboard stats", 
            "GET /api/messages": "Message history",
            "GET /api/complaints": "Complaint breakdown",
            "GET /api/finance": "Finance summary",
            "GET /api/rooms": "Room status",
            "GET /api/health": "Health check",
            "POST /api/complaints/add": "Add complaint"
        },
        "status": "running",
        "data_source": "fallback simulator (Kafka not connected)"
    })

# 1. Latest single message from Kafka
@app.route('/api/latest')
def get_latest():
    """Returns the most recent Kafka message"""
    return jsonify(latest_message if latest_message else {
        "complaint": "none", "expense": 0,
        "category": "none",  "rating": 0,
        "timestamp": datetime.now().strftime('%H:%M:%S')
    })

# 2. Dashboard summary — all stats in one call
@app.route('/api/dashboard')
def get_dashboard():
    """Returns aggregated stats for the dashboard"""
    avg_rating = (
        round(sum(rating_history) / len(rating_history), 1)
        if rating_history else 0
    )
    uptime = round(time.time() - start_time)
    return jsonify({
        "total_expense":  total_expense,
        "avg_rating":     avg_rating,
        "message_count":  message_count,
        "uptime_seconds": uptime,
        "complaints":     dict(complaint_counts),
        "categories":     dict(category_counts),
        "expense_trend":  list(expense_history),
        "rating_trend":   list(rating_history),
    })

# 3. Message history (last N messages)
@app.route('/api/messages')
def get_messages():
    """Returns last N messages. Use ?limit=20 to control count"""
    limit = request.args.get('limit', 20, type=int)
    return jsonify({
        "messages": list(message_history)[:limit],
        "total":    message_count
    })

# 4. Complaints breakdown
@app.route('/api/complaints')
def get_complaints():
    """Returns complaint counts and percentages"""
    total = sum(complaint_counts.values()) or 1
    breakdown = {
        k: {"count": v, "percent": round(v / total * 100, 1)}
        for k, v in complaint_counts.items()
    }
    return jsonify({
        "breakdown":    breakdown,
        "total_count":  sum(complaint_counts.values()),
        "worst":        max(complaint_counts, key=complaint_counts.get, default="none")
    })

# 5. Finance / expense breakdown
@app.route('/api/finance')
def get_finance():
    """Returns spending by category"""
    return jsonify({
        "by_category":    dict(category_counts),
        "total_expense":  total_expense,
        "avg_per_msg":    round(total_expense / message_count, 2) if message_count else 0,
        "expense_trend":  list(expense_history),
    })

# 6. Rooms status (using room management system)
@app.route('/api/rooms')
def get_rooms():
    """Returns room occupancy status"""
    room_list = [{"id": room_id, **room_data} for room_id, room_data in rooms.items()]
    return jsonify({
        "rooms":     room_list,
        "occupied":  sum(1 for r in rooms.values() if r["status"] == "Occupied"),
        "available": sum(1 for r in rooms.values() if r["status"] == "Available"),
    })

# 6a. Add new room
@app.route('/api/rooms/add', methods=['POST'])
def add_room():
    """Add a new room to the system"""
    data = request.get_json()
    room_number = data.get('room_number')
    
    if not room_number or room_number in rooms:
        return jsonify({"success": False, "message": "Invalid or duplicate room number"}), 400
    
    rooms[room_number] = {"status": "Available", "student": None}
    return jsonify({"success": True, "message": f"Room {room_number} added successfully"})

# 6b. Update room status and assign student
@app.route('/api/rooms/<int:room_id>/update', methods=['PUT'])
def update_room(room_id):
    """Update room status and assign/remove student"""
    if room_id not in rooms:
        return jsonify({"success": False, "message": "Room not found"}), 404
    
    data = request.get_json()
    status = data.get('status')
    student = data.get('student')
    
    if status in ['Occupied', 'Available', 'Maintenance']:
        rooms[room_id]['status'] = status
        
        # Auto-manage student based on status
        if status == 'Occupied' and student:
            rooms[room_id]['student'] = student
        elif status in ['Available', 'Maintenance']:
            rooms[room_id]['student'] = None
        elif status == 'Occupied' and not student:
            return jsonify({"success": False, "message": "Student name required for occupied room"}), 400
            
        return jsonify({"success": True, "message": f"Room {room_id} updated successfully"})
    
    return jsonify({"success": False, "message": "Invalid status"}), 400

# 6c. Remove room
@app.route('/api/rooms/<int:room_id>/remove', methods=['DELETE'])
def remove_room(room_id):
    """Remove a room from the system"""
    if room_id not in rooms:
        return jsonify({"success": False, "message": "Room not found"}), 404
    
    if rooms[room_id]['status'] == 'Occupied':
        return jsonify({"success": False, "message": "Cannot remove occupied room"}), 400
    
    del rooms[room_id]
    return jsonify({"success": True, "message": f"Room {room_id} removed successfully"})

# 7. Health check — to verify API is running
@app.route('/api/health')
def health():
    """Simple health check endpoint"""
    return jsonify({
        "status":   "ok",
        "uptime":   round(time.time() - start_time),
        "messages": message_count,
        "kafka":    bool(latest_message)
    })

# 8. Dashboard HTML page
@app.route('/dashboard')
def dashboard():
    """Serve the HTML dashboard"""
    return render_template('dashboard.html')

# 9. Add a manual complaint (POST)
@app.route('/api/complaints/add', methods=['POST'])
def add_complaint():
    """Manually submit a complaint via POST"""
    data = request.get_json()
    complaint_type = data.get('type', 'wifi')
    complaint_counts[complaint_type] += 1
    message_count_ref = message_count
    return jsonify({"success": True, "message": f"Complaint '{complaint_type}' recorded"})

if __name__ == '__main__':
    print("=== DataVista API Server ===")
    print("Endpoints:")
    print("  GET  /api/latest        - latest Kafka message")
    print("  GET  /api/dashboard     - full dashboard stats")
    print("  GET  /api/messages      - message history")
    print("  GET  /api/complaints    - complaint breakdown")
    print("  GET  /api/finance       - finance summary")
    print("  GET  /api/rooms         - room status")
    print("  GET  /api/health        - health check")
    print("  POST /api/complaints/add - add complaint")
    print("==========================")
    app.run(port=5000, debug=True)
