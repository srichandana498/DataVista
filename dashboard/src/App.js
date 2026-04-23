import React, { useEffect, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Filler
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Filler
);

const API = "http://localhost:5000/api";

function stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

const lineOpts = (min, max) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  elements: { point: { radius: 0 }, line: { tension: 0.4 } },
  scales: {
    x: { display: false },
    y: { min, max, grid: { color: "#1e2d45", lineWidth: 0.5 }, ticks: { color: "#64748b", font: { size: 10 } }, border: { display: false } },
  },
  animation: { duration: 300 },
});

const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "65%", animation: { duration: 400 } };

const barOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false, stacked: true },
    y: { stacked: true, grid: { color: "#1e2d45", lineWidth: 0.5 }, ticks: { color: "#64748b", font: { size: 10 } }, border: { display: false } },
  },
  animation: { duration: 300 },
};

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function LiveDot({ connected }) {
  return (
    <div className="live-badge" style={!connected ? { color: "#f87171", background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.2)" } : {}}>
      <span className="live-dot" style={!connected ? { background: "#f87171" } : {}} />
      {connected ? "LIVE · Kafka" : "API OFFLINE"}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  EDIT ROOM MODAL
// ══════════════════════════════════════════════════════
function EditRoomModal({ room, onClose, onSave, onDelete }) {
  const [status,  setStatus]  = useState(room.status);
  const [student, setStudent] = useState(room.student || "");
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(false);
  const [error,   setError]   = useState("");

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (status === "Occupied" && !student.trim()) {
      setError("Student name is required for Occupied status.");
      return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/rooms/${room.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, student: student.trim() || null }),
      });
      const json = await res.json();
      if (json.success) { onSave(); onClose(); }
      else setError(json.message || "Update failed");
    } catch { setError("Cannot reach server."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete Room ${room.id}? This cannot be undone.`)) return;
    setDeleting(true); setError("");
    try {
      const res = await fetch(`${API}/rooms/${room.id}/remove`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { onDelete(); onClose(); }
      else setError(json.message || "Delete failed");
    } catch { setError("Cannot reach server."); }
    finally { setDeleting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Edit Room {room.id}</h2>

        <div className="modal-field">
          <label className="modal-label">Room Number</label>
          <input className="modal-input" value={room.id} disabled />
        </div>

        <div className="modal-field">
          <label className="modal-label">Status</label>
          <select
            className="modal-select"
            value={status}
            onChange={e => { setStatus(e.target.value); setError(""); }}
          >
            <option value="Occupied">Occupied</option>
            <option value="Available">Available</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        {status === "Occupied" && (
          <div className="modal-field">
            <label className="modal-label">Student Name</label>
            <input
              className="modal-input"
              placeholder="e.g. Priya Sharma"
              value={student}
              onChange={e => { setStudent(e.target.value); setError(""); }}
              autoFocus
            />
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="modal-btn save"   onClick={handleSave}   disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="modal-btn delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  ADD ROOM MODAL
// ══════════════════════════════════════════════════════
function AddRoomModal({ onClose, onSave }) {
  const [roomNum, setRoomNum] = useState("");
  const [status,  setStatus]  = useState("Available");
  const [student, setStudent] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAdd = async () => {
    if (!roomNum.trim()) { setError("Room number is required."); return; }
    if (status === "Occupied" && !student.trim()) { setError("Student name required for Occupied."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/rooms/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_number: parseInt(roomNum), status, student: student.trim() || null }),
      });
      const json = await res.json();
      if (json.success) { onSave(); onClose(); }
      else setError(json.message || "Failed to add room");
    } catch { setError("Cannot reach server."); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Add New Room</h2>

        <div className="modal-field">
          <label className="modal-label">Room Number</label>
          <input className="modal-input" placeholder="e.g. 117" value={roomNum}
            onChange={e => { setRoomNum(e.target.value); setError(""); }} autoFocus />
        </div>

        <div className="modal-field">
          <label className="modal-label">Status</label>
          <select className="modal-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        {status === "Occupied" && (
          <div className="modal-field">
            <label className="modal-label">Student Name</label>
            <input className="modal-input" placeholder="e.g. Rahul Kumar" value={student}
              onChange={e => { setStudent(e.target.value); setError(""); }} />
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="modal-btn save"   onClick={handleAdd} disabled={saving}>
            {saving ? "Adding..." : "Add Room"}
          </button>
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ══════════════════════════════════════════════════════
function Dashboard({ data, connected }) {
  if (!data) return <div className="loading">Connecting to Flask API...</div>;
  const { total_expense = 0, avg_rating = 0, message_count = 0, complaints = {}, categories = {}, expense_trend = [], rating_trend = [] } = data;
  const totalC = Object.values(complaints).reduce((a, b) => a + b, 0) || 1;
  const bars = [
    { label: "WiFi",  val: complaints.wifi || 0,        color: "#38bdf8" },
    { label: "Water", val: complaints.water || 0,       color: "#34d399" },
    { label: "Elec",  val: complaints.electricity || 0, color: "#fbbf24" },
  ];
  return (
    <>
      <div className="topbar"><h1>Dashboard</h1><LiveDot connected={connected} /></div>
      <div className="grid4">
        <MetricCard label="Total Expense"    value={`₹${total_expense.toLocaleString("en-IN")}`} color="#38bdf8" sub="all transactions" />
        <MetricCard label="Avg Rating"       value={avg_rating} color="#fbbf24" sub={stars(Math.round(avg_rating))} />
        <MetricCard label="Total Complaints" value={totalC - 1} color="#f87171" sub="from Kafka stream" />
        <MetricCard label="Messages"         value={message_count} color="#34d399" sub="processed" />
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Expense Trend <span>GET /api/dashboard</span></div>
          <div style={{ position: "relative", height: 160 }}>
            <Line data={{ labels: expense_trend.map((_, i) => i), datasets: [{ data: expense_trend, borderColor: "#38bdf8", backgroundColor: "#38bdf815", fill: true, borderWidth: 1.5 }] }} options={lineOpts()} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Category Breakdown <span>live</span></div>
          <div style={{ position: "relative", height: 160 }}>
            <Doughnut data={{ labels: ["Food", "Travel", "Shopping"], datasets: [{ data: [categories.food || 0, categories.travel || 0, categories.shopping || 0], backgroundColor: ["#a78bfa", "#38bdf8", "#34d399"], borderWidth: 0 }] }} options={doughnutOpts} />
          </div>
        </div>
      </div>
      <div className="grid3">
        <div className="card">
          <div className="card-title">Complaint Distribution</div>
          {bars.map(b => (
            <div className="bar-row" key={b.label}>
              <span className="bar-label">{b.label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round(b.val / totalC * 100)}%`, background: b.color }} /></div>
              <span className="bar-val" style={{ color: b.color }}>{b.val}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Rating Trend</div>
          <div className="rating-big">{avg_rating} <span className="stars-sm">{stars(Math.round(avg_rating))}</span></div>
          <div style={{ position: "relative", height: 100 }}>
            <Line data={{ labels: rating_trend.map((_, i) => i), datasets: [{ data: rating_trend, borderColor: "#fbbf24", backgroundColor: "#fbbf2415", fill: true, borderWidth: 1.5 }] }} options={lineOpts(1, 5)} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">API Endpoints</div>
          {["/api/dashboard", "/api/messages", "/api/complaints", "/api/finance", "/api/rooms"].map(e => (
            <div className="api-row" key={e}>
              <span className={`api-dot ${connected ? "ok" : "err"}`} />
              <span className="mono small">{e}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  STREAM PAGE
// ══════════════════════════════════════════════════════
function Stream({ messages, total }) {
  return (
    <>
      <div className="topbar"><h1>Live Stream</h1><LiveDot connected={true} /></div>
      <div className="card">
        <div className="card-title">Raw Kafka Messages <span>{total} total · GET /api/messages</span></div>
        <table className="tbl">
          <thead><tr><th>#</th><th>Complaint</th><th>Expense</th><th>Category</th><th>Rating</th><th>Time</th></tr></thead>
          <tbody>
            {messages.map((m, i) => (
              <tr key={i}>
                <td className="mono muted">{total - i}</td>
                <td><span className={`badge badge-${m.complaint}`}>{m.complaint}</span></td>
                <td className="mono green">₹{m.expense}</td>
                <td><span className={`chip chip-${m.category}`}>{m.category}</span></td>
                <td className="amber">{stars(m.rating)}</td>
                <td className="mono muted small">{m.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  COMPLAINTS PAGE
// ══════════════════════════════════════════════════════
function Complaints({ data }) {
  const [form, setForm] = useState({ type: "wifi", submitting: false, msg: "" });
  const submit = async () => {
    setForm(f => ({ ...f, submitting: true }));
    try {
      const res = await fetch(`${API}/complaints/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: form.type }) });
      const json = await res.json();
      setForm(f => ({ ...f, submitting: false, msg: json.message }));
      setTimeout(() => setForm(f => ({ ...f, msg: "" })), 3000);
    } catch { setForm(f => ({ ...f, submitting: false, msg: "Error!" })); }
  };
  const b = data?.breakdown || {};
  return (
    <>
      <div className="topbar"><h1>Complaints</h1><LiveDot connected={true} /></div>
      <div className="grid3">
        <MetricCard label="WiFi Issues"        value={b.wifi?.count || 0}        color="#38bdf8" sub={`${b.wifi?.percent || 0}% of total`} />
        <MetricCard label="Water Issues"       value={b.water?.count || 0}       color="#34d399" sub={`${b.water?.percent || 0}% of total`} />
        <MetricCard label="Electricity Issues" value={b.electricity?.count || 0} color="#fbbf24" sub={`${b.electricity?.percent || 0}% of total`} />
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Summary <span>GET /api/complaints</span></div>
          <div className="metric-value" style={{ color: "#f87171", fontSize: 36, marginBottom: 8 }}>{data?.total_count || 0}</div>
          <div className="muted small">Worst: <span style={{ color: "#f87171" }}>{data?.worst || "—"}</span></div>
        </div>
        <div className="card">
          <div className="card-title">Submit Complaint <span>POST /api/complaints/add</span></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className="select-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="wifi">WiFi</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
            </select>
            <button className="btn-primary" onClick={submit} disabled={form.submitting}>{form.submitting ? "Submitting..." : "Submit"}</button>
            {form.msg && <span className="success-msg">{form.msg}</span>}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  FINANCE PAGE
// ══════════════════════════════════════════════════════
function Finance({ data, messages }) {
  if (!data) return <div className="loading">Loading...</div>;
  const { by_category = {}, total_expense = 0, avg_per_msg = 0 } = data;
  const buckets = messages.slice(0, 15).reverse().map(m => ({
    food: m.category === "food" ? m.expense : 0,
    travel: m.category === "travel" ? m.expense : 0,
    shopping: m.category === "shopping" ? m.expense : 0,
  }));
  return (
    <>
      <div className="topbar"><h1>Finance</h1><LiveDot connected={true} /></div>
      <div className="grid4">
        <MetricCard label="Food Spend"     value={`₹${(by_category.food || 0) * 170}`}     color="#a78bfa" />
        <MetricCard label="Travel Spend"   value={`₹${(by_category.travel || 0) * 220}`}   color="#38bdf8" />
        <MetricCard label="Shopping Spend" value={`₹${(by_category.shopping || 0) * 180}`} color="#34d399" />
        <MetricCard label="Total Spend"    value={`₹${total_expense.toLocaleString("en-IN")}`} color="#38bdf8" sub={`avg ₹${avg_per_msg}/msg`} />
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Spending Over Time <span>GET /api/finance</span></div>
          <div style={{ position: "relative", height: 200 }}>
            <Bar data={{ labels: buckets.map((_, i) => i), datasets: [{ label: "Food", data: buckets.map(b => b.food), backgroundColor: "#a78bfa88", borderRadius: 4 }, { label: "Travel", data: buckets.map(b => b.travel), backgroundColor: "#38bdf888", borderRadius: 4 }, { label: "Shopping", data: buckets.map(b => b.shopping), backgroundColor: "#34d39988", borderRadius: 4 }] }} options={barOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Recent Transactions</div>
          <table className="tbl">
            <thead><tr><th>Category</th><th>Amount</th><th>Time</th></tr></thead>
            <tbody>
              {messages.slice(0, 12).map((m, i) => (
                <tr key={i}>
                  <td><span className={`chip chip-${m.category}`}>{m.category}</span></td>
                  <td className="mono green">₹{m.expense}</td>
                  <td className="mono muted small">{m.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  ROOMS PAGE  ← THIS IS WHERE THE MODAL IS USED
// ══════════════════════════════════════════════════════
function Rooms({ data, onRefresh }) {
  const [editRoom,   setEditRoom]   = useState(null);  // room being edited
  const [showAdd,    setShowAdd]    = useState(false);  // add modal open?

  const rooms = data?.rooms || [];
  const statusColor = s => s === "Occupied" ? "#38bdf8" : s === "Available" ? "#34d399" : "#f87171";

  return (
    <>
      <div className="topbar">
        <h1>Rooms</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Room</button>
      </div>

      {/* Summary cards */}
      <div className="grid3" style={{ marginBottom: 20 }}>
        <MetricCard label="Occupied"    value={data?.occupied || 0}  color="#38bdf8" />
        <MetricCard label="Available"   value={data?.available || 0} color="#34d399" />
        <MetricCard label="Maintenance" value={rooms.filter(r => r.status === "Maintenance").length} color="#f87171" />
      </div>

      {/* Room cards — click any to open Edit modal */}
      <div className="grid4">
        {rooms.map(r => (
          <div
            className="room-card"
            key={r.id}
            onClick={() => setEditRoom(r)}
            title="Click to edit"
          >
            <div className="room-card-header">
              <div className="metric-label">Room {r.id}</div>
              <span className="room-edit-hint">✏️</span>
            </div>
            <div className="room-status-dot" style={{ background: statusColor(r.status) }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: statusColor(r.status) }}>{r.status}</div>
            {r.student && <div className="muted small" style={{ marginTop: 4 }}>{r.student}</div>}
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editRoom && (
        <EditRoomModal
          room={editRoom}
          onClose={() => setEditRoom(null)}
          onSave={onRefresh}
          onDelete={onRefresh}
        />
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <AddRoomModal
          onClose={() => setShowAdd(false)}
          onSave={onRefresh}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════
const NAV = [
  { id: "dashboard",  label: "Dashboard",  group: "Overview",   icon: "⊞" },
  { id: "stream",     label: "Live Stream", group: "Overview",   icon: "〜" },
  { id: "complaints", label: "Complaints",  group: "Management", icon: "◉" },
  { id: "finance",    label: "Finance",     group: "Management", icon: "₹" },
  { id: "rooms",      label: "Rooms",       group: "Management", icon: "⌂" },
];

export default function App() {
  const [page,          setPage]          = useState("dashboard");
  const [connected,     setConnected]     = useState(false);
  const [dashData,      setDashData]      = useState(null);
  const [messagesData,  setMessagesData]  = useState({ messages: [], total: 0 });
  const [complaintsData,setComplaintsData]= useState(null);
  const [financeData,   setFinanceData]   = useState(null);
  const [roomsData,     setRoomsData]     = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [dash, msgs, comp, fin, rooms] = await Promise.all([
        fetch(`${API}/dashboard`).then(r => r.json()),
        fetch(`${API}/messages?limit=30`).then(r => r.json()),
        fetch(`${API}/complaints`).then(r => r.json()),
        fetch(`${API}/finance`).then(r => r.json()),
        fetch(`${API}/rooms`).then(r => r.json()),
      ]);
      setDashData(dash); setMessagesData(msgs); setComplaintsData(comp);
      setFinanceData(fin); setRoomsData(rooms);
      setConnected(true);
    } catch { setConnected(false); }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const rooms = await fetch(`${API}/rooms`).then(r => r.json());
      setRoomsData(rooms);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 2000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const pages = {
    dashboard:  <Dashboard  data={dashData} connected={connected} />,
    stream:     <Stream     messages={messagesData.messages} total={messagesData.total} />,
    complaints: <Complaints data={complaintsData} />,
    finance:    <Finance    data={financeData} messages={messagesData.messages} />,
    rooms:      <Rooms      data={roomsData} onRefresh={fetchRooms} />,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo"><h2>DataVista</h2><span className="logo-sub">kafka · flask · react</span></div>
        {["Overview", "Management"].map(g => (
          <React.Fragment key={g}>
            <div className="nav-section">{g}</div>
            {NAV.filter(n => n.group === g).map(n => (
              <div key={n.id} className={`nav-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
                <span className="nav-icon">{n.icon}</span>{n.label}
              </div>
            ))}
          </React.Fragment>
        ))}
        <div style={{ marginTop: "auto", padding: "16px 20px" }}>
          <div className={`api-status-pill ${connected ? "ok" : "err"}`}>
            <span className="live-dot" style={{ background: connected ? "#34d399" : "#f87171", width: 5, height: 5 }} />
            {connected ? "API Connected" : "API Offline"}
          </div>
        </div>
      </aside>
      <main className="main">{pages[page]}</main>
    </div>
  );
}