export interface LocalAssessmentRequest {
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

export interface LocalAssessmentResponse {
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

export function generateLocalCurriculumAssessment(req: LocalAssessmentRequest): LocalAssessmentResponse {
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

  const objectives: LocalAssessmentResponse['objectives'] = [];
  const theory: LocalAssessmentResponse['theory'] = [];

  if (isEarlyYears) {
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
    const subjectLower = req.subject.toLowerCase();
    
    for (let i = 1; i <= objCount; i++) {
      let qText = "";
      let optA = "";
      let optB = "";
      let optC = "";
      let optD = "";
      let correct = ["A", "B", "C", "D"][(i * 3 + 1) % 4];

      if (subjectLower.includes("math")) {
        const mathQuestions = [
          { q: `Solve for x in the linear equation: 3x + 12 = 36`, a: `x = 6`, b: `x = 8`, c: `x = 10`, d: `x = 12`, ans: "B" },
          { q: `Calculate the simple interest on ₦15,000 invested for 3 years at 5% per annum.`, a: `₦1,850`, b: `₦2,250`, c: `₦2,500`, d: `₦3,000`, ans: "B" },
          { q: `Express 0.000345 in standard scientific notation.`, a: `3.45 × 10⁻⁴`, b: `3.45 × 10⁻³`, c: `34.5 × 10⁻⁵`, d: `0.345 × 10⁻³`, ans: "A" },
          { q: `Calculate the hypotenuse of a right-angled triangle with adjacent sides 6cm and 8cm.`, a: `10cm`, b: `12cm`, c: `14cm`, d: `16cm`, ans: "A" },
          { q: `Solve the quadratic equation x² - 5x + 6 = 0 for roots of x:`, a: `x = 1, 6`, b: `x = 2, 3`, c: `x = -2, -3`, d: `x = 3, 4`, ans: "B" },
          { q: `Find the 10th term of the Arithmetic Progression: 3, 7, 11, 15, ...`, a: `35`, b: `39`, c: `41`, d: `43`, ans: "B" },
          { q: `Convert the binary numeral 1101₂ to denary (base 10):`, a: `11`, b: `13`, c: `15`, d: `17`, ans: "B" },
          { q: `If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, calculate log₁₀ 6:`, a: `0.7781`, b: `0.6542`, c: `0.8120`, d: `0.9234`, ans: "A" },
          { q: `Calculate the area of a circle whose diameter is 14cm (Take π = 22/7):`, a: `154 cm²`, b: `308 cm²`, c: `44 cm²`, d: `616 cm²`, ans: "A" },
          { q: `Find the median of the distribution: 4, 7, 9, 12, 15, 18, 20.`, a: `9`, b: `12`, c: `13.5`, d: `15`, ans: "B" },
          { q: `Evaluate the expression: (2/3) ÷ (4/9) + (1/2):`, a: `1.5`, b: `2.0`, c: `2.5`, d: `3.0`, ans: "B" },
          { q: `In a right triangle, if sin θ = 3/5, what is the value of cos θ?`, a: `4/5`, b: `5/4`, c: `3/4`, d: `4/3`, ans: "A" },
          { q: `Simplify the algebraic expression: 5(2a - 3b) - 2(3a - 4b):`, a: `4a - 7b`, b: `4a - 23b`, c: `16a - 7b`, d: `4a + 7b`, ans: "A" },
          { q: `A trader bought an article for ₦4,000 and sold it for ₦5,200. Calculate percentage profit:`, a: `25%`, b: `30%`, c: `35%`, d: `40%`, ans: "B" },
          { q: `Find the value of x if 2ˣ⁺³ = 64:`, a: `x = 2`, b: `x = 3`, c: `x = 4`, d: `x = 5`, ans: "B" },
          { q: `What is the sum of interior angles of a regular hexagon?`, a: `540°`, b: `720°`, c: `900°`, d: `1080°`, ans: "B" },
          { q: `A bag contains 5 red balls and 3 green balls. What is the probability of picking a green ball?`, a: `3/8`, b: `5/8`, c: `1/3`, d: `1/5`, ans: "A" },
          { q: `Find the gradient (slope) of the straight line passing through (2, 3) and (6, 11):`, a: `1.5`, b: `2.0`, c: `2.5`, d: `3.0`, ans: "B" },
          { q: `Solve the simultaneous equations: x + y = 10 and x - y = 4:`, a: `x = 7, y = 3`, b: `x = 6, y = 4`, c: `x = 8, y = 2`, d: `x = 5, y = 5`, ans: "A" },
          { q: `Expand and simplify: (2x - 3)(x + 4):`, a: `2x² + 5x - 12`, b: `2x² - 5x - 12`, c: `2x² + 8x - 12`, d: `2x² - 12`, ans: "A" }
        ];
        const item = mathQuestions[(i - 1) % mathQuestions.length];
        qText = `${item.q} (Q${i})`;
        optA = item.a; optB = item.b; optC = item.c; optD = item.d;
        correct = item.ans;
      } else if (subjectLower.includes("bio") || subjectLower.includes("sci") || subjectLower.includes("agric")) {
        const bioQuestions = [
          { q: `Which cellular organelle is universally referred to as the powerhouse of the cell?`, a: `Ribosome`, b: `Mitochondria`, c: `Golgi apparatus`, d: `Nucleolus`, ans: "B" },
          { q: `The process by which green plants manufacture carbohydrates in the presence of sunlight is:`, a: `Respiration`, b: `Transpiration`, c: `Photosynthesis`, d: `Fermentation`, ans: "C" },
          { q: `Which blood component is primarily responsible for blood clotting at injury sites?`, a: `Erythrocytes`, b: `Leukocytes`, c: `Platelets (Thrombocytes)`, d: `Blood plasma`, ans: "C" },
          { q: `An organism that possesses both functional male and female reproductive organs is termed:`, a: `Dioecious`, b: `Hermaphrodite`, c: `Parthenogenetic`, d: `Dimorphic`, ans: "B" },
          { q: `The basic physical and functional unit of heredity in living organisms is the:`, a: `Chromosome`, b: `Gene`, c: `Centromere`, d: `Ribosome`, ans: "B" },
          { q: `In mammalian circulation, which major vessel carries oxygenated blood from the lungs to the left atrium?`, a: `Pulmonary vein`, b: `Pulmonary artery`, c: `Vena cava`, d: `Hepatic vein`, ans: "A" },
          { q: `Which hormone regulates blood glucose concentration by stimulating cellular uptake of glucose?`, a: `Glucagon`, b: `Insulin`, c: `Thyroxine`, d: `Adrenaline`, ans: "B" },
          { q: `The structural and functional excretory unit of the mammalian kidney is the:`, a: `Neuron`, b: `Nephron`, c: `Alveolus`, d: `Ureter`, ans: "B" },
          { q: `Which trophic level contains the highest total biomass and energy in a balanced terrestrial ecosystem?`, a: `Primary producers (Plants)`, b: `Primary consumers`, c: `Secondary consumers`, d: `Apex predators`, ans: "A" },
          { q: `The breakdown of glucose in the absence of molecular oxygen to produce ethanol or lactate is:`, a: `Aerobic respiration`, b: `Anaerobic fermentation`, c: `Photolysis`, d: `Translocation`, ans: "B" },
          { q: `Which mineral element is a central constituent of the green chlorophyll molecule?`, a: `Iron`, b: `Magnesium`, c: `Calcium`, d: `Potassium`, ans: "B" },
          { q: `The sensory organelle responsible for static and dynamic balance in mammals is situated in the:`, a: `Inner ear (Semicircular canals)`, b: `Cerebral cortex`, c: `Retina`, d: `Cochlea`, ans: "A" },
          { q: `In genetics, the phenotypic ratio resulting from a monohybrid cross of two heterozygous parents (Bb × Bb) is:`, a: `1:1`, b: `3:1`, c: `9:3:3:1`, d: `1:2:1`, ans: "B" },
          { q: `Which enzyme in human saliva initiates the chemical digestion of cooked dietary starch?`, a: `Ptyalin (Salivary amylase)`, b: `Pepsin`, c: `Trypsin`, d: `Lipase`, ans: "A" },
          { q: `The movement of water molecules across a semi-permeable membrane from a region of lower solute concentration to higher is:`, a: `Diffusion`, b: `Osmosis`, c: `Active transport`, d: `Plasmolysis`, ans: "B" },
          { q: `Which of the following organisms exhibits an open circulatory system?`, a: `Earthworm`, b: `Grasshopper (Insect)`, c: `Tilapia fish`, d: `Human`, ans: "B" },
          { q: `The gaseous exchange surface in flowering terrestrial plant leaves occurs through microscopic pores called:`, a: `Lenticels`, b: `Stomata`, c: `Cuticles`, d: `Hydathodes`, ans: "B" },
          { q: `Which vitamin is synthesized in human epidermal skin upon exposure to ultraviolet sunlight?`, a: `Vitamin A`, b: `Vitamin C`, c: `Vitamin D`, d: `Vitamin K`, ans: "C" },
          { q: `The symbiotic association between nitrogen-fixing Rhizobium bacteria and the root nodules of leguminous plants is an example of:`, a: `Parasitism`, b: `Commensalism`, c: `Mutualism`, d: `Amensalism`, ans: "C" },
          { q: `Which bone forms the protective cranial structure enclosing the human brain?`, a: `Cranium`, b: `Sternum`, c: `Pelvis`, d: `Scapula`, ans: "A" }
        ];
        const item = bioQuestions[(i - 1) % bioQuestions.length];
        qText = `${item.q} (Q${i})`;
        optA = item.a; optB = item.b; optC = item.c; optD = item.d;
        correct = item.ans;
      } else if (subjectLower.includes("eng") || subjectLower.includes("lit")) {
        const engQuestions = [
          { q: `Choose the option nearest in meaning to the italicized word: The principal's speech was *succinct*.`, a: `Prolix`, b: `Concise and brief`, c: `Confusing`, d: `Humorous`, ans: "B" },
          { q: `Identify the correct preposition: She has been appointed _____ the academic board.`, a: `into`, b: `onto`, c: `to`, d: `with`, ans: "C" },
          { q: `A speech delivered by a character alone on stage expressing private thoughts is a:`, a: `Dialogue`, b: `Soliloquy`, c: `Prologue`, d: `Epilogue`, ans: "B" },
          { q: `Choose the antonym of the capitalized word: The tutor gave an EXPLICIT instruction.`, a: `Ambiguous`, b: `Definite`, c: `Clear`, d: `Lucid`, ans: "A" },
          { q: `Complete the sentence with the correct concord: Neither the teacher nor the students _____ present at the assembly.`, a: `was`, b: `were`, c: `is`, d: `has been`, ans: "B" },
          { q: `Identify the figure of speech: "The wind whispered through the dark lonely corridor."`, a: `Metaphor`, b: `Personification`, c: `Hyperbole`, d: `Simile`, ans: "B" },
          { q: `Choose the correct question tag: "The bursar will sign the receipt, _____?"`, a: `won't he`, b: `will he`, c: `shall he`, d: `can't he`, ans: "A" },
          { q: `Select the word with the correct primary stress: PHOTOGRAPH`, a: `PHO-to-graph`, b: `pho-TO-graph`, c: `pho-to-GRAPH`, d: `None`, ans: "A" },
          { q: `Choose the option nearest in meaning: The governor *inaugurated* the newly built library complex.`, a: `Demolished`, b: `Formally opened`, c: `Renamed`, d: `Inspected`, ans: "B" },
          { q: `Identify the fatal personality defect that leads to the downfall of a tragic protagonist in drama:`, a: `Catharsis`, b: `Hamartia (Tragic flaw)`, c: `Hubris`, d: `Anagnorisis`, ans: "B" },
          { q: `Choose the correct idiom meaning: "To burn the midnight oil" means:`, a: `To set oil on fire`, b: `To study or work late into the night`, c: `To waste resources`, d: `To awake at dawn`, ans: "B" },
          { q: `Select the word that is correctly spelled:`, a: `Accomodation`, b: `Accommodation`, c: `Acommodation`, d: `Acomodation`, ans: "B" },
          { q: `Identify the clause type: "Although she arrived early, she missed the first lecture." The underlined part is a:`, a: `Noun clause`, b: `Adverbial clause of concession`, c: `Adjectival clause`, d: `Prepositional phrase`, ans: "B" },
          { q: `Choose the antonym of the capitalized word: The candidate's defense was TENACIOUS.`, a: `Yielding`, b: `Persistent`, c: `Resolute`, d: `Courageous`, ans: "A" },
          { q: `In poetry, an unrhymed verse written in iambic pentameter is known as:`, a: `Free verse`, b: `Blank verse`, c: `Sonnet`, d: `Ode`, ans: "B" },
          { q: `Fill in the blank with appropriate tense: By this time next year, the scholars _____ their terminal WAEC examinations.`, a: `will complete`, b: `will have completed`, c: `would complete`, d: `have completed`, ans: "B" },
          { q: `Choose the option nearest in meaning: The academic council commended his *meticulous* record keeping.`, a: `Careless`, b: `Thorough and painstaking`, c: `Hasty`, d: `Confidential`, ans: "B" },
          { q: `Which punctuation mark is strictly used to separate two independent clauses not joined by a conjunction?`, a: `Comma`, b: `Semicolon (;)`, c: `Hyphen`, d: `Apostrophe`, ans: "B" },
          { q: `A comparison between two unlike things using "like" or "as" is termed:`, a: `Metaphor`, b: `Simile`, c: `Oxymoron`, d: `Irony`, ans: "B" },
          { q: `Choose the correct passive voice: "The Chief Examiner reviewed the scripts."`, a: `The scripts were reviewed by the Chief Examiner.`, b: `The scripts have been reviewed.`, c: `The Chief Examiner was reviewing.`, d: `The scripts are reviewed.`, ans: "A" }
        ];
        const item = engQuestions[(i - 1) % engQuestions.length];
        qText = `${item.q} (Q${i})`;
        optA = item.a; optB = item.b; optC = item.c; optD = item.d;
        correct = item.ans;
      } else {
        const generalQuestions = [
          { q: `Define the primary governing principle of ${req.subject}:`, a: `Systematic theoretical empirical formulation`, b: `Arbitrary subjective interpretation`, c: `Random procedural variation`, d: `Isolated speculative hypothesis`, ans: "A" },
          { q: `In ${req.subject}, which methodology yields reproducible and valid findings?`, a: `Standard controlled evaluation`, b: `Anecdotal observation`, c: `Unverified assumptions`, d: `Circular reasoning`, ans: "A" },
          { q: `Identify the historical milestone that shaped contemporary practices in ${req.subject}:`, a: `Institutional standardization`, b: `Informal consensus`, c: `Stagnant conventions`, d: `Regional divergence`, ans: "A" },
          { q: `What is the significance of peer-reviewed documentation in this discipline?`, a: `Verification and quality assurance`, b: `Bureaucratic formality`, c: `Exclusion of new ideas`, d: `Commercial marketing`, ans: "A" },
          { q: `How does modern digital technology enhance efficiency in ${req.subject}?`, a: `Automated analytical computation and precision`, b: `Increased manual errors`, c: `Slower dissemination`, d: `Restricted collaboration`, ans: "A" }
        ];
        const item = generalQuestions[(i - 1) % generalQuestions.length];
        qText = `Question ${i}: Regarding ${req.subject} (${req.curriculumTopics || 'Term Syllabus'}), ${item.q}`;
        optA = item.a; optB = item.b; optC = item.c; optD = item.d;
        correct = item.ans;
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
