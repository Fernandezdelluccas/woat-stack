export const GAME_TYPES = {
  adicao: {
    label: 'Adição',
    description: 'Somar para resolver situações reais.',
    generator: (contextIndex = 0) => {
      const a = randomInt(4, 18);
      const b = randomInt(3, 15);
      const total = a + b;
      const context = CONTEXTS.adicao[contextIndex % CONTEXTS.adicao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, a turma separou ${a} ${context.item} pela manhã e mais ${b} à tarde. Quantos ${context.item} foram separados?`;
      const explanation = `Pensamos assim: ${a} + ${b} = ${total}. Quando juntamos os grupos, o total fica ${total}.`;
      return makeQuestion({
        prompt: story,
        contextId: `adicao:${context.place}`,
        example: `Exemplo prático: some o que havia de manhã (${a}) com o que chegou à tarde (${b}). A conta fica ${a} + ${b}.`,
        visual: { icon: context.icon, groups: [`${a} ${context.item}`, `${b} ${context.item}`], caption: 'Junte os dois grupos' },
        correctAnswer: total,
        options: buildNumericOptions(total),
        explanation,
      });
    },
  },
  subtracao: {
    label: 'Subtração',
    description: 'Descobrir o que sobra.',
    generator: (contextIndex = 0) => {
      const a = randomInt(15, 40);
      const b = randomInt(2, a - 1);
      const diff = a - b;
      const context = CONTEXTS.subtracao[contextIndex % CONTEXTS.subtracao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, havia ${a} ${context.item}. Depois que ${b} foram usados, quantos ${context.item} sobraram?`;
      const explanation = `A quantidade que sobrou é a diferença: ${a} - ${b} = ${diff}.`;
      return makeQuestion({
        prompt: story,
        contextId: `subtracao:${context.place}`,
        example: `Exemplo prático: comece com ${a} e retire ${b}. Para descobrir o restante, calcule ${a} - ${b}.`,
        visual: { icon: context.icon, groups: [`${a} ${context.item}`, `${b} usados`], caption: 'Retire uma parte e conte o que ficou' },
        correctAnswer: diff,
        options: buildNumericOptions(diff),
        explanation,
      });
    },
  },
  multiplicacao: {
    label: 'Multiplicação',
    description: 'Agrupar e repetir quantidades.',
    generator: (contextIndex = 0) => {
      const a = randomInt(2, 9);
      const b = randomInt(2, 9);
      const total = a * b;
      const context = CONTEXTS.multiplicacao[contextIndex % CONTEXTS.multiplicacao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, cada ${context.container} tem ${a} ${context.item}. Quantos ${context.item} há em ${b} ${context.container}s iguais?`;
      const explanation = `Multiplicar significa repetir grupos iguais: ${a} × ${b} = ${total}.`;
      return makeQuestion({
        prompt: story,
        contextId: `multiplicacao:${context.place}`,
        example: `Exemplo prático: em ${b} grupos com ${a} itens cada, pense em ${a} + ${a} + ... ou calcule ${a} × ${b}.`,
        visual: { icon: context.icon, groups: Array.from({ length: b }, () => `${a} ${context.item}`), caption: 'Repita a mesma quantidade em cada grupo' },
        correctAnswer: total,
        options: buildNumericOptions(total),
        explanation,
      });
    },
  },
  divisao: {
    label: 'Divisão',
    description: 'Repartir em partes iguais.',
    generator: (contextIndex = 0) => {
      const divisor = randomInt(2, 8);
      const quotient = randomInt(2, 9);
      const dividend = divisor * quotient;
      const context = CONTEXTS.divisao[contextIndex % CONTEXTS.divisao.length];
      const story = `Durante uma atividade ${formatPlace(context.place)}, a turma vai repartir ${dividend} ${context.item} igualmente em ${divisor} grupos. Quantos ${context.item} ficam em cada grupo?`;
      const explanation = `Repartir igualmente significa dividir: ${dividend} ÷ ${divisor} = ${quotient}.`;
      return makeQuestion({
        prompt: story,
        contextId: `divisao:${context.place}`,
        example: `Exemplo prático: distribua ${dividend} itens, um por vez, entre ${divisor} grupos iguais. A conta é ${dividend} ÷ ${divisor}.`,
        visual: { icon: context.icon, groups: Array.from({ length: divisor }, () => `${quotient} ${context.item}`), caption: 'Reparta igualmente entre os grupos' },
        correctAnswer: quotient,
        options: buildNumericOptions(quotient),
        explanation,
      });
    },
  },
  formas: {
    label: 'Formas Geométricas',
    description: 'Reconhecer formas no mundo real.',
    generator: (contextIndex = 0) => {
      const context = CONTEXTS.formas[contextIndex % CONTEXTS.formas.length];
      const shapes = CONTEXTS.formas.reduce((unique, entry) => {
        if (!unique.some((shape) => shape.name === entry.name)) unique.push(entry);
        return unique;
      }, []);
      const correct = context;
      const options = shuffleArray([...new Set([correct.name, ...shapes.filter((shape) => shape.name !== correct.name).map((shape) => shape.name)])]).slice(0, 4);
      const explanation = `A figura ${correct.name} tem ${correct.sides} lados. Observe o contorno de ${correct.object} para encontrar essa forma.`;
      return makeQuestion({
        prompt: `O contorno de ${correct.object} tem ${correct.sides} lados. Qual forma geométrica ele representa?`,
        contextId: `formas:${correct.object}`,
        example: `Exemplo prático: conte cada segmento reto do contorno de ${correct.object}; formas com ${correct.sides} lados são chamadas de ${correct.name.toLowerCase()}.`,
        visual: { icon: shapeIcon(correct.name), groups: [`${correct.sides} lados`, correct.object], caption: 'Observe a forma no mundo real' },
        correctAnswer: correct.name,
        options,
        explanation,
      });
    },
  },
};

export function getGameDefinition(gameKey) {
  const key = GAME_TYPES[gameKey] ? gameKey : 'adicao';
  return { key, ...GAME_TYPES[key] };
}

export function buildQuestions(gameKey, total = 10, { excludeContextIds = [] } = {}) {
  const { key } = getGameDefinition(gameKey);
  const contexts = CONTEXTS[key];
  const excluded = new Set(excludeContextIds);
  const questionCount = Math.min(total, contexts.length);
  const availableStarts = contexts.map((_, start) => start).filter((start) => (
    Array.from({ length: questionCount }, (_, offset) => contextIdFor(key, start + offset))
      .every((contextId) => !excluded.has(contextId))
  ));
  const starts = availableStarts.length ? availableStarts : contexts.map((_, index) => index);
  const startIndex = starts[randomInt(0, starts.length - 1)];
  return Array.from({ length: total }, (_, index) => GAME_TYPES[key].generator(startIndex + index));
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

function makeQuestion({ prompt, correctAnswer, options, explanation, visual, example, contextId }) {
  return {
    prompt,
    correctAnswer,
    options: shuffleArray(options),
    explanation,
    visual,
    example,
    contextId,
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
    { name: 'Triângulo', sides: 3, object: 'uma placa de trânsito' },
    { name: 'Quadrado', sides: 4, object: 'um azulejo' },
    { name: 'Pentágono', sides: 5, object: 'uma peça de jogo' },
    { name: 'Hexágono', sides: 6, object: 'uma célula de colmeia' },
    { name: 'Triângulo', sides: 3, object: 'a ponta de um bandeirinho' },
    { name: 'Quadrado', sides: 4, object: 'a face de um dado' },
    { name: 'Pentágono', sides: 5, object: 'um desenho de escudo' },
    { name: 'Hexágono', sides: 6, object: 'um parafuso de seis lados' },
    { name: 'Triângulo', sides: 3, object: 'o contorno de uma fatia de pizza' },
    { name: 'Quadrado', sides: 4, object: 'um tabuleiro quadriculado' },
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
  return { Triângulo: '🔺', Quadrado: '🟦', Pentágono: '⬟', Hexágono: '⬢' }[name] || '🔷';
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
