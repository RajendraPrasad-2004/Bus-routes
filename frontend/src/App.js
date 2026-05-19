import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import {
  getAllBuses, searchBuses, addBus, deleteBus,
  register as apiRegister, login as apiLogin,
  googleLogin, getMe,
} from './services/busApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

const BUS_TYPE_META = {
  ordinary: { label: 'Ordinary',  color: '#64748b', bg: '#f1f5f9', icon: '🚌', mult: '1×'  },
  express:  { label: 'Express',   color: '#2563eb', bg: '#eff6ff', icon: '🚍', mult: '1.2×' },
  ac:       { label: 'AC',        color: '#0891b2', bg: '#ecfeff', icon: '❄️', mult: '1.5×' },
  sleeper:  { label: 'Sleeper',   color: '#7c3aed', bg: '#f5f3ff', icon: '🛌', mult: '1.8×' },
  volvo:    { label: 'Volvo AC',  color: '#b45309', bg: '#fffbeb', icon: '⭐', mult: '2×'   },
};

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthCtx = React.createContext(null);
function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [authLoading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (token) {
      getMe().then(({ data }) => setUser(data.user))
              .catch(() => localStorage.removeItem('sb_token'))
              .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const loginUser  = (token, u) => { localStorage.setItem('sb_token', token); setUser(u); };
  const logoutUser = ()          => { localStorage.removeItem('sb_token');    setUser(null); };

  return <AuthCtx.Provider value={{ user, authLoading, loginUser, logoutUser }}>{children}</AuthCtx.Provider>;
}
const useAuth = () => React.useContext(AuthCtx);

// ─── Google Button ────────────────────────────────────────────────────────────
function GoogleBtn({ onSuccess, onError }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        try { const { data } = await googleLogin(credential); onSuccess(data); }
        catch (err) { onError(err.response?.data?.message || 'Google login failed'); }
      },
    });
    window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 340 });
  }, [onSuccess, onError]);
  return <div ref={ref} className="google-btn-wrap" />;
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ mode, onSwitch }) {
  const { loginUser } = useAuth();
  const [form, setForm]     = useState({ name: '', email: '', password: '', adminSecret: '' });
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');
  const isLogin = mode === 'login';

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault(); setLoad(true); setError('');
    try {
      const { data } = await (isLogin ? apiLogin(form) : apiRegister(form));
      loginUser(data.token, data.user);
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoad(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span className="auth-logo-icon">🚌</span><span className="auth-logo-text">SmartBus</span></div>
        <h1 className="auth-title">{isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-sub">{isLogin ? 'Sign in to continue' : 'Join SmartBus today'}</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && <div className="form-group"><label>Full Name</label><input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required /></div>}
          <div className="form-group"><label>Email</label><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required /></div>
          <div className="form-group"><label>Password</label><input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" required /></div>
          {!isLogin && <div className="form-group"><label>Admin Secret <span className="optional">(leave blank for regular account)</span></label><input name="adminSecret" type="password" value={form.adminSecret} onChange={handleChange} placeholder="Admin secret key" /></div>}
          <button type="submit" className="auth-submit-btn" disabled={loading}>{loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}</button>
        </form>
        <div className="auth-divider"><span>or continue with</span></div>
        <GoogleBtn onSuccess={d => loginUser(d.token, d.user)} onError={setError} />
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button className="link-btn" onClick={onSwitch}>{isLogin ? 'Sign up' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ activeTab, setActiveTab }) {
  const { user, logoutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
        <span className="brand-icon">🚌</span><span className="brand-text">SmartBus</span>
      </div>
      <div className="navbar-links">
        <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</button>
        {user?.role === 'admin' && <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin Panel</button>}
      </div>
      {user ? (
        <div className="user-menu" ref={ref} onClick={() => setOpen(p => !p)}>
          {user.avatar ? <img src={user.avatar} alt={user.name} className="user-avatar" /> : <div className="user-initials">{user.name?.[0]?.toUpperCase()}</div>}
          <span className="user-name">{user.name}</span>
          {user.role === 'admin' && <span className="admin-badge">Admin</span>}
          {open && (
            <div className="user-dropdown">
              <div className="user-dropdown-info"><strong>{user.name}</strong><span>{user.email}</span></div>
              <button className="dropdown-logout" onClick={logoutUser}>Sign Out</button>
            </div>
          )}
        </div>
      ) : (
        <button className="nav-signin-btn" onClick={() => setActiveTab('login')}>Sign In</button>
      )}
    </nav>
  );
}

// ─── Price Badge ──────────────────────────────────────────────────────────────
function PriceBadge({ price, busType, big }) {
  const meta = BUS_TYPE_META[busType] || BUS_TYPE_META.ordinary;
  return (
    <div className={`price-badge ${big ? 'price-badge-big' : ''}`} style={{ '--badge-color': meta.color, '--badge-bg': meta.bg }}>
      <span className="price-icon">{meta.icon}</span>
      <div className="price-info">
        <span className="price-amount">₹{price?.toLocaleString('en-IN')}</span>
        {big && <span className="price-type-label">{meta.label}</span>}
      </div>
    </div>
  );
}

// ─── Fare Breakdown ───────────────────────────────────────────────────────────
function FareBreakdown({ matchInfo, bus }) {
  if (!matchInfo) return null;
  const meta = BUS_TYPE_META[bus.busType] || BUS_TYPE_META.ordinary;
  const baseSegmentPrice = Math.round(matchInfo.ticketPrice / (matchInfo.multiplier || 1));

  return (
    <div className="fare-breakdown">
      <div className="fare-title">💰 Fare Details</div>
      <div className="fare-row"><span>Segment fare</span><span>₹{baseSegmentPrice}</span></div>
      {matchInfo.multiplier > 1 && (
        <div className="fare-row fare-highlight">
          <span>{meta.label} surcharge ({meta.mult})</span>
          <span>+ ₹{matchInfo.ticketPrice - baseSegmentPrice}</span>
        </div>
      )}
      <div className="fare-row fare-total"><span>Total ticket price</span><span>₹{matchInfo.ticketPrice?.toLocaleString('en-IN')}</span></div>
      <div className="fare-note">
        <span className="bus-type-pill" style={{ background: meta.bg, color: meta.color }}>{meta.icon} {meta.label}</span>
        Full route price: ₹{bus.basePrice?.toLocaleString('en-IN')}
      </div>
    </div>
  );
}

// ─── Route Timeline ───────────────────────────────────────────────────────────
function RouteTimeline({ bus, searchFrom, searchTo }) {
  const fullRoute = [
    { name: bus.source, arrivalTime: bus.departureTime, priceFromPrev: 0 },
    ...(bus.stops || []).map(s => ({ name: s.name, arrivalTime: s.arrivalTime, priceFromPrev: s.priceFromPrev })),
    { name: bus.destination, arrivalTime: bus.arrivalTime, priceFromPrev: null },
  ];
  return (
    <div className="route-timeline">
      {fullRoute.map((stop, i) => {
        const isBoarding  = stop.name.toLowerCase() === (searchFrom || bus.source).toLowerCase();
        const isAlighting = stop.name.toLowerCase() === (searchTo   || bus.destination).toLowerCase();
        return (
          <div key={i} className={`timeline-stop ${isBoarding ? 'boarding' : ''} ${isAlighting ? 'alighting' : ''}`}>
            <div className="timeline-left">
              <div className={`timeline-dot ${isBoarding || isAlighting ? 'active-dot' : ''}`} />
              {i < fullRoute.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-left-info">
                <span className="timeline-stop-name">{stop.name}</span>
                <div className="timeline-tags">
                  {isBoarding  && <span className="board-tag">Board here</span>}
                  {isAlighting && <span className="alight-tag">Alight here</span>}
                  {stop.priceFromPrev > 0 && <span className="segment-price-tag">+₹{stop.priceFromPrev}</span>}
                </div>
              </div>
              <span className="timeline-time">{stop.arrivalTime}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bus Card ─────────────────────────────────────────────────────────────────
function BusCard({ bus, onDelete, showDelete, searchFrom, searchTo }) {
  const [expanded, setExpanded] = useState(false);
  const mi   = bus.matchInfo;
  const meta = BUS_TYPE_META[bus.busType] || BUS_TYPE_META.ordinary;

  return (
    <div className={`bus-card ${expanded ? 'expanded' : ''}`} style={{ '--card-accent': meta.color }}>
      {/* Header */}
      <div className="bus-card-header">
        <div className="bus-card-header-left">
          <span className="bus-number">#{bus.busNumber}</span>
          <span className="bus-type-chip" style={{ background: meta.bg, color: meta.color }}>{meta.icon} {meta.label}</span>
        </div>
        <div className="card-header-right">
          {bus.isReturn && <span className="return-badge">↩ Return</span>}
          {showDelete && <button className="delete-btn" onClick={() => onDelete(bus._id)}>✕</button>}
        </div>
      </div>

      {/* Route row */}
      <div className="bus-route">
        <div className="route-endpoint">
          <span className="route-city">{mi ? mi.boardingStop : bus.source}</span>
          <span className="route-time-small">{mi ? mi.boardingTime : bus.departureTime}</span>
        </div>
        <div className="route-middle">
          <div className="route-dots"><span /><span /><span /></div>
          {mi && <span className="route-duration-label">{(bus.stops?.length || 0) + 1} stop{bus.stops?.length !== 0 ? 's' : ''}</span>}
        </div>
        <div className="route-endpoint right-endpoint">
          <span className="route-city">{mi ? mi.alightingStop : bus.destination}</span>
          <span className="route-time-small">{mi ? mi.alightingTime : bus.arrivalTime}</span>
        </div>
      </div>

      {/* Ticket price highlight */}
      {mi && (
        <div className="ticket-price-row">
          <PriceBadge price={mi.ticketPrice} busType={bus.busType} big />
          {(mi.boardingStop !== bus.source || mi.alightingStop !== bus.destination) && (
            <span className="partial-route-note">Partial route · Full: ₹{bus.basePrice}</span>
          )}
        </div>
      )}
      {!mi && (
        <div className="ticket-price-row">
          <PriceBadge price={bus.basePrice} busType={bus.busType} big />
        </div>
      )}

      <button className="expand-btn" onClick={() => setExpanded(p => !p)}>
        {expanded ? '▲ Hide route & fare details' : '▼ Show route timeline & fare details'}
      </button>

      {expanded && (
        <>
          <RouteTimeline bus={bus} searchFrom={mi?.boardingStop || searchFrom} searchTo={mi?.alightingStop || searchTo} />
          <FareBreakdown matchInfo={mi} bus={bus} />
        </>
      )}
    </div>
  );
}

// ─── Bus List ─────────────────────────────────────────────────────────────────
function BusList({ title, buses, onDelete, showDelete, icon, searchFrom, searchTo }) {
  if (!buses?.length) return null;
  return (
    <div className="bus-list-section">
      <h2 className="section-title">
        <span>{icon}</span>{title}
        <span className="count-badge">{buses.length} bus{buses.length !== 1 ? 'es' : ''}</span>
      </h2>
      <div className="bus-grid">
        {buses.map(bus => (
          <BusCard key={bus._id} bus={bus} onDelete={onDelete} showDelete={showDelete} searchFrom={searchFrom} searchTo={searchTo} />
        ))}
      </div>
    </div>
  );
}

// ─── Hero Search ──────────────────────────────────────────────────────────────
function HeroSearch({ onSearch }) {
  const [source, setSrc] = useState('');
  const [dest,   setDst] = useState('');
  const swap = () => { setSrc(dest); setDst(source); };

  const handleSubmit = e => {
    e.preventDefault();
    if (source.trim() && dest.trim()) onSearch(source.trim(), dest.trim());
  };

  return (
    <div className="hero">
      <div className="hero-overlay" />
      <div className="hero-bus-illustration">
        <svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg" className="bus-svg">
          <rect x="50" y="80" width="700" height="160" rx="20" fill="#1a56db" opacity="0.9"/>
          <rect x="70" y="60" width="640" height="120" rx="15" fill="#1e40af"/>
          <rect x="90" y="75" width="80" height="80" rx="8" fill="#93c5fd" opacity="0.8"/>
          <rect x="185" y="75" width="80" height="80" rx="8" fill="#93c5fd" opacity="0.8"/>
          <rect x="280" y="75" width="80" height="80" rx="8" fill="#93c5fd" opacity="0.8"/>
          <rect x="375" y="75" width="80" height="80" rx="8" fill="#93c5fd" opacity="0.8"/>
          <rect x="470" y="75" width="80" height="80" rx="8" fill="#bfdbfe" opacity="0.9"/>
          <rect x="565" y="75" width="120" height="80" rx="8" fill="#1d4ed8"/>
          <circle cx="160" cy="250" r="35" fill="#1e293b"/><circle cx="160" cy="250" r="20" fill="#475569"/>
          <circle cx="640" cy="250" r="35" fill="#1e293b"/><circle cx="640" cy="250" r="20" fill="#475569"/>
          <rect x="50" y="200" width="700" height="10" rx="5" fill="#1d4ed8"/>
          <rect x="720" y="100" width="30" height="60" rx="5" fill="#f59e0b"/>
          <text x="565" y="108" fill="#60a5fa" fontSize="11" fontFamily="monospace">SMARTBUS</text>
          <line x1="0" y1="285" x2="800" y2="285" stroke="#3b82f6" strokeWidth="2" strokeDasharray="20,10" opacity="0.4"/>
        </svg>
      </div>
      <div className="hero-content">
        <h1 className="hero-title">Smart Bus <span className="hero-accent">Timing</span> & Route System</h1>
        <p className="hero-subtitle">Search by city or stop · Per-stop timings · Instant fare calculation</p>
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-inputs">
            <div className="input-group">
              <span className="input-icon">📍</span>
              <input type="text" placeholder="From (city or stop)" value={source} onChange={e => setSrc(e.target.value)} className="search-input" />
            </div>
            <button type="button" className="swap-btn" onClick={swap} title="Swap">⇄</button>
            <div className="input-group">
              <span className="input-icon">🏁</span>
              <input type="text" placeholder="To (city or stop)" value={dest} onChange={e => setDst(e.target.value)} className="search-input" />
            </div>
            <button type="submit" className="search-btn">Search Buses</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage() {
  const [outbound,    setOut]    = useState([]);
  const [returnBuses, setRet]    = useState([]);
  const [searched,    setSearch] = useState(false);
  const [loading,     setLoad]   = useState(false);
  const [error,       setError]  = useState('');
  const [meta,        setMeta]   = useState({ source: '', destination: '' });

  const handleSearch = async (source, destination) => {
    setLoad(true); setError('');
    try {
      const { data } = await searchBuses(source, destination);
      setOut(data.outbound || []);
      setRet(data.return   || []);
      setMeta({ source, destination });
      setSearch(true);
    } catch { setError('Could not reach the server. Make sure the backend is running.'); }
    finally  { setLoad(false); }
  };

  const minOutPrice = outbound.length ? Math.min(...outbound.map(b => b.matchInfo?.ticketPrice || b.basePrice)) : null;
  const minRetPrice = returnBuses.length ? Math.min(...returnBuses.map(b => b.matchInfo?.ticketPrice || b.basePrice)) : null;

  return (
    <div className="home-page">
      <HeroSearch onSearch={handleSearch} />
      <div className="results-container">
        {loading && <div className="loading-state"><div className="spinner" /><p>Searching buses & calculating fares…</p></div>}
        {error   && <div className="error-banner">{error}</div>}

        {searched && !loading && (
          outbound.length === 0 && returnBuses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🚌</span>
              <h3>No buses found</h3>
              <p>No routes between <strong>{meta.source}</strong> and <strong>{meta.destination}</strong></p>
              <p className="empty-hint">Try an intermediate stop like "Vellore" or "Chittoor"</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="search-summary">
                <div className="summary-item">
                  <span className="summary-label">Outbound buses</span>
                  <span className="summary-val">{outbound.length}</span>
                </div>
                {minOutPrice && <div className="summary-item"><span className="summary-label">Lowest fare</span><span className="summary-val green">₹{minOutPrice}</span></div>}
                <div className="summary-divider" />
                <div className="summary-item"><span className="summary-label">Return buses</span><span className="summary-val">{returnBuses.length}</span></div>
                {minRetPrice && <div className="summary-item"><span className="summary-label">Lowest return fare</span><span className="summary-val green">₹{minRetPrice}</span></div>}
              </div>

              <BusList title={`${meta.source} → ${meta.destination}`} buses={outbound}
                icon="🟢" showDelete={false} searchFrom={meta.source} searchTo={meta.destination} />
              <BusList title={`${meta.destination} → ${meta.source}`} buses={returnBuses}
                icon="🔵" showDelete={false} searchFrom={meta.destination} searchTo={meta.source} />
            </>
          )
        )}

        {!searched && !loading && (
          <div className="welcome-section">
            <div className="feature-grid">
              {[
                { icon: '🔍', title: 'Search Any Stop',    desc: 'Search by city name or any intermediate stop' },
                { icon: '💰', title: 'Instant Fare Calc',  desc: 'Ticket price auto-calculated for your exact journey segment' },
                { icon: '⏱️', title: 'Per-Stop Timings',  desc: 'Exact arrival time at every stop along the route' },
                { icon: '🔄', title: 'Return Routes',      desc: 'Return buses auto-shown with separate fares' },
              ].map(f => (
                <div key={f.title} className="feature-card">
                  <span className="feature-icon">{f.icon}</span>
                  <h3>{f.title}</h3><p>{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="bus-types-legend">
              <h3 className="legend-title">Bus Types & Fare Multipliers</h3>
              <div className="legend-grid">
                {Object.entries(BUS_TYPE_META).map(([k, v]) => (
                  <div key={k} className="legend-item" style={{ background: v.bg, color: v.color, border: `1px solid ${v.color}22` }}>
                    <span className="legend-icon">{v.icon}</span>
                    <span className="legend-name">{v.label}</span>
                    <span className="legend-mult">{v.mult}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Bus Form (Admin) ─────────────────────────────────────────────────────
function AddBusForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ busNumber: '', source: '', destination: '', departureTime: '', arrivalTime: '', basePrice: '', busType: 'ordinary' });
  const [stops, setStops]       = useState([{ name: '', arrivalTime: '', priceFromPrev: '' }]);
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState('');

  const fc = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const sc = (idx, f, v) => setStops(p => p.map((s, i) => i === idx ? { ...s, [f]: v } : s));
  const addStop    = () => setStops(p => [...p, { name: '', arrivalTime: '', priceFromPrev: '' }]);
  const removeStop = idx => setStops(p => p.filter((_, i) => i !== idx));

  const handleSubmit = async e => {
    e.preventDefault(); setSub(true); setError('');
    try {
      const validStops = stops.filter(s => s.name.trim()).map(s => ({
        name: s.name.trim(), arrivalTime: s.arrivalTime.trim(),
        priceFromPrev: Number(s.priceFromPrev) || 0,
      }));
      await addBus({ ...form, basePrice: Number(form.basePrice), stops: validStops });
      onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed to add bus'); }
    finally { setSub(false); }
  };

  const meta = BUS_TYPE_META[form.busType] || BUS_TYPE_META.ordinary;

  return (
    <div className="add-bus-form-card">
      <div className="form-card-header">
        <h2 className="form-title">Add New Bus Route</h2>
        <button className="cancel-btn" onClick={onCancel}>✕ Cancel</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} className="add-bus-form">
        <div className="form-row">
          <div className="form-group"><label>Bus Number *</label><input name="busNumber" value={form.busNumber} onChange={fc} placeholder="e.g. AP-1234" required /></div>
          <div className="form-group"><label>Source *</label><input name="source" value={form.source} onChange={fc} placeholder="e.g. Tirupati" required /></div>
          <div className="form-group"><label>Destination *</label><input name="destination" value={form.destination} onChange={fc} placeholder="e.g. Chennai" required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Departure Time *</label><input name="departureTime" value={form.departureTime} onChange={fc} placeholder="06:00 AM" required /></div>
          <div className="form-group"><label>Final Arrival Time *</label><input name="arrivalTime" value={form.arrivalTime} onChange={fc} placeholder="10:30 AM" required /></div>
        </div>

        {/* Pricing row */}
        <div className="pricing-config-row">
          <div className="form-group flex1">
            <label>Base Price (₹) — Full route fare *</label>
            <div className="price-input-wrap">
              <span className="price-rupee">₹</span>
              <input name="basePrice" type="number" min="0" value={form.basePrice} onChange={fc} placeholder="e.g. 320" required className="price-input" />
            </div>
          </div>
          <div className="form-group">
            <label>Bus Type</label>
            <select name="busType" value={form.busType} onChange={fc} className="bustype-select">
              {Object.entries(BUS_TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label} ({v.mult})</option>
              ))}
            </select>
          </div>
          <div className="bustype-preview" style={{ background: meta.bg, color: meta.color }}>
            <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
            <div>
              <div style={{ fontWeight: 700 }}>{meta.label}</div>
              <div style={{ fontSize: '0.78rem' }}>Multiplier: {meta.mult}</div>
              {form.basePrice && <div style={{ fontWeight: 700, marginTop: 2 }}>Effective: ₹{Math.round(Number(form.basePrice) * parseFloat(meta.mult))}</div>}
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="stops-section">
          <div className="stops-header">
            <div>
              <h3>Intermediate Stops</h3>
              <p className="stops-hint">Set per-segment price for precise fare calculation at each stop</p>
            </div>
            <button type="button" className="add-stop-btn" onClick={addStop}>+ Add Stop</button>
          </div>
          {stops.map((stop, idx) => (
            <div key={idx} className="stop-row">
              <span className="stop-seq">{idx + 1}</span>
              <div className="form-group flex1"><input value={stop.name} onChange={e => sc(idx, 'name', e.target.value)} placeholder="Stop name (e.g. Vellore)" /></div>
              <div className="form-group stop-time-col"><input value={stop.arrivalTime} onChange={e => sc(idx, 'arrivalTime', e.target.value)} placeholder="Arrival (e.g. 08:30 AM)" /></div>
              <div className="form-group stop-price-col">
                <div className="price-input-wrap">
                  <span className="price-rupee">₹</span>
                  <input type="number" min="0" value={stop.priceFromPrev} onChange={e => sc(idx, 'priceFromPrev', e.target.value)} placeholder="Price from prev stop" className="price-input" />
                </div>
              </div>
              {stops.length > 1 && <button type="button" className="remove-stop-btn" onClick={() => removeStop(idx)}>✕</button>}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <p className="return-note">🔄 A return trip will be auto-created with same fares</p>
          <button type="submit" className="submit-btn" disabled={submitting}>{submitting ? 'Adding…' : 'Add Bus Route'}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel() {
  const [buses,     setBuses]   = useState([]);
  const [loading,   setLoad]    = useState(true);
  const [error,     setError]   = useState('');
  const [success,   setSuccess] = useState('');
  const [showForm,  setForm]    = useState(false);
  const [filter,    setFilter]  = useState('');
  const [typeFilter,setTypeF]   = useState('all');

  const fetchBuses = useCallback(async () => {
    setLoad(true);
    try { const { data } = await getAllBuses(); setBuses(data.data || []); }
    catch { setError('Failed to load buses.'); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  const handleDelete = async id => {
    if (!window.confirm('Delete this bus and its return trip?')) return;
    try { await deleteBus(id); setSuccess('Bus deleted.'); fetchBuses(); setTimeout(() => setSuccess(''), 3000); }
    catch { setError('Failed to delete.'); }
  };

  const mainBuses = buses.filter(b => !b.isReturn);
  const filtered  = buses.filter(b =>
    (!filter || b.busNumber.toLowerCase().includes(filter.toLowerCase()) ||
      b.source.toLowerCase().includes(filter.toLowerCase()) ||
      b.destination.toLowerCase().includes(filter.toLowerCase())) &&
    (typeFilter === 'all' || b.busType === typeFilter)
  );

  const totalRevenuePotential = mainBuses.reduce((a, b) => a + (b.basePrice || 0), 0);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div><h1 className="admin-title">Admin Panel</h1><p className="admin-subtitle">Manage routes, schedules & fare pricing</p></div>
        <button className="add-bus-btn" onClick={() => setForm(p => !p)}>{showForm ? '✕ Cancel' : '+ Add Bus Route'}</button>
      </div>

      {error   && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      {showForm && <AddBusForm onSuccess={() => { setForm(false); setSuccess('Bus & return trip created!'); fetchBuses(); setTimeout(() => setSuccess(''), 3000); }} onCancel={() => setForm(false)} />}

      <div className="admin-stats">
        <div className="stat-card"><span className="stat-number">{mainBuses.length}</span><span className="stat-label">Routes</span></div>
        <div className="stat-card"><span className="stat-number">{buses.filter(b => b.isReturn).length}</span><span className="stat-label">Return Trips</span></div>
        <div className="stat-card"><span className="stat-number">{new Set(buses.map(b => b.source)).size}</span><span className="stat-label">Cities</span></div>
        <div className="stat-card"><span className="stat-number">{buses.reduce((a, b) => a + (b.stops?.length || 0), 0)}</span><span className="stat-label">Total Stops</span></div>
        <div className="stat-card stat-card-green"><span className="stat-number">₹{Math.min(...mainBuses.map(b => b.basePrice || 0)) || 0}</span><span className="stat-label">Min Fare</span></div>
        <div className="stat-card stat-card-blue"><span className="stat-number">₹{Math.max(...mainBuses.map(b => b.basePrice || 0)) || 0}</span><span className="stat-label">Max Fare</span></div>
      </div>

      <div className="table-filters-row">
        <input className="table-filter" placeholder="🔍  Filter by bus no., source, destination…" value={filter} onChange={e => setFilter(e.target.value)} />
        <select className="type-filter-select" value={typeFilter} onChange={e => setTypeF(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(BUS_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading buses…</p></div>
      ) : (
        <div className="admin-bus-table">
          <table>
            <thead>
              <tr><th>Bus No.</th><th>Type</th><th>Source</th><th>Destination</th><th>Departs</th><th>Arrives</th><th>Base Fare</th><th>Stops & Prices</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9" className="empty-row">No buses found.</td></tr>
              ) : filtered.map(bus => {
                const meta = BUS_TYPE_META[bus.busType] || BUS_TYPE_META.ordinary;
                return (
                  <tr key={bus._id}>
                    <td><strong>{bus.busNumber}</strong>{bus.isReturn && <span className="return-badge-sm ml4">↩</span>}</td>
                    <td><span className="bustype-chip" style={{ background: meta.bg, color: meta.color }}>{meta.icon} {meta.label}</span></td>
                    <td>{bus.source}</td>
                    <td>{bus.destination}</td>
                    <td>{bus.departureTime}</td>
                    <td>{bus.arrivalTime}</td>
                    <td><span className="fare-chip">₹{bus.basePrice?.toLocaleString('en-IN')}</span></td>
                    <td>
                      <div className="stops-cell">
                        {bus.stops?.length > 0
                          ? bus.stops.map((s, i) => (
                            <span key={i} className="stop-badge small" title={`Arrives: ${s.arrivalTime}`}>
                              {s.name}{s.priceFromPrev > 0 && <span className="stop-price-sup"> +₹{s.priceFromPrev}</span>}
                            </span>
                          ))
                          : <span className="no-stops">—</span>}
                      </div>
                    </td>
                    <td><button className="delete-btn-table" onClick={() => handleDelete(bus._id)}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function AppInner() {
  const { user, authLoading } = useAuth();
  const [activeTab, setTab] = useState('home');

  useEffect(() => {
    const s = document.createElement('script');
    s.src   = 'https://accounts.google.com/gsi/client';
    s.async = true;
    document.head.appendChild(s);
    return () => document.head.contains(s) && document.head.removeChild(s);
  }, []);

  if (authLoading) return (
    <div className="full-loading"><div className="spinner large" /><p>Loading SmartBus…</p></div>
  );

  if (activeTab === 'login' || activeTab === 'register') {
    return <AuthPage mode={activeTab === 'login' ? 'login' : 'register'} onSwitch={() => setTab(activeTab === 'login' ? 'register' : 'login')} />;
  }

  return (
    <div className="app">
      <Navbar activeTab={activeTab} setActiveTab={setTab} />
      <main>{activeTab === 'admin' && user?.role === 'admin' ? <AdminPanel /> : <HomePage />}</main>
      <footer className="footer"><p>© 2024 SmartBus — Smart Bus Timing, Route & Fare System</p></footer>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
