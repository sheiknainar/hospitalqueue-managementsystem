import { Department, Doctor } from '../types/database';

export interface SymptomAnalysisResult {
  recommendedDepartmentId?: string;
  recommendedDepartmentName: string;
  recommendedDoctorId?: string;
  recommendedDoctorName?: string;
  urgency: 'routine' | 'priority' | 'urgent' | 'emergency';
  confidence: number; // 0 to 100
  summary: string;
  chiefComplaint: string;
  possibleCauses: string[];
  homeCareTips: string[];
  questionsForDoctor: string[];
  isEmergency: boolean;
  emergencyWarning?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  suggestedActions?: { label: string; action: string }[];
}

const STORAGE_KEY_GEMINI = 'carequeue_gemini_api_key';

// Helper to get active Gemini API key (env or localStorage)
export const getGeminiApiKey = (): string => {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem(STORAGE_KEY_GEMINI) ||
    ''
  );
};

export const setGeminiApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY_GEMINI, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI);
  }
};

export const isGeminiConfigured = (): boolean => {
  return !!getGeminiApiKey();
};

/**
 * Built-in Medical Triage Heuristic Engine (Fallback & Instant Zero-Setup Mode)
 */
const triageKnowledgeBase: {
  keywords: string[];
  departmentKeywords: string[];
  urgency: 'routine' | 'priority' | 'urgent' | 'emergency';
  summary: string;
  possibleCauses: string[];
  homeCareTips: string[];
  questionsForDoctor: string[];
  isEmergency: boolean;
  emergencyWarning?: string;
}[] = [
  {
    keywords: [
      'chest pain',
      'heart attack',
      'angina',
      'crushing chest',
      'chest tightness',
      'left arm numbness',
      'palpitation',
      'irregular heartbeat',
      'cardiac',
    ],
    departmentKeywords: ['cardiology', 'cardiac', 'heart', 'emergency', 'general medicine'],
    urgency: 'emergency',
    summary:
      'Symptoms suggest possible cardiovascular involvement or acute chest distress. Requires urgent clinical evaluation.',
    possibleCauses: [
      'Angina / Coronary artery condition',
      'Costochondritis (chest wall inflammation)',
      'Gastroesophageal reflux (GERD)',
      'Arrhythmia or cardiac stress',
    ],
    homeCareTips: [
      'Rest in a comfortable, seated upright position.',
      'Do not perform any strenuous physical activity.',
      'If accompanied by shortness of breath, radiating arm pain, or fainting, visit Emergency Casualty immediately.',
    ],
    questionsForDoctor: [
      'Do I need an immediate ECG and cardiac enzyme evaluation?',
      'Could this pain be gastrointestinal or musculoskeletal?',
      'Are there activities or medications I should avoid immediately?',
    ],
    isEmergency: true,
    emergencyWarning:
      'RED FLAG: Severe chest pain, pain radiating to the jaw/left arm, or shortness of breath can be signs of a medical emergency. Please report to the Emergency / Casualty room immediately.',
  },
  {
    keywords: [
      'fracture',
      'sprain',
      'knee pain',
      'joint pain',
      'bone',
      'arthritis',
      'back pain',
      'spine',
      'shoulder pain',
      'ankle pain',
      'ligament',
      'swollen joint',
      'ortho',
    ],
    departmentKeywords: ['orthopedics', 'orthopaedics', 'bone', 'joint', 'physiotherapy', 'general medicine'],
    urgency: 'priority',
    summary:
      'Musculoskeletal or joint concern noted. Specialized orthopedic physical evaluation and imaging may be beneficial.',
    possibleCauses: [
      'Ligament sprain or tendon strain',
      'Osteoarthritis or joint inflammation',
      'Lumbar disc strain / Sciatica',
      'Micro-fracture or cartilage injury',
    ],
    homeCareTips: [
      'Follow R.I.C.E protocol (Rest, Ice, Compression, Elevation) for acute sprains.',
      'Avoid bearing excessive weight on the affected limb or joint.',
      'Maintain gentle support without restricting blood circulation.',
    ],
    questionsForDoctor: [
      'Is an X-Ray or MRI scan necessary to rule out structural injury?',
      'Would physical therapy and rehabilitation exercises help?',
      'Are there specific supports or braces recommended?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'headache',
      'migraine',
      'dizziness',
      'vertigo',
      'numbness',
      'seizure',
      'tingling',
      'stroke',
      'nerve',
      'tremor',
      'paralysis',
    ],
    departmentKeywords: ['neurology', 'neuro', 'general medicine'],
    urgency: 'priority',
    summary:
      'Neurological or neuro-vascular indicators identified. Examination by a Neurologist or Physician recommended.',
    possibleCauses: [
      'Migraine or tension-type cephalalgia',
      'Benign paroxysmal positional vertigo (BPPV)',
      'Peripheral neuropathy or cervical nerve compression',
      'Electrolyte imbalance or inner ear disturbance',
    ],
    homeCareTips: [
      'Rest in a quiet, dark, well-ventilated room.',
      'Stay adequately hydrated with clean water and oral fluids.',
      'Avoid bright screens, loud noises, and sudden posture transitions.',
    ],
    questionsForDoctor: [
      'Is my headache vascular, tension-related, or nerve-related?',
      'Should I undergo cranial imaging or EEG studies?',
      'What preventive measures reduce episode frequency?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'cough',
      'cold',
      'fever',
      'sore throat',
      'flu',
      'chills',
      'weakness',
      'body ache',
      'fatigue',
      'viral',
      'infection',
    ],
    departmentKeywords: ['general medicine', 'internal medicine', 'general', 'pediatrics', 'pulmonology'],
    urgency: 'routine',
    summary:
      'Symptoms correlate with common acute febrile illness, respiratory tract irritation, or seasonal viral syndrome.',
    possibleCauses: [
      'Viral upper respiratory tract infection (URTI)',
      'Seasonal pharyngitis or bronchitis',
      'Mild influenza or bacterial infection',
      'Environmental allergen reactivity',
    ],
    homeCareTips: [
      'Maintain plentiful oral hydration (warm fluids, broths).',
      'Warm saline gargles 2-3 times daily for sore throat relief.',
      'Monitor body temperature using an oral digital thermometer.',
    ],
    questionsForDoctor: [
      'Do I require a blood test (CBC) or swab test?',
      'Are antibiotics required or is supportive viral management indicated?',
      'What symptoms indicate I should return for urgent review?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'stomach pain',
      'abdominal pain',
      'acidity',
      'vomiting',
      'nausea',
      'diarrhea',
      'loose motion',
      'gas',
      'bloating',
      'indigestion',
      'constipation',
      'gastric',
    ],
    departmentKeywords: ['gastroenterology', 'general medicine', 'general surgery'],
    urgency: 'routine',
    summary:
      'Gastrointestinal symptoms identified. Clinical assessment will help localize abdominal discomfort and guide hydration/diet.',
    possibleCauses: [
      'Acute gastroenteritis (food/water infection)',
      'Gastritis or acid peptic disorder',
      'Irritable bowel syndrome (IBS)',
      'Biliary colic or appendicular irritation (if localized right lower abdomen)',
    ],
    homeCareTips: [
      'Sip oral rehydration salts (ORS) or electrolyte water frequently.',
      'Follow a bland BRAT diet (Bananas, Rice, Applesauce, Toast).',
      'Avoid spicy, oily, caffeinated, and dairy-heavy foods.',
    ],
    questionsForDoctor: [
      'Does my abdominal pain indicate localized inflammation like appendicitis or gallbladder?',
      'Should an ultrasound or stool routine test be performed?',
      'What prescription anti-emetic or antacid is safe for me?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'skin rash',
      'itching',
      'allergy',
      'eczema',
      'acne',
      'hives',
      'pimples',
      'hair loss',
      'dermatitis',
      'fungal',
      'red patches',
    ],
    departmentKeywords: ['dermatology', 'skin', 'general medicine'],
    urgency: 'routine',
    summary:
      'Cutaneous or dermatological reaction indicated. Direct visual inspection by a Dermatologist is ideal.',
    possibleCauses: [
      'Contact dermatitis or allergic urticaria',
      'Eczematous or fungal skin condition',
      'Acne vulgaris or folliculitis',
      'Heat rash or insect reaction',
    ],
    homeCareTips: [
      'Avoid scratching to prevent secondary bacterial infection.',
      'Apply gentle, fragrance-free moisturizer or calamine lotion.',
      'Wear loose, breathable cotton garments.',
    ],
    questionsForDoctor: [
      'Is this rash allergic, viral, or fungal in nature?',
      'Are topical corticosteroids or antihistamines indicated?',
      'What soaps and cosmetics should I strictly avoid?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'eye pain',
      'blurry vision',
      'red eye',
      'conjunctivitis',
      'vision loss',
      'watery eyes',
      'itchy eye',
      'cataract',
      'eye discharge',
    ],
    departmentKeywords: ['ophthalmology', 'eye', 'general medicine'],
    urgency: 'priority',
    summary:
      'Ophthalmic concern noted. Specialized slit-lamp examination and visual acuity testing recommended.',
    possibleCauses: [
      'Infectious or allergic conjunctivitis (pink eye)',
      'Corneal abrasion or foreign body irritation',
      'Digital eye strain / Dry eye syndrome',
      'Refractive error change or elevated intraocular pressure',
    ],
    homeCareTips: [
      'Do not rub the eyes under any circumstance.',
      'Wash hands thoroughly with soap before and after touching face.',
      'Discontinue contact lens use immediately until evaluated.',
    ],
    questionsForDoctor: [
      'Is there any corneal scratch or internal ocular inflammation?',
      'Are specific prescription lubricating or antibiotic drops needed?',
      'Should my intraocular eye pressure be evaluated?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'ear pain',
      'hearing loss',
      'tinnitus',
      'ear discharge',
      'nose bleed',
      'sinus',
      'tonsil',
      'throat pain',
      'hoarseness',
      'ent',
    ],
    departmentKeywords: ['ent', 'ear nose throat', 'otorhinolaryngology', 'general medicine'],
    urgency: 'routine',
    summary:
      'Otorhinolaryngology (Ear, Nose, Throat) symptoms detected. Otoscopic examination advised.',
    possibleCauses: [
      'Otitis media or externa (ear canal infection)',
      'Sinusitis or allergic rhinitis',
      'Tonsillitis or pharyngeal inflammation',
      'Cerumen (ear wax) impaction',
    ],
    homeCareTips: [
      'Never insert cotton buds or sharp objects into ear canals.',
      'Inhale gentle warm water steam for sinus congestion relief.',
      'Keep ears dry while bathing if discharge is present.',
    ],
    questionsForDoctor: [
      'Is the eardrum intact or is there fluid effusion behind it?',
      'Would nasal steroid sprays or antihistamines be effective?',
      'Is ear irrigation or micro-suction required?',
    ],
    isEmergency: false,
  },
  {
    keywords: [
      'child',
      'baby',
      'infant',
      'toddler',
      'pediatric',
      'vaccination',
      'crying constantly',
      'feeding trouble',
      'colic',
    ],
    departmentKeywords: ['pediatrics', 'child health', 'general medicine'],
    urgency: 'priority',
    summary:
      'Pediatric presentation identified. Specialized child-friendly clinical examination and weight-adjusted dosing recommended.',
    possibleCauses: [
      'Common pediatric viral syndrome',
      'Infantile colic or teething distress',
      'Otitis media or childhood throat irritation',
      'Routine developmental / vaccination milestone',
    ],
    homeCareTips: [
      'Ensure adequate fluid and milk intake to maintain diaper output.',
      'Do not administer adult medications or dosages to infants.',
      'Keep the child in a calm, comfortable environment.',
    ],
    questionsForDoctor: [
      'What is the child-safe weight-appropriate dosage?',
      'Are the child’s vaccinations up-to-date?',
      'What specific signs require immediate pediatric ER care?',
    ],
    isEmergency: false,
  },
];

/**
 * Analyze symptoms using real Gemini API if key exists, otherwise use clinical heuristic engine
 */
export async function analyzeSymptomsWithAI(
  symptoms: string,
  departments: Department[],
  doctors: Doctor[]
): Promise<SymptomAnalysisResult> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const result = await callGeminiSymptomAnalysis(symptoms, departments, doctors, apiKey);
      if (result) return result;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to intelligent triage engine:', err);
    }
  }

  // Fallback to intelligent local triage engine
  return localTriageEngine(symptoms, departments, doctors);
}

/**
 * Call Google Gemini REST API
 */
async function callGeminiSymptomAnalysis(
  symptoms: string,
  departments: Department[],
  doctors: Doctor[],
  apiKey: string
): Promise<SymptomAnalysisResult | null> {
  const departmentListStr = departments
    .map(d => `- ID: "${d.id}", Name: "${d.name}"`)
    .join('\n');

  const doctorListStr = doctors
    .map(
      doc =>
        `- ID: "${doc.id}", Name: "Dr. ${doc.profile?.full_name || 'Doctor'}", Specialization: "${doc.specialization}", DeptID: "${doc.department_id || ''}"`
    )
    .join('\n');

  const systemPrompt = `You are CareQueue's certified AI Clinical Triage and Medical Department Recommendation Specialist for a modern hospital.
A patient is entering their symptoms to book an outpatient (OPD) appointment.
Analyze the symptoms and output STRICTLY VALID JSON conforming to the requested schema.

Hospital Departments Available:
${departmentListStr || 'General Medicine, Cardiology, Orthopedics, Pediatrics, Dermatology, Neurology, ENT, Ophthalmology'}

Hospital Doctors Available:
${doctorListStr || 'Available on request'}

Schema to return:
{
  "recommendedDepartmentName": "Department Name",
  "recommendedDepartmentId": "Department ID from list or empty string",
  "recommendedDoctorId": "Doctor ID from list or empty string",
  "recommendedDoctorName": "Doctor Name from list or empty string",
  "urgency": "routine" | "priority" | "urgent" | "emergency",
  "confidence": 85,
  "summary": "1-2 sentence medical analysis of why this department is suggested",
  "chiefComplaint": "Concise medical phrasing of patient symptoms (e.g. 'Acute epigastric discomfort radiating to chest')",
  "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
  "homeCareTips": ["Tip 1", "Tip 2"],
  "questionsForDoctor": ["Question 1", "Question 2"],
  "isEmergency": boolean,
  "emergencyWarning": "Warning text if red-flag symptoms exist, otherwise null"
}

Do not include markdown backticks around JSON if possible. Return ONLY the raw JSON object.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: `Patient Symptom Description: "${symptoms}"` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('No response text from Gemini');

  // Parse JSON from text
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  // Link matched department and doctor IDs if matching by name
  let deptId = parsed.recommendedDepartmentId;
  let doctorId = parsed.recommendedDoctorId;

  if (!deptId && parsed.recommendedDepartmentName) {
    const match = departments.find(d =>
      d.name.toLowerCase().includes(parsed.recommendedDepartmentName.toLowerCase())
    );
    if (match) deptId = match.id;
  }

  if (!doctorId && deptId) {
    const docMatch = doctors.find(d => d.department_id === deptId);
    if (docMatch) {
      doctorId = docMatch.id;
      parsed.recommendedDoctorName = docMatch.profile?.full_name || parsed.recommendedDoctorName;
    }
  }

  return {
    recommendedDepartmentId: deptId || departments[0]?.id || '',
    recommendedDepartmentName: parsed.recommendedDepartmentName || departments[0]?.name || 'General Medicine',
    recommendedDoctorId: doctorId || (doctors.length > 0 ? doctors[0].id : ''),
    recommendedDoctorName: parsed.recommendedDoctorName || (doctors[0]?.profile?.full_name ? `Dr. ${doctors[0].profile.full_name}` : 'Available Physician'),
    urgency: parsed.urgency || 'routine',
    confidence: parsed.confidence || 90,
    summary: parsed.summary,
    chiefComplaint: parsed.chiefComplaint || symptoms,
    possibleCauses: parsed.possibleCauses || [],
    homeCareTips: parsed.homeCareTips || [],
    questionsForDoctor: parsed.questionsForDoctor || [],
    isEmergency: !!parsed.isEmergency,
    emergencyWarning: parsed.emergencyWarning || undefined,
  };
}

/**
 * Intelligent Local Fallback Engine
 */
function localTriageEngine(
  symptoms: string,
  departments: Department[],
  doctors: Doctor[]
): SymptomAnalysisResult {
  const query = symptoms.toLowerCase();

  let bestMatch = triageKnowledgeBase[3]; // default to General Medicine / Flu
  let maxScore = 0;

  for (const entry of triageKnowledgeBase) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (query.includes(kw)) {
        score += 3;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = entry;
    }
  }

  // Find matching department from hospital database
  let matchedDept: Department | undefined;
  for (const deptKw of bestMatch.departmentKeywords) {
    matchedDept = departments.find(d => d.name.toLowerCase().includes(deptKw));
    if (matchedDept) break;
  }

  if (!matchedDept && departments.length > 0) {
    matchedDept = departments[0];
  }

  // Find doctor in matched department
  let matchedDoctor = doctors.find(
    doc => matchedDept && doc.department_id === matchedDept.id
  );
  if (!matchedDoctor && doctors.length > 0) {
    matchedDoctor = doctors[0];
  }

  const confidence = maxScore > 0 ? Math.min(75 + maxScore * 5, 96) : 70;

  return {
    recommendedDepartmentId: matchedDept?.id,
    recommendedDepartmentName: matchedDept?.name || 'General Medicine',
    recommendedDoctorId: matchedDoctor?.id,
    recommendedDoctorName: matchedDoctor?.profile?.full_name
      ? `Dr. ${matchedDoctor.profile.full_name}`
      : 'Consulting Physician',
    urgency: bestMatch.urgency,
    confidence,
    summary: bestMatch.summary,
    chiefComplaint: `Patient presents with: ${symptoms.slice(0, 120)}`,
    possibleCauses: bestMatch.possibleCauses,
    homeCareTips: bestMatch.homeCareTips,
    questionsForDoctor: bestMatch.questionsForDoctor,
    isEmergency: bestMatch.isEmergency,
    emergencyWarning: bestMatch.emergencyWarning,
  };
}

/**
 * Standard Medical Advice Safe Redirection
 * The AI must NEVER provide medical diagnosis, prescription, or treatment advice.
 */
export const MEDICAL_ADVICE_DISCLAIMER =
  'I can help you with the hospital system, appointments, queues, departments, and other website features. For medical advice or treatment, please consult a qualified healthcare professional.';

/**
 * Detects if the user query is asking for medical advice, medicine prescriptions, or disease diagnosis.
 */
export function isMedicalAdviceQuery(query: string): boolean {
  const q = query.toLowerCase().trim();

  // Navigation questions about reports or prescriptions should NOT trigger the disclaimer
  const isSystemNavigation =
    q.includes('where can i see my prescription') ||
    q.includes('where can i find my prescription') ||
    q.includes('where is my prescription') ||
    q.includes('where can i see my medical report') ||
    q.includes('where can i find my report') ||
    q.includes('where is my report') ||
    q.includes('how do i download my report') ||
    q.includes('how to download my report') ||
    q.includes('how can i see my report');

  if (isSystemNavigation) {
    return false;
  }

  // Medical query keywords
  const medicalTriggers = [
    'medicine',
    'medicines',
    'tablet',
    'tablets',
    'pill',
    'pills',
    'capsule',
    'capsules',
    'syrup',
    'dosage',
    'dose',
    'antibiotic',
    'antibiotics',
    'paracetamol',
    'ibuprofen',
    'painkiller',
    'painkillers',
    'prescribe',
    'cure for',
    'treatment for',
    'how to cure',
    'how to treat',
    'take for fever',
    'take for pain',
    'take for headache',
    'take for cold',
    'take for stomach',
    'take for cough',
    'diagnose',
    'diagnosis',
    'do i have',
    'am i sick',
    'is it cancer',
    'heart attack symptoms',
    'stroke symptoms',
    'interpret my report',
    'interpret my blood',
    'interpret my lab',
    'what does my report mean',
    'what does my blood test mean',
    'what does my mri mean',
    'what does my scan mean',
    'what is wrong with my body',
    'am i dying',
    'disease prediction',
    'home remedy for disease',
  ];

  return medicalTriggers.some(kw => q.includes(kw));
}

export interface HospitalAssistantContext {
  hospitalName: string;
  patientName?: string;
  currentTokenNumber?: number | null;
  currentServingToken?: number | null;
  patientsAhead?: number;
  estimatedWaitMinutes?: number;
  doctorName?: string;
  doctorSpecialization?: string;
  departmentName?: string;
  departmentLocation?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentStatus?: string;
  totalPastAppointments?: number;
  departments?: { name: string; description?: string; location?: string }[];
  doctors?: { name: string; specialization: string; departmentName?: string; availability?: string }[];
}

/**
 * Department Location Directory for Bharathiar Hospital
 */
export const HOSPITAL_DEPT_LOCATIONS: Record<string, string> = {
  cardiology: 'Block A, 1st Floor, Room 102 (East Wing)',
  orthopedics: 'Block B, Ground Floor, Room 004 (West Wing)',
  'general medicine': 'Block A, Ground Floor, Rooms 001 - 003',
  pediatrics: 'Block B, 1st Floor, Room 108 (Childrens Clinic)',
  dermatology: 'Block C, 2nd Floor, Room 204 (Skin Care Wing)',
  neurology: 'Block C, 1st Floor, Room 112 (Neuro Diagnostic Lab)',
  ent: 'Block A, 2nd Floor, Room 201 (ENT Examination Suite)',
  ophthalmology: 'Block B, 2nd Floor, Room 205 (Eye Care Clinic)',
  emergency: 'Ground Floor, Main Entrance (24/7 Casualty & Trauma Center)',
  casualty: 'Ground Floor, Main Entrance (24/7 Casualty & Trauma Center)',
  pharmacy: 'Ground Floor, Central Concourse (Adjacent to Main Reception)',
  laboratory: 'Block A, Basement 1 (Central Diagnostic Pathology & Blood Bank)',
  billing: 'Ground Floor, Counter 1 & 2 (Central Reception)',
};

/**
 * Conversational Hospital Assistant
 * Strict purpose: Help patients understand and navigate the hospital web application.
 */
export async function chatWithHospitalAssistant(
  question: string,
  conversationHistory: ChatMessage[],
  context: HospitalAssistantContext
): Promise<string> {
  // 1. Strict Medical Advice Filter: Never provide medical diagnosis or medicine recommendations
  if (isMedicalAdviceQuery(question)) {
    return MEDICAL_ADVICE_DISCLAIMER;
  }

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const response = await callGeminiChat(question, conversationHistory, context, apiKey);
      if (response) return response;
    } catch (err) {
      console.warn('Gemini chat failed, using local assistant engine:', err);
    }
  }

  // 2. High-precision Local Knowledge Engine
  return localChatbotResponse(question, context);
}

async function callGeminiChat(
  question: string,
  history: ChatMessage[],
  context: HospitalAssistantContext,
  apiKey: string
): Promise<string> {
  const deptListStr = context.departments && context.departments.length > 0
    ? context.departments.map(d => `- ${d.name} (${d.location || 'Consultation Block'})`).join('\n')
    : '- General Medicine\n- Cardiology (Block A, 1st Floor)\n- Orthopedics (Block B, Ground Floor)\n- Pediatrics (Block B, 1st Floor)\n- Neurology (Block C, 1st Floor)\n- Dermatology (Block C, 2nd Floor)\n- ENT (Block A, 2nd Floor)\n- Ophthalmology (Block B, 2nd Floor)';

  const doctorListStr = context.doctors && context.doctors.length > 0
    ? context.doctors.map(d => `- ${d.name} (${d.specialization}, ${d.departmentName || 'General'})`).join('\n')
    : 'Available specialists in all major departments.';

  const systemInstruction = `You are "CareQueue AI", the official Hospital Website and Patient Navigation Assistant for ${context.hospitalName}.

CRITICAL POLICY - NO MEDICAL ADVICE:
You are STRICTLY a website navigation and hospital system assistant. You are NOT a doctor or medical AI.
You must NEVER:
1. Diagnose diseases or evaluate symptoms.
2. Recommend medicines, tablets, drugs, syrups, or dosages.
3. Suggest treatments, cures, or home remedies for illnesses.
4. Interpret medical reports, lab results, or scans.
5. Make medical decisions.
If the patient asks ANY question about what medicine to take, symptom diagnosis, treatment, or report interpretation, you MUST respond ONLY with:
"${MEDICAL_ADVICE_DISCLAIMER}"

YOUR PURPOSE:
Help patients understand and navigate the hospital application, appointments, live tokens, queue progress, and hospital departments.

LIVE PATIENT DATA (Use this real data in your answers):
- Patient Name: ${context.patientName || 'Patient'}
- Active Token for Today: ${context.currentTokenNumber ? '#' + context.currentTokenNumber : 'None booked today'}
- Currently Serving Token: ${context.currentServingToken ? '#' + context.currentServingToken : 'Waiting to start'}
- Patients Ahead in Queue: ${context.patientsAhead !== undefined ? context.patientsAhead : 0}
- Estimated Wait: ${context.estimatedWaitMinutes ? context.estimatedWaitMinutes + ' minutes' : 'N/A'}
- Consulting Doctor: ${context.doctorName || 'None assigned'} (${context.doctorSpecialization || 'Specialist'})
- Assigned Department: ${context.departmentName || 'N/A'} (Location: ${context.departmentLocation || 'Check at Central Reception'})
- Appointment Schedule: ${context.appointmentDate || 'No appointment scheduled'} at ${context.appointmentTime || 'N/A'}
- Appointment Status: ${context.appointmentStatus || 'None'}
- Previous Consultation Records: ${context.totalPastAppointments ?? 0} past appointments

HOSPITAL DEPARTMENTS:
${deptListStr}

DOCTORS LIST:
${doctorListStr}

KEY FEATURES OF THE SYSTEM TO EXPLAIN:
1. How to book appointment: Click "Book Appointment" in the sidebar (/patient/book), pick department, doctor, date & slot, and confirm.
2. Where to see appointment: "My Dashboard & Token" (/patient) for today's active visit, and "Appointment History" (/patient/history) for all bookings.
3. How queue works: Tokens are issued sequentially. Watch live token on dashboard. Token turns yellow when called and green when in consultation.
4. "I'm on my way" button: Informs the hospital team that the patient has departed and is traveling to the clinic.
5. "I've arrived" button: Checks the patient in as physically present in the waiting area so the doctor knows they are ready.
6. Reports & Prescriptions: Doctors record notes and prescriptions upon consultation completion. Summaries can be reviewed in Appointment History (/patient/history). Printed lab reports are at the Central Records Counter (Ground Floor). Note: AI cannot read or interpret medical reports.

Format your responses with clean, readable markdown bullet points, bold key areas, and concise, empathetic tone.`;

  const recentHistory = history.slice(-6).map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        ...recentHistory,
        { role: 'user', parts: [{ text: question }] },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini response error ${response.status}`);
  const json = await response.json();
  return (
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I am here to help you navigate the hospital system. How can I assist you with your appointment or token?"
  );
}

function localChatbotResponse(question: string, context: HospitalAssistantContext): string {
  const q = question.toLowerCase().trim();

  // Strict Medical Advice check
  if (isMedicalAdviceQuery(q)) {
    return MEDICAL_ADVICE_DISCLAIMER;
  }

  // 1. TOKEN INQUIRIES ("Where can I see my token?", "What is my token?")
  if (
    q.includes('my token') ||
    q.includes('see my token') ||
    q.includes('token number') ||
    q.includes('where is my token') ||
    q.includes('token status')
  ) {
    if (context.currentTokenNumber) {
      const serving = context.currentServingToken ? `#${context.currentServingToken}` : 'Queue not yet called';
      const ahead = context.patientsAhead !== undefined ? context.patientsAhead : 0;
      return `🎫 **Your Live Consultation Token:**\n- **Your Token:** #${context.currentTokenNumber}\n- **Currently Serving:** ${serving}\n- **Patients Ahead:** ${ahead}\n- **Consulting Doctor:** ${context.doctorName || 'Assigned Specialist'}\n- **Department:** ${context.departmentName || 'General OPD'}\n\nYou can always view your live token badge on your **My Dashboard & Token** page.`;
    }
    return `You do not have an active queue token for today yet. To get an appointment token, go to the **Book Appointment** tab on the left navigation menu.`;
  }

  // 2. QUEUE POSITION & PATIENTS AHEAD ("What is my current queue position?", "How many patients are ahead of me?")
  if (
    q.includes('position') ||
    q.includes('patients ahead') ||
    q.includes('how many ahead') ||
    q.includes('how many patients') ||
    q.includes('queue status')
  ) {
    if (context.currentTokenNumber) {
      const ahead = context.patientsAhead !== undefined ? context.patientsAhead : 0;
      if (ahead === 0) {
        return `🎉 **You are next in line!**\n- **Your Token:** #${context.currentTokenNumber}\n- **Doctor:** ${context.doctorName || 'Doctor'}\n- **Status:** Please remain near **${context.departmentLocation || 'the consultation room'}** as your number is approaching!`;
      }
      return `👥 **Queue Position:**\n- **Your Token:** #${context.currentTokenNumber}\n- **Currently Serving:** ${context.currentServingToken ? '#' + context.currentServingToken : 'Starting shortly'}\n- **Patients Ahead of You:** **${ahead}**\n- **Estimated Wait:** Approximately **${context.estimatedWaitMinutes || ahead * 12} minutes**\n\nYour dashboard will automatically sound an alert and change colors when your turn arrives!`;
    }
    return `You currently do not have an active queue position today because no consultation token is booked. You can book an appointment under **Book Appointment** in the patient menu.`;
  }

  // 3. ESTIMATED CONSULTATION TIME ("Where can I see my estimated consultation time?", "When is my estimated consultation?")
  if (
    q.includes('estimated consultation') ||
    q.includes('estimated time') ||
    q.includes('wait time') ||
    q.includes('when is my turn') ||
    q.includes('how long')
  ) {
    if (context.currentTokenNumber) {
      const wait = context.estimatedWaitMinutes || (context.patientsAhead !== undefined ? context.patientsAhead * 12 : 15);
      return `⏱️ **Estimated Consultation Time:**\n- **Estimated Wait:** ~**${wait} minutes**\n- **Patients Ahead:** ${context.patientsAhead ?? 0}\n- **Scheduled Slot:** ${context.appointmentTime || 'Today\'s OPD Session'}\n- **Doctor:** ${context.doctorName || 'Assigned Doctor'}\n\n*Note: Wait times are calculated at approximately 10-15 minutes per consultation and update dynamically as doctors progress.*`;
    }
    return `Your estimated consultation time is displayed on **My Dashboard & Token** once you have an active appointment for today. Currently, you do not have an active booking.`;
  }

  // 4. HOW QUEUE SYSTEM WORKS & TOKEN MEANING ("How does the queue system work?", "What does my token number mean?")
  if (
    q.includes('queue system work') ||
    q.includes('how does the queue work') ||
    q.includes('token number mean') ||
    q.includes('what does my token mean') ||
    q.includes('token system')
  ) {
    return `📋 **How the Hospital Queue System Works:**\n1. **Digital Token:** When you book an appointment, you receive a sequential token number for that doctor for today.\n2. **Fair Sequential Order:** The doctor calls tokens in order (#1, #2, #3, etc.).\n3. **Live Screen Tracking:** Your dashboard displays the currently serving token and the exact number of patients ahead of you.\n4. **Turn Calling:** When your token is called, an audible chime sounds and your token badge highlights in yellow/green, signaling you to enter the consultation room.`;
  }

  // 5. STATUS MEANINGS ("What does 'I'm on my way' mean?", "What does 'I've arrived' mean?")
  if (q.includes('on my way') || q.includes("i'm on my way")) {
    return `🚗 **"I'm on my way" Status:**\nClicking this button on your dashboard notifies the hospital reception desk and your consulting doctor that you have departed from your location and are traveling to the hospital.`;
  }

  if (q.includes('arrived') || q.includes("i've arrived")) {
    return `🏥 **"I've arrived" Status:**\nClicking this button confirms that you have reached the hospital and are waiting in the clinic lounge. It alerts the doctor that you are present and ready to enter as soon as your token is called!`;
  }

  // 6. APPOINTMENT BOOKING ("How do I book an appointment?")
  if (
    q.includes('how do i book') ||
    q.includes('how to book') ||
    q.includes('book an appointment') ||
    q.includes('schedule an appointment') ||
    q.includes('book appointment')
  ) {
    return `📅 **How to Book an Appointment:**\n1. Click **"Book Appointment"** in the left sidebar menu (or visit \`/patient/book\`).\n2. Select your required **Department** (e.g. Cardiology, Orthopedics, General Medicine).\n3. Choose your preferred **Doctor**.\n4. Pick an available **Date** and **Consultation Time Slot**.\n5. Click **"Confirm Appointment"**. Your digital queue token will be created immediately!`;
  }

  // 7. VIEWING APPOINTMENTS ("Where can I see my appointment?", "Where can I find my appointment details?")
  if (
    q.includes('see my appointment') ||
    q.includes('find my appointment') ||
    q.includes('my appointment details') ||
    q.includes('where is my appointment')
  ) {
    if (context.currentTokenNumber || context.appointmentDate) {
      return `📅 **Your Current Appointment Details:**\n- **Doctor:** ${context.doctorName || 'Assigned Doctor'} (${context.doctorSpecialization || 'Specialist'})\n- **Department:** ${context.departmentName || 'General OPD'}\n- **Date & Time:** ${context.appointmentDate || 'Today'} at ${context.appointmentTime || 'OPD hours'}\n- **Token Number:** ${context.currentTokenNumber ? '#' + context.currentTokenNumber : 'Pending'}\n- **Status:** ${context.appointmentStatus || 'Confirmed'}\n\nYou can see full live details on **"My Dashboard & Token"** (\`/patient\`) or view past visits under **"Appointment History"** (\`/patient/history\`).`;
    }
    return `You can view all your appointments in two places:\n1. **My Dashboard & Token** (\`/patient\`) – Shows your active visit, live token, and queue status for today.\n2. **Appointment History** (\`/patient/history\`) – Shows all your past, upcoming, and completed consultations.`;
  }

  // 8. CANCELLING & RESCHEDULING ("How can I cancel my appointment?", "How can I reschedule my appointment?")
  if (q.includes('cancel') && q.includes('appointment')) {
    return `❌ **How to Cancel an Appointment:**\n- You can review and manage your scheduled appointments on the **Appointment History** page (\`/patient/history\`).\n- For same-day immediate cancellations or to release your queue token, you can also contact our hospital reception desk directly at **+91 8610221213**.`;
  }

  if (q.includes('reschedule')) {
    return `🔄 **How to Reschedule an Appointment:**\n1. Navigate to **Book Appointment** (\`/patient/book\`) and reserve your new preferred date and time slot.\n2. In **Appointment History** (\`/patient/history\`), you can review your previous booking or ask the reception desk at **+91 8610221213** to update your schedule.`;
  }

  // 9. HOSPITAL NAVIGATION & DEPARTMENT LOCATIONS ("Where is Cardiology?", "Where is Orthopedics?", etc.)
  for (const [deptKey, location] of Object.entries(HOSPITAL_DEPT_LOCATIONS)) {
    if (q.includes(deptKey)) {
      const deptTitle = deptKey.charAt(0).toUpperCase() + deptKey.slice(1);
      return `📍 **${deptTitle} Department Location:**\n**${location}**\n\nFollow the directional signage from the Main Ground Floor Lobby or ask the Central Information Desk.`;
    }
  }

  if (q.includes('where is my appointment department') || q.includes('my department location')) {
    if (context.departmentName) {
      const loc = context.departmentLocation || HOSPITAL_DEPT_LOCATIONS[context.departmentName.toLowerCase()] || 'Main Consultation Block';
      return `📍 **Your Booked Department:**\n- **Department:** ${context.departmentName}\n- **Location:** ${loc}\n- **Doctor:** ${context.doctorName || 'Doctor'}`;
    }
    return `You do not have an active department booking today. When you schedule an appointment, your department's exact room and floor will be listed here.`;
  }

  if (q.includes('consultation room') || q.includes('find the room') || q.includes('where is the room')) {
    return `🚪 **How to Find Your Consultation Room:**\n1. Check your assigned doctor and department on **My Dashboard & Token**.\n2. All consultation rooms are numbered with block signage (Block A, B, and C).\n3. The Central Information & Reception Desk is located at the **Ground Floor Main Entrance** to guide you directly to your doctor's suite.`;
  }

  if (q.includes('doctor details') || q.includes('doctors') || q.includes('see the doctor')) {
    let docList = '';
    if (context.doctors && context.doctors.length > 0) {
      docList = context.doctors.map(d => `- **${d.name}** – ${d.specialization} (${d.departmentName || 'General OPD'})`).join('\n');
    } else {
      docList = `- **Dr. Priya Sharma** – Cardiologist (Heart Specialist)\n- **Dr. Rajesh Kumar** – Orthopedic Surgeon (Bone & Joint)\n- **Dr. Ananya Iyer** – General Physician (Internal Medicine)\n- **Dr. Vikram Seth** – Neurologist (Brain & Spine)`;
    }
    return `👨‍⚕️ **Hospital Doctors Directory:**\n${docList}\n\nYou can review full profiles and schedule consultations on the **Book Appointment** page (\`/patient/book\`).`;
  }

  // 10. PATIENT ACCOUNT, PROFILE & HISTORY ("Where can I update my profile?", "Where can I see my medical history?")
  if (q.includes('update my profile') || q.includes('edit profile') || q.includes('change phone')) {
    return `👤 **Updating Your Patient Profile:**\nYour personal details (full name, phone number, date of birth) are safely stored in your hospital record. To update your contact details or address, please visit the **Hospital Registration & Reception Desk** during your visit.`;
  }

  if (
    q.includes('medical history') ||
    q.includes('previous appointment') ||
    q.includes('past appointment') ||
    q.includes('history')
  ) {
    const pastCount = context.totalPastAppointments ?? 0;
    return `📜 **Consultation & Visit History:**\nYou have **${pastCount}** consultation record(s) on file.\nYou can review the complete history of all your completed, cancelled, and upcoming appointments by clicking **"Appointment History"** on the left menu (or visiting \`/patient/history\`).`;
  }

  if (q.includes('notification') || q.includes('alert')) {
    return `🔔 **Notifications & Turn Alerts:**\n- Live notifications appear in real time on your **My Dashboard & Token** page.\n- When your token is called by the doctor, a visual notification banner and an audio chime will alert you immediately.`;
  }

  // 11. MEDICAL REPORTS & PRESCRIPTIONS ("Where can I see my medical report?", "How do I download my report?")
  if (
    q.includes('medical report') ||
    q.includes('my report') ||
    q.includes('download my report') ||
    q.includes('prescription') ||
    q.includes('lab test')
  ) {
    return `📋 **Medical Reports & Prescriptions Navigation:**\n- **Prescriptions:** Prescribed medications and clinical advice are documented by your doctor upon completing your consultation and recorded with your visit in **Appointment History** (\`/patient/history\`).\n- **Diagnostic & Lab Reports:** Official physical printouts and diagnostic lab reports can be collected at the **Central Medical Records & Laboratory Desk (Block A, Ground Floor Counter 3)**.\n\n*Note: As a hospital system assistant, I help with website navigation and cannot read or interpret medical reports.*`;
  }

  // 12. GENERAL WEBSITE HELP ("How does this website work?")
  if (q.includes('how does this website work') || q.includes('what can you do') || q.includes('help')) {
    return `👋 **Welcome to Bharathiar Hospital CareQueue!**\nHere is what you can do on our digital patient platform:\n- 📅 **Book Appointments:** Schedule OPD consultations with our doctors online.\n- 🎫 **Live Queue Tracking:** View your sequential token number and see how many patients are ahead in real time.\n- ⏱️ **Estimated Consultation Time:** Monitor your wait time so you do not have to wait in physical lines.\n- 📜 **Appointment History:** Review all your past and upcoming consultations.\n- 📍 **Hospital Navigation:** Find department rooms, OPD timings, and emergency contacts.`;
  }

  // OPD Timings & Emergency
  if (q.includes('time') || q.includes('timing') || q.includes('hours') || q.includes('open')) {
    return `🕒 **Hospital OPD Timings:**\n- **General OPD:** Monday – Saturday: 08:00 AM – 08:00 PM\n- **Sunday OPD:** 09:00 AM – 01:00 PM\n- **24/7 Casualty & Emergency:** Open 24 hours a day, 365 days a year.`;
  }

  if (q.includes('emergency') || q.includes('ambulance') || q.includes('casualty')) {
    return `🚨 **24/7 Emergency Assistance:**\nOur Casualty & Trauma Center is open 24 hours a day, 7 days a week.\n- Emergency Hotline: **+91 8610221213**\n- Ambulance Services: Dial **108** or contact our Ground Floor Emergency Bay.`;
  }

  // Greeting
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hello ${context.patientName || 'there'}! 👋 I am CareQueue AI, your hospital website assistant for Bharathiar Hospital.\n\nI can help you check your live token, see how many patients are ahead, find department rooms, or guide you through booking appointments. What would you like to know?`;
  }

  // Default response
  return `I am your **Hospital System & Navigation Assistant**. I can help you with:\n- 🎫 Checking your **live token status & patients ahead**\n- ⏱️ Finding your **estimated consultation time**\n- 📅 Guiding you to **book or reschedule appointments**\n- 📍 Locating **departments & consultation rooms**\n- 📜 Viewing your **appointment history & records guidance**\n\n*Note: For medical emergencies or treatment advice, please consult a qualified healthcare professional.*`;
}

