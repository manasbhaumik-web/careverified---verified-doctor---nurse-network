import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Application, Request, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";

const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const iso = () => new Date().toISOString();
const str = (v: unknown, max = 250) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });

/**
 * Images saved with a build-hash in the name (/assets/photo-C0TGKdC3.jpg) only exist in one build. Point them at the stable copy
 * (/assets/photo.jpg) when it is there, so packages and hospitals never show a broken picture.
 */
function stableImagePath(url: string | null | undefined): string | null | undefined {
  const m = typeof url === "string" ? url.match(/^(\/assets\/[A-Za-z0-9_]+)-[A-Za-z0-9_-]{8}(\.(?:jpg|png))$/) : null;
  if (!m) return url;
  const file = `${m[1]}${m[2]}`.replace(/^\//, "");
  return ["public", "dist"].some(dir => fs.existsSync(path.join(process.cwd(), dir, file))) ? `/${file}` : url;
}
function fixSavedImages() {
  for (const [table, col] of [["medical_packages", "image_url"], ["tourism_facilities", "cover_image"]] as const) {
    try {
      for (const r of db.prepare(`SELECT id, ${col} AS img FROM ${table} WHERE ${col} LIKE '/assets/%-%'`).all() as { id: string; img: string }[]) {
        const fixed = stableImagePath(r.img);
        if (fixed && fixed !== r.img) db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`).run(fixed, r.id);
      }
    } catch { /* table not created yet */ }
  }
}

// -------------------------------------------------------------
// Initialize Tables & Columns for Packages, Promos, Facilities
// -------------------------------------------------------------
export function initPackagesSchema() {
  // 1. Ensure tourism_facilities has equipment, amenities, cover_image
  for (const col of [
    "equipment TEXT",
    "amenities TEXT",
    "cover_image TEXT",
  ]) {
    try {
      db.exec(`ALTER TABLE tourism_facilities ADD COLUMN ${col}`);
    } catch {
      /* column already exists */
    }
  }

  // 2. Medical Packages Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_packages (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      duration TEXT NOT NULL,
      price_sen INTEGER NOT NULL,
      original_price_sen INTEGER,
      target_audience TEXT NOT NULL DEFAULT 'all',
      fasting_required INTEGER NOT NULL DEFAULT 0,
      inclusions TEXT NOT NULL DEFAULT '[]',
      exclusions TEXT,
      preparation_instructions TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_med_pkg_fac ON medical_packages(facility_id, status);
    CREATE INDEX IF NOT EXISTS idx_med_pkg_cat ON medical_packages(category);

    CREATE TABLE IF NOT EXISTS medical_promotions (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value INTEGER NOT NULL,
      package_id TEXT,
      badge_text TEXT,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      terms TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_med_promo_fac ON medical_promotions(facility_id, status);
    CREATE INDEX IF NOT EXISTS idx_med_promo_code ON medical_promotions(code);
  `);

  // 3. Seed Default Medical Packages if empty
  const countPkgs = (db.prepare("SELECT COUNT(*) AS c FROM medical_packages").get() as any)?.c || 0;
  if (countPkgs === 0) {
    const defaultPackages = [
      {
        id: "pkg-exec-01",
        facility_id: "fac-demo-1",
        code: "PKG-EXEC-01",
        title: "Executive Full-Body & Tumour Marker Screening",
        category: "Health Screening",
        description: "Comprehensive executive medical check-up encompassing full blood chemistry, vital organ profiling, comprehensive cancer tumour markers, and specialist physician consultation.",
        duration: "1 Day Outpatient (4-5 hours)",
        price_sen: 128000,
        original_price_sen: 160000,
        target_audience: "all",
        fasting_required: 1,
        inclusions: JSON.stringify([
          "Full Blood Count (FBC) & ESR",
          "Comprehensive Renal & Liver Profile",
          "Fasting Lipid Panel & HbA1c Glycaemic Control",
          "Cancer Tumour Markers (AFP, CEA, CA19-9, PSA/CA125)",
          "Resting 12-Lead Electrocardiogram (ECG)",
          "Chest X-Ray (High-Definition Digital)",
          "Ultrasound of Abdomen & Pelvis",
          "Consultant Physician Review & Medical Report Book",
        ]),
        exclusions: "Additional advanced imaging (CT/MRI) charged separately if clinically indicated.",
        preparation_instructions: "Strict 10-hour overnight fasting required. Plain water allowed. Report to Executive Screening Lounge Level 2 at 8:00 AM.",
        image_url: "/assets/clean_light_doctor_suite_full.jpg",
        status: "published",
        featured: 1,
      },
      {
        id: "pkg-card-02",
        facility_id: "fac-demo-1",
        code: "PKG-CARD-02",
        title: "Comprehensive Cardiac CT Angiogram & Calcium Score",
        category: "Cardiology",
        description: "Non-invasive cardiac coronary artery disease assessment using 640-slice Dual Source CT to detect arterial plaque, stenosis, and myocardial health.",
        duration: "1 Day Outpatient (3 hours)",
        price_sen: 295000,
        original_price_sen: 350000,
        target_audience: "all",
        fasting_required: 1,
        inclusions: JSON.stringify([
          "Coronary CT Angiography (640-slice high-speed scan)",
          "Agatston Coronary Artery Calcium Score",
          "Transthoracic 2D Doppler Echocardiogram",
          "Cardiac Blood Biomarkers (High-Sensitivity Troponin T, hs-CRP, Homocysteine)",
          "Consultant Cardiologist Diagnostic Evaluation & Risk Stratification",
        ]),
        exclusions: "Interventional catheterisation or stent placement not included.",
        preparation_instructions: "Fast for 4 hours prior. Avoid caffeine, chocolate, and smoking for 12 hours. Continue blood pressure medications as advised.",
        image_url: "/assets/clinics_hospital_hero_bg.jpg",
        status: "published",
        featured: 1,
      },
      {
        id: "pkg-orth-03",
        facility_id: "fac-demo-1",
        code: "PKG-ORTH-03",
        title: "Robotic-Arm Assisted Total Knee Replacement (All-Inclusive)",
        category: "Orthopaedics",
        description: "Precision sub-millimeter robotic knee arthroplasty using FDA-approved titanium joint prosthesis with rapid recovery surgical pathway and inpatient physiotherapy.",
        duration: "4 Days 3 Nights Inpatient",
        price_sen: 2850000,
        original_price_sen: 3200000,
        target_audience: "all",
        fasting_required: 1,
        inclusions: JSON.stringify([
          "Senior Consultant Orthopaedic Surgeon & Anaesthetist Attendance",
          "Pre-operative 3D CT Knee Joint Mapping & Robotic Planning",
          "Premium FDA-Approved Titanium Knee Implant",
          "Single Executive Inpatient Room Stay (3 Nights)",
          "Operating Theatre, Recovery & Surgical Consumables",
          "Post-Operative Inpatient Physiotherapy & Daily Mobility Training",
          "Discharge Medication & Orthopaedic Walking Frame",
        ]),
        exclusions: "Pre-existing ICU complications beyond 3 nights single room stay.",
        preparation_instructions: "Pre-admission clinical workup scheduled 3 days prior. Stop anticoagulants/aspirin under physician guidance.",
        image_url: "/assets/landing_hero_treatment_nursing_pharmacy_2.jpg",
        status: "published",
        featured: 1,
      },
      {
        id: "pkg-mat-04",
        facility_id: "fac-demo-1",
        code: "PKG-MAT-04",
        title: "Gentle Birth Normal Delivery Maternity Package",
        category: "Maternity",
        description: "Compassionate, safe natural childbirth package with specialist obstetrician attendance, private labour suite, newborn nursery screening, and lactation support.",
        duration: "2 Days 1 Night Inpatient",
        price_sen: 588800,
        original_price_sen: 680000,
        target_audience: "local",
        fasting_required: 0,
        inclusions: JSON.stringify([
          "Consultant Obstetrician & Gynaecologist Delivery Attendance",
          "Consultant Paediatrician Attendance at Delivery",
          "Private Standard Single Inpatient Room (1 Night)",
          "Labour & Delivery Suite Facilities and Nursing Support",
          "Newborn Hearing Screening & Bilirubin Check",
          "Routine Newborn Vaccines (BCG, Hepatitis B 1st Dose, Vitamin K)",
          "Dedicated Lactation Consultant Bedside Coaching",
        ]),
        exclusions: "Emergency caesarean conversion or nursery phototherapy if needed.",
        preparation_instructions: "Bring maternal health record (buku merah / antenatal book) and registration documents.",
        image_url: "/assets/practitioners_hero_bg.jpg",
        status: "published",
        featured: 0,
      },
      {
        id: "pkg-ivf-05",
        facility_id: "fac-demo-1",
        code: "PKG-IVF-05",
        title: "Advanced IVF / ICSI Assisted Conception Cycle",
        category: "Fertility",
        description: "State-of-the-art reproductive medicine protocol with time-lapse embryo imaging, ICSI micro-fertilization, and dedicated fertility nurse coordination.",
        duration: "2–3 Weeks Outpatient Cycle",
        price_sen: 1850000,
        original_price_sen: 2200000,
        target_audience: "international",
        fasting_required: 0,
        inclusions: JSON.stringify([
          "Serial Follicular Ultrasound Scans during Stimulation",
          "Oocyte Pick-Up (OPU) in Sterile Day Care Surgical Theatre",
          "Intracytoplasmic Sperm Injection (ICSI) by Senior Embryologist",
          "Blastocyst Embryo Culture with Time-Lapse Incubator",
          "Fresh Embryo Transfer Procedure",
          "MHTC International Patient Concierge & Medical Visa Letter",
        ]),
        exclusions: "Stimulation gonadotropin injections and embryo freezing storage after year 1.",
        preparation_instructions: "Initial consultation on Day 2 of menstrual cycle.",
        image_url: "/assets/malaysian_female_doctor.jpg",
        status: "published",
        featured: 1,
      },
    ];

    const stmt = db.prepare(`
      INSERT INTO medical_packages (
        id, facility_id, code, title, category, description, duration, price_sen, original_price_sen,
        target_audience, fasting_required, inclusions, exclusions, preparation_instructions, image_url, status, featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = iso();
    for (const p of defaultPackages) {
      stmt.run(
        p.id, p.facility_id, p.code, p.title, p.category, p.description, p.duration, p.price_sen, p.original_price_sen,
        p.target_audience, p.fasting_required, p.inclusions, p.exclusions, p.preparation_instructions, p.image_url, p.status, p.featured, now, now
      );
    }
  }

  // 4. Seed Default Promotions if empty
  const countPromos = (db.prepare("SELECT COUNT(*) AS c FROM medical_promotions").get() as any)?.c || 0;
  if (countPromos === 0) {
    const defaultPromos = [
      {
        id: "promo-merdeka-20",
        facility_id: "fac-demo-1",
        code: "CAREMERDEKA",
        title: "Merdeka National Wellness Special 2026",
        description: "Enjoy 20% discount on all comprehensive Health Screening and Cardiac packages in celebration of Malaysian Wellness Month.",
        discount_type: "percentage",
        discount_value: 20,
        package_id: null,
        badge_text: "20% OFF National Special",
        valid_from: "2026-08-01",
        valid_until: "2026-12-31",
        terms: "Applicable for Malaysian Citizens and Permanent Residents. Cannot be combined with other insurance vouchers.",
        status: "active",
      },
      {
        id: "promo-pink-oct",
        facility_id: "fac-demo-1",
        code: "PINKOCTOBER",
        title: "Pink October Women's Wellness Campaign",
        description: "RM 250 direct rebate on Executive Health Screening & 3D Mammogram packages.",
        discount_type: "fixed",
        discount_value: 25000,
        package_id: "pkg-exec-01",
        badge_text: "RM 250 Women's Rebate",
        valid_from: "2026-09-15",
        valid_until: "2026-11-30",
        terms: "Applicable for female patients age 35 and above.",
        status: "active",
      },
      {
        id: "promo-mhtc-global",
        facility_id: "fac-demo-1",
        code: "GLOBALHEALTH",
        title: "MHTC Medical Traveler Welcome Privilege",
        description: "15% discount for international inbound patients booking elective orthopaedic, cardiac, or fertility procedures.",
        discount_type: "percentage",
        discount_value: 15,
        package_id: null,
        badge_text: "15% MHTC Travel Privilege",
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
        terms: "Passport holder required at time of hospital registration. Includes complimentary airport meet-and-greet.",
        status: "active",
      },
    ];

    const stmt = db.prepare(`
      INSERT INTO medical_promotions (
        id, facility_id, code, title, description, discount_type, discount_value, package_id, badge_text, valid_from, valid_until, terms, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = iso();
    for (const pr of defaultPromos) {
      stmt.run(
        pr.id, pr.facility_id, pr.code, pr.title, pr.description, pr.discount_type, pr.discount_value, pr.package_id, pr.badge_text, pr.valid_from, pr.valid_until, pr.terms, pr.status, now, now
      );
    }
  }

  // 5. Update demo facility equipment & amenities if null
  const fac = db.prepare("SELECT * FROM tourism_facilities WHERE id = 'fac-demo-1'").get() as any;
  if (fac && (!fac.equipment || !fac.amenities)) {
    const defaultEquipment = JSON.stringify([
      "3T High-Field MRI (Siemens Magnetom Vida)",
      "640-Slice Dual Source CT Scanner (Aquilion ONE)",
      "Digital 3D Mammography with Tomosynthesis",
      "Hybrid Biplane Angiography Cath Lab",
      "Da Vinci Xi 4-Arm Robotic Surgical System",
      "PET-CT Molecular Nuclear Imaging",
      "Automated Roche Diagnostics Central Laboratory",
      "High-Definition Olympus GI Endoscopy Suite",
    ]);

    const defaultAmenities = JSON.stringify([
      "24/7 Level 1 Trauma & Emergency Medical Centre",
      "Intensive Care Unit (ICU, CCU & Neonatal NICU)",
      "Executive Single & Presidential Inpatient Suites",
      "MHTC International Patient Concierge Lounge",
      "JAKIM Halal-Certified In-House Clinical Dietary Kitchen",
      "Dedicated Air & Ground Critical Care Ambulance Service",
      "Surau & Multi-Faith Quiet Contemplation Rooms",
      "Multilingual Patient Concierge (English, Malay, Mandarin, Arabic)",
    ]);

    db.prepare(`
      UPDATE tourism_facilities
      SET equipment = ?, amenities = ?, cover_image = ?
      WHERE id = 'fac-demo-1'
    `).run(defaultEquipment, defaultAmenities, "/assets/clinics_hospital_hero_bg.jpg");
  }

  // 4. Older rows point at hashed image names
  fixSavedImages();
}

// -------------------------------------------------------------
// Register Routes for Medical Packages, Promos, Facilities
// -------------------------------------------------------------
export function registerPackagesRoutes(app: Application) {
  initPackagesSchema();

  // -----------------------------------------------------------
  // PUBLIC / USER: List Medical Packages
  // -----------------------------------------------------------
  app.get("/api/packages", (req: Request, res: Response) => {
    const { facility_id, category, audience, q, status } = req.query;
    let sql = `
      SELECT p.*, f.name AS facility_name, f.city AS facility_city, f.state AS facility_state, f.licence_no, f.mhtc_member, f.verified_facilitator
      FROM medical_packages p
      JOIN tourism_facilities f ON f.id = p.facility_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Everyone sees published packages. Only the board (all) and a facility (its own) may list drafts, or ask for "all".
    const role = req.user?.role;
    const mayListUnpublished = role === "admin" || role === "facility";
    const wantStatus = typeof status === "string" ? status : "";
    if (mayListUnpublished && wantStatus === "all") {
      // no status filter
    } else if (mayListUnpublished && wantStatus) {
      sql += " AND p.status = ?";
      params.push(wantStatus);
    } else {
      sql += " AND p.status = 'published'";
    }

    // A facility only ever sees its own unpublished packages
    if (role === "facility" && req.user?.facilityId && wantStatus && wantStatus !== "published") {
      sql += " AND p.facility_id = ?";
      params.push(req.user.facilityId);
    }

    if (facility_id && typeof facility_id === "string") {
      sql += " AND p.facility_id = ?";
      params.push(facility_id);
    }

    if (category && typeof category === "string" && category !== "All") {
      sql += " AND p.category = ?";
      params.push(category);
    }

    if (audience && typeof audience === "string" && audience !== "all") {
      sql += " AND (p.target_audience = ? OR p.target_audience = 'all')";
      params.push(audience);
    }

    if (q && typeof q === "string") {
      sql += " AND (p.title LIKE ? OR p.description LIKE ? OR p.code LIKE ? OR f.name LIKE ?)";
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += " ORDER BY p.featured DESC, p.created_at DESC LIMIT 100";
    const pkgs = db.prepare(sql).all(...params) as any[];

    const result = pkgs.map(p => ({
      ...p,
      name: p.title,
      author: p.facility_name,
      version: p.code || "1.0.0",
      isEnabled: p.status === "published",
      isRemovable: true,
      icon: p.category === "Health Screening" ? "Heart" : p.category === "Cardiology" ? "Activity" : "Puzzle",
      priceMyr: p.price_sen / 100,
      originalPriceMyr: p.original_price_sen ? p.original_price_sen / 100 : null,
      inclusions: JSON.parse(p.inclusions || "[]"),
      fastingRequired: !!p.fasting_required,
      featured: !!p.featured,
    }));

    res.json({ status: "success", data: result });
  });

  // Get Single Package with Active Promotions
  app.get("/api/packages/:id", (req: Request, res: Response) => {
    const pkg = db.prepare(`
      SELECT p.*, f.name AS facility_name, f.city AS facility_city, f.state AS facility_state, f.address AS facility_address,
             f.phone AS facility_phone, f.email AS facility_email, f.licence_no, f.mhtc_member, f.verified_facilitator
      FROM medical_packages p
      JOIN tourism_facilities f ON f.id = p.facility_id
      WHERE p.id = ?
    `).get(req.params.id) as any;

    if (!pkg) return fail(res, 404, "Medical package not found.");

    // Fetch active promotions for this package or facility
    const today = new Date().toISOString().slice(0, 10);
    const promos = db.prepare(`
      SELECT * FROM medical_promotions
      WHERE facility_id = ? AND status = 'active' AND valid_from <= ? AND valid_until >= ?
        AND (package_id IS NULL OR package_id = ?)
    `).all(pkg.facility_id, today, today, pkg.id) as any[];

    res.json({
      status: "success",
      data: {
        ...pkg,
        priceMyr: pkg.price_sen / 100,
        originalPriceMyr: pkg.original_price_sen ? pkg.original_price_sen / 100 : null,
        inclusions: JSON.parse(pkg.inclusions || "[]"),
        fastingRequired: !!pkg.fasting_required,
        featured: !!pkg.featured,
        promotions: promos.map(pr => ({
          ...pr,
          discountValueMyr: pr.discount_type === "fixed" ? pr.discount_value / 100 : null,
        })),
      },
    });
  });

  // -----------------------------------------------------------
  // FACILITY / ADMIN: Publish & Manage Medical Packages
  // -----------------------------------------------------------
  app.post("/api/packages", requireRole("facility", "admin"), (req: Request, res: Response, next: any) => {
    if (!req.body.title && req.body.name && !req.body.priceMyr && !req.body.price) {
      if (typeof next === "function") return next();
    }
    const facilityId = req.user!.facilityId || req.user!.profileId || req.body.facilityId || "fac-demo-1";
    const title = str(req.body.title, 150);
    const category = str(req.body.category, 60) || "Health Screening";
    const description = str(req.body.description, 2000);
    const duration = str(req.body.duration, 80) || "1 Day Outpatient";
    const code = str(req.body.code, 40) || `PKG-${Date.now().toString(36).toUpperCase()}`;
    const priceMyr = parseFloat(req.body.priceMyr || req.body.price);
    const originalPriceMyr = req.body.originalPriceMyr ? parseFloat(req.body.originalPriceMyr) : null;

    if (!title) return fail(res, 400, "Package title is required.");
    if (isNaN(priceMyr) || priceMyr <= 0) return fail(res, 400, "Valid price in MYR is required.");

    const inclusions = Array.isArray(req.body.inclusions)
      ? req.body.inclusions.map((i: unknown) => str(i, 200)).filter(Boolean)
      : [];
    const exclusions = str(req.body.exclusions, 500);
    const preparation = str(req.body.preparationInstructions, 500);
    const targetAudience = ["all", "local", "international"].includes(req.body.targetAudience) ? req.body.targetAudience : "all";
    const fasting = req.body.fastingRequired ? 1 : 0;
    const featured = req.body.featured ? 1 : 0;
    const status = ["published", "draft", "archived"].includes(req.body.status) ? req.body.status : "published";
    const imageUrl = str(req.body.imageUrl, 300) || "/assets/clean_light_doctor_suite_full.jpg";

    const id = newId("pkg");
    const now = iso();

    db.prepare(`
      INSERT INTO medical_packages (
        id, facility_id, code, title, category, description, duration, price_sen, original_price_sen,
        target_audience, fasting_required, inclusions, exclusions, preparation_instructions, image_url, status, featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, facilityId, code, title, category, description, duration, Math.round(priceMyr * 100),
      originalPriceMyr ? Math.round(originalPriceMyr * 100) : null,
      targetAudience, fasting, JSON.stringify(inclusions), exclusions, preparation, imageUrl, status, featured, now, now
    );

    audit(req, "package.create", { target: ["package", id], details: { facilityId } });
    res.status(201).json({ status: "success", message: "Medical package published successfully.", data: { id } });
  });

  app.put("/api/packages/:id", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const existing = db.prepare("SELECT * FROM medical_packages WHERE id = ?").get(req.params.id) as any;
    if (!existing) return fail(res, 404, "Medical package not found.");

    if (req.user!.role === "facility" && req.user!.facilityId && existing.facility_id !== req.user!.facilityId) {
      return fail(res, 403, "You can only edit packages for your own facility.");
    }

    const title = str(req.body.title, 150) || existing.title;
    const category = str(req.body.category, 60) || existing.category;
    const description = req.body.description !== undefined ? str(req.body.description, 2000) : existing.description;
    const duration = str(req.body.duration, 80) || existing.duration;
    const code = str(req.body.code, 40) || existing.code;
    const priceMyr = req.body.priceMyr !== undefined ? parseFloat(req.body.priceMyr) : existing.price_sen / 100;
    const originalPriceMyr = req.body.originalPriceMyr !== undefined ? (req.body.originalPriceMyr ? parseFloat(req.body.originalPriceMyr) : null) : (existing.original_price_sen ? existing.original_price_sen / 100 : null);

    const inclusions = Array.isArray(req.body.inclusions)
      ? req.body.inclusions.map((i: unknown) => str(i, 200)).filter(Boolean)
      : JSON.parse(existing.inclusions || "[]");
    const exclusions = req.body.exclusions !== undefined ? str(req.body.exclusions, 500) : existing.exclusions;
    const preparation = req.body.preparationInstructions !== undefined ? str(req.body.preparationInstructions, 500) : existing.preparation_instructions;
    const targetAudience = req.body.targetAudience || existing.target_audience;
    const fasting = req.body.fastingRequired !== undefined ? (req.body.fastingRequired ? 1 : 0) : existing.fasting_required;
    const featured = req.body.featured !== undefined ? (req.body.featured ? 1 : 0) : existing.featured;
    const status = req.body.status || existing.status;
    const imageUrl = req.body.imageUrl || existing.image_url;
    const now = iso();

    db.prepare(`
      UPDATE medical_packages SET
        code = ?, title = ?, category = ?, description = ?, duration = ?, price_sen = ?, original_price_sen = ?,
        target_audience = ?, fasting_required = ?, inclusions = ?, exclusions = ?, preparation_instructions = ?,
        image_url = ?, status = ?, featured = ?, updated_at = ?
      WHERE id = ?
    `).run(
      code, title, category, description, duration, Math.round(priceMyr * 100),
      originalPriceMyr ? Math.round(originalPriceMyr * 100) : null,
      targetAudience, fasting, JSON.stringify(inclusions), exclusions, preparation, imageUrl, status, featured, now, req.params.id
    );

    audit(req, "package.update", { target: ["package", req.params.id] });
    res.json({ status: "success", message: "Medical package updated successfully." });
  });

  // Toggle enabled/published status
  app.post("/api/packages/:id/toggle", requireRole("facility", "admin"), (req: Request, res: Response, next: any) => {
    const pkg = db.prepare("SELECT * FROM medical_packages WHERE id = ?").get(req.params.id) as any;
    if (!pkg) {
      if (typeof next === "function") return next();
      return fail(res, 404, "Medical package not found.");
    }
    const nextStatus = pkg.status === "published" ? "draft" : "published";
    db.prepare("UPDATE medical_packages SET status = ?, updated_at = ? WHERE id = ?").run(nextStatus, iso(), req.params.id);
    audit(req, "package.toggle", { target: ["package", req.params.id], details: { status: nextStatus } });
    res.json({
      status: "success",
      message: `Package "${pkg.title}" is now ${nextStatus === "published" ? "enabled" : "disabled"}.`,
      data: {
        ...pkg,
        name: pkg.title,
        status: nextStatus,
        isEnabled: nextStatus === "published",
        priceMyr: pkg.price_sen / 100
      }
    });
  });

  app.delete("/api/packages/:id", requireRole("facility", "admin"), (req: Request, res: Response, next: any) => {
    const existing = db.prepare("SELECT * FROM medical_packages WHERE id = ?").get(req.params.id) as any;
    if (!existing) {
      if (typeof next === "function") return next();
      return fail(res, 404, "Medical package not found.");
    }

    if (req.user!.role === "facility" && req.user!.facilityId && existing.facility_id !== req.user!.facilityId) {
      return fail(res, 403, "You can only delete packages for your own facility.");
    }

    db.prepare("DELETE FROM medical_packages WHERE id = ?").run(req.params.id);
    audit(req, "package.delete", { target: ["package", req.params.id] });
    res.json({ status: "success", message: "Medical package deleted successfully." });
  });

  // -----------------------------------------------------------
  // PROMOTIONS & OFFERS API
  // -----------------------------------------------------------
  app.get("/api/promotions", (req: Request, res: Response) => {
    const { facility_id, active_only } = req.query;
    let sql = `
      SELECT pr.*, f.name AS facility_name, p.title AS package_title
      FROM medical_promotions pr
      JOIN tourism_facilities f ON f.id = pr.facility_id
      LEFT JOIN medical_packages p ON p.id = pr.package_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (facility_id && typeof facility_id === "string") {
      sql += " AND pr.facility_id = ?";
      params.push(facility_id);
    }

    if (active_only === "1" || active_only === "true") {
      const today = new Date().toISOString().slice(0, 10);
      sql += " AND pr.status = 'active' AND pr.valid_from <= ? AND pr.valid_until >= ?";
      params.push(today, today);
    }

    sql += " ORDER BY pr.created_at DESC";
    const rows = db.prepare(sql).all(...params) as any[];

    res.json({
      status: "success",
      data: rows.map(r => ({
        ...r,
        discountValueMyr: r.discount_type === "fixed" ? r.discount_value / 100 : null,
      })),
    });
  });

  app.post("/api/promotions", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const facilityId = req.user!.facilityId || req.user!.profileId || req.body.facilityId || "fac-demo-1";
    const code = str(req.body.code, 30).toUpperCase();
    const title = str(req.body.title, 120);
    const description = str(req.body.description, 500);
    const discountType = req.body.discountType === "fixed" ? "fixed" : "percentage";
    const discountValue = parseInt(req.body.discountValue, 10);
    const packageId = req.body.packageId || null;
    const badgeText = str(req.body.badgeText, 50) || (discountType === "percentage" ? `${discountValue}% OFF` : `RM ${discountValue} OFF`);
    const validFrom = str(req.body.validFrom, 10) || new Date().toISOString().slice(0, 10);
    const validUntil = str(req.body.validUntil, 10) || "2026-12-31";
    const terms = str(req.body.terms, 500);
    const status = req.body.status || "active";

    if (!code || !title) return fail(res, 400, "Promotion code and title are required.");
    if (isNaN(discountValue) || discountValue <= 0) return fail(res, 400, "Valid discount value is required.");

    const id = newId("promo");
    const now = iso();
    const storedValue = discountType === "fixed" ? Math.round(discountValue * 100) : discountValue;

    db.prepare(`
      INSERT INTO medical_promotions (
        id, facility_id, code, title, description, discount_type, discount_value, package_id, badge_text, valid_from, valid_until, terms, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, facilityId, code, title, description, discountType, storedValue, packageId, badgeText, validFrom, validUntil, terms, status, now, now
    );

    audit(req, "promotion.create", { target: ["promotion", id], details: { facilityId } });
    res.status(201).json({ status: "success", message: "Promotion published successfully.", data: { id } });
  });

  app.put("/api/promotions/:id", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const existing = db.prepare("SELECT * FROM medical_promotions WHERE id = ?").get(req.params.id) as any;
    if (!existing) return fail(res, 404, "Promotion not found.");

    if (req.user!.role === "facility" && req.user!.facilityId && existing.facility_id !== req.user!.facilityId) {
      return fail(res, 403, "You can only edit promotions for your own facility.");
    }

    const code = str(req.body.code, 30).toUpperCase() || existing.code;
    const title = str(req.body.title, 120) || existing.title;
    const description = req.body.description !== undefined ? str(req.body.description, 500) : existing.description;
    const discountType = req.body.discountType || existing.discount_type;
    let discountValue = existing.discount_value;
    if (req.body.discountValue !== undefined) {
      const v = parseInt(req.body.discountValue, 10);
      discountValue = discountType === "fixed" ? Math.round(v * 100) : v;
    }
    const packageId = req.body.packageId !== undefined ? (req.body.packageId || null) : existing.package_id;
    const badgeText = req.body.badgeText || existing.badge_text;
    const validFrom = req.body.validFrom || existing.valid_from;
    const validUntil = req.body.validUntil || existing.valid_until;
    const terms = req.body.terms !== undefined ? str(req.body.terms, 500) : existing.terms;
    const status = req.body.status || existing.status;
    const now = iso();

    db.prepare(`
      UPDATE medical_promotions SET
        code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?,
        package_id = ?, badge_text = ?, valid_from = ?, valid_until = ?, terms = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      code, title, description, discountType, discountValue, packageId, badgeText, validFrom, validUntil, terms, status, now, req.params.id
    );

    audit(req, "promotion.update", { target: ["promotion", req.params.id] });
    res.json({ status: "success", message: "Promotion updated successfully." });
  });

  app.delete("/api/promotions/:id", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const existing = db.prepare("SELECT * FROM medical_promotions WHERE id = ?").get(req.params.id) as any;
    if (!existing) return fail(res, 404, "Promotion not found.");

    if (req.user!.role === "facility" && req.user!.facilityId && existing.facility_id !== req.user!.facilityId) {
      return fail(res, 403, "You can only delete promotions for your own facility.");
    }

    db.prepare("DELETE FROM medical_promotions WHERE id = ?").run(req.params.id);
    audit(req, "promotion.delete", { target: ["promotion", req.params.id] });
    res.json({ status: "success", message: "Promotion deleted successfully." });
  });

  // Verify / Apply Promo Code
  app.post("/api/promotions/verify", (req: Request, res: Response) => {
    const code = str(req.body.code, 30).toUpperCase();
    const packageId = req.body.packageId;
    if (!code) return fail(res, 400, "Enter a promotion code.");

    const today = new Date().toISOString().slice(0, 10);
    const promo = db.prepare(`
      SELECT * FROM medical_promotions
      WHERE code = ? AND status = 'active' AND valid_from <= ? AND valid_until >= ?
    `).get(code, today, today) as any;

    if (!promo) {
      return fail(res, 404, "Invalid or expired promotion code.");
    }

    if (promo.package_id && packageId && promo.package_id !== packageId) {
      return fail(res, 400, "This promotion code is not applicable to the selected package.");
    }

    let discountSummary = "";
    if (promo.discount_type === "percentage") {
      discountSummary = `${promo.discount_value}% Discount Applied`;
    } else {
      discountSummary = `RM ${(promo.discount_value / 100).toFixed(2)} Off Applied`;
    }

    res.json({
      status: "success",
      message: `${promo.title}: ${discountSummary}`,
      data: {
        id: promo.id,
        code: promo.code,
        title: promo.title,
        discountType: promo.discount_type,
        discountValue: promo.discount_type === "fixed" ? promo.discount_value / 100 : promo.discount_value,
        badgeText: promo.badge_text,
      },
    });
  });

  // -----------------------------------------------------------
  // PACKAGE DEPOSIT CHECKOUT & RESERVATIONS API
  // -----------------------------------------------------------
  // Reserve package with pre-authorized deposit
  app.post("/api/packages/:id/reserve-deposit", (req: Request, res: Response) => {
    const pkg = db.prepare("SELECT * FROM medical_packages WHERE id = ? AND status = 'published'").get(req.params.id) as any;
    if (!pkg) return fail(res, 404, "Medical package not found or no longer available.");

    const patientName = str(req.body.patientName, 120);
    const patientEmail = str(req.body.patientEmail, 120);
    const patientPhone = str(req.body.patientPhone, 40);
    const patientCountry = str(req.body.patientCountry, 80) || "Malaysia";
    const preferredDate = str(req.body.preferredDate, 10);
    const promoCode = str(req.body.promoCode, 30).toUpperCase();
    const paymentMethod = ["credit_card", "fpx", "intl_transfer"].includes(req.body.paymentMethod) ? req.body.paymentMethod : "credit_card";
    const notes = str(req.body.notes, 500);

    if (!patientName || !patientEmail || !patientPhone) {
      return fail(res, 400, "Please provide full patient name, contact email, and phone number.");
    }

    const basePriceMyr = pkg.price_sen / 100;
    let discountMyr = 0;

    // Apply promo if valid
    if (promoCode) {
      const today = new Date().toISOString().slice(0, 10);
      const promo = db.prepare(`
        SELECT * FROM medical_promotions
        WHERE code = ? AND status = 'active' AND valid_from <= ? AND valid_until >= ?
      `).get(promoCode, today, today) as any;
      if (promo) {
        if (!promo.package_id || promo.package_id === pkg.id) {
          if (promo.discount_type === "percentage") {
            discountMyr = Math.round((basePriceMyr * promo.discount_value / 100) * 100) / 100;
          } else {
            discountMyr = promo.discount_value / 100;
          }
        }
      }
    }

    const finalPriceMyr = Math.max(0, Math.round((basePriceMyr - discountMyr) * 100) / 100);
    const depositPct = 10.0; // 10% advance reservation deposit
    const depositAmountMyr = Math.max(50.0, Math.round((finalPriceMyr * (depositPct / 100)) * 100) / 100);
    const remainingPayableMyr = Math.round((finalPriceMyr - depositAmountMyr) * 100) / 100;

    const orderId = newId("pord");
    const now = iso();
    // A request reference only: no payment is taken here, so it is never called a payment reference to the patient.
    const depositPaymentRef = `REQ-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    db.prepare(`
      INSERT INTO package_orders (
        id, package_id, facility_id, patient_user_id, patient_name, patient_email, patient_phone,
        patient_country, preferred_date, total_price_myr, deposit_pct, deposit_amount_myr,
        remaining_payable_myr, promo_code, discount_amount_myr, payment_method, payment_status,
        deposit_payment_ref, hospital_confirmation_status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, pkg.id, pkg.facility_id, req.user?.id || null, patientName, patientEmail, patientPhone,
      patientCountry, preferredDate || null, finalPriceMyr, depositPct, depositAmountMyr,
      remainingPayableMyr, promoCode || null, discountMyr, paymentMethod, "awaiting_payment",
      depositPaymentRef, "pending", notes || null, now, now
    );

    audit(req, "package.order.deposit", {
      target: ["package_order", orderId],
      details: { packageId: pkg.id, facilityId: pkg.facility_id, depositAmountMyr, depositPaymentRef, paid: false }
    });

    res.status(201).json({
      status: "success",
      message: `Request sent (Ref: ${depositPaymentRef}). No payment has been taken. The hospital will confirm and tell you if a deposit of RM ${depositAmountMyr.toFixed(2)} is needed.`,
      data: {
        orderId,
        depositPaymentRef,
        packageTitle: pkg.title,
        packageCode: pkg.code,
        patientName,
        totalPriceMyr: finalPriceMyr,
        depositAmountMyr,
        remainingPayableMyr,
        preferredDate,
        hospitalConfirmationStatus: "pending"
      }
    });
  });

  // Facility / Admin: List Package Orders
  app.get("/api/facility/package-orders", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
    const orders = db.prepare(`
      SELECT o.*, p.title AS package_title, p.code AS package_code, p.category AS package_category
      FROM package_orders o
      JOIN medical_packages p ON p.id = o.package_id
      WHERE o.facility_id = ? OR ? = 'admin'
      ORDER BY o.created_at DESC
    `).all(facilityId, req.user!.role) as any[];

    res.json({
      status: "success",
      data: orders
    });
  });

  // Facility / Admin: Confirm Package Order
  app.patch("/api/facility/package-orders/:id/confirm", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const order = db.prepare("SELECT * FROM package_orders WHERE id = ?").get(req.params.id) as any;
    if (!order) return fail(res, 404, "Order not found.");

    const status = ["confirmed", "completed", "cancelled"].includes(req.body.status) ? req.body.status : "confirmed";
    const now = iso();

    db.prepare("UPDATE package_orders SET hospital_confirmation_status = ?, updated_at = ? WHERE id = ?").run(status, now, order.id);
    audit(req, "package.order.confirm", { target: ["package_order", order.id], details: { status } });

    res.json({
      status: "success",
      message: `Package reservation status updated to "${status}".`,
      data: { id: order.id, status }
    });
  });

  // -----------------------------------------------------------
  // FACILITIES & INFRASTRUCTURE MANAGEMENT API
  // -----------------------------------------------------------
  // Public directory of facilities with infrastructure & packages count
  app.get("/api/facilities/directory", (_req: Request, res: Response) => {
    const list = db.prepare(`
      SELECT f.*,
             (SELECT COUNT(*) FROM medical_packages p WHERE p.facility_id = f.id AND p.status = 'published') AS packages_count,
             (SELECT COUNT(*) FROM medical_promotions pr WHERE pr.facility_id = f.id AND pr.status = 'active') AS active_promotions_count
      FROM tourism_facilities f
      WHERE f.active = 1
      ORDER BY f.mhtc_member DESC, f.name ASC
    `).all() as any[];
    // Same rule as the Global Patient Care list: switched on, and the licence has not expired
    const todayKey = new Date().toISOString().slice(0, 10);
    const listed = list.filter(f => !f.licence_expiry || f.licence_expiry >= todayKey);

    res.json({
      status: "success",
      data: listed.map(f => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        city: f.city,
        state: f.state,
        address: f.address,
        description: f.description,
        phone: f.phone,
        email: f.email,
        website: f.website,
        mhtcMember: !!f.mhtc_member,
        verifiedFacilitator: !!f.verified_facilitator,
        licenceNo: f.licence_no,
        licenceExpiry: f.licence_expiry,
        isLicenceValid: !f.licence_expiry || f.licence_expiry >= new Date().toISOString().slice(0, 10),
        coverImage: f.cover_image || "/assets/clinics_hospital_hero_bg.jpg",
        specialties: JSON.parse(f.specialties || "[]"),
        equipment: JSON.parse(f.equipment || "[]"),
        amenities: JSON.parse(f.amenities || "[]"),
        accreditations: JSON.parse(f.accreditations || "[]"),
        packagesCount: f.packages_count,
        activePromotionsCount: f.active_promotions_count,
      })),
    });
  });

  // Facility Authenticated: Get full infrastructure details
  app.get("/api/facility/infrastructure", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
    const fac = db.prepare("SELECT * FROM tourism_facilities WHERE id = ?").get(facilityId) as any;
    if (!fac) return fail(res, 404, "Facility not found.");

    res.json({
      status: "success",
      data: {
        id: fac.id,
        name: fac.name,
        kind: fac.kind,
        city: fac.city,
        state: fac.state,
        address: fac.address,
        description: fac.description,
        phone: fac.phone,
        email: fac.email,
        website: fac.website,
        licenceNo: fac.licence_no,
        licenceExpiry: fac.licence_expiry,
        licenceCheckedAt: fac.licence_checked_at,
        isLicenceValid: !fac.licence_expiry || fac.licence_expiry >= new Date().toISOString().slice(0, 10),
        mhtcMember: !!fac.mhtc_member,
        coverImage: fac.cover_image || "/assets/clinics_hospital_hero_bg.jpg",
        specialties: JSON.parse(fac.specialties || "[]"),
        equipment: JSON.parse(fac.equipment || "[]"),
        amenities: JSON.parse(fac.amenities || "[]"),
        accreditations: JSON.parse(fac.accreditations || "[]"),
      },
    });
  });

  // Facility Authenticated: Update facility infrastructure, amenities, equipment
  app.put("/api/facility/infrastructure", requireRole("facility", "admin"), (req: Request, res: Response) => {
    const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
    const fac = db.prepare("SELECT * FROM tourism_facilities WHERE id = ?").get(facilityId) as any;
    if (!fac) return fail(res, 404, "Facility not found.");

    const name = str(req.body.name, 120) || fac.name;
    const kind = str(req.body.kind, 60) || fac.kind;
    const description = req.body.description !== undefined ? str(req.body.description, 2000) : fac.description;
    const phone = str(req.body.phone, 50) || fac.phone;
    const email = str(req.body.email, 100) || fac.email;
    const website = str(req.body.website, 150) || fac.website;
    const city = str(req.body.city, 80) || fac.city;
    const state = str(req.body.state, 80) || fac.state;
    const address = str(req.body.address, 200) || fac.address;
    const coverImage = str(req.body.coverImage, 300) || fac.cover_image;

    const specialties = Array.isArray(req.body.specialties) ? req.body.specialties : JSON.parse(fac.specialties || "[]");
    const equipment = Array.isArray(req.body.equipment) ? req.body.equipment : JSON.parse(fac.equipment || "[]");
    const amenities = Array.isArray(req.body.amenities) ? req.body.amenities : JSON.parse(fac.amenities || "[]");

    db.prepare(`
      UPDATE tourism_facilities SET
        name = ?, kind = ?, description = ?, phone = ?, email = ?, website = ?,
        city = ?, state = ?, address = ?, cover_image = ?,
        specialties = ?, equipment = ?, amenities = ?
      WHERE id = ?
    `).run(
      name, kind, description, phone, email, website, city, state, address, coverImage,
      JSON.stringify(specialties), JSON.stringify(equipment), JSON.stringify(amenities), facilityId
    );

    audit(req, "facility.infrastructure.update", { target: ["facility", facilityId] });
    res.json({ status: "success", message: "Facility infrastructure details updated successfully." });
  });
}
