const EMERGENCY_PATTERNS = [
    /no puede respirar/i, /no respira/i, /infarto/i, /paro card/i,
    /sangrado/i, /convuls/i, /inconsciente/i, /desmay/i,
    /accidente/i, /atropell/i, /quemadura grave/i, /ahogan/i,
    /me estoy muriendo/i, /emergencia/i, /urgencia/i, /ambulancia/i,
    /suicid/i, /sobredosis/i, /envenenamiento/i,
  ];
  
  export function isEmergency(text: string): boolean {
    return EMERGENCY_PATTERNS.some((p) => p.test(text));
  }
  
  export const EMERGENCY_REPLY =
    "🚨 Si se trata de una emergencia médica, llama de inmediato:\n\n" +
    "**911** (Emergencias nacionales)\n" +
    "**55 5395 1111** (Cruz Roja CDMX–Edomex)\n\n" +
    "No puedo darte orientación médica. Por favor llama ahora.";