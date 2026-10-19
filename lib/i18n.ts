import type { LanguagePreference } from "@/lib/types";

export type UiLanguage = "en" | "es";

export type UiCopy = {
  pageTitle: string;
  pageDescription: string;
  landingEyebrow: string;
  landingTitle: string;
  landingDescription: string;
  ideaLabel: string;
  ideaPlaceholder: string;
  expand: string;
  language: string;
  auto: string;
  english: string;
  spanish: string;
  headerTagline: string;
  newIdea: string;
  sharedExploration: string;
  startWithIdea: string;
  currentConcept: string;
  explorationHistory: string;
  threeDirections: string;
  previousSuggestions: string;
  restoreSuggestion: string;
  exploreMode: string;
  mapMode: string;
  explorationMap: string;
  mapEyebrow: string;
  mapHint: string;
  mapZoom: string;
  zoomIn: string;
  zoomOut: string;
  mapExplored: string;
  mapAvailable: string;
  mapDiscarded: string;
  mapFavorite: string;
  mapConclusion: string;
  mapMerged: string;
  mapCurrent: string;
  mapCenterActive: string;
  mapFit: string;
  mapReorganize: string;
  mapFullscreen: string;
  mapExitFullscreen: string;
  mapContinue: string;
  mapReleaseNode: string;
  mapFixed: string;
  mapNodeSelected: string;
  mapDragHint: string;
  explorationPath: string;
  openExplorationMap: string;
  closeExplorationMap: string;
  explorationView: string;
  useOwnAI: string;
  provider: string;
  apiKey: string;
  connect: string;
  disconnect: string;
  byokConnected: string;
  invalidApiKey: string;
  connectAIToContinue: string;
  whatIsApiKey: string;
  apiKeyShortExplanation: string;
  chooseProviderForAI: string;
  keyStepCreate: string;
  keyStepPaste: string;
  keyStepConnect: string;
  closeSettings: string;
  connectYourAI: string;
  ownAIIntro: string;
  youChooseModel: string;
  youControlKey: string;
  youPayProvider: string;
  noResellTokens: string;
  getStarted: string;
  chooseProvider: string;
  getApiKey: string;
  apiKeyExplanation: string;
  apiKeyStepOne: string;
  apiKeyStepTwo: string;
  apiKeyStepThree: string;
  apiKeyStepFour: string;
  openProviderDashboard: string;
  testConnection: string;
  testingConnection: string;
  connectionSuccessful: string;
  chooseModel: string;
  continueSetup: string;
  readyTitle: string;
  readyDescription: string;
  startExploring: string;
  activeAIProvider: string;
  availableProviders: string;
  manage: string;
  replaceKey: string;
  testAgain: string;
  providerUnavailable: string;
  rateLimitReached: string;
  creditsUnavailable: string;
  modelUnavailable: string;
  noProviderTitle: string;
  noProviderDescription: string;
  explore: string;
  expandingIdea: string;
  noDirections: string;
  retry: string;
  differentDirections: string;
  generatingDifferentDirections: string;
  generateAnother: string;
  discard: string;
  favorite: string;
  unfavorite: string;
  markConclusion: string;
  unmarkConclusion: string;
  goal: string;
  goalPlaceholder: string;
  constraints: string;
  constraintsPlaceholder: string;
  context: string;
  compare: string;
  merge: string;
  mergeAlreadyExists: string;
  synthesize: string;
  selectBranches: string;
  selectTwoBranches: string;
  compareHint: string;
  synthesis: string;
  stale: string;
  recommendation: string;
  nextActions: string;
  keyDifferences: string;
  tradeOffs: string;
  situations: string;
  strengths: string;
  weaknesses: string;
  risks: string;
  assumptions: string;
  whatWasExplored: string;
  strongestDirections: string;
  openQuestions: string;
  importantAssumptions: string;
  branchDiscarded: string;
  undo: string;
  steer: string;
  steerToward: string;
  steerPlaceholder: string;
  steering: string;
  steerSubmit: string;
  steerInvalid: string;
  summarizeJourney: string;
  synthesizingJourney: string;
  conclusion: string;
  keyInsights: string;
  close: string;
  share: string;
  shareExploration: string;
  stopSharing: string;
  saved: string;
  savingFailed: string;
  readOnly: string;
  fork: string;
  sharingUnavailable: string;
  linkCopied: string;
  saving: string;
  logout: string;
  deleteAccount: string;
  deleteAccountConfirm: string;
  accountActionFailed: string;
  accountDeleted: string;
  myExplorations: string;
  openExploration: string;
  deleteExploration: string;
  deleteExplorationConfirm: string;
  noSavedExplorations: string;
  explorationListError: string;
  forkUnavailable: string;
  errors: {
    auth: string;
    quota: string;
    invalidRequest: string;
    unavailable: string;
    journeyTooShort: string;
    summaryUnavailable: string;
  };
};

const COPY: Record<UiLanguage, UiCopy> = {
  en: {
    pageTitle: "Xpansive — Explore an idea",
    pageDescription: "Three directions to expand any idea.",
    landingEyebrow: "A TOOL FOR BETTER QUESTIONS",
    landingTitle: "What do you want to expand?",
    landingDescription: "Start with an idea. We’ll open three different directions worth exploring.",
    ideaLabel: "What do you want to expand?",
    ideaPlaceholder: "A question, a problem, a possibility…",
    expand: "EXPAND",
    language: "Language",
    auto: "Auto",
    english: "English",
    spanish: "Spanish",
    headerTagline: "EXPAND THE QUESTION",
    newIdea: "NEW IDEA",
    sharedExploration: "SHARED EXPLORATION",
    startWithIdea: "START WITH AN IDEA",
    currentConcept: "CURRENT CONCEPT",
    explorationHistory: "Exploration history",
    threeDirections: "Three directions",
    previousSuggestions: "Previous suggestions",
    restoreSuggestion: "Restore",
    exploreMode: "EXPLORE",
    mapMode: "MAP",
    explorationMap: "Exploration map",
    mapEyebrow: "EXPLORATION MAP",
    mapHint: "A territory of ideas. Select any node to continue there.",
    mapZoom: "Map zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    mapExplored: "Explored",
    mapAvailable: "Available",
    mapDiscarded: "Discarded",
    mapFavorite: "Favorite",
    mapConclusion: "Conclusion",
    mapMerged: "Merged",
    mapCurrent: "Current",
    mapCenterActive: "Center active node",
    mapFit: "Fit graph",
    mapReorganize: "Reorganize graph",
    mapFullscreen: "Show map fullscreen",
    mapExitFullscreen: "Exit fullscreen map",
    mapContinue: "Continue here",
    mapReleaseNode: "Release position",
    mapFixed: "position fixed",
    mapNodeSelected: "SELECTED NODE",
    mapDragHint: "Drag nodes · drag the background to pan · scroll to zoom",
    explorationPath: "PATH",
    openExplorationMap: "Open exploration map",
    closeExplorationMap: "Close exploration map",
    explorationView: "Exploration view",
    useOwnAI: "USE YOUR OWN AI",
    provider: "Provider",
    apiKey: "API key",
    connect: "CONNECT",
    disconnect: "DISCONNECT",
    byokConnected: "YOUR AI CONNECTED",
    invalidApiKey: "We couldn't validate this key. Check that you copied it completely and that it belongs to",
    connectAIToContinue: "Connect your AI to continue",
    whatIsApiKey: "What is an API key?",
    apiKeyShortExplanation: "It is a private password that lets Xpansive use your chosen AI provider for this session.",
    chooseProviderForAI: "Choose a provider",
    keyStepCreate: "1. Create or copy your API key",
    keyStepPaste: "2. Paste it here",
    keyStepConnect: "3. Connect",
    closeSettings: "Close AI settings",
    connectYourAI: "CONNECT YOUR AI",
    ownAIIntro: "Xpansive works with your own AI provider. AI usage is billed by that provider according to its pricing.",
    youChooseModel: "You choose the model.",
    youControlKey: "You control the API key.",
    youPayProvider: "You pay the provider directly.",
    noResellTokens: "Xpansive does not resell AI tokens.",
    getStarted: "GET STARTED",
    chooseProvider: "Choose your AI provider",
    getApiKey: "Get your API key",
    apiKeyExplanation: "An API key lets Xpansive send requests to your provider on your behalf. Your provider bills the AI usage directly; Xpansive does not create or store the key.",
    apiKeyStepOne: "Open the provider dashboard",
    apiKeyStepTwo: "Create an API key",
    apiKeyStepThree: "Copy it",
    apiKeyStepFour: "Return to Xpansive",
    openProviderDashboard: "OPEN PROVIDER DASHBOARD ↗",
    testConnection: "TEST CONNECTION",
    testingConnection: "TESTING…",
    connectionSuccessful: "CONNECTION SUCCESSFUL",
    chooseModel: "Choose model",
    continueSetup: "CONTINUE",
    readyTitle: "You're ready.",
    readyDescription: "Let's create your first exploration.",
    startExploring: "START EXPLORING",
    activeAIProvider: "ACTIVE AI PROVIDER",
    availableProviders: "AVAILABLE PROVIDERS",
    manage: "MANAGE",
    replaceKey: "REPLACE KEY",
    testAgain: "TEST AGAIN",
    providerUnavailable: "Your AI provider is temporarily unavailable.",
    rateLimitReached: "Your provider's rate limit was reached.",
    creditsUnavailable: "Your provider balance or credits are unavailable.",
    modelUnavailable: "The selected model is not available.",
    noProviderTitle: "Connect an AI provider",
    noProviderDescription: "Xpansive needs your AI provider to generate new ideas.",
    explore: "EXPLORE",
    expandingIdea: "EXPANDING THIS IDEA",
    noDirections: "No directions yet.",
    retry: "RETRY",
    differentDirections: "DIFFERENT DIRECTIONS",
    generatingDifferentDirections: "GENERATING DIFFERENT DIRECTIONS",
    generateAnother: "＋ GENERATE ANOTHER",
    discard: "Discard branch",
    favorite: "Save as favorite",
    unfavorite: "Remove favorite",
    markConclusion: "Mark as conclusion",
    unmarkConclusion: "Remove conclusion",
    goal: "Optional goal",
    goalPlaceholder: "What would make this exploration useful?",
    constraints: "Constraints",
    constraintsPlaceholder: "Add a constraint and press Enter",
    context: "Context",
    compare: "COMPARE",
    merge: "MERGE",
    mergeAlreadyExists: "These two branches have already been merged.",
    synthesize: "SYNTHESIZE",
    selectBranches: "Select 2–3 branches",
    selectTwoBranches: "Select exactly 2 branches",
    compareHint: "Compare directions without changing the tree.",
    synthesis: "SYNTHESIS",
    stale: "This synthesis is outdated",
    recommendation: "RECOMMENDED DIRECTION",
    nextActions: "NEXT ACTIONS",
    keyDifferences: "KEY DIFFERENCES",
    tradeOffs: "TRADE-OFFS",
    situations: "WHEN EACH FITS",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    risks: "Risks",
    assumptions: "Assumptions",
    whatWasExplored: "WHAT WAS EXPLORED",
    strongestDirections: "STRONGEST DIRECTIONS",
    openQuestions: "OPEN QUESTIONS",
    importantAssumptions: "IMPORTANT ASSUMPTIONS",
    branchDiscarded: "Branch discarded",
    undo: "Undo",
    steer: "STEER",
    steerToward: "Steer toward…",
    steerPlaceholder: "psychology, economics, something more practical…",
    steering: "STEERING",
    steerSubmit: "Apply steering",
    steerInvalid: "Enter 2–100 characters with at least one letter or number.",
    summarizeJourney: "SUMMARIZE JOURNEY",
    synthesizingJourney: "SYNTHESIZING JOURNEY",
    conclusion: "CONCLUSION",
    keyInsights: "KEY INSIGHTS",
    close: "Close summary",
    share: "SHARE",
    shareExploration: "Share exploration",
    stopSharing: "STOP SHARING",
    saved: "Saved",
    savingFailed: "Save unavailable",
    readOnly: "Read only",
    fork: "FORK",
    sharingUnavailable: "Sharing is currently unavailable",
    linkCopied: "LINK COPIED",
    saving: "SAVING…",
    logout: "LOG OUT",
    deleteAccount: "DELETE ACCOUNT",
    deleteAccountConfirm: "Delete your account, explorations, feedback and access permanently?",
    accountActionFailed: "The account action could not be completed.",
    accountDeleted: "Account deleted.",
    myExplorations: "YOUR EXPLORATIONS",
    openExploration: "OPEN",
    deleteExploration: "DELETE",
    deleteExplorationConfirm: "Delete this exploration permanently?",
    noSavedExplorations: "No saved explorations yet.",
    explorationListError: "Saved explorations are temporarily unavailable.",
    forkUnavailable: "This copy could not be created. Try again.",
    errors: {
      auth: "The OpenAI key is invalid or does not have permission.",
      quota: "OpenAI has reached its limit or has no available quota.",
      invalidRequest: "The request is invalid.",
      unavailable: "The expansion engine is unavailable. Try again.",
      journeyTooShort: "Choose at least three steps before summarizing the journey.",
      summaryUnavailable: "The journey could not be summarized. Try again.",
    },
  },
  es: {
    pageTitle: "Xpansive — Explora una idea",
    pageDescription: "Tres direcciones para expandir cualquier idea.",
    landingEyebrow: "UNA HERRAMIENTA PARA MEJORES PREGUNTAS",
    landingTitle: "¿Qué quieres explorar?",
    landingDescription: "Empieza con una idea. Abriremos tres direcciones diferentes que merecen ser exploradas.",
    ideaLabel: "¿Qué quieres explorar?",
    ideaPlaceholder: "Una pregunta, un problema, una posibilidad…",
    expand: "EXPLORAR",
    language: "Idioma",
    auto: "Automático",
    english: "Inglés",
    spanish: "Español",
    headerTagline: "EXPANDE LA PREGUNTA",
    newIdea: "NUEVA IDEA",
    sharedExploration: "EXPLORACIÓN COMPARTIDA",
    startWithIdea: "EMPIEZA CON UNA IDEA",
    currentConcept: "CONCEPTO ACTUAL",
    explorationHistory: "Historial de exploración",
    threeDirections: "Tres direcciones",
    previousSuggestions: "Sugerencias anteriores",
    restoreSuggestion: "Restaurar",
    exploreMode: "EXPLORAR",
    mapMode: "MAPA",
    explorationMap: "Mapa de exploración",
    mapEyebrow: "MAPA DE EXPLORACIÓN",
    mapHint: "Un territorio de ideas. Selecciona cualquier nodo para continuar allí.",
    mapZoom: "Zoom del mapa",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    mapExplored: "Explorado",
    mapAvailable: "Disponible",
    mapDiscarded: "Descartada",
    mapFavorite: "Favorita",
    mapConclusion: "Conclusión",
    mapMerged: "Fusionada",
    mapCurrent: "Actual",
    mapCenterActive: "Centrar nodo activo",
    mapFit: "Encuadrar grafo",
    mapReorganize: "Reorganizar grafo",
    mapFullscreen: "Mostrar mapa a pantalla completa",
    mapExitFullscreen: "Salir del mapa a pantalla completa",
    mapContinue: "Continuar aquí",
    mapReleaseNode: "Liberar posición",
    mapFixed: "posición fijada",
    mapNodeSelected: "NODO SELECCIONADO",
    mapDragHint: "Arrastra nodos · arrastra el fondo para moverlo · rueda para ampliar",
    explorationPath: "RECORRIDO",
    openExplorationMap: "Abrir mapa de exploración",
    closeExplorationMap: "Cerrar mapa de exploración",
    explorationView: "Vista de exploración",
    useOwnAI: "USAR MI PROPIA IA",
    provider: "Proveedor",
    apiKey: "API key",
    connect: "CONECTAR",
    disconnect: "DESCONECTAR",
    byokConnected: "TU IA ESTÁ CONECTADA",
    invalidApiKey: "No hemos podido validar esta key. Comprueba que la hayas copiado completa y que pertenezca a",
    connectAIToContinue: "Conecta tu IA para continuar",
    whatIsApiKey: "¿Qué es una API key?",
    apiKeyShortExplanation: "Es una contraseña privada que permite a Xpansive usar tu proveedor de IA durante esta sesión.",
    chooseProviderForAI: "Elige un proveedor",
    keyStepCreate: "1. Crea o copia tu API key",
    keyStepPaste: "2. Pégala aquí",
    keyStepConnect: "3. Conecta",
    closeSettings: "Cerrar configuración de IA",
    connectYourAI: "CONECTA TU IA",
    ownAIIntro: "Xpansive funciona con tu propio proveedor de IA. El consumo de IA lo factura ese proveedor según sus precios.",
    youChooseModel: "Tú eliges el modelo.",
    youControlKey: "Tú controlas la API key.",
    youPayProvider: "Tú pagas directamente al proveedor.",
    noResellTokens: "Xpansive no revende tokens de IA.",
    getStarted: "EMPEZAR",
    chooseProvider: "Elige tu proveedor de IA",
    getApiKey: "Obtén tu API key",
    apiKeyExplanation: "Una API key permite que Xpansive envíe peticiones a tu proveedor en tu nombre. Ese proveedor factura directamente el consumo de IA; Xpansive no crea ni almacena la clave.",
    apiKeyStepOne: "Abre el panel del proveedor",
    apiKeyStepTwo: "Crea una API key",
    apiKeyStepThree: "Cópiala",
    apiKeyStepFour: "Vuelve a Xpansive",
    openProviderDashboard: "ABRIR PANEL DEL PROVEEDOR ↗",
    testConnection: "PROBAR CONEXIÓN",
    testingConnection: "PROBANDO…",
    connectionSuccessful: "CONEXIÓN CORRECTA",
    chooseModel: "Elige el modelo",
    continueSetup: "CONTINUAR",
    readyTitle: "Ya estás listo.",
    readyDescription: "Vamos a crear tu primera exploración.",
    startExploring: "EMPEZAR A EXPLORAR",
    activeAIProvider: "PROVEEDOR DE IA ACTIVO",
    availableProviders: "PROVEEDORES DISPONIBLES",
    manage: "GESTIONAR",
    replaceKey: "CAMBIAR KEY",
    testAgain: "PROBAR DE NUEVO",
    providerUnavailable: "Tu proveedor de IA no está disponible temporalmente.",
    rateLimitReached: "Has alcanzado el límite de peticiones del proveedor.",
    creditsUnavailable: "El saldo o los créditos del proveedor no están disponibles.",
    modelUnavailable: "El modelo seleccionado no está disponible.",
    noProviderTitle: "Conecta un proveedor de IA",
    noProviderDescription: "Xpansive necesita tu proveedor de IA para generar nuevas ideas.",
    explore: "EXPLORAR",
    expandingIdea: "EXPLORANDO ESTA IDEA",
    noDirections: "Todavía no hay direcciones.",
    retry: "REINTENTAR",
    differentDirections: "OTRAS DIRECCIONES",
    generatingDifferentDirections: "GENERANDO OTRAS DIRECCIONES",
    generateAnother: "＋ GENERAR OTRA",
    discard: "Descartar rama",
    favorite: "Guardar como favorita",
    unfavorite: "Quitar de favoritas",
    markConclusion: "Marcar como conclusión",
    unmarkConclusion: "Quitar conclusión",
    goal: "Objetivo opcional",
    goalPlaceholder: "¿Qué haría útil esta exploración?",
    constraints: "Restricciones",
    constraintsPlaceholder: "Añade una restricción y pulsa Enter",
    context: "Contexto",
    compare: "COMPARAR",
    merge: "FUSIONAR",
    mergeAlreadyExists: "Estas dos ramas ya se han fusionado.",
    synthesize: "SINTETIZAR",
    selectBranches: "Selecciona 2–3 ramas",
    selectTwoBranches: "Selecciona exactamente 2 ramas",
    compareHint: "Compara direcciones sin modificar el árbol.",
    synthesis: "SÍNTESIS",
    stale: "Esta síntesis está desactualizada",
    recommendation: "DIRECCIÓN RECOMENDADA",
    nextActions: "PRÓXIMAS ACCIONES",
    keyDifferences: "DIFERENCIAS CLAVE",
    tradeOffs: "EQUILIBRIOS",
    situations: "CUÁNDO ENCAJA CADA UNA",
    strengths: "Fortalezas",
    weaknesses: "Debilidades",
    risks: "Riesgos",
    assumptions: "Supuestos",
    whatWasExplored: "QUÉ SE HA EXPLORADO",
    strongestDirections: "DIRECCIONES MÁS FUERTES",
    openQuestions: "PREGUNTAS ABIERTAS",
    importantAssumptions: "SUPUESTOS IMPORTANTES",
    branchDiscarded: "Rama descartada",
    undo: "Deshacer",
    steer: "ORIENTAR",
    steerToward: "Orientar hacia…",
    steerPlaceholder: "psicología, economía, algo más práctico…",
    steering: "ORIENTANDO",
    steerSubmit: "Aplicar orientación",
    steerInvalid: "Escribe entre 2 y 100 caracteres con al menos una letra o número.",
    summarizeJourney: "SINTETIZAR RECORRIDO",
    synthesizingJourney: "SINTETIZANDO RECORRIDO",
    conclusion: "CONCLUSIÓN",
    keyInsights: "IDEAS CLAVE",
    close: "Cerrar resumen",
    share: "COMPARTIR",
    shareExploration: "Compartir exploración",
    stopSharing: "DEJAR DE COMPARTIR",
    saved: "Guardado",
    savingFailed: "No se ha podido guardar",
    readOnly: "Solo lectura",
    fork: "DUPLICAR",
    sharingUnavailable: "Compartir no está disponible ahora",
    linkCopied: "ENLACE COPIADO",
    saving: "GUARDANDO…",
    logout: "SALIR",
    deleteAccount: "BORRAR CUENTA",
    deleteAccountConfirm: "¿Borrar permanentemente tu cuenta, exploraciones, feedback y acceso?",
    accountActionFailed: "No se ha podido completar la acción de cuenta.",
    accountDeleted: "Cuenta borrada.",
    myExplorations: "TUS EXPLORACIONES",
    openExploration: "ABRIR",
    deleteExploration: "BORRAR",
    deleteExplorationConfirm: "¿Borrar permanentemente esta exploración?",
    noSavedExplorations: "Todavía no tienes exploraciones guardadas.",
    explorationListError: "Las exploraciones guardadas no están disponibles ahora.",
    forkUnavailable: "No se ha podido crear la copia. Inténtalo de nuevo.",
    errors: {
      auth: "La clave de OpenAI no es válida o no tiene permisos.",
      quota: "OpenAI ha alcanzado el límite o no tiene cuota disponible.",
      invalidRequest: "La solicitud no es válida.",
      unavailable: "El motor de expansión no está disponible. Inténtalo de nuevo.",
      journeyTooShort: "Elige al menos tres pasos antes de sintetizar el recorrido.",
      summaryUnavailable: "No se ha podido sintetizar el recorrido. Inténtalo de nuevo.",
    },
  },
};

export function resolveUiLanguage(preference: LanguagePreference): UiLanguage {
  if (preference !== "auto") return preference;
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("es")) return "es";
  return "en";
}

export function getCopy(language: UiLanguage): UiCopy {
  return COPY[language];
}

export function localizeError(message: string, language: UiLanguage): string {
  const copy = getCopy(language);
  if (message.includes("OpenAI authentication failed") || message.includes("La clave de OpenAI")) return copy.errors.auth;
  if (message.includes("OpenAI rate limit") || message.includes("OpenAI ha alcanzado")) return copy.errors.quota;
  if (message === "The request is invalid." || message === "La solicitud no es válida.") return copy.errors.invalidRequest;
  if (message === "Unable to expand this idea." || message === "The expansion engine is unavailable. Try again.") return copy.errors.unavailable;
  if (message.includes("at least three") || message.includes("al menos tres")) return copy.errors.journeyTooShort;
  if (message.includes("Unable to summarize") || message.includes("summary failed") || message.includes("resumen")) return copy.errors.summaryUnavailable;
  return message;
}
