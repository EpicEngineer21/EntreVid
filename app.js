// ============================================================
// Entrepreneur Video Directory — Main Server
// Express + EJS + JSON file persistence + Auth + Security
// ============================================================

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const crypto     = require('crypto');
const bodyParser = require('body-parser');
const session    = require('express-session');
const flash      = require('express-flash');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cors       = require('cors');

// DB and Models
const connectDB   = require('./src/config/db');
const User        = require('./src/models/User');
const Video       = require('./src/models/Video');
const Application = require('./src/models/Application');
const OTP         = require('./src/models/OTP');
const Audit       = require('./src/models/Audit');

const app  = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ── Environment flags ────────────────────────────────────────
const IS_PROD         = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim());
const ADMIN_EMAILS    = (process.env.ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// ── Audit logging ────────────────────────────────────────────
// Appends a structured entry to the MongoDB audit collection.
// NEVER logs passwords, OTPs, or full email addresses.
async function logAudit(eventType, { userId = null, email = null, ip = null, userAgent = null, meta = null } = {}) {
  try {
    await Audit.create({
      event: eventType,
      userId,
      email: email ? maskEmail(email) : null,
      ip,
      userAgent: userAgent ? String(userAgent).slice(0, 120) : null,
      meta,
    });
  } catch (e) {
    console.error('  ⚠️  Audit write failed:', e.message);
  }
}

// ── YouTube helpers ──────────────────────────────────────────
function isValidYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]{11}/.test(url);
}
function extractYouTubeId(url) {
  const patterns = [/youtube\.com\/watch\?v=([\w-]{11})/, /youtu\.be\/([\w-]{11})/, /youtube\.com\/embed\/([\w-]{11})/];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// ── ID generator ─────────────────────────────────────────────
function generateId(prefix = 'v') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Email mask ───────────────────────────────────────────────
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return local[0] + '***@' + domain;
  return local[0] + '***' + local[local.length - 1] + '@' + domain;
}

// ── Password policy ──────────────────────────────────────────
// Returns array of violation strings; empty = OK.
const PASSWORD_MIN_LEN = 8;
function validatePassword(pw) {
  const e = [];
  if (!pw || pw.length < PASSWORD_MIN_LEN)  e.push(`Password must be at least ${PASSWORD_MIN_LEN} characters.`);
  if (!/[A-Z]/.test(pw))                    e.push('Password must contain at least one uppercase letter.');
  if (!/[a-z]/.test(pw))                    e.push('Password must contain at least one lowercase letter.');
  if (!/[0-9]/.test(pw))                    e.push('Password must contain at least one number.');
  return e;
}

// ── Account lockout ──────────────────────────────────────────
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES   = 15;

function isAccountLocked(user) {
  return user.lockUntil ? new Date() < new Date(user.lockUntil) : false;
}
async function handleFailedLogin(user) {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
    user.lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    console.log(`  🔒  Account locked: ${maskEmail(user.email)}`);
  }
  await user.save();
}
async function resetFailedLogins(user) {
  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
}

// ── OTP helpers (hashed storage) ─────────────────────────────
const OTP_LENGTH         = 6;
const MAX_OTP_ATTEMPTS   = 5;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
const OTP_COOLDOWN_SECS  = parseInt(process.env.OTP_COOLDOWN_SECS,  10) || 60;

function hashOtp(otp) { return crypto.createHash('sha256').update(otp).digest('hex'); }
function generateOtp() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH);
  return crypto.randomInt(min, max).toString();
}

// Server-side cooldown check — prevents OTP flooding regardless of browser state
async function checkOtpCooldown(key) {
  const record = await OTP.findOne({ key });
  if (!record?.lastSentAt) return { ok: true };
  const elapsed = Math.floor((Date.now() - record.lastSentAt.getTime()) / 1000);
  return elapsed < OTP_COOLDOWN_SECS
    ? { ok: false, waitSeconds: OTP_COOLDOWN_SECS - elapsed }
    : { ok: true };
}

// Creates (or replaces) an OTP entry
async function createOtp(email, keyPrefix = '') {
  const otp       = generateOtp();
  const otpHash   = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const key       = keyPrefix + email.toLowerCase();
  
  await OTP.findOneAndUpdate(
    { key },
    { otpHash, expiresAt, attempts: 0, lastSentAt: new Date(), createdAt: new Date() },
    { upsert: true, new: true }
  );
  return otp;
}

async function verifyOtp(email, inputOtp, keyPrefix = '') {
  const key    = keyPrefix + email.toLowerCase();
  const record = await OTP.findOne({ key });

  if (!record) return { valid: false, error: 'No verification code found. Please request a new one.' };
  if (new Date() > record.expiresAt) {
    await OTP.deleteOne({ key });
    return { valid: false, error: 'Verification code has expired. Please request a new one.' };
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await OTP.deleteOne({ key });
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  if (hashOtp(inputOtp) !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    const rem = MAX_OTP_ATTEMPTS - record.attempts;
    return { valid: false, error: `Invalid code. ${rem} attempt${rem !== 1 ? 's' : ''} remaining.` };
  }

  await OTP.deleteOne({ key });
  return { valid: true };
}

// Namespaced wrappers so reset OTPs never clash with verify-email OTPs
const RESET_PREFIX = '__reset__';
const createResetOtp  = async (email)          => await createOtp(email, RESET_PREFIX);
const verifyResetOtp  = async (email, input)   => await verifyOtp(email, input, RESET_PREFIX);

// ── Email transporter (Brevo SMTP) ───────────────────────────
const EMAIL_FROM = (process.env.EMAIL_FROM || '').trim();
const SMTP_HOST  = (process.env.SMTP_HOST  || 'smtp-relay.brevo.com').trim();
const SMTP_PORT  = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER  = (process.env.SMTP_USER  || '').trim();
const SMTP_PASS  = (process.env.SMTP_PASS  || '').trim();

const EMAIL_CONFIGURED = Boolean(EMAIL_FROM) && Boolean(SMTP_USER) && Boolean(SMTP_PASS) && SMTP_PASS.length >= 10;
if (!EMAIL_CONFIGURED) console.warn('  ⚠️  Email not configured — set EMAIL_FROM, SMTP_USER, SMTP_PASS in .env');

const transporter = EMAIL_CONFIGURED
  ? nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: false, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;

function emailHtml(accentColor, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#0d0f1a;font-family:'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f1a;padding:40px 20px;">
      <tr><td align="center">
        <table width="100%" style="max-width:480px;background:#171a2e;border-radius:16px;border:1px solid #2d3250;overflow:hidden;">
          <tr><td style="height:4px;background:${accentColor};"></td></tr>
          <tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
          <tr><td style="border-top:1px solid #2d3250;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#4b5563;">If you didn't request this, you can safely ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function sendOtpEmail(toEmail, otpCode, fullName) {
  if (!EMAIL_CONFIGURED || !transporter) { console.error('  ❌  Email disabled'); return { success: false, error: 'Email not configured.' }; }
  const html = emailHtml('linear-gradient(90deg,#4c6ef5,#748ffc)', `
    <h1 style="margin:0 0 8px;font-size:22px;color:#fff;">Verify Your Email</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">Hey ${fullName}, use this code to verify your email.</p>
    <div style="background:#0d0f1a;border:1px solid #2d3250;border-radius:12px;padding:20px 32px;text-align:center;margin-bottom:24px;">
      <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#5c7cfa;font-family:'Courier New',monospace;">${otpCode}</span>
    </div>
    <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">⏱ Expires in <strong style="color:#9ca3af;">${OTP_EXPIRY_MINUTES} minutes</strong></p>
  `);
  try {
    const info = await transporter.sendMail({ from: `"EntreVid" <${EMAIL_FROM}>`, to: toEmail, subject: 'Verify Your Email — EntreVid', html });
    console.log(`  📧  Verify email sent — ${info.messageId}`);
    return { success: true };
  } catch (err) { console.error('  ❌  sendOtpEmail failed:', err.message); return { success: false, error: err.message }; }
}

async function sendPasswordResetEmail(toEmail, otpCode, fullName) {
  if (!EMAIL_CONFIGURED || !transporter) { console.error('  ❌  Email disabled'); return { success: false, error: 'Email not configured.' }; }
  const html = emailHtml('#f59e0b', `
    <h1 style="margin:0 0 8px;font-size:22px;color:#fff;">Password Reset</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">Hey ${fullName}, use this code to reset your password.</p>
    <div style="background:#0d0f1a;border:1px solid #2d3250;border-radius:12px;padding:20px 32px;text-align:center;margin-bottom:24px;">
      <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#f59e0b;font-family:'Courier New',monospace;">${otpCode}</span>
    </div>
    <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">⏱ Expires in <strong style="color:#9ca3af;">${OTP_EXPIRY_MINUTES} minutes</strong></p>
  `);
  try {
    const info = await transporter.sendMail({ from: `"EntreVid" <${EMAIL_FROM}>`, to: toEmail, subject: 'Reset Your Password — EntreVid', html });
    console.log(`  📧  Reset email sent — ${info.messageId}`);
    return { success: true };
  } catch (err) { console.error('  ❌  sendPasswordResetEmail failed:', err.message); return { success: false, error: err.message }; }
}

// ── Express setup ────────────────────────────────────────────
// Trust proxy when behind Nginx / cloud load-balancer (needed for req.ip + secure cookies)
if (IS_PROD) app.set('trust proxy', 1);

// ── Security headers (Helmet) ─────────────────────────────────
// CSP is tuned for EJS inline scripts, Google Fonts, YouTube embeds.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'https://img.youtube.com', 'https://i.ytimg.com'],
      frameSrc:    ['https://www.youtube.com'],
      connectSrc:  ["'self'"],
      objectSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // required for YouTube iframes
}));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // In dev: allow requests with no origin (same-tab, file://, automated tools)
    // In prod: strictly enforce the allowlist
    if (!IS_PROD && (!origin || origin === 'null')) return cb(null, true);
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not in allowlist`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.static(PUBLIC_DIR));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ── Session (hardened) ────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave:            false,
  saveUninitialized: false,
  name:              'evid.sid',   // don't expose 'connect.sid'
  cookie: {
    httpOnly: true,                // no JS access to cookie
    secure:   IS_PROD,             // HTTPS-only in production
    sameSite: 'lax',               // CSRF mitigation for same-site navigation
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(flash());

// ── CSRF protection (session-based synchronizer token) ────────
// Generates a random token per session, verifies it on every
// state-changing POST. All EJS forms include <input name="_csrf">.
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.body._csrf || req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      console.warn(`  ⚠️  CSRF mismatch — ${req.method} ${req.path} — IP: ${req.ip}`);
      // Return JSON for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ ok: false, errors: ['Invalid or missing CSRF token. Please refresh and try again.'] });
      }
      req.flash('error', 'Invalid form submission. Please try again.');
      return res.redirect(req.headers.referer || '/');
    }
  }
  next();
});

// ── Global template locals ────────────────────────────────────
app.use((req, res, next) => {
  res.locals.success     = req.flash('success');
  res.locals.error       = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  next();
});

// ── Rate limiters ─────────────────────────────────────────────
function makeLimit(windowMs, max, message, fallbackPath = '/') {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    handler: (req, res) => {
      // Return JSON for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(429).json({ ok: false, errors: [message], code: 'RATE_LIMIT' });
      }
      req.flash('error', message);
      res.redirect(req.headers.referer || fallbackPath);
    },
  });
}
const rl = {
  signup:         makeLimit(60 * 60 * 1000, 10, 'Too many signups from this IP. Please try again in 1 hour.',           '/signup'),
  login:          makeLimit(15 * 60 * 1000, 20, 'Too many login attempts. Please try again in 15 minutes.',             '/login'),
  verifyEmail:    makeLimit(15 * 60 * 1000, 15, 'Too many verification attempts. Please try again in 15 minutes.',     '/verify-email'),
  resendOtp:      makeLimit(60 * 60 * 1000,  5, 'Too many resend requests. Please try again in 1 hour.',               '/verify-email'),
  forgotPassword: makeLimit(60 * 60 * 1000,  5, 'Too many reset requests. Please try again in 1 hour.',                '/forgot-password'),
  resetPassword:  makeLimit(60 * 60 * 1000, 10, 'Too many reset attempts. Please try again in 1 hour.',                '/reset-password'),
  apply:          makeLimit(60 * 60 * 1000,  3, 'Too many application attempts. Please try again in 1 hour.',           '/apply'),
  upload:         makeLimit(60 * 60 * 1000, 10, 'Too many uploads. Please try again in 1 hour.',                        '/submit'),
};

// ── Auth middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ ok: false, errors: ['Please log in to access this resource.'], code: 'AUTH_REQUIRED' });
    }
    req.flash('error', 'Please log in to access that page.');
    return res.redirect('/login');
  }
  next();
}

// ── Role-based middleware ────────────────────────────────────
function requireEntrepreneur(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ ok: false, errors: ['Please log in to access this resource.'], code: 'AUTH_REQUIRED' });
    }
    req.flash('error', 'Please log in to access that page.');
    return res.redirect('/login');
  }
  const role = req.session.user.role || 'user';
  if (role !== 'verified_entrepreneur' && role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ ok: false, errors: ['Only verified entrepreneurs can access this resource.'], code: 'ROLE_REQUIRED' });
    }
    req.flash('error', 'Only verified entrepreneurs can access this page. Apply to become one!');
    return res.redirect('/apply');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ ok: false, errors: ['Please log in to access this resource.'], code: 'AUTH_REQUIRED' });
    }
    req.flash('error', 'Please log in to access that page.');
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ ok: false, errors: ['Access denied.'], code: 'ADMIN_REQUIRED' });
    }
    req.flash('error', 'Access denied.');
    return res.redirect('/');
  }
  next();
}

// ── Utility: client IP (proxy-aware) ─────────────────────────
function getIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
}

// ============================================================
// AUTH ROUTES
// ============================================================

// ============================================================
// JSON API ROUTES (Phase 1: Home + Login + Signup)
// ============================================================

app.get('/api/csrf', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/api/videos', async (req, res) => {
  try {
    const { search, category } = req.query;

    const query = { status: 'published' };
    if (category && category !== 'All') {
      query.category = category;
    }
    if (search) {
      const q = String(search).toLowerCase();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { entrepreneur: { $regex: q, $options: 'i' } }
      ];
    }

    const videos = await Video.find(query);
    const allVideos = await Video.find({ status: 'published' });
    
    const categories = [...new Set(allVideos.map(v => v.category))].sort();
    const featuredVideos = allVideos.filter(v => v.featured);
    
    const users = await User.find({}, 'id role');
    const ownerMap = {};
    users.forEach(u => {
      ownerMap[u.id] = { role: u.role || 'user' };
    });

    res.json({
      videos,
      categories,
      featuredVideos,
      currentSearch: search || '',
      currentCategory: category || 'All',
      ownerMap,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ ok: false, errors: ['Failed to fetch videos'] });
  }
});

app.post('/api/auth/signup', rl.signup, async (req, res) => {
  try {
    const fullName        = (req.body.fullName        || '').trim();
    const email           = (req.body.email           || '').trim().toLowerCase();
    const password        =  req.body.password        || '';
    const confirmPassword =  req.body.confirmPassword || '';

    const errors = [];
    if (!fullName)                                        errors.push('Full name is required.');
    if (!email)                                           errors.push('Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');

    const pwErrors = validatePassword(password);
    errors.push(...pwErrors);
    if (pwErrors.length === 0 && password !== confirmPassword) errors.push('Passwords do not match.');

    if (errors.length === 0) {
      const existingUser = await User.findOne({ email });
      if (existingUser) errors.push('An account with this email already exists.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ ok: false, errors });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // We explicitly generate and store our custom prefixed ID
    const customId = generateId('u');
    
    const newUser = await User.create({
      id:                  customId,
      fullName,
      email,
      password:            hashedPassword,
      role:                'user',
      verified:            false,
      failedLoginAttempts: 0,
      lockUntil:           null
    });

    const otp = await createOtp(email);
    await sendOtpEmail(email, otp, fullName);

    await logAudit('SIGNUP', { userId: newUser.id, email, ip: getIp(req), userAgent: req.headers['user-agent'] });
    req.session.pendingEmail = email;
    req.session.pendingName  = fullName;

    req.session.save(() => {
      res.json({
        ok: true,
        message: 'Account created! Check your email for verification code.',
        next: '/verify-email',
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ ok: false, errors: ['Failed to create account. Please try again.'] });
  }
});

app.post('/api/auth/login', rl.login, async (req, res) => {
  try {
    const email    = (req.body.email || '').trim().toLowerCase();
    const password =  req.body.password || '';

    const errors = [];
    if (!email)    errors.push('Email is required.');
    if (!password) errors.push('Password is required.');
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });

    const user = await User.findOne({ email });
    const invalid = 'Invalid email or password.';

    if (!user) {
      await logAudit('LOGIN_FAIL', { email, ip: getIp(req), userAgent: req.headers['user-agent'], meta: { reason: 'no_account' } });
      return res.status(401).json({ ok: false, errors: [invalid] });
    }

    if (isAccountLocked(user)) {
      const minsLeft = Math.ceil((new Date(user.lockUntil) - Date.now()) / 60000);
      await logAudit('LOGIN_FAIL', { userId: user.id, email, ip: getIp(req), userAgent: req.headers['user-agent'], meta: { reason: 'locked' } });
      return res.status(423).json({
        ok: false,
        errors: [`Account temporarily locked. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`],
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await handleFailedLogin(user);
      await logAudit('LOGIN_FAIL', { userId: user.id, email, ip: getIp(req), userAgent: req.headers['user-agent'], meta: { reason: 'bad_password', attempts: user.failedLoginAttempts } });
      return res.status(401).json({ ok: false, errors: [invalid] });
    }

    await resetFailedLogins(user);

    if (ADMIN_EMAILS.includes(email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    req.session.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role || 'user',
      verified: user.verified !== false,
    };

    await logAudit('LOGIN_SUCCESS', { userId: user.id, email, ip: getIp(req), userAgent: req.headers['user-agent'] });
    req.session.save(() => {
      res.json({ ok: true, message: 'Login successful.', next: '/' });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred during login. Please try again.'] });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    if (req.session.user) {
      await logAudit('LOGOUT', { userId: req.session.user.id, email: req.session.user.email, ip: getIp(req), userAgent: req.headers['user-agent'] });
    }
    req.session.destroy(() => res.json({ ok: true, next: '/' }));
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ ok: false, errors: ['Internal server error.'] });
  }
});

// ============================================================
// JSON API ROUTES (Phase 2: All remaining)
// ============================================================

// ── Auth: Verify Email ───────────────────────────────────────
app.post('/api/auth/verify-email', rl.verifyEmail, async (req, res) => {
  try {
    const email = req.session.pendingEmail || req.session.user?.email;
    if (!email) return res.status(400).json({ ok: false, errors: ['No pending verification. Please sign up or log in.'] });

    let otpCode = '';
    if (req.body.otp) { otpCode = req.body.otp.trim(); }
    else { for (let i = 1; i <= 6; i++) otpCode += (req.body[`digit${i}`] || ''); }

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({ ok: false, errors: ['Please enter a valid 6-digit code.'] });
    }

    const result = await verifyOtp(email, otpCode);
    if (!result.valid) {
      return res.status(400).json({ ok: false, errors: [result.error] });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ ok: false, errors: ['User not found. Please sign up again.'] });

    user.verified        = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    await logAudit('EMAIL_VERIFIED', { userId: user.id, email, ip: getIp(req), userAgent: req.headers['user-agent'] });

    req.session.user = { id: user.id, fullName: user.fullName, email: user.email, role: user.role || 'user', verified: true };
    delete req.session.pendingEmail;
    delete req.session.pendingName;

    req.session.save(() => {
      res.json({ ok: true, message: `Email verified! Welcome aboard, ${user.fullName}! 🎉`, next: '/' });
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred. Please try again.'] });
  }
});

// ── Auth: Resend OTP ─────────────────────────────────────────
app.post('/api/auth/resend-otp', rl.resendOtp, async (req, res) => {
  try {
    const email = req.session.pendingEmail || req.session.user?.email;
    if (!email) return res.status(400).json({ ok: false, errors: ['No pending verification found.'] });

    const cooldown = await checkOtpCooldown(email);
    if (!cooldown.ok) {
      return res.status(429).json({ ok: false, errors: [`Please wait ${cooldown.waitSeconds} seconds before requesting a new code.`] });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ ok: false, errors: ['User not found.'] });
    if (user.verified) return res.json({ ok: true, message: 'Your email is already verified!', next: '/login' });

    const otp         = await createOtp(email);
    const emailResult = await sendOtpEmail(email, otp, user.fullName);
    if (emailResult.success) {
      res.json({ ok: true, message: 'A new verification code has been sent to your email! 📧' });
    } else {
      res.status(500).json({ ok: false, errors: ['Failed to send email. Please try again later.'] });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred. Please try again.'] });
  }
});

// ── Auth: Forgot Password ────────────────────────────────────
app.post('/api/auth/forgot-password', rl.forgotPassword, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, errors: ['Please enter a valid email address.'] });
    }

    const successMsg = 'If an account with that email exists, a reset code has been sent. 📧';

    const user = await User.findOne({ email });
    if (!user) {
      await logAudit('FORGOT_PASSWORD_NO_ACCOUNT', { email, ip: getIp(req), userAgent: req.headers['user-agent'] });
      return res.json({ ok: true, message: successMsg, next: '/reset-password' });
    }

    const cooldown = await checkOtpCooldown(RESET_PREFIX + email);
    if (!cooldown.ok) {
      return res.json({ ok: true, message: successMsg, next: '/reset-password' });
    }

    const otp         = await createResetOtp(email);
    const emailResult = await sendPasswordResetEmail(email, otp, user.fullName);
    if (!emailResult.success) {
      return res.status(500).json({ ok: false, errors: ['Failed to send reset email. Please try again later.'] });
    }

    await logAudit('FORGOT_PASSWORD_REQUEST', { userId: user.id, email, ip: getIp(req), userAgent: req.headers['user-agent'] });
    req.session.resetEmail = email;
    req.session.save(() => {
      res.json({ ok: true, message: successMsg, next: '/reset-password' });
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred. Please try again.'] });
  }
});

// ── Auth: Reset Password ─────────────────────────────────────
app.post('/api/auth/reset-password', rl.resetPassword, async (req, res) => {
  try {
    const email = req.session.resetEmail;
    if (!email) return res.status(400).json({ ok: false, errors: ['No active password reset. Please start again.'], next: '/forgot-password' });

    const { newPassword, confirmPassword } = req.body;
    let otpCode = '';
    if (req.body.otp) { otpCode = req.body.otp.trim(); }
    else { for (let i = 1; i <= 6; i++) otpCode += (req.body[`digit${i}`] || ''); }

    const errors = [];
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) errors.push('Please enter a valid 6-digit reset code.');
    const pwErrors = validatePassword(newPassword || '');
    errors.push(...pwErrors);
    if (pwErrors.length === 0 && newPassword !== confirmPassword) errors.push('Passwords do not match.');

    if (errors.length > 0) return res.status(400).json({ ok: false, errors });

    const result = await verifyResetOtp(email, otpCode);
    if (!result.valid) return res.status(400).json({ ok: false, errors: [result.error] });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ ok: false, errors: ['User not found.'] });

    user.password            = hashedPassword;
    user.failedLoginAttempts = 0;
    user.lockUntil           = null;
    await user.save();

    await logAudit('PASSWORD_RESET', { userId: user.id, email, ip: getIp(req), userAgent: req.headers['user-agent'] });

    delete req.session.resetEmail;
    if (req.session.user?.email === email) delete req.session.user;
    req.session.save(() => {
      res.json({ ok: true, message: '🎉 Password reset successfully! Please log in with your new password.', next: '/login' });
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred. Please try again.'] });
  }
});

// ── Video: Single ────────────────────────────────────────────
app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) return res.status(404).json({ ok: false, errors: ['Video not found.'] });

    const owner = video.ownerUserId ? await User.findOne({ id: video.ownerUserId }) : null;

    res.json({
      ok: true,
      data: {
        video,
        owner: owner ? { id: owner.id, fullName: owner.fullName, role: owner.role || 'user' } : null,
      },
    });
  } catch (error) {
    console.error('Video fetch error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred.'] });
  }
});

// ── Video: My Videos (dashboard) ─────────────────────────────
app.get('/api/my/videos', requireEntrepreneur, async (req, res) => {
  try {
    const videos = await Video.find({ ownerUserId: req.session.user.id }).sort({ createdAt: -1 });
    res.json({ ok: true, data: { videos } });
  } catch (error) {
    console.error('Fetch my videos error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred.'] });
  }
});

// ── Video: Submit ────────────────────────────────────────────
app.post('/api/videos', requireEntrepreneur, rl.upload, async (req, res) => {
  try {
    const { title, entrepreneur, description, youtubeUrl, category, tags } = req.body;
    const errors = [];
    if (!title?.trim())        errors.push('Video title is required.');
    if (!entrepreneur?.trim()) errors.push('Entrepreneur name is required.');
    if (!description?.trim())  errors.push('Description is required.');
    if (!youtubeUrl?.trim())   errors.push('YouTube URL is required.');
    else if (!isValidYouTubeUrl(youtubeUrl)) errors.push('Please provide a valid YouTube URL.');
    if (!category)             errors.push('Category is required.');

    if (errors.length > 0) return res.status(400).json({ ok: false, errors });

    const newVideo = await Video.create({
      id:           generateId('v'),
      title:        title.trim(),
      entrepreneur: entrepreneur.trim(),
      description:  description.trim(),
      youtubeUrl:   youtubeUrl.trim(),
      youtubeId:    extractYouTubeId(youtubeUrl),
      category,
      tags:         tags ? (typeof tags === 'string' ? tags.split(',') : tags).map(t => t.trim()).filter(Boolean) : [],
      featured:     false,
      submittedBy:  req.session.user.fullName,
      ownerUserId:  req.session.user.id,
      status:       'published'
    });

    await logAudit('VIDEO_SUBMIT', { userId: req.session.user.id, email: req.session.user.email, ip: getIp(req), userAgent: req.headers['user-agent'], meta: { videoId: newVideo.id } });
    res.json({ ok: true, message: 'Video submitted successfully! 🎉', next: '/dashboard', data: { videoId: newVideo.id } });
  } catch (error) {
    console.error('Video submit error:', error);
    res.status(500).json({ ok: false, errors: ['Failed to submit video.'] });
  }
});

// ── Video: Edit ──────────────────────────────────────────────
app.post('/api/videos/:id/edit', requireEntrepreneur, async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) return res.status(404).json({ ok: false, errors: ['Video not found.'] });

    if (video.ownerUserId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ ok: false, errors: ['You can only edit your own videos.'] });
    }

    const { title, entrepreneur, description, youtubeUrl, category, tags } = req.body;
    const errors = [];
    if (!title?.trim())        errors.push('Video title is required.');
    if (!entrepreneur?.trim()) errors.push('Entrepreneur name is required.');
    if (!description?.trim())  errors.push('Description is required.');
    if (!youtubeUrl?.trim())   errors.push('YouTube URL is required.');
    else if (!isValidYouTubeUrl(youtubeUrl)) errors.push('Please provide a valid YouTube URL.');
    if (!category)             errors.push('Category is required.');

    if (errors.length > 0) return res.status(400).json({ ok: false, errors });

    video.title        = title.trim();
    video.entrepreneur = entrepreneur.trim();
    video.description  = description.trim();
    video.youtubeUrl   = youtubeUrl.trim();
    video.youtubeId    = extractYouTubeId(youtubeUrl);
    video.category     = category;
    video.tags         = tags ? (typeof tags === 'string' ? tags.split(',') : tags).map(t => t.trim()).filter(Boolean) : [];
    await video.save();

    await logAudit('VIDEO_EDIT', { userId: req.session.user.id, ip: getIp(req), meta: { videoId: video.id } });
    res.json({ ok: true, message: 'Video updated successfully! ✏️', next: '/dashboard' });
  } catch (error) {
    console.error('Video edit error:', error);
    res.status(500).json({ ok: false, errors: ['Failed to update video.'] });
  }
});

// ── Video: Delete ────────────────────────────────────────────
app.post('/api/videos/:id/delete', requireEntrepreneur, async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) return res.status(404).json({ ok: false, errors: ['Video not found.'] });

    if (video.ownerUserId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ ok: false, errors: ['You can only delete your own videos.'] });
    }

    await Video.deleteOne({ id: req.params.id });

    await logAudit('VIDEO_DELETE', { userId: req.session.user.id, ip: getIp(req), meta: { videoId: req.params.id } });
    res.json({ ok: true, message: 'Video deleted. 🗑️' });
  } catch (error) {
    console.error('Video delete error:', error);
    res.status(500).json({ ok: false, errors: ['Failed to delete video.'] });
  }
});

// ── Applications: My application ─────────────────────────────
app.get('/api/applications/me', requireAuth, async (req, res) => {
  try {
    const application = await Application.findOne({ userId: req.session.user.id });
    res.json({ ok: true, data: { application } });
  } catch (error) {
    console.error('Fetch application error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred.'] });
  }
});

// ── Applications: Submit ─────────────────────────────────────
app.post('/api/applications', requireAuth, rl.apply, async (req, res) => {
  try {
    const role = req.session.user.role || 'user';
    if (role === 'verified_entrepreneur' || role === 'admin') {
      return res.json({ ok: true, message: 'You are already a verified entrepreneur!', next: '/dashboard' });
    }

    const existing = await Application.findOne({ userId: req.session.user.id });
    if (existing && existing.status === 'pending') {
      return res.status(400).json({ ok: false, errors: ['You already have a pending application.'] });
    }

    const startupName = (req.body.startupName || '').trim();
    const bio         = (req.body.bio         || '').trim();
    const linkedinUrl = (req.body.linkedinUrl  || '').trim();
    const websiteUrl  = (req.body.websiteUrl   || '').trim();
    const notes       = (req.body.notes        || '').trim();

    const errors = [];
    if (!startupName)                                         errors.push('Startup / business name is required.');
    if (startupName.length > 100)                             errors.push('Startup name must be under 100 characters.');
    if (!bio || bio.length < 20)                              errors.push('Please write a bio of at least 20 characters.');
    if (bio.length > 500)                                     errors.push('Bio must be under 500 characters.');
    if (!linkedinUrl && !websiteUrl)                          errors.push('Please provide at least one verification link (LinkedIn or website).');
    if (linkedinUrl && !/^https?:\/\/.+/i.test(linkedinUrl))  errors.push('LinkedIn URL must start with http:// or https://.');
    if (websiteUrl  && !/^https?:\/\/.+/i.test(websiteUrl))   errors.push('Website URL must start with http:// or https://.');

    if (errors.length > 0) return res.status(400).json({ ok: false, errors });

    await Application.findOneAndUpdate(
      { userId: req.session.user.id },
      {
        id:              generateId('app'),
        userId:          req.session.user.id,
        userEmail:       req.session.user.email,
        userName:        req.session.user.fullName,
        startupName,
        bio,
        linkedinUrl:     linkedinUrl || null,
        websiteUrl:      websiteUrl  || null,
        notes:           notes || null,
        status:          'pending',
        appliedAt:       new Date(),
        reviewedAt:      null,
        reviewedBy:      null,
        rejectionReason: null,
      },
      { upsert: true, new: true }
    );

    await logAudit('ENTREPRENEUR_APPLY', { userId: req.session.user.id, email: req.session.user.email, ip: getIp(req), userAgent: req.headers['user-agent'] });
    res.json({ ok: true, message: 'Application submitted! We will review it shortly. 🚀' });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ ok: false, errors: ['Failed to submit application.'] });
  }
});

// ── Admin: List applications ─────────────────────────────────
app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const apps  = await Application.find();
    
    // We already have userEmail and userName inside the application schema
    const enriched = apps.map(a => ({
      ...a.toObject(),
      user: { fullName: a.userName, email: a.userEmail }
    }));
    
    enriched.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return  1;
      return new Date(b.appliedAt) - new Date(a.appliedAt);
    });
    res.json({ ok: true, data: { applications: enriched } });
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred.'] });
  }
});

// ── Admin: Approve application ───────────────────────────────
app.post('/api/admin/applications/:userId/approve', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const appRecord = await Application.findOne({ userId, status: 'pending' });
    if (!appRecord) return res.status(404).json({ ok: false, errors: ['Application not found or already reviewed.'] });

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ ok: false, errors: ['User not found.'] });

    appRecord.status     = 'approved';
    appRecord.reviewedAt = new Date();
    appRecord.reviewedBy = req.session.user.id;
    await appRecord.save();

    user.role                   = 'verified_entrepreneur';
    user.verifiedEntrepreneurAt = new Date().toISOString();
    await user.save();

    await logAudit('ENTREPRENEUR_APPROVED', {
      userId: user.id, email: user.email,
      ip: getIp(req), userAgent: req.headers['user-agent'],
      meta: { adminId: req.session.user.id },
    });

    res.json({ ok: true, message: `${user.fullName} has been approved as a verified entrepreneur! ✅` });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred.'] });
  }
});

// ── Admin: Reject application ────────────────────────────────
app.post('/api/admin/applications/:userId/reject', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const rejectionReason = (req.body.rejectionReason || '').trim();

    const appRecord = await Application.findOne({ userId, status: 'pending' });
    if (!appRecord) return res.status(404).json({ ok: false, errors: ['Application not found or already reviewed.'] });

    appRecord.status          = 'rejected';
    appRecord.reviewedAt      = new Date();
    appRecord.reviewedBy      = req.session.user.id;
    appRecord.rejectionReason = rejectionReason || null;
    await appRecord.save();

    await logAudit('ENTREPRENEUR_REJECTED', {
      userId, ip: getIp(req), userAgent: req.headers['user-agent'],
      meta: { adminId: req.session.user.id },
    });

    res.json({ ok: true, message: 'Application rejected.' });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ ok: false, errors: ['An error occurred.'] });
  }
});

// ============================================================
// STATIC PAGE ROUTES (serve HTML files)
// ============================================================

// GET /
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// GET /login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// GET /signup
app.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.sendFile(path.join(PUBLIC_DIR, 'signup.html'));
});

// GET /verify-email
app.get('/verify-email', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'verify-email.html')));

// GET /forgot-password
app.get('/forgot-password', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'forgot-password.html')));

// GET /reset-password
app.get('/reset-password', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'reset-password.html')));

// GET /apply
app.get('/apply', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'apply.html')));

// GET /dashboard
app.get('/dashboard', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html')));

// GET /submit
app.get('/submit', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'submit.html')));

// GET /video/:id/edit
app.get('/video/:id/edit', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'edit-video.html')));

// GET /video/:id  (ensure it comes after more specific /video/... routes if there are any)
app.get('/video/:id', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'video-details.html')));

// GET /admin/applications
app.get('/admin/applications', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin-applications.html')));



// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, errors: ['Endpoint not found.'], code: 'NOT_FOUND' });
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

// ── Centralized error handler ─────────────────────────────────
// Catches unhandled errors. Never leaks stack traces in production.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('  ❌  Unhandled error:', err.message);
  
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ ok: false, errors: ['Internal server error.'], code: 'SERVER_ERROR' });
  }
  
  if (IS_PROD) {
    res.status(500).sendFile(path.join(PUBLIC_DIR, '404.html'));
  } else {
    res.status(500).send(`<pre style="color:red">${err.stack}</pre>`);
  }
});

// ── Start server ──────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  🚀  EntreVid running at  http://localhost:${PORT}\n`);
  });
});
