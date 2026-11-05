export const GAME_TYPES = {
  adicao: {
    label: 'Adição',
    description: 'Somar para resolver situações reais.',
    generator: (contextIndex = 0, grade = 4) => {
      const rules = getGradeRules(grade);
      const a = randomInt(1, Math.floor(rules.additionMax / 2));
      const b = randomInt(1, rules.additionMax - a);
      const total = a + b;
      const context = CONTEXTS.adicao[contextIndex % CONTEXTS.adicao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, a turma separou ${a} ${context.item} pela manhã e mais ${b} à tarde. Qual é o total?`;
      const explanation = `Pensamos assim: ${a} + ${b} = ${total}. Quando juntamos os grupos, o total fica ${total}.`;
      return makeQuestion({
        prompt: story,
        contextId: `adicao:${context.place}`,
        example: `Exemplo prático: some o que havia de manhã (${a}) com o que chegou à tarde (${b}). A conta fica ${a} + ${b}.`,
        visual: { icon: context.icon, groups: [`${a} ${context.item}`, `${b} ${context.item}`], caption: 'Junte os dois grupos' },
        correctAnswer: total,
        options: buildNumericOptions(total),
        explanation,
        grade,
      });
    },
  },
  subtracao: {
    label: 'Subtração',
    description: 'Descobrir o que sobra.',
    generator: (contextIndex = 0, grade = 4) => {
      const rules = getGradeRules(grade);
      const a = randomInt(3, rules.subtractionMax);
      const b = randomInt(1, a - 1);
      const diff = a - b;
      const context = CONTEXTS.subtracao[contextIndex % CONTEXTS.subtracao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, a turma tinha ${a} ${context.item}. Depois de usar ${b}, qual quantidade restou?`;
      const explanation = `A quantidade que sobrou é a diferença: ${a} - ${b} = ${diff}.`;
      return makeQuestion({
        prompt: story,
        contextId: `subtracao:${context.place}`,
        example: `Exemplo prático: comece com ${a} e retire ${b}. Para descobrir o restante, calcule ${a} - ${b}.`,
        visual: { icon: context.icon, groups: [`${a} ${context.item}`, `${b} usados`], caption: 'Retire uma parte e conte o que ficou' },
        correctAnswer: diff,
        options: buildNumericOptions(diff),
        explanation,
        grade,
      });
    },
  },
  multiplicacao: {
    label: 'Multiplicação',
    description: 'Agrupar e repetir quantidades.',
    generator: (contextIndex = 0, grade = 4) => {
      const rules = getGradeRules(grade);
      const a = randomInt(2, rules.multiplicationFactorMax);
      const b = randomInt(2, rules.multiplicationFactorMax);
      const total = a * b;
      const context = CONTEXTS.multiplicacao[contextIndex % CONTEXTS.multiplicacao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, cada ${context.container} tem ${a} ${context.item}. Qual é o total de itens em ${b} grupos iguais?`;
      const explanation = `Multiplicar significa repetir grupos iguais: ${a} × ${b} = ${total}.`;
      return makeQuestion({
        prompt: story,
        contextId: `multiplicacao:${context.place}`,
        example: `Exemplo prático: em ${b} grupos com ${a} itens cada, pense em ${a} + ${a} + ... ou calcule ${a} × ${b}.`,
        visual: { icon: context.icon, groups: Array.from({ length: b }, () => `${a} ${context.item}`), caption: 'Repita a mesma quantidade em cada grupo' },
        correctAnswer: total,
        options: buildNumericOptions(total),
        explanation,
        grade,
      });
    },
  },
  divisao: {
    label: 'Divisão',
    description: 'Repartir em partes iguais.',
    generator: (contextIndex = 0, grade = 4) => {
      const rules = getGradeRules(grade);
      const divisor = randomInt(2, rules.divisionDivisorMax);
      const quotient = randomInt(2, rules.divisionQuotientMax);
      const dividend = divisor * quotient;
      const context = CONTEXTS.divisao[contextIndex % CONTEXTS.divisao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, a turma vai repartir ${dividend} ${context.item} igualmente em ${divisor} grupos. Qual quantidade fica em cada grupo?`;
      const explanation = `Repartir igualmente significa dividir: ${dividend} ÷ ${divisor} = ${quotient}.`;
      return makeQuestion({
        prompt: story,
        contextId: `divisao:${context.place}`,
        example: `Exemplo prático: distribua ${dividend} itens, um por vez, entre ${divisor} grupos iguais. A conta é ${dividend} ÷ ${divisor}.`,
        visual: { icon: context.icon, groups: Array.from({ length: divisor }, () => `${quotient} ${context.item}`), caption: 'Reparta igualmente entre os grupos' },
        correctAnswer: quotient,
        options: buildNumericOptions(quotient),
        explanation,
        grade,
      });
    },
  },
  formas: {
    label: 'Formas Geométricas',
    description: 'Reconhecer formas no mundo real.',
    generator: (contextIndex = 0, grade = 4) => {
      const availableShapes = CONTEXTS.formas.filter((shape) => shape.minGrade <= grade);
      const context = availableShapes[contextIndex % availableShapes.length];
      const shapes = availableShapes.reduce((unique, entry) => {
        if (!unique.some((shape) => shape.name === entry.name)) unique.push(entry);
        return unique;
      }, []);
      const correct = context;
      const distractors = shapes.filter((shape) => shape.name !== correct.name).map((shape) => shape.name);
      const options = shuffleArray([correct.name, ...shuffleArray(distractors).slice(0, 3)]);
      const sideDescription = correct.sides === 0 ? 'não tem lados retos' : `tem ${correct.sides} lados`;
      const explanation = `A figura ${correct.name} ${sideDescription}. Observe o contorno de ${correct.object} para encontrar essa forma.`;
      return makeQuestion({
        prompt: correct.sides === 0
          ? `O contorno de ${correct.object} é redondo e não tem lados retos. Qual forma geométrica ele representa?`
          : `O contorno de ${correct.object} tem ${correct.sides} lados. Qual forma geométrica ele representa?`,
        contextId: `formas:${correct.object}`,
        example: correct.sides === 0
          ? `Exemplo prático: observe o contorno redondo de ${correct.object}; formas sem lados retos são círculos.`
          : `Exemplo prático: conte cada segmento reto do contorno de ${correct.object}; formas com ${correct.sides} lados são chamadas de ${correct.name.toLowerCase()}.`,
        visual: { icon: shapeIcon(correct.name), groups: [correct.sides === 0 ? 'contorno redondo' : `${correct.sides} lados`, correct.object], caption: 'Observe a forma no mundo real' },
        correctAnswer: correct.name,
        options,
        explanation,
        grade,
      });
    },
  },
  fracoes: {
    label: 'Frações',
    description: 'Descobrir partes iguais de um todo.',
    generator: (contextIndex = 0, grade = 4) => {
      const rules = getGradeRules(grade);
      const context = CONTEXTS.fracoes[contextIndex % CONTEXTS.fracoes.length];
      const denominator = randomInt(2, rules.fractionDenominatorMax);
      const numerator = randomInt(1, denominator - 1);
      const correct = `${numerator}/${denominator}`;
      const distractors = [];
      for (let candidateDenominator = 2; candidateDenominator <= rules.fractionDenominatorMax; candidateDenominator += 1) {
        for (let candidateNumerator = 1; candidateNumerator < candidateDenominator; candidateNumerator += 1) {
          if (candidateNumerator * denominator !== numerator * candidateDenominator) {
            distractors.push(`${candidateNumerator}/${candidateDenominator}`);
          }
        }
      }
      const answerOptions = shuffleArray([correct, ...shuffleArray(distractors).slice(0, 3)]);
      return makeQuestion({
        prompt: `${context.whole} foi dividida em ${denominator} partes iguais. ${numerator} partes foram servidas. Que fração representa a parte servida?`,
        contextId: `fracoes:${context.place}`,
        example: `Exemplo prático: de ${denominator} partes iguais de ${context.subject}, ${numerator} foram servidas. A fração é ${numerator}/${denominator}.`,
        visual: { icon: context.icon, groups: [`${numerator} partes servidas`, `${denominator - numerator} restantes`], caption: 'Compare as partes servidas com o total' },
        correctAnswer: correct,
        options: answerOptions,
        explanation: `O denominador mostra o total de partes iguais (${denominator}) e o numerador mostra quantas foram servidas (${numerator}). A fração é ${correct}.`,
        grade,
      });
    },
  },
};

export function getGameDefinition(gameKey) {
  const key = GAME_TYPES[gameKey] ? gameKey : 'adicao';
  return { key, ...GAME_TYPES[key] };
}

export function buildQuestions(gameKey, total = 10, { excludeContextIds = [], grade = 4 } = {}) {
  const { key } = getGameDefinition(gameKey);
  const schoolGrade = normalizeGrade(grade);
  const contexts = CONTEXTS[key];
  const excluded = new Set(excludeContextIds);
  const questionCount = Math.min(total, contexts.length);
  const availableStarts = contexts.map((_, start) => start).filter((start) => (
    Array.from({ length: questionCount }, (_, offset) => contextIdFor(key, start + offset))
      .every((contextId) => !excluded.has(contextId))
  ));
  const starts = availableStarts.length ? availableStarts : contexts.map((_, index) => index);
  const startIndex = starts[randomInt(0, starts.length - 1)];
  return Array.from({ length: total }, (_, index) => GAME_TYPES[key].generator(startIndex + index, schoolGrade));
}

export function normalizeGrade(grade) {
  const value = Number(grade);
  if (!Number.isFinite(value)) return 4;
  return Math.min(5, Math.max(1, Math.floor(value)));
}

export function getGradeFromClassroom(classroom) {
  const match = String(classroom || '').match(/(?:^|\D)([1-5])\s*[º°]?\s*ano/i);
  return match ? normalizeGrade(match[1]) : 4;
}

function getGradeRules(grade) {
  return [
    null,
    { additionMax: 20, subtractionMax: 20, multiplicationFactorMax: 3, divisionDivisorMax: 3, divisionQuotientMax: 4, fractionDenominatorMax: 4 },
    { additionMax: 100, subtractionMax: 100, multiplicationFactorMax: 5, divisionDivisorMax: 5, divisionQuotientMax: 6, fractionDenominatorMax: 6 },
    { additionMax: 1000, subtractionMax: 1000, multiplicationFactorMax: 9, divisionDivisorMax: 9, divisionQuotientMax: 10, fractionDenominatorMax: 8 },
    { additionMax: 10000, subtractionMax: 10000, multiplicationFactorMax: 10, divisionDivisorMax: 10, divisionQuotientMax: 10, fractionDenominatorMax: 10 },
    { additionMax: 100000, subtractionMax: 100000, multiplicationFactorMax: 12, divisionDivisorMax: 12, divisionQuotientMax: 12, fractionDenominatorMax: 12 },
  ][normalizeGrade(grade)];
}

function contextIdFor(key, index) {
  const context = CONTEXTS[key][index % CONTEXTS[key].length];
  return `${key}:${key === 'formas' ? context.object : context.place}`;
}

export function formatAnswer(value) {
  if (typeof value === 'number') {
    return String(value);
  }
  return value;
}

function makeQuestion({ prompt, correctAnswer, options, explanation, visual, example, contextId, grade = 4 }) {
  return {
    prompt,
    correctAnswer,
    options: shuffleArray(options),
    explanation,
    visual,
    example,
    contextId,
    grade,
  };
}

const CONTEXTS = {
  adicao: [
    { place: 'biblioteca', item: 'livros', icon: '📚' },
    { place: 'horta', item: 'sementes', icon: '🌱' },
    { place: 'quadra', item: 'cones', icon: '🔶' },
    { place: 'oficina de arte', item: 'pincéis', icon: '🖌️' },
    { place: 'sala de ciências', item: 'amostras', icon: '🧪' },
    { place: 'campanha solidária', item: 'latas', icon: '🥫' },
    { place: 'aquário da escola', item: 'conchas', icon: '🐚' },
    { place: 'sala de música', item: 'partituras', icon: '🎼' },
    { place: 'jardim', item: 'mudas', icon: '🌼' },
    { place: 'feira de ciências', item: 'cartazes', icon: '🪧' },
  ],
  subtracao: [
    { place: 'biblioteca', item: 'livros', icon: '📚' },
    { place: 'horta', item: 'mudas', icon: '🌱' },
    { place: 'quadra', item: 'bolas', icon: '⚽' },
    { place: 'oficina de arte', item: 'folhas', icon: '🎨' },
    { place: 'sala de ciências', item: 'tubos de ensaio', icon: '🧪' },
    { place: 'campanha solidária', item: 'cobertores', icon: '🧣' },
    { place: 'aquário da escola', item: 'conchas', icon: '🐚' },
    { place: 'sala de música', item: 'instrumentos', icon: '🎸' },
    { place: 'cozinha da escola', item: 'maçãs', icon: '🍎' },
    { place: 'feira de ciências', item: 'cartões', icon: '🔬' },
  ],
  multiplicacao: [
    { place: 'ateliê', container: 'caixa', item: 'lápis', icon: '✏️' },
    { place: 'biblioteca', container: 'estante', item: 'livros', icon: '📚' },
    { place: 'horta', container: 'canteiro', item: 'mudas', icon: '🌱' },
    { place: 'laboratório', container: 'bandeja', item: 'frascos', icon: '🧪' },
    { place: 'quadra', container: 'equipe', item: 'jogadores', icon: '🏀' },
    { place: 'cozinha', container: 'forma', item: 'bolinhos', icon: '🧁' },
    { place: 'sala de música', container: 'suporte', item: 'instrumentos', icon: '🎸' },
    { place: 'feira de ciências', container: 'painel', item: 'fotografias', icon: '🖼️' },
    { place: 'jardim', container: 'fileira', item: 'flores', icon: '🌷' },
    { place: 'sala de jogos', container: 'mesa', item: 'peças', icon: '🎲' },
  ],
  divisao: [
    { place: 'biblioteca', item: 'livros', icon: '📚' },
    { place: 'horta', item: 'sementes', icon: '🌱' },
    { place: 'quadra', item: 'coletes', icon: '🏃' },
    { place: 'oficina de arte', item: 'pincéis', icon: '🖌️' },
    { place: 'laboratório', item: 'amostras', icon: '🧪' },
    { place: 'campanha solidária', item: 'alimentos', icon: '🥫' },
    { place: 'sala de música', item: 'partituras', icon: '🎼' },
    { place: 'jardim', item: 'mudas', icon: '🌼' },
    { place: 'cozinha da escola', item: 'frutas', icon: '🍊' },
    { place: 'feira de ciências', item: 'cartões', icon: '🔬' },
  ],
  formas: [
    { name: 'Círculo', sides: 0, object: 'um prato', minGrade: 1 },
    { name: 'Triângulo', sides: 3, object: 'uma placa de trânsito', minGrade: 1 },
    { name: 'Quadrado', sides: 4, object: 'um azulejo', minGrade: 1 },
    { name: 'Retângulo', sides: 4, object: 'uma porta', minGrade: 2 },
    { name: 'Pentágono', sides: 5, object: 'uma peça de jogo', minGrade: 3 },
    { name: 'Hexágono', sides: 6, object: 'uma célula de colmeia', minGrade: 4 },
    { name: 'Triângulo', sides: 3, object: 'a ponta de um bandeirinho', minGrade: 1 },
    { name: 'Quadrado', sides: 4, object: 'a face de um dado', minGrade: 1 },
    { name: 'Pentágono', sides: 5, object: 'um desenho de escudo', minGrade: 3 },
    { name: 'Hexágono', sides: 6, object: 'um parafuso de seis lados', minGrade: 4 },
    { name: 'Triângulo', sides: 3, object: 'o contorno de uma fatia de pizza', minGrade: 1 },
    { name: 'Quadrado', sides: 4, object: 'um tabuleiro quadriculado', minGrade: 1 },
  ],
  fracoes: [
    { place: 'pizza', whole: 'Uma pizza', subject: 'pizza', icon: '🍕' },
    { place: 'chocolate', whole: 'Uma barra de chocolate', subject: 'barra de chocolate', icon: '🍫' },
    { place: 'melancia', whole: 'Uma melancia', subject: 'melancia', icon: '🍉' },
    { place: 'bolo', whole: 'Um bolo', subject: 'bolo', icon: '🎂' },
    { place: 'torta', whole: 'Uma torta', subject: 'torta', icon: '🥧' },
    { place: 'sanduiche', whole: 'Um sanduíche', subject: 'sanduíche', icon: '🥪' },
    { place: 'queijo', whole: 'Uma peça de queijo', subject: 'peça de queijo', icon: '🧀' },
    { place: 'laranja', whole: 'Uma laranja', subject: 'laranja', icon: '🍊' },
    { place: 'panqueca', whole: 'Uma panqueca', subject: 'panqueca', icon: '🥞' },
    { place: 'biscoito', whole: 'Um biscoito redondo', subject: 'biscoito', icon: '🍪' },
  ],
};

const FEMININE_PLACES = new Set([
  'biblioteca', 'horta', 'quadra', 'oficina de arte', 'sala de ciências',
  'campanha solidária', 'sala de música', 'feira de ciências', 'cozinha',
  'cozinha da escola', 'sala de jogos',
]);

function formatPlace(place) {
  return `${FEMININE_PLACES.has(place) ? 'na' : 'no'} ${place}`;
}

function shapeIcon(name) {
  return { Círculo: '⚪', Triângulo: '🔺', Quadrado: '🟦', Retângulo: '▭', Pentágono: '⬟', Hexágono: '⬢' }[name] || '🔷';
}

function buildNumericOptions(correctAnswer) {
  const options = new Set([correctAnswer]);
  while (options.size < 4) {
    const variance = randomInt(-8, 8);
    const candidate = correctAnswer + variance;
    if (candidate > 0) {
      options.add(candidate);
    }
  }
  return Array.from(options).slice(0, 4);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  console.log('game module loaded');
}
