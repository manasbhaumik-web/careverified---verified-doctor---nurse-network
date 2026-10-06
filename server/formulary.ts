/**
 * Built-in prescribing safety data.
 *
 * IMPORTANT: this is a small, curated list of widely documented drug groups and high-severity interactions. It is
 * decision support for the prescriber, not a substitute for clinical judgement or for a licensed drug database
 * (e.g. the Malaysian MOH formulary or MIMS). Replace/extend it before relying on it clinically.
 */

export interface Drug {
  name: string;          // generic name
  aliases?: string[];    // common brand/alternative names, matched case-insensitively
  classes: string[];     // therapeutic/pharmacological groups used by the rules below
  allergyGroups?: string[]; // allergy groups this drug belongs to
}

export const FORMULARY: Drug[] = [
  // Analgesics / antipyretics
  { name: "paracetamol", aliases: ["acetaminophen", "panadol"], classes: ["analgesic", "paracetamol"] },
  { name: "ibuprofen", aliases: ["brufen", "nurofen"], classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "diclofenac", aliases: ["voltaren"], classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "naproxen", classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "mefenamic acid", aliases: ["ponstan"], classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "celecoxib", aliases: ["celebrex"], classes: ["nsaid"], allergyGroups: ["nsaid", "sulfonamide"] },
  { name: "aspirin", aliases: ["acetylsalicylic acid"], classes: ["nsaid", "antiplatelet"], allergyGroups: ["nsaid", "aspirin"] },
  // Antibiotics
  { name: "amoxicillin", aliases: ["amoxil"], classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "amoxicillin-clavulanate", aliases: ["augmentin", "co-amoxiclav"], classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "ampicillin", classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "cloxacillin", classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "cefalexin", aliases: ["cephalexin"], classes: ["cephalosporin", "antibiotic"], allergyGroups: ["cephalosporin", "beta-lactam"] },
  { name: "cefuroxime", classes: ["cephalosporin", "antibiotic"], allergyGroups: ["cephalosporin", "beta-lactam"] },
  { name: "ceftriaxone", classes: ["cephalosporin", "antibiotic"], allergyGroups: ["cephalosporin", "beta-lactam"] },
  { name: "azithromycin", classes: ["macrolide", "antibiotic"], allergyGroups: ["macrolide"] },
  { name: "clarithromycin", classes: ["macrolide", "antibiotic", "cyp3a4-inhibitor"], allergyGroups: ["macrolide"] },
  { name: "erythromycin", classes: ["macrolide", "antibiotic", "cyp3a4-inhibitor"], allergyGroups: ["macrolide"] },
  { name: "ciprofloxacin", classes: ["fluoroquinolone", "antibiotic"], allergyGroups: ["fluoroquinolone"] },
  { name: "levofloxacin", classes: ["fluoroquinolone", "antibiotic"], allergyGroups: ["fluoroquinolone"] },
  { name: "doxycycline", classes: ["tetracycline", "antibiotic"], allergyGroups: ["tetracycline"] },
  { name: "metronidazole", aliases: ["flagyl"], classes: ["nitroimidazole", "antibiotic"] },
  { name: "co-trimoxazole", aliases: ["trimethoprim-sulfamethoxazole", "septrin", "bactrim"], classes: ["sulfonamide", "antibiotic"], allergyGroups: ["sulfonamide"] },
  // Cardiovascular
  { name: "warfarin", classes: ["anticoagulant", "vitamin-k-antagonist"] },
  { name: "rivaroxaban", aliases: ["xarelto"], classes: ["anticoagulant", "doac"] },
  { name: "apixaban", aliases: ["eliquis"], classes: ["anticoagulant", "doac"] },
  { name: "clopidogrel", aliases: ["plavix"], classes: ["antiplatelet"] },
  { name: "enalapril", classes: ["ace-inhibitor", "antihypertensive"], allergyGroups: ["ace-inhibitor"] },
  { name: "perindopril", classes: ["ace-inhibitor", "antihypertensive"], allergyGroups: ["ace-inhibitor"] },
  { name: "lisinopril", classes: ["ace-inhibitor", "antihypertensive"], allergyGroups: ["ace-inhibitor"] },
  { name: "losartan", classes: ["arb", "antihypertensive"] },
  { name: "valsartan", classes: ["arb", "antihypertensive"] },
  { name: "amlodipine", classes: ["calcium-channel-blocker", "antihypertensive"] },
  { name: "nifedipine", classes: ["calcium-channel-blocker", "antihypertensive"] },
  { name: "bisoprolol", classes: ["beta-blocker", "antihypertensive"] },
  { name: "atenolol", classes: ["beta-blocker", "antihypertensive"] },
  { name: "propranolol", classes: ["beta-blocker", "antihypertensive"] },
  { name: "furosemide", aliases: ["frusemide", "lasix"], classes: ["loop-diuretic", "diuretic"], allergyGroups: ["sulfonamide"] },
  { name: "hydrochlorothiazide", classes: ["thiazide", "diuretic"], allergyGroups: ["sulfonamide"] },
  { name: "spironolactone", classes: ["potassium-sparing-diuretic", "diuretic"] },
  { name: "digoxin", classes: ["cardiac-glycoside"] },
  { name: "simvastatin", classes: ["statin", "cyp3a4-substrate-statin"] },
  { name: "atorvastatin", classes: ["statin", "cyp3a4-substrate-statin"] },
  { name: "rosuvastatin", classes: ["statin"] },
  { name: "glyceryl trinitrate", aliases: ["gtn", "nitroglycerin"], classes: ["nitrate"] },
  { name: "isosorbide mononitrate", aliases: ["isosorbide dinitrate"], classes: ["nitrate"] },
  { name: "sildenafil", aliases: ["viagra"], classes: ["pde5-inhibitor"] },
  { name: "tadalafil", aliases: ["cialis"], classes: ["pde5-inhibitor"] },
  // Diabetes
  { name: "metformin", classes: ["biguanide", "antidiabetic"] },
  { name: "gliclazide", classes: ["sulfonylurea", "antidiabetic"] },
  { name: "glibenclamide", aliases: ["glyburide"], classes: ["sulfonylurea", "antidiabetic"] },
  { name: "insulin", classes: ["insulin", "antidiabetic"] },
  // Neuro / psych
  { name: "sertraline", classes: ["ssri", "serotonergic", "antidepressant"] },
  { name: "fluoxetine", classes: ["ssri", "serotonergic", "antidepressant"] },
  { name: "escitalopram", classes: ["ssri", "serotonergic", "antidepressant"] },
  { name: "amitriptyline", classes: ["tca", "antidepressant"] },
  { name: "tramadol", classes: ["opioid", "serotonergic"] },
  { name: "carbamazepine", classes: ["anticonvulsant", "cyp-inducer"] },
  { name: "phenytoin", classes: ["anticonvulsant", "cyp-inducer"] },
  { name: "sodium valproate", aliases: ["valproate", "epilim"], classes: ["anticonvulsant"] },
  // Others commonly prescribed
  { name: "omeprazole", classes: ["ppi"] },
  { name: "pantoprazole", classes: ["ppi"] },
  { name: "domperidone", classes: ["antiemetic"] },
  { name: "ondansetron", classes: ["antiemetic"] },
  { name: "loratadine", classes: ["antihistamine"] },
  { name: "cetirizine", classes: ["antihistamine"] },
  { name: "chlorphenamine", aliases: ["chlorpheniramine"], classes: ["antihistamine"] },
  { name: "salbutamol", aliases: ["albuterol", "ventolin"], classes: ["saba", "bronchodilator"] },
  { name: "prednisolone", classes: ["corticosteroid"] },
  { name: "dexamethasone", classes: ["corticosteroid"] },
  { name: "methotrexate", classes: ["antimetabolite", "dmard"] },
  { name: "allopurinol", classes: ["xanthine-oxidase-inhibitor"] },
  { name: "levothyroxine", classes: ["thyroid-hormone"] },
  { name: "potassium chloride", aliases: ["slow-k", "kcl"], classes: ["potassium-supplement"] },
  { name: "oral rehydration salts", aliases: ["ors"], classes: ["supplement"] },
  { name: "vitamin c", classes: ["supplement"] },
];

/**
 * Not available for electronic prescribing here: controlled / scheduled medicines that normally need a
 * physical, serialised prescription under local poisons and dangerous-drugs law. Confirm local rules.
 */
export const RESTRICTED = [
  "morphine", "fentanyl", "oxycodone", "pethidine", "methadone", "codeine", "buprenorphine",
  "diazepam", "alprazolam", "lorazepam", "clonazepam", "midazolam", "zolpidem", "ketamine",
  "methylphenidate", "amphetamine", "dexamfetamine", "phenobarbital",
];

export type Severity = "contraindicated" | "major" | "moderate";
export interface Warning {
  key: string;
  severity: Severity;
  type: "allergy" | "interaction" | "duplicate" | "restricted" | "unknown_drug";
  message: string;
  drugs: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function findDrug(input: string): Drug | undefined {
  const n = norm(input);
  if (!n) return undefined;
  return FORMULARY.find(d => n === d.name || d.aliases?.some(a => n === a) || n.startsWith(d.name + " ") || d.aliases?.some(a => n.startsWith(a + " ")));
}

export const isRestricted = (input: string) => {
  const n = norm(input);
  return RESTRICTED.some(r => n === r || n.startsWith(r + " ") || n.includes(` ${r}`));
};

interface Rule { a: string; b: string; severity: Severity; message: string }
// a / b are drug names or class names
const RULES: Rule[] = [
  { a: "nitrate", b: "pde5-inhibitor", severity: "contraindicated", message: "Nitrates with PDE5 inhibitors can cause severe, life-threatening hypotension." },
  { a: "simvastatin", b: "cyp3a4-inhibitor", severity: "contraindicated", message: "Clarithromycin/erythromycin markedly raise simvastatin levels (risk of rhabdomyolysis)." },
  { a: "anticoagulant", b: "nsaid", severity: "major", message: "NSAIDs with anticoagulants greatly increase the risk of serious bleeding." },
  { a: "warfarin", b: "macrolide", severity: "major", message: "Macrolide antibiotics can raise INR and bleeding risk with warfarin." },
  { a: "warfarin", b: "fluoroquinolone", severity: "major", message: "Fluoroquinolones can raise INR and bleeding risk with warfarin." },
  { a: "warfarin", b: "metronidazole", severity: "major", message: "Metronidazole markedly raises INR with warfarin." },
  { a: "warfarin", b: "co-trimoxazole", severity: "major", message: "Co-trimoxazole markedly raises INR with warfarin." },
  { a: "anticoagulant", b: "antiplatelet", severity: "major", message: "Anticoagulant plus antiplatelet increases bleeding risk." },
  { a: "ace-inhibitor", b: "potassium-sparing-diuretic", severity: "major", message: "Risk of dangerous hyperkalaemia." },
  { a: "ace-inhibitor", b: "potassium-supplement", severity: "major", message: "Risk of dangerous hyperkalaemia." },
  { a: "arb", b: "potassium-sparing-diuretic", severity: "major", message: "Risk of dangerous hyperkalaemia." },
  { a: "ace-inhibitor", b: "arb", severity: "major", message: "Dual renin-angiotensin blockade increases risk of hypotension, hyperkalaemia and renal failure." },
  { a: "ace-inhibitor", b: "nsaid", severity: "moderate", message: "NSAIDs can reduce the effect of ACE inhibitors and impair kidney function." },
  { a: "arb", b: "nsaid", severity: "moderate", message: "NSAIDs can reduce the effect of ARBs and impair kidney function." },
  { a: "methotrexate", b: "nsaid", severity: "major", message: "NSAIDs can raise methotrexate levels and cause toxicity." },
  { a: "methotrexate", b: "co-trimoxazole", severity: "contraindicated", message: "Co-trimoxazole with methotrexate can cause severe bone-marrow suppression." },
  { a: "serotonergic", b: "serotonergic", severity: "major", message: "Combining serotonergic drugs increases the risk of serotonin syndrome." },
  { a: "ssri", b: "nsaid", severity: "moderate", message: "SSRIs with NSAIDs increase gastrointestinal bleeding risk." },
  { a: "ssri", b: "anticoagulant", severity: "moderate", message: "SSRIs may increase bleeding risk with anticoagulants." },
  { a: "digoxin", b: "macrolide", severity: "major", message: "Macrolides can raise digoxin levels to toxic range." },
  { a: "digoxin", b: "loop-diuretic", severity: "moderate", message: "Diuretic-induced low potassium increases digoxin toxicity risk." },
  { a: "beta-blocker", b: "calcium-channel-blocker", severity: "moderate", message: "Check heart rate and blood pressure when combining beta-blockers with calcium-channel blockers (severe bradycardia is a risk with verapamil/diltiazem)." },
  { a: "sulfonylurea", b: "co-trimoxazole", severity: "major", message: "Co-trimoxazole can cause severe hypoglycaemia with sulfonylureas." },
  { a: "sulfonylurea", b: "fluoroquinolone", severity: "moderate", message: "Fluoroquinolones can cause hypo- or hyperglycaemia in patients on sulfonylureas." },
  { a: "statin", b: "macrolide", severity: "moderate", message: "Macrolides can raise statin levels; monitor for muscle symptoms." },
  { a: "carbamazepine", b: "macrolide", severity: "major", message: "Macrolides can raise carbamazepine levels to toxic range." },
  { a: "tca", b: "ssri", severity: "moderate", message: "SSRIs can raise tricyclic levels and add serotonergic effects." },
  { a: "corticosteroid", b: "nsaid", severity: "moderate", message: "Corticosteroids with NSAIDs increase gastrointestinal ulcer and bleeding risk." },
  { a: "allopurinol", b: "penicillin", severity: "moderate", message: "Allopurinol increases the rate of rash with ampicillin/amoxicillin." },
];

const traits = (d: Drug) => new Set<string>([d.name, ...d.classes]);

export interface DrugRef { raw: string; drug?: Drug }

/** Allergy text is free text ("penicillin", "sulfa drugs", "ibuprofen"). Map it to allergy groups and drug names. */
const ALLERGY_ALIASES: Record<string, string[]> = {
  penicillin: ["penicillin", "beta-lactam"], penicillins: ["penicillin", "beta-lactam"], amoxicillin: ["penicillin", "beta-lactam"],
  cephalosporin: ["cephalosporin", "beta-lactam"], "beta lactam": ["beta-lactam"], "beta-lactam": ["beta-lactam"],
  sulfa: ["sulfonamide"], sulfonamide: ["sulfonamide"], sulphonamide: ["sulfonamide"], "sulfa drugs": ["sulfonamide"],
  nsaid: ["nsaid"], nsaids: ["nsaid"], aspirin: ["aspirin", "nsaid"], ibuprofen: ["nsaid"],
  macrolide: ["macrolide"], erythromycin: ["macrolide"], quinolone: ["fluoroquinolone"], fluoroquinolone: ["fluoroquinolone"],
  tetracycline: ["tetracycline"], "ace inhibitor": ["ace-inhibitor"],
};

export function checkPrescription(
  itemNames: string[],
  patient: { allergies: string[]; currentMedications: string[] }
): Warning[] {
  const warnings: Warning[] = [];
  const items: DrugRef[] = itemNames.map(raw => ({ raw, drug: findDrug(raw) }));

  for (const it of items) {
    if (isRestricted(it.raw)) {
      warnings.push({ key: `restricted:${norm(it.raw)}`, severity: "contraindicated", type: "restricted", drugs: [it.raw],
        message: `${it.raw} is a controlled medicine and cannot be e-prescribed here. Issue a physical prescription.` });
    } else if (!it.drug) {
      warnings.push({ key: `unknown:${norm(it.raw)}`, severity: "moderate", type: "unknown_drug", drugs: [it.raw],
        message: `${it.raw} is not in the built-in formulary, so allergy and interaction checks were not performed for it. Check manually.` });
    }
  }

  // allergies
  for (const allergy of patient.allergies) {
    const a = norm(allergy);
    const groups = new Set<string>(ALLERGY_ALIASES[a] ?? []);
    for (const k of Object.keys(ALLERGY_ALIASES)) if (a.includes(k)) ALLERGY_ALIASES[k].forEach(g => groups.add(g));
    for (const it of items) {
      if (!it.drug) { if (a && norm(it.raw).includes(a)) warnings.push({ key: `allergy:${a}:${norm(it.raw)}`, severity: "major", type: "allergy", drugs: [it.raw], message: `Patient reports an allergy to "${allergy}".` }); continue; }
      const hit = it.drug.name === a || it.drug.aliases?.includes(a) || it.drug.allergyGroups?.some(g => groups.has(g));
      if (hit) warnings.push({ key: `allergy:${a}:${it.drug.name}`, severity: "major", type: "allergy", drugs: [it.drug.name],
        message: `Patient reports an allergy to "${allergy}", which matches ${it.drug.name}.` });
    }
  }

  // interactions: within the prescription and against the patient's current medications
  const current: DrugRef[] = patient.currentMedications.map(raw => ({ raw, drug: findDrug(raw) }));
  const pool = [
    ...items.filter(i => i.drug).map(i => ({ d: i.drug!, from: "prescription" as const })),
    ...current.filter(i => i.drug).map(i => ({ d: i.drug!, from: "current" as const })),
  ];
  const seen = new Set<string>();
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (pool[i].from === "current" && pool[j].from === "current") continue; // not our prescription
      const A = pool[i].d, B = pool[j].d;
      if (A.name === B.name) {
        const key = `duplicate:${A.name}`;
        if (!seen.has(key)) { seen.add(key); warnings.push({ key, severity: "major", type: "duplicate", drugs: [A.name], message: `${A.name} appears more than once (including the patient's current medicines).` }); }
        continue;
      }
      const ta = traits(A), tb = traits(B);
      for (const r of RULES) {
        const hit = (ta.has(r.a) && tb.has(r.b)) || (ta.has(r.b) && tb.has(r.a));
        if (!hit) continue;
        // "serotonergic" with itself needs two different drugs, which we have
        const key = `interaction:${[A.name, B.name].sort().join("+")}:${r.a}:${r.b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        warnings.push({ key, severity: r.severity, type: "interaction", drugs: [A.name, B.name], message: r.message });
      }
      // same-class duplication inside the prescription (e.g. two NSAIDs)
      const shared = A.classes.find(c => B.classes.includes(c) && ["nsaid", "ppi", "statin", "ssri", "ace-inhibitor", "arb", "opioid"].includes(c));
      if (shared && pool[i].from === "prescription" && pool[j].from === "prescription") {
        const key = `dupclass:${shared}:${[A.name, B.name].sort().join("+")}`;
        if (!seen.has(key)) { seen.add(key); warnings.push({ key, severity: "moderate", type: "duplicate", drugs: [A.name, B.name], message: `Two ${shared.replace("-", " ")} drugs together (therapeutic duplication).` }); }
      }
    }
  }

  const order: Record<Severity, number> = { contraindicated: 0, major: 1, moderate: 2 };
  return warnings.sort((x, y) => order[x.severity] - order[y.severity]);
}
