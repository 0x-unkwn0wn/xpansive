import type { ExpansionOption, LanguagePreference } from "@/lib/types";
import { DEFAULT_EXPANSION_COUNT } from "@/lib/constants";

type Domain = "transport" | "education" | "energy" | "ai" | "adaptiveTutor" | "restaurants" | "coffee" | "cities" | "memory" | "music" | "sleep" | "other";

function subject(idea: string) {
  return idea.length > 72 ? `${idea.slice(0, 69)}…` : idea;
}

function fillToThree(primary: ExpansionOption[], initialIdea: string, path: ExpansionOption[], spanish: boolean) {
  const current = path.at(-1)?.title ?? subject(initialIdea);
  const supplemental = spanish
    ? [
      ["Quién decide", `Rastrear cómo ${current.toLowerCase()} redistribuye autoridad entre personas, instituciones y sistemas.`],
      ["Condiciones de fallo", `Explorar dónde ${current.toLowerCase()} deja de funcionar y qué daños produciría.`],
      ["Aplicación inesperada", `Encontrar un contexto concreto donde ${current.toLowerCase()} pueda cambiar una práctica existente.`],
      ["Infraestructura necesaria", `Diseñar los sistemas materiales y sociales que harían posible ${current.toLowerCase()}.`],
      ["Adaptación a largo plazo", `Seguir cómo ${current.toLowerCase()} cambiaría después de años de uso y aprendizaje.`],
    ].map(([title, description]) => ({ title, description }))
    : [
      ["Who decides", `Trace how ${current.toLowerCase()} redistributes authority among people, institutions, and systems.`],
      ["Failure conditions", `Explore where ${current.toLowerCase()} stops working and what damage failure could cause.`],
      ["Unexpected application", `Find a concrete context where ${current.toLowerCase()} could change an existing practice.`],
      ["Necessary infrastructure", `Design the material and social systems that would make ${current.toLowerCase()} possible.`],
      ["Long-term adaptation", `Follow how ${current.toLowerCase()} would change after years of use and learning.`],
    ].map(([title, description]) => ({ title, description }));
  const seen = new Set<string>();
  return [...primary, ...supplemental].filter((option) => {
    const key = option.title.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, DEFAULT_EXPANSION_COUNT);
}

function detectLanguage(idea: string, requested: LanguagePreference) {
  if (requested !== "auto") return requested;
  return /\b(el|la|los|las|qué|que|cómo|como|para|una|quiero|crear|empresa|relacionada|transporte|educación|energía|inteligencia|restaurantes|sueño|ciudades|humanos|vivir)\b/i.test(idea) ? "es" : "en";
}

function detectDomain(idea: string): Domain {
  const value = idea.toLowerCase();
  if (/adaptive tutor|tutor adaptativo/.test(value)) return "adaptiveTutor";
  if (/transport|movilidad|tr[aá]nsito|travel|movement/.test(value)) return "transport";
  if (/educa|escuela|aprendizaje|learning|school/.test(value)) return "education";
  if (/energ[yí]|electric|power|energía/.test(value)) return "energy";
  if (/artificial intelligence|inteligencia artificial|\bai\b|machine learning/.test(value)) return "ai";
  if (/restaurant|restaurante|comida|food|dining/.test(value)) return "restaurants";
  if (/coffee|café|cafe/.test(value)) return "coffee";
  if (/cities|ciudades|city|ciudad|urban/.test(value)) return "cities";
  if (/memory|memoria|remember|recuerdo/.test(value)) return "memory";
  if (/music|música|musica|sound|sonido/.test(value)) return "music";
  if (/sueño|sleep|dormir|bed/.test(value)) return "sleep";
  return "other";
}

function englishRoot(domain: Domain, idea: string): ExpansionOption[] {
  const fallback = subject(idea);
  const options: Record<Domain, ExpansionOption[]> = {
    transport: [
      { title: "Faster movement", description: "Make transporting people and goods quicker, cheaper, safer, or more efficient." },
      { title: "Less need to move", description: "Design systems where people and goods need to travel less in the first place." },
      { title: "Bring services closer", description: "Move resources and services toward people instead of moving people toward them." },
    ],
    education: [
      { title: "Personalized learning", description: "Adapt the pace, sequence, and support of education to the needs of each learner." },
      { title: "Learning by doing", description: "Make real projects, apprenticeships, and practice the main setting for acquiring knowledge." },
      { title: "Universal access", description: "Remove the geographic, financial, and social barriers that keep people from quality education." },
    ],
    energy: [
      { title: "Generate more energy", description: "Develop cleaner and more reliable ways to produce the energy society needs." },
      { title: "Use less energy", description: "Redesign buildings, devices, and habits so the same outcomes require less power." },
      { title: "Store and distribute energy", description: "Build infrastructure that moves energy through time and place when demand changes." },
    ],
    ai: [
      { title: "Automate routine work", description: "Let intelligent systems handle repetitive tasks that consume human time and attention." },
      { title: "Extend human capabilities", description: "Use AI to help people create, decide, learn, and solve problems they could not handle alone." },
      { title: "Delegate important decisions", description: "Explore where institutions could let AI make or recommend decisions with real consequences." },
    ],
    adaptiveTutor: [
      { title: "Gap detection", description: "Infer which concepts a learner does not actually understand yet." },
      { title: "Learning theory", description: "Examine which model of learning should govern the tutor's decisions." },
      { title: "School without classes", description: "Explore what happens when an adaptive tutor becomes education's primary interface." },
    ],
    restaurants: [
      { title: "Improve the dining experience", description: "Make choosing, ordering, eating, and returning to a restaurant more rewarding for guests." },
      { title: "Reinvent the kitchen", description: "Change how food is sourced, prepared, personalized, and served behind the scenes." },
      { title: "Decentralize the meal", description: "Move restaurant-quality food beyond a single venue into homes, neighborhoods, and public spaces." },
    ],
    coffee: [
      { title: "Third places", description: "Explore the coffee shop as social infrastructure between home and work." },
      { title: "Unit economics", description: "Understand what makes a coffee business financially viable." },
      { title: "Urban rhythms", description: "Examine how coffee shops change the use of a street throughout the day." },
    ],
    cities: [
      { title: "Public life", description: "Explore how streets and shared places enable encounters, belonging, and civic life." },
      { title: "Housing systems", description: "Examine how homes, land, and access shape who can participate in the city." },
      { title: "Climate resilience", description: "Understand how urban systems absorb heat, floods, scarcity, and other shocks." },
    ],
    memory: [
      { title: "Identity and forgetting", description: "Explore how remembering and forgetting shape a person's sense of self." },
      { title: "Memory technologies", description: "Examine tools that record, retrieve, augment, or distort human memory." },
      { title: "Collective memory", description: "Understand how groups preserve, contest, and transmit a shared past." },
    ],
    music: [
      { title: "Emotion and attention", description: "Explore how sound changes feeling, focus, anticipation, and behavior." },
      { title: "Performance economies", description: "Examine how musicians, platforms, venues, and audiences create value." },
      { title: "Sound as environment", description: "Understand music as an atmosphere that shapes spaces and social situations." },
    ],
    sleep: [
      { title: "Sleep better", description: "Improve the quality, regularity, and recovery produced by the hours people already spend asleep." },
      { title: "Redesign the sleep environment", description: "Change bedrooms, lighting, sound, temperature, and routines around the act of sleeping." },
      { title: "Need less sleep", description: "Explore how biology, technology, or work could reduce the time people need to recover." },
    ],
    other: [
      { title: `Improve ${fallback}`, description: `Make the essential outcome of ${fallback} faster, safer, more affordable, or more useful.` },
      { title: `Need less ${fallback}`, description: `Find ways for people to achieve the underlying outcome without depending as heavily on ${fallback}.` },
      { title: `Bring ${fallback} closer`, description: `Move the value, access, or service associated with ${fallback} nearer to the people who need it.` },
    ],
  };
  return options[domain];
}

function spanishRoot(domain: Domain, idea: string): ExpansionOption[] {
  const fallback = subject(idea);
  const options: Record<Domain, ExpansionOption[]> = {
    transport: [
      { title: "Mejorar el movimiento", description: "Hacer que transportar personas y objetos sea más rápido, barato, seguro o eficiente." },
      { title: "Eliminar el movimiento", description: "Diseñar sistemas donde cada vez sea menos necesario desplazarse físicamente." },
      { title: "Acercar lo necesario", description: "Llevar recursos y servicios hacia las personas en lugar de mover a las personas hacia ellos." },
    ],
    education: [
      { title: "Personalizar el aprendizaje", description: "Adaptar el ritmo, la secuencia y el apoyo de la educación a cada estudiante." },
      { title: "Aprender haciendo", description: "Convertir los proyectos reales, la práctica y los oficios en el centro de la adquisición de conocimiento." },
      { title: "Abrir el acceso", description: "Eliminar las barreras geográficas, económicas y sociales que separan a las personas de una educación de calidad." },
    ],
    energy: [
      { title: "Generar más energía", description: "Desarrollar formas más limpias y fiables de producir la energía que necesita la sociedad." },
      { title: "Consumir menos energía", description: "Rediseñar edificios, dispositivos y hábitos para obtener lo mismo usando menos electricidad." },
      { title: "Almacenar y distribuir", description: "Crear infraestructura que lleve la energía a través del tiempo y del territorio cuando cambie la demanda." },
    ],
    ai: [
      { title: "Automatizar tareas rutinarias", description: "Dejar que sistemas inteligentes realicen trabajos repetitivos que consumen tiempo y atención humana." },
      { title: "Aumentar las capacidades humanas", description: "Usar la inteligencia artificial para ayudar a crear, decidir, aprender y resolver problemas complejos." },
      { title: "Delegar decisiones importantes", description: "Explorar qué decisiones con consecuencias reales podrían tomar o recomendar los sistemas de IA." },
    ],
    adaptiveTutor: [
      { title: "Detección de lagunas", description: "Inferir qué conceptos todavía no domina realmente una persona." },
      { title: "Modelo pedagógico", description: "Examinar qué teoría del aprendizaje debería gobernar las decisiones del tutor." },
      { title: "Escuela sin clases", description: "Explorar qué ocurre si un tutor adaptativo se convierte en la interfaz principal de la educación." },
    ],
    restaurants: [
      { title: "Mejorar la experiencia", description: "Hacer más valiosos para los clientes la elección, el pedido, la comida y el regreso al restaurante." },
      { title: "Reinventar la cocina", description: "Cambiar cómo se consiguen, preparan, personalizan y sirven los alimentos dentro del restaurante." },
      { title: "Descentralizar la comida", description: "Llevar comida de calidad de restaurante a hogares, barrios y espacios públicos más allá del local." },
    ],
    coffee: [
      { title: "Terceros lugares", description: "Explorar la cafetería como infraestructura social entre el hogar y el trabajo." },
      { title: "Economía unitaria", description: "Entender qué hace económicamente viable una cafetería." },
      { title: "Ritmos urbanos", description: "Examinar cómo las cafeterías cambian el uso de una calle a lo largo del día." },
    ],
    cities: [
      { title: "Vida pública", description: "Explorar cómo las calles y los espacios compartidos permiten encuentros, pertenencia y vida cívica." },
      { title: "Sistemas de vivienda", description: "Examinar cómo la vivienda, el suelo y el acceso determinan quién participa en la ciudad." },
      { title: "Resiliencia climática", description: "Entender cómo los sistemas urbanos absorben calor, inundaciones, escasez y otras crisis." },
    ],
    memory: [
      { title: "Identidad y olvido", description: "Explorar cómo recordar y olvidar construye el sentido de identidad de una persona." },
      { title: "Tecnologías de la memoria", description: "Examinar herramientas que registran, recuperan, amplían o distorsionan la memoria humana." },
      { title: "Memoria colectiva", description: "Entender cómo los grupos conservan, discuten y transmiten un pasado compartido." },
    ],
    music: [
      { title: "Emoción y atención", description: "Explorar cómo el sonido cambia la emoción, el foco, la anticipación y la conducta." },
      { title: "Economía de la interpretación", description: "Examinar cómo músicos, plataformas, salas y públicos crean valor." },
      { title: "El sonido como entorno", description: "Entender la música como una atmósfera que transforma espacios y situaciones sociales." },
    ],
    sleep: [
      { title: "Dormir mejor", description: "Mejorar la calidad, regularidad y recuperación que producen las horas que ya dedicamos a dormir." },
      { title: "Rediseñar el entorno del sueño", description: "Cambiar dormitorios, luz, sonido, temperatura y rutinas alrededor del acto de dormir." },
      { title: "Necesitar menos sueño", description: "Explorar cómo la biología, la tecnología o el trabajo podrían reducir el tiempo de recuperación necesario." },
    ],
    other: [
      { title: `Mejorar ${fallback}`, description: `Hacer que el resultado principal de ${fallback} sea más rápido, seguro, asequible o útil.` },
      { title: `Necesitar menos ${fallback}`, description: `Encontrar formas de lograr el resultado subyacente sin depender tanto de ${fallback}.` },
      { title: `Acercar ${fallback}`, description: `Llevar el valor, acceso o servicio asociado a ${fallback} más cerca de quienes lo necesitan.` },
    ],
  };
  return options[domain];
}

function adjacentDirections(initialIdea: string, path: ExpansionOption[], spanish: boolean): ExpansionOption[] {
  const current = path.at(-1)?.title ?? subject(initialIdea);
  const movements = spanish ? [
    ["Quién decide", "Seguir cómo esta idea redistribuye autoridad entre personas, instituciones y sistemas."],
    ["Consecuencias no intencionadas", "Explorar qué efectos secundarios puede producir esta dirección fuera de su objetivo principal."],
    ["Precedentes históricos", "Buscar qué ejemplos del pasado ayudan a entender el funcionamiento de esta dirección."],
    ["Economía alrededor", "Examinar quién paga, quién captura valor y qué incentivos sostienen esta dirección."],
    ["Infraestructura necesaria", "Diseñar los sistemas materiales, técnicos y sociales que harían posible esta dirección."],
    ["Tensión central", "Explorar qué valor entra en conflicto con otro cuando esta dirección se lleva lejos."],
    ["Aplicaciones inesperadas", "Encontrar contextos concretos donde esta dirección pueda cambiar una práctica existente."],
    ["Normas y legitimidad", "Preguntar qué reglas, responsabilidades y límites necesita esta dirección para ser aceptable."],
    ["Futuro que implica", "Seguir qué tipo de sociedad o comportamiento podría emerger si esta dirección prospera."],
    ["Ciencia subyacente", "Conectar esta dirección con los mecanismos científicos que explican cuándo funciona y cuándo falla."],
    ["Escala y coordinación", "Examinar qué cambia cuando esta dirección pasa de una persona a una red o una institución."],
    ["Lo que vuelve obsoleto", "Explorar qué práctica, rol o supuesto podría dejar de ser necesario por esta dirección."],
    ["Conducta humana", "Observar cómo esta dirección puede cambiar hábitos, decisiones y relaciones cotidianas."],
    ["Flujos de recursos", "Rastrear qué materiales, tiempo, datos y energía requiere o libera esta dirección."],
    ["Condiciones límite", "Descubrir en qué contextos deja de funcionar esta dirección o cambia de significado."],
    ["Significado cultural", "Explorar qué símbolos, valores y relatos adquiere esta dirección en una sociedad."],
    ["Rediseño institucional", "Imaginar qué organizaciones tendrían que cambiar para sostener esta dirección."],
    ["Nuevos actores", "Identificar quién podría ganar capacidad, voz o responsabilidad gracias a esta dirección."],
    ["Medición y evidencia", "Preguntar qué habría que observar para saber si esta dirección funciona realmente."],
    ["Modos de fallo", "Explorar cómo podría fallar esta dirección y qué daños produciría ese fallo."],
    ["Implicaciones éticas", "Examinar qué obligaciones y dilemas morales aparecen cuando esta dirección se aplica."],
    ["Historias alternativas", "Imaginar qué habría ocurrido si esta dirección hubiera aparecido antes."],
    ["Nuevos rituales", "Seguir qué prácticas repetidas y formas de convivencia podría crear esta dirección."],
    ["Adaptación a largo plazo", "Explorar cómo cambiaría esta dirección después de años de uso y aprendizaje."],
  ] : [
    ["Who decides", "Trace how this idea redistributes authority among people, institutions, and systems."],
    ["Unintended consequences", "Explore which side effects this direction could produce beyond its primary goal."],
    ["Historical precedents", "Find examples from the past that help explain how this direction works."],
    ["The surrounding economics", "Examine who pays, who captures value, and which incentives sustain this direction."],
    ["Necessary infrastructure", "Design the material, technical, and social systems that would make this direction possible."],
    ["The central tension", "Explore which value comes into conflict with another when this direction is taken seriously."],
    ["Unexpected applications", "Find concrete contexts where this direction could change an existing practice."],
    ["Rules and legitimacy", "Ask which rules, responsibilities, and limits this direction needs to be acceptable."],
    ["The future it implies", "Follow what kind of society or behavior could emerge if this direction succeeds."],
    ["The underlying science", "Connect this direction to the scientific mechanisms that explain when it works and fails."],
    ["Scale and coordination", "Examine what changes when this direction moves from one person to a network or institution."],
    ["What it makes obsolete", "Explore which practice, role, or assumption might no longer be necessary because of this direction."],
    ["Human behavior", "Observe how this direction could change habits, decisions, and everyday relationships."],
    ["Resource flows", "Trace which materials, time, data, and energy this direction requires or releases."],
    ["Boundary conditions", "Discover where this direction stops working or changes meaning."],
    ["Cultural meaning", "Explore which symbols, values, and stories this direction acquires in a society."],
    ["Institutional redesign", "Imagine which organizations would need to change to sustain this direction."],
    ["New stakeholders", "Identify who could gain capacity, voice, or responsibility through this direction."],
    ["Measurement and evidence", "Ask what would need to be observed to know whether this direction really works."],
    ["Failure modes", "Explore how this direction could fail and what damage that failure would cause."],
    ["Ethical stakes", "Examine which duties and moral dilemmas appear when this direction is applied."],
    ["Alternative histories", "Imagine what might have happened if this direction had appeared earlier."],
    ["New rituals", "Follow which repeated practices and forms of living together this direction could create."],
    ["Long-term adaptation", "Explore how this direction would change after years of use and learning."],
  ];
  const [label, description] = movements[Math.max(0, path.length - 1) % movements.length];
  const context = current.length > 56 ? `${current.slice(0, 53)}…` : current;
  return [{ title: label, description: `${description} Current concept: ${context}.` }, { title: movements[(Math.max(0, path.length - 1) + 1) % movements.length][0], description: `${movements[(Math.max(0, path.length - 1) + 1) % movements.length][1]} Current concept: ${context}.` }, { title: movements[(Math.max(0, path.length - 1) + 2) % movements.length][0], description: `${movements[(Math.max(0, path.length - 1) + 2) % movements.length][1]} Current concept: ${context}.` }];
}

function alternativeDirections(initialIdea: string, path: ExpansionOption[], spanish: boolean, rejectedOptions: ExpansionOption[]) {
  const current = path.at(-1)?.title ?? subject(initialIdea);
  const suffixes = spanish
    ? ["en hogares", "en comunidades", "mediante infraestructura", "con incentivos", "a través de mercados", "con regulación", "desde la cultura", "mediante datos", "en situaciones límite"]
    : ["in homes", "in communities", "through infrastructure", "through incentives", "through markets", "through regulation", "through culture", "through data", "at the edges"];
  const candidates = suffixes.map((suffix) => ({
    title: `${current} ${suffix}`,
    description: spanish
      ? `Explorar cómo ${current.toLowerCase()} cambia cuando se organiza ${suffix}.`
      : `Explore how ${current.toLowerCase()} changes when it is organized ${suffix}.`,
  }));
  const rejectedTitles = new Set(rejectedOptions.map((option) => option.title.toLocaleLowerCase()));
  return candidates.filter((option) => !rejectedTitles.has(option.title.toLocaleLowerCase())).slice(0, 3);
}

function steeredDirections(initialIdea: string, path: ExpansionOption[], steer: string, spanish: boolean, rejectedOptions: ExpansionOption[]) {
  const current = path.at(-1)?.title ?? subject(initialIdea);
  const context = current.length > 56 ? `${current.slice(0, 53)}…` : current;
  const orientation = steer.toLowerCase();
  const contextText = `${initialIdea} ${current}`.toLowerCase();
  const specific = spanish
    ? /psicolog/.test(orientation) && /transport|movimiento|viaje|tr[aá]nsito/.test(contextText)
      ? [
        { title: "Percepción del tiempo de viaje", description: `Cómo ${context.toLowerCase()} cambia la percepción subjetiva de la duración del desplazamiento.` },
        { title: "Estrés de desplazamiento", description: `Qué respuestas emocionales y sociales produce ${context.toLowerCase()} en las personas.` },
        { title: "Sensación de control", description: `Cómo recuperar agencia y previsibilidad dentro de ${context.toLowerCase()}.` },
      ]
      : /econom/.test(orientation) && /tutor|aprendizaje|educa/.test(contextText)
        ? [
          { title: "Coste marginal de tutoría", description: `Qué recursos adicionales exige orientar ${context.toLowerCase()} a cada estudiante.` },
          { title: "Modelos de acceso", description: `Cómo financiar y distribuir ${context.toLowerCase()} sin perder calidad educativa.` },
          { title: "Sustitución parcial del trabajo docente", description: `Qué tareas cambia ${context.toLowerCase()} y cuáles siguen necesitando profesores.` },
        ]
        : /ciudad|ciudades|urb/.test(orientation) && /caf[eé]|coffee/.test(contextText)
          ? [
            { title: "Tercer lugar", description: `Cómo ${context.toLowerCase()} puede funcionar como infraestructura social de una ciudad.` },
            { title: "Activación de calles", description: `Cómo ${context.toLowerCase()} modifica el uso del espacio público y los ritmos urbanos.` },
            { title: "Ritmos urbanos", description: `Qué patrones de convivencia y movimiento crea ${context.toLowerCase()} durante el día.` },
          ]
          : [
            { title: "Experiencia humana", description: `Qué cambia en las personas cuando ${context.toLowerCase()} se encuentra con ${steer}.` },
            { title: "Sistemas e incentivos", description: `Qué organizaciones y decisiones conectan ${context.toLowerCase()} con ${steer}.` },
            { title: "Consecuencias prácticas", description: `Qué aplicaciones concretas aparecen al relacionar ${context.toLowerCase()} con ${steer}.` },
          ]
    : /psycholog/.test(orientation) && /transport|movement|travel|transit/.test(contextText)
      ? [
        { title: "Perceived travel time", description: `How ${context.toLowerCase()} changes the subjective experience of journey duration.` },
        { title: "Travel stress", description: `Which emotional and social responses ${context.toLowerCase()} produces in people.` },
        { title: "Sense of control", description: `How people recover agency and predictability within ${context.toLowerCase()}.` },
      ]
      : /econom/.test(orientation) && /tutor|learning|educat/.test(contextText)
        ? [
          { title: "Marginal tutoring cost", description: `Which additional resources it takes to adapt ${context.toLowerCase()} to each learner.` },
          { title: "Access models", description: `How to fund and distribute ${context.toLowerCase()} without losing educational quality.` },
          { title: "Partial teacher substitution", description: `Which tasks ${context.toLowerCase()} changes and which still need teachers.` },
        ]
        : /city|cities|urban/.test(orientation) && /coffee|cafe/.test(contextText)
          ? [
            { title: "Third places", description: `How ${context.toLowerCase()} can work as social infrastructure for a city.` },
            { title: "Street activation", description: `How ${context.toLowerCase()} changes public space and urban rhythms.` },
            { title: "Urban rhythms", description: `Which patterns of living together and movement ${context.toLowerCase()} creates during the day.` },
          ]
          : [
            { title: "Human experience", description: `What changes for people when ${context.toLowerCase()} meets ${steer}.` },
            { title: "Systems and incentives", description: `Which organizations and decisions connect ${context.toLowerCase()} with ${steer}.` },
            { title: "Practical consequences", description: `Which concrete applications appear when ${context.toLowerCase()} is related to ${steer}.` },
          ];
  const rejectedTitles = new Set(rejectedOptions.map((option) => option.title.toLocaleLowerCase()));
  return specific.filter((option) => !rejectedTitles.has(option.title.toLocaleLowerCase())).slice(0, 3);
}

export function mockExpansion(initialIdea: string, path: ExpansionOption[], language: LanguagePreference = "auto", rejectedOptions: ExpansionOption[] = [], steer?: string): { options: ExpansionOption[] } {
  const spanish = detectLanguage(initialIdea, language) === "es";
  const root = spanish ? spanishRoot(detectDomain(initialIdea), initialIdea) : englishRoot(detectDomain(initialIdea), initialIdea);
  const primary = steer ? steeredDirections(initialIdea, path, steer, spanish, rejectedOptions) : rejectedOptions.length ? alternativeDirections(initialIdea, path, spanish, rejectedOptions) : path.length ? adjacentDirections(initialIdea, path, spanish) : root;
  return { options: fillToThree(primary, initialIdea, path, spanish) };
}
