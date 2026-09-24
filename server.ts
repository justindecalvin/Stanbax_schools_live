import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper to call Gemini with resilient model fallback
async function generateWithGemini(ai: GoogleGenAI, params: {
  contents: any;
  config?: any;
}) {
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastErr = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      return { response, model };
    } catch (err: any) {
      lastErr = err;
      console.warn(`Model ${model} failed, attempting fallback:`, err?.message || err?.status);
    }
  }
  throw lastErr;
}

interface AssessmentRequest {
  classLevel: string;
  ageGroup?: string;
  subject: string;
  term: string;
  assessmentType: string;
  curriculumTopics?: string;
  difficulty?: string;
  targetObjectiveCount?: number;
  targetTheoryCount?: number;
}

// Structured Assessment Response Interface
interface AssessmentResponse {
  title: string;
  schoolName: string;
  classLevel: string;
  subject: string;
  term: string;
  timeAllowed: string;
  instructions: string;
  isEarlyYearsPictorial: boolean;
  isSecondaryFiftySix: boolean;
  objectives: Array<{
    id: number;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD?: string;
    correctOption: string;
    singleLineFormat: string;
    pictorialSymbol?: string;
    visualHint?: string;
  }>;
  theory: Array<{
    id: number;
    questionNumber: number;
    questionText: string;
    subParts?: string[];
    maxScore: number;
    sampleAnswer?: string;
  }>;
  paperSavingText: string;
  markingGuide: string;
}

// Deterministic Curriculum Generator Fallback (guarantees instantaneous, rich, paper-saving output even without API key)
function generateCurriculumFallback(req: AssessmentRequest): AssessmentResponse {
  const isEarlyYears = 
    req.classLevel.toLowerCase().includes('nursery') || 
    req.classLevel.toLowerCase().includes('kindergarten') || 
    req.classLevel.toLowerCase().includes('kg') || 
    req.classLevel.toLowerCase().includes('reception') || 
    req.classLevel.toLowerCase().includes('early') || 
    (req.ageGroup && req.ageGroup.includes('3-6'));

  const isSecondary = 
    req.classLevel.toLowerCase().includes('jss') || 
    req.classLevel.toLowerCase().includes('sss') || 
    req.classLevel.toLowerCase().includes('secondary');

  const objCount = isSecondary ? 50 : isEarlyYears ? 15 : (req.targetObjectiveCount || 25);
  const theoryCount = isSecondary ? 6 : isEarlyYears ? 0 : 4;

  const objectives: AssessmentResponse['objectives'] = [];
  const theory: AssessmentResponse['theory'] = [];

  if (isEarlyYears) {
    // Early Years Pictorial Questions for ages 3-6
    const pictorialBank = [
      { q: "Count the apples: 🍎 🍎 🍎. How many apples are there?", sym: "🍎🍎🍎", a: "2 apples", b: "3 apples", c: "4 apples", d: "5 apples", ans: "B", hint: "Three red apples" },
      { q: "Which animal says 'Woof-Woof'?", sym: "🐶 🐱 🐮 🦁", a: "Cat (🐱)", b: "Dog (🐶)", c: "Cow (🐮)", d: "Lion (🦁)", ans: "B", hint: "Friendly puppy" },
      { q: "Which shape is a Circle?", sym: "🔴 ⬛ 🔺 ⭐", a: "Square (⬛)", b: "Triangle (🔺)", c: "Circle (🔴)", d: "Star (⭐)", ans: "C", hint: "Round ball" },
      { q: "What color is the ripe banana?", sym: "🍌 🟡 🟢 🔴", a: "Blue", b: "Yellow", c: "Purple", d: "Black", ans: "B", hint: "Yellow sunshine" },
      { q: "Which letter is for Apple?", sym: "🅰️ 🅱️ 🅲️ 🅳️", a: "Letter B", b: "Letter C", c: "Letter A", d: "Letter D", ans: "C", hint: "A for Apple" },
      { q: "Identify the vehicle that flies in the sky:", sym: "✈️ 🚗 🚲 🚢", a: "Car (🚗)", b: "Aeroplane (✈️)", c: "Bicycle (🚲)", d: "Ship (🚢)", ans: "B", hint: "High in the clouds" },
      { q: "Count the shining stars: ⭐ ⭐ ⭐ ⭐ ⭐", sym: "⭐⭐⭐⭐⭐", a: "3 stars", b: "4 stars", c: "5 stars", d: "6 stars", ans: "C", hint: "Five stars" },
      { q: "Which fruit is sweet and orange in color?", sym: "🍊 🍇 🍉 🍋", a: "Orange (🍊)", b: "Grapes (🍇)", c: "Watermelon (🍉)", d: "Lemon (🍋)", ans: "A", hint: "Juicy citrus" },
      { q: "Which of these is a domestic pet animal?", sym: "🐱 🐊 🐘 🦈", a: "Cat (🐱)", b: "Crocodile (🐊)", c: "Elephant (🐘)", d: "Shark (🦈)", ans: "A", hint: "Little kitten" },
      { q: "Which part of your body do you use to SMELL flowers?", sym: "👃 👁️ 👂 👄", a: "Eyes (👁️)", b: "Ears (👂)", c: "Nose (👃)", d: "Mouth (👄)", ans: "C", hint: "Sniffing scents" },
      { q: "Which number comes after 4?", sym: "1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣", a: "3", b: "5", c: "2", d: "6", ans: "B", hint: "Count: 1, 2, 3, 4, 5" },
      { q: "Identify the hot object in the morning sky:", sym: "☀️ 🌙 ☁️ 🌧️", a: "Moon (🌙)", b: "Sun (☀️)", c: "Rain (🌧️)", d: "Cloud (☁️)", ans: "B", hint: "Bright sunshine" },
      { q: "Which object is used to brush your teeth?", sym: "🪥 🥄 ✏️ ✂️", a: "Toothbrush (🪥)", b: "Spoon (🥄)", c: "Pencil (✏️)", d: "Scissors (✂️)", ans: "A", hint: "Clean white teeth" },
      { q: "Identify the aquatic animal that swims in water:", sym: "🐟 🐒 🦅 🐎", a: "Fish (🐟)", b: "Monkey (🐒)", c: "Eagle (🦅)", d: "Horse (🐎)", ans: "A", hint: "Swims in the river" },
      { q: "Count the smiling faces: 😊 😊", sym: "😊😊", a: "1 face", b: "2 faces", c: "3 faces", d: "4 faces", ans: "B", hint: "Two smiling faces" }
    ];

    for (let i = 0; i < objCount; i++) {
      const item = pictorialBank[i % pictorialBank.length];
      const singleLine = `${i + 1}. [${item.sym}] ${item.q}  (A) ${item.a}  (B) ${item.b}  (C) ${item.c}  (D) ${item.d}`;
      objectives.push({
        id: i + 1,
        question: `[${item.sym}] ${item.q}`,
        optionA: item.a,
        optionB: item.b,
        optionC: item.c,
        optionD: item.d,
        correctOption: item.ans,
        singleLineFormat: singleLine,
        pictorialSymbol: item.sym,
        visualHint: item.hint
      });
    }
  } else {
    // Primary or Secondary School Questions (Standard Curriculum)
    const subjectLower = req.subject.toLowerCase();
    
    // Generate up to 50 Objective questions with options on the SAME LINE
    for (let i = 1; i <= objCount; i++) {
      let qText = "";
      let optA = "";
      let optB = "";
      let optC = "";
      let optD = "";
      let correct = ["A", "B", "C", "D"][(i * 3 + 1) % 4];

      if (subjectLower.includes("math")) {
        const x = (i * 7) % 30 + 5;
        const y = (i * 3) % 15 + 2;
        if (i % 4 === 1) {
          qText = `Solve for x in the linear algebraic relation: ${y}x + ${x} = ${y * 4 + x}`;
          optA = `x = 2`; optB = `x = 4`; optC = `x = 6`; optD = `x = 8`;
          correct = "B";
        } else if (i % 4 === 2) {
          qText = `Find the simple interest on ₦${x * 1000} for 3 years at ${y}% per annum.`;
          const ansVal = (x * 1000 * 3 * y) / 100;
          optA = `₦${ansVal - 150}`; optB = `₦${ansVal}`; optC = `₦${ansVal + 200}`; optD = `₦${ansVal + 500}`;
          correct = "B";
        } else if (i % 4 === 3) {
          qText = `Express 0.00${x}4 in standard scientific index notation.`;
          optA = `${x}.4 × 10⁻³`; optB = `${x}.4 × 10⁻⁴`; optC = `${x}.4 × 10⁻²`; optD = `${x}.4 × 10⁻⁵`;
          correct = "A";
        } else {
          qText = `Calculate the hypotenuse of a right-angled triangle with sides 3cm and 4cm.`;
          optA = `5cm`; optB = `7cm`; optC = `9cm`; optD = `12cm`;
          correct = "A";
        }
      } else if (subjectLower.includes("bio") || subjectLower.includes("sci")) {
        if (i % 5 === 1) {
          qText = `Which cellular organelle is universally referred to as the powerhouse of the cell?`;
          optA = `Ribosome`; optB = `Mitochondria`; optC = `Golgi apparatus`; optD = `Nucleolus`;
          correct = "B";
        } else if (i % 5 === 2) {
          qText = `The process by which green plants manufacture carbohydrates in the presence of sunlight is:`;
          optA = `Respiration`; optB = `Transpiration`; optC = `Photosynthesis`; optD = `Fermentation`;
          correct = "C";
        } else if (i % 5 === 3) {
          qText = `Which blood component is primarily responsible for blood clotting at injury sites?`;
          optA = `Erythrocytes`; optB = `Leukocytes`; optC = `Platelets`; optD = `Blood plasma`;
          correct = "C";
        } else if (i % 5 === 4) {
          qText = `An organism that possesses both male and female reproductive organs is termed:`;
          optA = `Dioecious`; optB = `Hermaphrodite`; optC = `Parthenogenetic`; optD = `Dimorphic`;
          correct = "B";
        } else {
          qText = `The basic physical and functional unit of heredity in living organisms is the:`;
          optA = `Chromosome`; optB = `Gene`; optC = `Centromere`; optD = `Ribosome`;
          correct = "B";
        }
      } else if (subjectLower.includes("eng") || subjectLower.includes("lit")) {
        if (i % 4 === 1) {
          qText = `Choose the option nearest in meaning to the italicized word: The principal's speech was *succinct*.`;
          optA = `Prolix`; optB = `Concise`; optC = `Confusing`; optD = `Humorous`;
          correct = "B";
        } else if (i % 4 === 2) {
          qText = `Identify the correct preposition: She has been appointed _____ the academic board.`;
          optA = `into`; optB = `onto`; optC = `to`; optD = `with`;
          correct = "C";
        } else if (i % 4 === 3) {
          qText = `A speech delivered by a character alone on stage expressing private thoughts is a:`;
          optA = `Dialogue`; optB = `Soliloquy`; optC = `Prologue`; optD = `Epilogue`;
          correct = "B";
        } else {
          qText = `Choose the antonym of the capitalized word: The tutor gave an EXPLICIT instruction.`;
          optA = `Ambiguous`; optB = `Definite`; optC = `Clear`; optD = `Lucid`;
          correct = "A";
        }
      } else {
        // General Stanbax Curriculum
        qText = `Question ${i}: Regarding ${req.subject} (${req.curriculumTopics || 'Term Syllabus'}), identify the fundamental tenet:`;
        optA = `Primary axiom of ${req.subject} theory`;
        optB = `Secondary empirical validation`;
        optC = `Controlled comparative analysis`;
        optD = `Standard operational synthesis`;
        correct = ["A", "B", "C", "D"][i % 4];
      }

      const singleLine = `${i}. ${qText}  (A) ${optA}  (B) ${optB}  (C) ${optC}  (D) ${optD}`;
      objectives.push({
        id: i,
        question: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctOption: correct,
        singleLineFormat: singleLine
      });
    }

    // Generate 6 Theory Questions for Secondary School
    if (isSecondary || theoryCount >= 6) {
      theory.push(
        {
          id: 1,
          questionNumber: 1,
          questionText: `(a) Clearly define the core concept of ${req.subject} under discussion.\n(b) State three practical applications of this principle in modern Nigerian industry.\n(c) Distinguish between primary and secondary attributes with two clear examples.`,
          subParts: ["Definition (4 marks)", "3 Applications (6 marks)", "Distinction with examples (5 marks)"],
          maxScore: 15,
          sampleAnswer: "Comprehensive conceptual definition with verifiable industrial applications and distinct comparative examples."
        },
        {
          id: 2,
          questionNumber: 2,
          questionText: `(a) Draw a well-labeled schematic diagram illustrating the primary mechanism.\n(b) Outline the step-by-step procedural methodology required to replicate the experimental finding.\n(c) Mention two precautionary measures observed during standard laboratory operations.`,
          subParts: ["Labeled Diagram (6 marks)", "Procedural steps (6 marks)", "2 Precautions (3 marks)"],
          maxScore: 15,
          sampleAnswer: "Neat diagram showing essential labels, logical step-by-step sequence, and safety standards."
        },
        {
          id: 3,
          questionNumber: 3,
          questionText: `(a) With the aid of relevant mathematical formulae or structural models, analyze the relationship between the key interacting variables.\n(b) Calculate the theoretical yield or derivative given initial parameters.\n(c) State two limitations associated with this model.`,
          subParts: ["Formula & analysis (6 marks)", "Calculation with unit (6 marks)", "2 Limitations (3 marks)"],
          maxScore: 15,
          sampleAnswer: "Clear mathematical substitution, correct units, and valid theoretical constraints."
        },
        {
          id: 4,
          questionNumber: 4,
          questionText: `(a) Explain four environmental or socio-economic factors that directly influence the outcomes in this discipline.\n(b) Propose two policy interventions that can enhance efficiency in the Ibadan metropolitan ecosystem.`,
          subParts: ["4 Environmental factors (8 marks)", "2 Policy interventions (7 marks)"],
          maxScore: 15,
          sampleAnswer: "Thorough explanation of environmental dependencies and actionable local policy recommendations."
        },
        {
          id: 5,
          questionNumber: 5,
          questionText: `(a) Differentiate comprehensively between qualitative and quantitative evaluations in ${req.subject}.\n(b) Enumerate three distinct sources of observational error and describe how each can be minimized.\n(c) Highlight two ethical considerations in contemporary research.`,
          subParts: ["Comparative table (6 marks)", "Sources of error & mitigation (6 marks)", "Ethical guidelines (3 marks)"],
          maxScore: 15,
          sampleAnswer: "Tabular comparison, practical mitigation strategies, and institutional research ethics."
        },
        {
          id: 6,
          questionNumber: 6,
          questionText: `Case Study & Critical Synthesis:\nA local agricultural/industrial enterprise in Oyo State recorded an unexpected 35% variance over the preceding terminal quarter.\n(a) Identify three probable causal factors based on curriculum principles.\n(b) Formulate a corrective operational strategy to restore standard benchmark performance.`,
          subParts: ["Identification of 3 causal factors (7 marks)", "Corrective strategy (8 marks)"],
          maxScore: 15,
          sampleAnswer: "Diagnostic reasoning linked to course principles with a structured corrective action plan."
        }
      );
    } else if (theoryCount > 0) {
      for (let t = 1; t <= theoryCount; t++) {
        theory.push({
          id: t,
          questionNumber: t,
          questionText: `Question ${t}: (a) Define key terms in ${req.subject}. (b) Explain with two practical classroom examples.`,
          subParts: ["Definition (5 marks)", "2 Examples (5 marks)"],
          maxScore: 10,
          sampleAnswer: "Accurate definitions followed by lucid everyday examples."
        });
      }
    }
  }

  // Paper-Saving Master Text (Options strictly on the same line to conserve paper)
  const headerText = [
    `================================================================================`,
    `                      STANBAX SCHOOLS IBADAN, OYO STATE                        `,
    `           GOVERNMENT APPROVED • ACCREDITED BRITISH-NIGERIAN CURRICULUM          `,
    `================================================================================`,
    `ACADEMIC SESSION: 2025/2026                 TERM: ${req.term.toUpperCase()}`,
    `EXAMINATION / ASSESSMENT: ${req.assessmentType.toUpperCase()}`,
    `SUBJECT: ${req.subject.toUpperCase()}        CLASS: ${req.classLevel.toUpperCase()}`,
    `TIME ALLOWED: ${isSecondary ? '2 HOURS' : isEarlyYears ? '45 MINS' : '1 HOUR 30 MINS'}`,
    `--------------------------------------------------------------------------------`,
    `CANDIDATE'S FULL NAME: ________________________________  EXAM NO: _______________`,
    `DATE: _____________________  CLASS SECTION: ___________  SIGNATURE: ____________`,
    `================================================================================\n`,
    isEarlyYears 
      ? `SECTION A: PICTORIAL IDENTIFICATION & RECOGNITION (${objCount} MARKS)\nINSTRUCTIONS: Look at each picture or symbol carefully. Tick or circle the correct letter (A, B, C, or D).\n`
      : isSecondary
      ? `SECTION A: OBJECTIVE MULTIPLE CHOICE (50 MARKS)\nINSTRUCTIONS: Answer ALL fifty (50) questions. Each question carries 1 mark.\nNOTE: Questions and options are placed on the same line to save paper space.\n`
      : `SECTION A: OBJECTIVE TEST (${objCount} MARKS)\nINSTRUCTIONS: Answer all questions in this section.\n`,
    ...objectives.map(o => o.singleLineFormat),
    `\n--------------------------------------------------------------------------------`,
    isSecondary
      ? `SECTION B: THEORY & ESSAY QUESTIONS (50 MARKS)\nINSTRUCTIONS: Answer any FOUR (4) questions out of the six (6) questions provided below.\nEach full question carries 12.5 or 15 marks as allocated.\n`
      : theory.length > 0
      ? `SECTION B: STRUCTURED QUESTIONS\nINSTRUCTIONS: Answer all questions in the spaces provided below.\n`
      : ``,
    ...theory.map(t => `\nQUESTION ${t.questionNumber} (${t.maxScore} Marks):\n${t.questionText}\n`)
  ].filter(Boolean).join('\n');

  // Compact marking guide
  const markingGuide = [
    `STANBAX SCHOOLS - CONFIDENTIAL OFFICIAL MARKING GUIDE`,
    `SUBJECT: ${req.subject} | CLASS: ${req.classLevel} | TERM: ${req.term}`,
    `\nSECTION A OBJECTIVE ANSWER KEYS:`,
    ...objectives.map((o, idx) => `${o.id}.${o.correctOption}${((idx + 1) % 10 === 0) ? '\n' : '  '}`),
    theory.length > 0 ? `\n\nSECTION B THEORY MARKING SCHEME:\n` + theory.map(t => `Q${t.questionNumber}: ${t.sampleAnswer} [Max: ${t.maxScore}m]`).join('\n') : ''
  ].join('\n');

  return {
    title: `${req.subject} ${req.assessmentType}`,
    schoolName: "Stanbax Schools Ibadan",
    classLevel: req.classLevel,
    subject: req.subject,
    term: req.term,
    timeAllowed: isSecondary ? "2 Hours" : isEarlyYears ? "45 Minutes" : "1 Hour 30 Minutes",
    instructions: isEarlyYears 
      ? "Circle or point to the correct picture or symbol for each question."
      : isSecondary 
      ? "SECTION A: Answer all 50 Objective Questions. SECTION B: Answer any 4 Theory Questions out of 6."
      : "Answer all questions in Section A and chosen questions in Section B.",
    isEarlyYearsPictorial: Boolean(isEarlyYears),
    isSecondaryFiftySix: Boolean(isSecondary),
    objectives,
    theory,
    paperSavingText: headerText,
    markingGuide
  };
}

// Academic Fallback Engine for Calvin AI
function generateCalvinAcademicFallback(question: string, studentName: string, classLevel: string, isPremium: boolean): string {
  const qLower = question.toLowerCase();
  const isEarly = classLevel.toLowerCase().includes('nursery') || classLevel.toLowerCase().includes('kg') || classLevel.toLowerCase().includes('reception');

  if (isEarly) {
    return `Hello little star, ${studentName}!

I love your wonderful question! In our ${classLevel} class at Stanbax Schools, we learn that:

• Everything around us has a name and a special purpose!
• God made our world full of colorful shapes, sounds, and friendly animals.

Keep asking questions and smiling today! You did great!`;
  }

  if (qLower.includes('photo') || qLower.includes('plant') || qLower.includes('leaf')) {
    if (isPremium) {
      return `Photosynthesis: Masterclass Academic Breakdown
Tailored for ${studentName} (${classLevel}) • Calvin Premium Masterclass

1. Concept Summary & Definition
Photosynthesis is the fundamental biochemical process whereby green plants, algae, and certain cyanobacteria synthesize organic food (glucose) from inorganic carbon dioxide (CO₂) and water (H₂O), utilizing solar radiant energy trapped by chlorophyll, releasing oxygen gas as a byproduct.

Chemical Word & Symbol Equation:
6CO₂ + 6H₂O  ──(Sunlight / Chlorophyll)──>  C₆H₁₂O₆ + 6O₂
Carbon Dioxide + Water  ──>  Glucose + Oxygen

2. The Two Crucial Phases (WAEC / Cambridge Focus):
• Light-Dependent Phase (Thylakoid Grana): Solar photons strike Photosystems II and I. Water undergoes photolysis (2H₂O → 4H⁺ + 4e⁻ + O₂), generating ATP and reduced NADPH.
• Light-Independent Phase / Calvin-Benson Cycle (Stroma): Carbon fixation mediated by the enzyme RuBisCO. CO₂ combines with Ribulose 1,5-bisphosphate (RuBP) to yield 3-phosphoglycerate (PGA), subsequently reduced to glyceraldehyde-3-phosphate (G3P) and glucose.

3. Mnemonic Trick to Remember Inputs & Outputs:
C-W-S-O → Carbon dioxide + Water + Sunlight = Sugar + Oxygen!

4. Stanbax Senior Examiner Tip:
Beware of confusion between Photosynthesis and Respiration! In WAEC Section B, remember to state that light reactions occur in the thylakoids/grana while dark reactions take place in the stroma.

Quick Practice Drill for You, ${studentName}:
What happens to the rate of photosynthesis when temperature exceeds 45°C? (Hint: Think about what happens to plant protein enzymes like RuBisCO at high temperatures!)`;
    } else {
      return `Understanding Photosynthesis
Hello ${studentName}! Here is your guide for ${classLevel}:

Photosynthesis is the process by which green plants manufacture their own food (glucose) using:
1. Carbon Dioxide (CO₂) from the air through microscopic stomata.
2. Water (H₂O) absorbed by roots from the soil.
3. Sunlight absorbed by the green pigment called chlorophyll in chloroplasts.

Chemical Equation:
Carbon Dioxide + Water  ──(Sunlight + Chlorophyll)──>  Glucose + Oxygen
6CO₂ + 6H₂O  ──>  C₆H₁₂O₆ + 6O₂

Oxygen is released into the air for humans and animals to breathe! Feel free to ask if you need further practice questions.`;
    }
  }

  if (qLower.includes('quadratic') || qLower.includes('solve') || qLower.includes('math') || qLower.includes('equation')) {
    if (isPremium) {
      return `Quadratic Equations: Comprehensive Solution Method
Personalized for ${studentName} (${classLevel}) • Calvin Premium Masterclass

1. Standard General Form
Any second-degree polynomial equation takes the form:
ax² + bx + c = 0  (where a ≠ 0)

2. The Quadratic Formula:
x = (-b ± √(b² - 4ac)) / (2a)

Worked Example: Solve 2x² - 5x + 2 = 0
• Step 1: Identify coefficients: a = 2, b = -5, c = 2.
• Step 2: Calculate the discriminant:
  Δ = b² - 4ac = (-5)² - 4(2)(2) = 25 - 16 = 9.
• Step 3: Substitute into the quadratic formula:
  x = (-(-5) ± √9) / (2 × 2) = (5 ± 3) / 4
• First Solution: x = (5 + 3) / 4 = 8 / 4 = 2
• Second Solution: x = (5 - 3) / 4 = 2 / 4 = 1/2 (or 0.5)

3. WAEC & JAMB Marking Guide Note:
Always verify your roots by factorizing: (2x - 1)(x - 2) = 0. In theory papers, showing the substitution step earns 2 method marks before the final answer!`;
    } else {
      return `Solving Quadratic Equations
Hello ${studentName}! Here is the standard method for ${classLevel}:

To solve any quadratic equation in the form ax² + bx + c = 0, use the quadratic formula:
x = (-b ± √(b² - 4ac)) / (2a)

Steps:
1. Rearrange the equation so that one side equals zero.
2. Write down the values of a, b, and c.
3. Compute the term inside the square root: b² - 4ac.
4. Calculate the two possible answers using + and -.

Try sending me an equation like x² - 5x + 6 = 0 and I will walk through it with you!`;
    }
  }

  // General academic response
  return `Academic Guidance from Calvin
Hello ${studentName}! Here is your ${isPremium ? 'Premium ' : ''}tutor explanation for ${classLevel}:

Regarding your question: "${question}"

1. Core Concept: At Stanbax Schools Ibadan, our curriculum emphasizes foundational understanding first. Review the relevant chapter in your term syllabus.
2. Key Principle: Break complex questions down into smaller parts. Define key terms clearly before applying formulas or constructing arguments.
3. Study Habit: Write out key terms and definitions in your notebook, and practice active recall after 24 hours.

${isPremium ? 'Calvin Premium Masterclass Perk: You can ask me to write a full step-by-step WAEC/NECO worked solution, generate practice questions, or test your memory on this topic!' : 'Ask me any follow-up question and I will explain it step by step!'}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      school: "Stanbax Schools Ibadan" 
    });
  });

  // AI Exam & Assessment Generation Endpoint
  app.post("/api/generate-assessment", async (req, res) => {
    const {
      classLevel = "SSS 2",
      ageGroup,
      subject = "General Science",
      term = "2nd Term",
      assessmentType = "Terminal Examination",
      curriculumTopics = "",
      difficulty = "Standard WAEC / Stanbax Standard",
      targetObjectiveCount,
      targetTheoryCount
    } = req.body as AssessmentRequest;

    const isEarlyYears = 
      classLevel.toLowerCase().includes('nursery') || 
      classLevel.toLowerCase().includes('kindergarten') || 
      classLevel.toLowerCase().includes('kg') || 
      classLevel.toLowerCase().includes('reception') || 
      classLevel.toLowerCase().includes('early') || 
      (ageGroup && ageGroup.includes('3-6'));

    const isSecondary = 
      classLevel.toLowerCase().includes('jss') || 
      classLevel.toLowerCase().includes('sss') || 
      classLevel.toLowerCase().includes('secondary');

    const expectedObjCount = targetObjectiveCount && targetObjectiveCount > 0 
      ? targetObjectiveCount 
      : (isSecondary ? 30 : isEarlyYears ? 10 : 20);
    const expectedTheoryCount = targetTheoryCount !== undefined 
      ? targetTheoryCount 
      : (isSecondary ? 4 : isEarlyYears ? 0 : 3);

    const ai = getGeminiClient();

    if (!ai) {
      // Return guaranteed rich curriculum fallback if API key is not present in container
      const fallback = generateCurriculumFallback({
        classLevel,
        ageGroup,
        subject,
        term,
        assessmentType,
        curriculumTopics,
        difficulty,
        targetObjectiveCount: expectedObjCount,
        targetTheoryCount: expectedTheoryCount
      });
      return res.json({ success: true, source: "curriculum_engine", data: fallback });
    }

    try {
      const systemInstruction = `You are the Senior Chief Examiner and Academic Assessment Officer for Stanbax Schools Ibadan, a premier Nigerian-British curriculum educational institution.
Your job is to generate rigorous, authentic, professional exam question papers and tests for teachers.

CRITICAL ARCHITECTURAL RULES:
1. AGE & CLASS PERSONALIZATION:
   - If the class is Early Years / Ages 3-6 (Nursery, Kindergarten, KG, Reception): Questions MUST feature vivid, identifiable PICTORIAL representations and visual symbols (e.g. 🍎, 🐶, ⭐, 🔴, 🚗, ✈️) so young children can easily identify, point, or circle answers. Questions must test foundational Phonics, Counting/Number Work, Colors, Shapes, and Everyday Objects.
   - If the class is Secondary School (JSS 1-3 or SSS 1-3): YOU MUST GENERATE EXACTLY 50 OBJECTIVE MULTIPLE CHOICE QUESTIONS (numbered 1 to 50) AND EXACTLY 6 THEORY QUESTIONS (numbered 1 to 6). Follow WAEC / BECE / NECO syllabus depth.
   - If Primary School (Basic 1-6): Generate age-appropriate objective questions (25-30) and 4 theory questions.

2. STRICT SINGLE-LINE OPTION FORMATTING (PAPER SAVER RULE):
   - In standard Nigerian schools, exam papers are printed/photocopied on tight paper budgets.
   - Therefore, ALL multiple choice questions and their options MUST be on the SAME LINE:
     Format: [Number]. [Question text] (A) [Option A] (B) [Option B] (C) [Option C] (D) [Option D]
     Example: 1. Which organ pumps blood in human body? (A) Brain  (B) Lungs  (C) Heart  (D) Kidney

3. OUTPUT FORMAT:
   - Return valid, unescaped JSON matching this schema:
   {
     "title": "string",
     "schoolName": "Stanbax Schools Ibadan",
     "classLevel": "string",
     "subject": "string",
     "term": "string",
     "timeAllowed": "string",
     "instructions": "string",
     "isEarlyYearsPictorial": boolean,
     "isSecondaryFiftySix": boolean,
     "objectives": [
       {
         "id": 1,
         "question": "string",
         "optionA": "string",
         "optionB": "string",
         "optionC": "string",
         "optionD": "string",
         "correctOption": "A" | "B" | "C" | "D",
         "singleLineFormat": "1. Question (A) OptA (B) OptB (C) OptC (D) OptD",
         "pictorialSymbol": "🍎🍎🍎" (if early years, optional otherwise)
       }
     ],
     "theory": [
       {
         "id": 1,
         "questionNumber": 1,
         "questionText": "string with (a), (b), (c)",
         "subParts": ["string"],
         "maxScore": 15,
         "sampleAnswer": "string"
       }
     ],
     "paperSavingText": "Full formatted text with header and all questions strictly formatted on single lines",
     "markingGuide": "Concise key: 1. A, 2. C, 3. B... plus theory rubrics"
   }`;

      const userPrompt = `Generate a complete ${assessmentType} paper for Stanbax Schools Ibadan:
- Subject: ${subject}
- Class Level: ${classLevel} ${ageGroup ? `(${ageGroup})` : ''}
- Academic Term: ${term}
- Specific Topics/Scope: ${curriculumTopics || 'Full term syllabus as per Nigerian curriculum'}
- Difficulty standard: ${difficulty}
- Required Objective Questions: ${expectedObjCount} ${isSecondary ? '(Full 50 Questions mandated for Secondary)' : isEarlyYears ? '(Pictorial items for Ages 3-6)' : ''}
- Required Theory Questions: ${expectedTheoryCount} ${isSecondary ? '(Full 6 Questions mandated for Secondary)' : ''}
- STRICT RULE: Format every single question and its options (A, B, C, D) on the SAME LINE to save paper space when printed.`;

      const { response, model: modelUsed } = await generateWithGemini(ai, {
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      const responseText = response.text || "";
      let parsedData: AssessmentResponse;
      try {
        parsedData = JSON.parse(responseText.trim());
      } catch (parseErr) {
        console.warn("JSON parse error on Gemini output, falling back to curriculum engine", parseErr);
        parsedData = generateCurriculumFallback({
          classLevel,
          ageGroup,
          subject,
          term,
          assessmentType,
          curriculumTopics,
          difficulty,
          targetObjectiveCount: expectedObjCount,
          targetTheoryCount: expectedTheoryCount
        });
      }

      // Ensure paperSavingText and markingGuide exist
      if (!parsedData.paperSavingText || parsedData.objectives.length === 0) {
        parsedData = generateCurriculumFallback({
          classLevel,
          ageGroup,
          subject,
          term,
          assessmentType,
          curriculumTopics,
          difficulty,
          targetObjectiveCount: expectedObjCount,
          targetTheoryCount: expectedTheoryCount
        });
      }

      return res.json({ success: true, source: "gemini_ai", modelUsed, data: parsedData });
    } catch (apiError: any) {
      console.warn("Gemini API call error:", apiError?.message || apiError);
      // Seamlessly deliver complete curriculum fallback
      const fallback = generateCurriculumFallback({
        classLevel,
        ageGroup,
        subject,
        term,
        assessmentType,
        curriculumTopics,
        difficulty,
        targetObjectiveCount: expectedObjCount,
        targetTheoryCount: expectedTheoryCount
      });
      return res.json({ success: true, source: "curriculum_engine", data: fallback });
    }
  });

  // Student Portal Calvin AI Chat Endpoint
  app.post("/api/calvin-chat", async (req, res) => {
    const {
      message = "",
      studentName = "Scholar",
      classLevel = "SSS 2",
      tier = "regular",
      chatHistory = []
    } = req.body;

    if (!message.trim()) {
      return res.status(400).json({ success: false, error: "Question message is required" });
    }

    const isEarlyYears = 
      classLevel.toLowerCase().includes('nursery') || 
      classLevel.toLowerCase().includes('kindergarten') || 
      classLevel.toLowerCase().includes('kg') || 
      classLevel.toLowerCase().includes('reception') || 
      classLevel.toLowerCase().includes('early');

    const isPrimary = 
      classLevel.toLowerCase().includes('primary') || 
      classLevel.toLowerCase().includes('basic') || 
      classLevel.toLowerCase().includes('grade');

    const isJuniorSec = 
      classLevel.toLowerCase().includes('jss');

    const isSeniorSec = 
      classLevel.toLowerCase().includes('sss') || 
      classLevel.toLowerCase().includes('ss');

    const isPremium = tier === 'premium';

    // System instruction tailored to age, class, and token tier
    const systemInstruction = `You are Calvin, the personal AI Academic Tutor and Study Companion for Stanbax Schools Ibadan, an esteemed Nigerian-British curriculum school in Ibadan, Oyo State, Nigeria.
You are interacting with ${studentName}, who is currently enrolled in ${classLevel}.

PEDAGOGICAL PERSONA & CLASS-LEVEL ADAPTATION:
${isEarlyYears ? `
- TARGET AUDIENCE: Early Childhood (Ages 3-6 / Nursery & Reception).
- TONE: Warm, motherly/fatherly, encouraging, gentle, and enthusiastic!
- STYLE: Very simple language, short words, rhyming concepts where fun.
- VISUALS: Use vivid child-friendly emojis (🍎, 🌟, 🎈, 🐱, 🚀, 📚) to illustrate points.
- Always celebrate effort with praise ("Great job, ${studentName}!", "You are a shining star! ⭐").
` : isPrimary ? `
- TARGET AUDIENCE: Primary School (Ages 6-11 / Basic 1 to 6).
- TONE: Friendly, patient, structured, and inspiring.
- STYLE: Clear, easy-to-understand definitions, step-by-step arithmetic breakdown, relatable Nigerian real-world analogies (market shopping in naira, school garden, rainfall, food crops).
- Encourage curiosity and end with a quick gentle check question or cheerful cheer!
` : isJuniorSec ? `
- TARGET AUDIENCE: Junior Secondary School (Ages 11-14 / JSS 1 to 3).
- CURRICULUM: Aligned with Nigerian BECE / Junior WAEC standards and British Cambridge Checkpoint syllabus.
- TONE: Motivating, scholastic, respectful.
- STYLE: Systematic breakdown of concepts in Basic Science, Basic Tech, Mathematics, English grammar, Business Studies, Social Studies, and Civic Education. Break down calculations line by line with formulas.
` : `
- TARGET AUDIENCE: Senior Secondary School (Ages 14-18 / SSS 1 to 3).
- CURRICULUM: WAEC WASSCE, NECO SSCE, JAMB UTME, and Cambridge IGCSE standards.
- TONE: Scholarly, intellectually rigorous, empowering, and focused on exam mastery.
- STYLE: Academic precision. When answering science/math problems, provide formula statements, SI units, algebraic substitutions, and final answers with units clearly highlighted. For humanities/commercial, provide structured points, legal/economic definitions, and analytical depth.
`}

TOKEN TIER CAPABILITY LEVEL (${isPremium ? 'PREMIUM MASTERCLASS' : 'REGULAR TIER'}):
${isPremium ? `
- The student is using a PREMIUM TOKEN authorized by the School Administrator.
- Provide the HIGHEST QUALITY, IN-DEPTH, MASTERCLASS explanations.
- Structure explanations into clear, organized sections:
  1. Direct Concept Summary / Definition
  2. Step-by-Step Derivation / Worked Examples
  3. Mnemonic / Memory Trick to recall concepts easily
  4. WAEC / NECO / JAMB / Cambridge Exam Secrets & Pitfalls to avoid
  5. Quick Practice Question for self-testing!
` : `
- The student is using a REGULAR TOKEN.
- Provide concise, accurate, clear, and encouraging explanations tailored to their class syllabus.
`}

CRITICAL STUDENT-FRIENDLY FORMATTING RULES (STRICTLY ENFORCED):
- NEVER use markdown hash symbols (#, ##, ###, ####) for titles or section headings. Simply write clean titles on their own line followed by a blank line, or use simple bold section headers.
- NEVER use the caret symbol (^) for exponents or powers! Primary and secondary school students find raw carets confusing. Always use standard unicode superscript characters (such as ², ³, ⁴, ⁿ, ⁻¹, ⁻², 10⁵, m/s², cm³) or spell out words like "squared" or "to the power of". Scholars must NEVER see raw '^' characters.
- NEVER use asterisks (*) for bullet points. Use standard clean bullet dots (•) or numbered lists (1., 2., 3.).
- NEVER output raw LaTeX codes or math delimiters like $$, \\text{}, \\frac{}{}, \\times, or \\pm. Format formulas in clean, natural readable text: e.g., "x = (-b ± √(b² - 4ac)) / (2a)", "Area = πr²", "v = u + at" so students can read and understand immediately without programming syntax.
- Address the scholar warmly as ${studentName}.
- Keep answers educational, respectful, inspiring, and aligned with standard Nigerian-British curriculum guidelines.`;

    const ai = getGeminiClient();

    if (!ai) {
      const fallbackReply = generateCalvinAcademicFallback(message, studentName, classLevel, isPremium);
      return res.json({
        success: true,
        reply: fallbackReply,
        tier,
        source: "academic_engine"
      });
    }

    try {
      // Build conversation contents including history
      const formattedHistory = Array.isArray(chatHistory) 
        ? chatHistory.slice(-8).map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: typeof h.text === 'string' ? h.text : (h.parts?.[0]?.text || '') }]
          })).filter(h => h.parts[0].text)
        : [];

      formattedHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const { response, model: modelUsed } = await generateWithGemini(ai, {
        contents: formattedHistory,
        config: {
          systemInstruction,
          temperature: isPremium ? 0.7 : 0.6,
          maxOutputTokens: isPremium ? 2048 : 1024,
        }
      });

      const reply = response.text || "Hello scholar! I am here to help you learn. Please ask your academic question again.";
      return res.json({
        success: true,
        reply,
        tier,
        source: "gemini_ai",
        modelUsed
      });
    } catch (err: any) {
      console.warn("Calvin Gemini API error:", err?.message || err);
      const fallbackReply = generateCalvinAcademicFallback(message, studentName, classLevel, isPremium);
      return res.json({
        success: true,
        reply: fallbackReply,
        tier,
        source: "academic_engine"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Stanbax Schools server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
