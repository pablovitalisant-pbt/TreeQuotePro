import 'dotenv/config';
import express from "express";
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import multer from "multer";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Resend } from "resend";
import cors from 'cors';

const PostgresStore = connectPgSimple(session);

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Type augmentation for session
declare module "express-session" {
  interface SessionData {
    userId: number;
    companyId: number;
    role: string;
    isMaster: boolean;
  }
}

async function startServer() {
  console.log("Starting ArborQuote Server...");
  const isProduction = process.env.NODE_ENV === 'production';
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }));

  const PORT = 3000;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  const sendVerificationEmail = async (email: string, code: string) => {
    if (!resend) {
      throw new Error("Email service not configured");
    }

    await resend.emails.send({
      from: "TreeQuote Pro <noreply@pbtleads.website>",
      to: email,
      subject: "Your TreeQuote Pro verification code",
      text: `Your verification code is ${code}. This code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2 style="margin: 0 0 8px;">Verify your TreeQuote Pro account</h2>
          <p style="margin: 0 0 16px;">Use the 6-digit code below to complete your signup. This code expires in 10 minutes.</p>
          <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${code}</div>
          <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    });
  };

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create uploads dir (read-only fs, expected in production):", e);
    }
  }

  // 1. Body parsing and static files — always first, no dependencies
  app.use(express.json());
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Configure Multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  // 2. DB init
  let pool: Pool | undefined;
  let dbReady = false;
  try {
    console.log("Initializing database...");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Test connection
    await pool.query("SELECT NOW()");
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        base_rate DOUBLE PRECISION DEFAULT 50.0,
        height_rate DOUBLE PRECISION DEFAULT 10.0,
        diameter_rate DOUBLE PRECISION DEFAULT 5.0,
        hazard_multiplier DOUBLE PRECISION DEFAULT 1.5,
        user_id INTEGER,
        webhook_url TEXT,
        logo_url TEXT,
        primary_color TEXT DEFAULT '#059669',
        ads_enabled INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const columns = [
      { name: 'webhook_url', type: 'TEXT' },
      { name: 'height_rate', type: 'DOUBLE PRECISION DEFAULT 10.0' },
      { name: 'diameter_rate', type: 'DOUBLE PRECISION DEFAULT 5.0' },
      { name: 'hazard_multiplier', type: 'DOUBLE PRECISION DEFAULT 1.5' },
      { name: 'logo_url', type: 'TEXT' },
      { name: 'primary_color', type: 'TEXT DEFAULT \'#059669\'' },
      { name: 'ads_enabled', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE companies ADD COLUMN ${col.name} ${col.type}`);
      } catch (e) {}
    }
    try {
      await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        tree_species TEXT,
        tree_height INTEGER,
        tree_diameter INTEGER,
        proximity_hazard TEXT,
        condition TEXT,
        accessibility TEXT,
        estimated_min DOUBLE PRECISION,
        estimated_max DOUBLE PRECISION,
        images TEXT,
        status TEXT DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        is_verified BOOLEAN DEFAULT false,
        verification_code TEXT,
        verification_expires TIMESTAMP,
        company_id INTEGER REFERENCES companies(id),
        role TEXT DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone TEXT
    `);
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_code TEXT
    `);
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP
    `);
    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN phone TYPE TEXT
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")');

    // Fix existing session table if it was created without the proper constraint
    try {
      await pool.query(`
        ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_pkey;
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      `);
    } catch (e) {}

    console.log("Database initialization complete.");
    dbReady = true;
  } catch (err) {
    console.error("DATABASE FATAL ERROR:", err);
  }

  // 3. Session — only registers if DB is ready, otherwise skip gracefully
  if (dbReady && pool) {
    app.use(session({
      store: new PostgresStore({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: false
      }),
      secret: process.env.SESSION_SECRET || 'arborquote-default-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      proxy: isProduction
    }));
  } else {
    // If DB failed, block all API routes immediately with a clear error
    app.use('/api', (req, res) => {
      res.status(503).json({ error: "Server starting, please retry" });
    });
  }

  // 4. Auth middleware definitions
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const result = await pool.query(
        "SELECT is_verified FROM users WHERE id = $1",
        [req.session.userId]
      );
      const isVerified = result.rows[0]?.is_verified === true;
      if (!isVerified) {
        return res.status(403).json({ error: "Account not verified" });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  };

  const requireMaster = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.isMaster) {
      return res.status(403).json({ error: "Forbidden: Master access required" });
    }
    next();
  };

  // 5. API Routes
  app.get("/api/geocode", async (req, res) => {
    let committed = false;
    try {
      const { q, lat, lon } = req.query;
      if (!q) return res.status(400).json({ error: "Query required" });

      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&limit=5&addressdetails=1`;
      if (lat && lon) url += `&lat=${lat}&lon=${lon}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'ArborQuote/1.0 (pablovitalisant@gmail.com)' }
      });

      if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("Geocoding proxy error:", err);
      res.status(500).json({ error: "Geocoding failed" });
    }
  });

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/auth/register", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    const client = await pool.connect();
    let committed = false;
    try {
      const { email: rawEmail, password: rawPassword, companyName: rawCompanyName, phone: rawPhone } = req.body;

      if (!rawEmail || !rawPassword || !rawCompanyName || !rawPhone) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const email = rawEmail.trim();
      const companyName = rawCompanyName.trim();
      const phone = typeof rawPhone === 'string' ? rawPhone.trim() : rawPhone;
      const password = typeof rawPassword === 'string' ? rawPassword.trim() : rawPassword;

      if (!email || !password || !companyName || !phone) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      await client.query('BEGIN');

      // Check if email already exists
      const emailCheck = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (emailCheck.rows.length > 0) {
        throw new Error("Email already registered");
      }

      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const companyCheck = await client.query("SELECT id FROM companies WHERE slug = $1", [slug]);
      if (companyCheck.rows.length > 0) throw new Error("Company name already taken");

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationCode = generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
      const userResult = await client.query(
        "INSERT INTO users (email, password_hash, phone, verification_code, verification_expires) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [email, passwordHash, phone, verificationCode, verificationExpires]
      );
      const userId = userResult.rows[0].id;

      const companyResult = await client.query(
        "INSERT INTO companies (name, slug, user_id) VALUES ($1, $2, $3) RETURNING id",
        [companyName, slug, userId]
      );
      const companyId = companyResult.rows[0].id;

      await client.query(
        "UPDATE users SET company_id = $1 WHERE id = $2",
        [companyId, userId]
      );

      await client.query('COMMIT');
      committed = true;

      req.session.userId = userId;
      req.session.companyId = companyId;
      req.session.role = 'owner';

      try {
        await sendVerificationEmail(email, verificationCode);
      } catch (emailErr) {
        console.error("Verification email failed (non-fatal):", emailErr);
      }

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session error after registration" });
        }
        res.json({ success: true, slug });
      });
    } catch (err) {
      if (!committed) {
        await client.query('ROLLBACK');
      }
      res.status(400).json({ error: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      client.release();
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      let { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      email = email.trim();
      code = code.trim();

      if (!email || !code) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const userResult = await pool.query(
        "SELECT id, verification_expires FROM users WHERE email = $1 AND verification_code = $2",
        [email, code]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      const { id, verification_expires } = userResult.rows[0];
      if (!verification_expires || new Date(verification_expires) < new Date()) {
        return res.status(400).json({ error: "Verification code expired. Please request a new one." });
      }

      await pool.query(
        "UPDATE users SET is_verified = true, verification_code = NULL, verification_expires = NULL WHERE id = $1",
        [id]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-code", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      let { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      email = email.trim();
      if (!email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const userResult = await pool.query(
        "SELECT id, is_verified FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: "User not found" });
      }

      if (userResult.rows[0]?.is_verified === true) {
        return res.status(400).json({ error: "Account already verified" });
      }

      const verificationCode = generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

      await pool.query(
        "UPDATE users SET verification_code = $1, verification_expires = $2 WHERE email = $3",
        [verificationCode, verificationExpires, email]
      );

      await sendVerificationEmail(email, verificationCode);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Resend failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const { email, password } = req.body;
      const result = await pool.query(
        "SELECT u.*, c.slug FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1",
        [email]
      );
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.companyId = user.company_id;
      req.session.role = user.role;

      res.json({ success: true, slug: user.slug });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  app.post("/api/auth/master-login", (req, res) => {
    const { password } = req.body;
    const masterPassword = process.env.MASTER_PASSWORD || 'arbor-master-2026';
    if (password === masterPassword) {
      req.session.isMaster = true;
      return res.json({ success: true });
    }
    res.status(401).json({ error: "Invalid master password" });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId && !req.session?.isMaster) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // Master session without a userId (master-login only)
    if (req.session?.isMaster && !req.session?.userId) {
      return res.json({ isMaster: true });
    }

    // Regular user — fetch slug from DB
    try {
      if (!pool) return res.status(500).json({ error: "Database unavailable" });
      const result = await pool.query(
        "SELECT c.slug, u.is_verified, u.email FROM users u JOIN companies c ON u.company_id = c.id WHERE u.id = $1",
        [req.session.userId]
      );
      const slug = result.rows[0]?.slug ?? null;
      const isVerified = result.rows[0]?.is_verified === true;
      const email = result.rows[0]?.email ?? null;
      res.json({
        userId: req.session.userId,
        companyId: req.session.companyId,
        role: req.session.role,
        isMaster: req.session.isMaster ?? false,
        slug,
        is_verified: isVerified,
        email,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  });

  app.get("/api/stats/user-count", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM companies");
      res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/upload", upload.array("images", 5), (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
      const fileUrls = files.map(file => `/uploads/${file.filename}`);
      res.json({ urls: fileUrls });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/api/debug/db", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const companies = await pool.query("SELECT * FROM companies");
      const leads = await pool.query("SELECT * FROM leads");
      res.json({ companies: companies.rows, leads: leads.rows });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/companies/:slug", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const slug = req.params.slug.toLowerCase();
      let result = await pool.query("SELECT * FROM companies WHERE slug = $1", [slug]);
      let company = result.rows[0];
      
      if (!company) return res.status(404).json({ error: "Company not found" });
      res.json(company);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const {
        company_id, name, email, phone, address,
        tree_species, tree_height, tree_diameter,
        proximity_hazard, condition, accessibility,
        estimated_min, estimated_max, images
      } = req.body;

      const result = await pool.query(`
        INSERT INTO leads (
          company_id, name, email, phone, address,
          tree_species, tree_height, tree_diameter,
          proximity_hazard, condition, accessibility,
          estimated_min, estimated_max, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        company_id, name, email, phone, address,
        tree_species, tree_height, tree_diameter,
        proximity_hazard, condition, accessibility,
        estimated_min, estimated_max, images
      ]);

      const leadId = result.rows[0].id;

      try {
        const companyResult = await pool.query("SELECT webhook_url, name FROM companies WHERE id = $1", [company_id]);
        const company = companyResult.rows[0];
        if (company?.webhook_url) {
          fetch(company.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'lead.created',
              company_id: company_id,
              company_name: company.name,
              lead: {
                id: leadId,
                name, email, phone, address,
                images: images ? images.split(',') : [],
                tree_details: { species: tree_species, height: tree_height, diameter: tree_diameter },
                hazard_details: { proximity: proximity_hazard, condition, accessibility },
                estimate: { min: estimated_min, max: estimated_max }
              }
            })
          }).catch(err => console.error("Webhook delivery failed:", err));
        }
      } catch (webhookErr) {}

      res.json({ id: leadId });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/companies/:slug/settings", requireAuth, async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const { base_rate, height_rate, diameter_rate, hazard_multiplier, webhook_url, logo_url, primary_color, ads_enabled } = req.body;
      const slug = req.params.slug.toLowerCase();
      
      const companyResult = await pool.query("SELECT id FROM companies WHERE slug = $1", [slug]);
      if (companyResult.rows.length === 0) return res.status(404).json({ error: "Company not found" });
      
      if (req.session.companyId !== companyResult.rows[0].id && !req.session.isMaster) {
        return res.status(403).json({ error: "Unauthorized access to this company" });
      }

      await pool.query(`
        UPDATE companies 
        SET base_rate = $1, height_rate = $2, diameter_rate = $3, hazard_multiplier = $4, webhook_url = $5, logo_url = $6, primary_color = $7, ads_enabled = $8
        WHERE slug = $9
      `, [base_rate, height_rate, diameter_rate, hazard_multiplier, webhook_url, logo_url, primary_color, ads_enabled, slug]);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/admin/:slug/leads", requireAuth, async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const slug = req.params.slug.toLowerCase();
      const companyResult = await pool.query("SELECT id FROM companies WHERE slug = $1", [slug]);
      const company = companyResult.rows[0];
      if (!company) return res.status(404).json({ error: "Company not found" });

      if (req.session.companyId !== company.id && !req.session.isMaster) {
        return res.status(403).json({ error: "Unauthorized access to this company" });
      }

      const leadsResult = await pool.query("SELECT * FROM leads WHERE company_id = $1 ORDER BY created_at DESC", [company.id]);
      res.json(leadsResult.rows);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/leads/:id/status", requireAuth, async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const { status } = req.body;
      const leadCheck = await pool.query("SELECT company_id FROM leads WHERE id = $1", [req.params.id]);
      if (leadCheck.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      
      if (req.session.companyId !== leadCheck.rows[0].company_id && !req.session.isMaster) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await pool.query("UPDATE leads SET status = $1 WHERE id = $2", [status, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/super/companies", requireMaster, async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const result = await pool.query("SELECT * FROM companies ORDER BY name ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/super/companies/:id/ads", requireMaster, async (req, res) => {
    if (!pool) return res.status(500).json({ error: "Database unavailable" });
    try {
      const { ads_enabled } = req.body;
      await pool.query("UPDATE companies SET ads_enabled = $1 WHERE id = $2", [ads_enabled ? 1 : 0, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Static files are served by Vercel in production.

  return app;
}

const appPromise = startServer().catch(err => {
  console.error("Critical server error:", err);
  throw err;
});

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
