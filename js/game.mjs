export const GAME_TYPES = {
  adicao: {
    label: 'Adição',
    description: 'Some os números certinho.',
    generator: () => {
      const a = randomInt(5, 30);
      const b = randomInt(5, 30);
      return makeQuestion({
        prompt: `${a} + ${b} = ?`,
        correctAnswer: a + b,
        options: buildNumericOptions(a + b),
      });
    },
  },
  subtracao: {
    label: 'Subtração',
    description: 'Descubra a diferença.',
    generator: () => {
      const a = randomInt(10, 50);
      const b = randomInt(1, a - 1);
      return makeQuestion({
        prompt: `${a} - ${b} = ?`,
        correctAnswer: a - b,
        options: buildNumericOptions(a - b),
      });
    },
  },
  multiplicacao: {
    label: 'Multiplicação',
    description: 'Tabuada em forma de jogo.',
    generator: () => {
      const a = randomInt(2, 12);
      const b = randomInt(2, 12);
      return makeQuestion({
        prompt: `${a} × ${b} = ?`,
        correctAnswer: a * b,
        options: buildNumericOptions(a * b),
      });
    },
  },
  divisao: {
    label: 'Divisão',
    description: 'Repartir também é matemática.',
    generator: () => {
      const divisor = randomInt(2, 12);
      const quotient = randomInt(2, 12);
      const dividend = divisor * quotient;
      return makeQuestion({
        prompt: `${dividend} ÷ ${divisor} = ?`,
        correctAnswer: quotient,
        options: buildNumericOptions(quotient),
      });
    },
  },
  formas: {
    label: 'Formas Geométricas',
    description: 'Reconheça figuras do dia a dia.',
    generator: () => {
      const shapes = [
        { name: 'Triângulo', sides: 3 },
        { name: 'Quadrado', sides: 4 },
        { name: 'Pentágono', sides: 5 },
        { name: 'Hexágono', sides: 6 },
      ];
      const correct = shapes[randomInt(0, shapes.length - 1)];
      const options = shuffleArray(
        Array.from(new Set([correct.name, ...shapes.filter((shape) => shape.name !== correct.name).slice(0, 3).map((shape) => shape.name)]))
      );
      return makeQuestion({
        prompt: `Qual figura geométrica tem ${correct.sides} lados?`,
        correctAnswer: correct.name,
        options,
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

function makeQuestion({ prompt, correctAnswer, options }) {
  return {
    prompt,
    correctAnswer,
    options: shuffleArray(options),
  };
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
