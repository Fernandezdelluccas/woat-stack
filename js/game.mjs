export const GAME_TYPES = {
  adicao: {
    label: 'Adição',
    description: 'Somar para resolver situações reais.',
    generator: () => {
      const a = randomInt(4, 18);
      const b = randomInt(3, 15);
      const total = a + b;
      const story = `Na feira, ${a} maçãs estavam na caixa e ${b} maçãs chegaram mais. Quantas maçãs há ao todo?`;
      const explanation = `Pensamos assim: ${a} + ${b} = ${total}. Quando juntamos os grupos, o total fica ${total}.`;
      return makeQuestion({
        prompt: story,
        visual: { icon: '🍎', groups: [`${a} maçãs`, `${b} maçãs`], caption: 'Junte os dois grupos' },
        correctAnswer: total,
        options: buildNumericOptions(total),
        explanation,
      });
    },
  },
  subtracao: {
    label: 'Subtração',
    description: 'Descobrir o que sobra.',
    generator: () => {
      const a = randomInt(15, 40);
      const b = randomInt(2, a - 1);
      const diff = a - b;
      const story = `No lanche, havia ${a} bolachas. Você comeu ${b}. Quantas bolachas sobraram?`;
      const explanation = `A quantidade que sobrou é a diferença: ${a} - ${b} = ${diff}.`;
      return makeQuestion({
        prompt: story,
        visual: { icon: '🍪', groups: [`${a} bolachas`, `${b} comidas`], caption: 'Veja o que saiu do prato' },
        correctAnswer: diff,
        options: buildNumericOptions(diff),
        explanation,
      });
    },
  },
  multiplicacao: {
    label: 'Multiplicação',
    description: 'Agrupar e repetir quantidades.',
    generator: () => {
      const a = randomInt(2, 9);
      const b = randomInt(2, 9);
      const total = a * b;
      const story = `Cada caixa tem ${a} brinquedos e há ${b} caixas. Quantos brinquedos existem no total?`;
      const explanation = `Multiplicar significa repetir grupos iguais: ${a} × ${b} = ${total}.`;
      return makeQuestion({
        prompt: story,
        visual: { icon: '🧸', groups: Array.from({ length: b }, () => `${a} brinquedos`), caption: 'Grupos iguais se repetem' },
        correctAnswer: total,
        options: buildNumericOptions(total),
        explanation,
      });
    },
  },
  divisao: {
    label: 'Divisão',
    description: 'Repartir em partes iguais.',
    generator: () => {
      const divisor = randomInt(2, 8);
      const quotient = randomInt(2, 9);
      const dividend = divisor * quotient;
      const story = `Você quer dividir ${dividend} balas igualmente entre ${divisor} amigos. Quantas balas cada um recebe?`;
      const explanation = `Repartir igualmente significa dividir: ${dividend} ÷ ${divisor} = ${quotient}.`;
      return makeQuestion({
        prompt: story,
        visual: { icon: '🍬', groups: Array.from({ length: divisor }, () => `${quotient} balas`), caption: 'Reparta igualmente' },
        correctAnswer: quotient,
        options: buildNumericOptions(quotient),
        explanation,
      });
    },
  },
  formas: {
    label: 'Formas Geométricas',
    description: 'Reconhecer formas no mundo real.',
    generator: () => {
      const shapes = [
        { name: 'Triângulo', sides: 3, story: 'um pedaço de pizza' },
        { name: 'Quadrado', sides: 4, story: 'uma janela' },
        { name: 'Pentágono', sides: 5, story: 'uma casa de cinco lados' },
        { name: 'Hexágono', sides: 6, story: 'um painel de colmeia' },
      ];
      const correct = shapes[randomInt(0, shapes.length - 1)];
      const options = shuffleArray([...new Set([correct.name, ...shapes.filter((shape) => shape.name !== correct.name).map((shape) => shape.name)])]).slice(0, 4);
      const explanation = `A figura ${correct.name} tem ${correct.sides} lados e lembra ${correct.story}.`;
      return makeQuestion({
        prompt: `Qual forma tem ${correct.sides} lados e lembra ${correct.story}?`,
        visual: { icon: shapeIcon(correct.name), groups: [`${correct.sides} lados`, correct.story], caption: 'Observe a forma no mundo real' },
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

export function buildQuestions(gameKey, total = 10) {
  const { key } = getGameDefinition(gameKey);
  return Array.from({ length: total }, () => GAME_TYPES[key].generator());
}

export function formatAnswer(value) {
  if (typeof value === 'number') {
    return String(value);
  }
  return value;
}

function makeQuestion({ prompt, correctAnswer, options, explanation, visual }) {
  return {
    prompt,
    correctAnswer,
    options: shuffleArray(options),
    explanation,
    visual,
  };
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
