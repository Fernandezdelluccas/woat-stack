// Motor de perguntas de Matemática — uma fase por assunto, 20 níveis por fase,
// dificuldade cresce com o nível, toda pergunta é gerada na hora (aleatória).

export const FASES = [
  { key: 'adicao', label: 'Adição', icon: '➕', description: 'Some os números certinho.' },
  { key: 'subtracao', label: 'Subtração', icon: '➖', description: 'Descubra a diferença.' },
  { key: 'multiplicacao', label: 'Multiplicação', icon: '✖️', description: 'Tabuada em forma de jogo.' },
  { key: 'divisao', label: 'Divisão', icon: '➗', description: 'Repartir também é matemática.' },
  { key: 'formas', label: 'Formas Geométricas', icon: '🔺', description: 'Reconheça figuras do dia a dia.' },
  { key: 'fracoes', label: 'Frações', icon: '🍕', description: 'Pizza, chocolate e frações!' },
  { key: 'sequencias', label: 'Números e Sequências', icon: '🔢', description: 'Pares, ímpares e padrões.' },
  { key: 'problemas', label: 'Situações-Problema', icon: '🧩', description: 'Use a matemática do dia a dia.' },
];

const NOMES = ['Ana', 'Pedro', 'Júlia', 'Lucas', 'Maria', 'João', 'Sofia', 'Miguel', 'Laura', 'Davi'];
const OBJETOS = ['figurinhas', 'balas', 'bolinhas de gude', 'lápis', 'adesivos', 'biscoitos', 'carrinhos'];

const GENERATORS = {
  adicao: (nivel) => {
    const max = 9 + nivel * 4;
    const a = randomInt(1, max);
    const b = randomInt(1, max);
    return makeQuestion({
      prompt: `${a} + ${b} = ?`,
      correctAnswer: a + b,
      options: buildNumericOptions(a + b),
      explicacao: `${a} + ${b} = ${a + b}`,
    });
  },

  subtracao: (nivel) => {
    const max = 10 + nivel * 4;
    const a = randomInt(Math.ceil(max / 2), max);
    const b = randomInt(1, a - 1);
    return makeQuestion({
      prompt: `${a} - ${b} = ?`,
      correctAnswer: a - b,
      options: buildNumericOptions(a - b),
      explicacao: `${a} - ${b} = ${a - b}`,
    });
  },

  multiplicacao: (nivel) => {
    const maxFator = Math.min(2 + Math.ceil(nivel / 2), 12);
    const a = randomInt(2, maxFator);
    const b = randomInt(2, maxFator);
    return makeQuestion({
      prompt: `${a} × ${b} = ?`,
      correctAnswer: a * b,
      options: buildNumericOptions(a * b),
      explicacao: `${a} × ${b} = ${a * b}`,
    });
  },

  divisao: (nivel) => {
    const maxFator = Math.min(2 + Math.ceil(nivel / 2), 12);
    const divisor = randomInt(2, maxFator);
    const quociente = randomInt(2, maxFator);
    const dividendo = divisor * quociente;
    return makeQuestion({
      prompt: `${dividendo} ÷ ${divisor} = ?`,
      correctAnswer: quociente,
      options: buildNumericOptions(quociente),
      explicacao: `${dividendo} ÷ ${divisor} = ${quociente}`,
    });
  },

  formas: (nivel) => {
    const shapes = [
      { name: 'Triângulo', sides: 3 },
      { name: 'Quadrado', sides: 4 },
      { name: 'Pentágono', sides: 5 },
      { name: 'Hexágono', sides: 6 },
      { name: 'Heptágono', sides: 7 },
      { name: 'Octógono', sides: 8 },
    ];
    const poolSize = nivel <= 5 ? 4 : nivel <= 12 ? 5 : 6;
    const pool = shapes.slice(0, poolSize);
    const correct = pool[randomInt(0, pool.length - 1)];

    if (nivel <= 10) {
      const options = shuffleArray(pool.map((s) => s.name)).slice(0, 4);
      if (!options.includes(correct.name)) options[0] = correct.name;
      return makeQuestion({
        prompt: `Qual figura geométrica tem ${correct.sides} lados?`,
        correctAnswer: correct.name,
        options,
        explicacao: `${correct.name} tem ${correct.sides} lados.`,
      });
    }

    return makeQuestion({
      prompt: `Quantos lados tem um(a) ${correct.name}?`,
      correctAnswer: correct.sides,
      options: buildNumericOptions(correct.sides, 1, 2, 10),
      explicacao: `${correct.name} tem ${correct.sides} lados.`,
    });
  },

  fracoes: (nivel) => {
    if (nivel <= 8) {
      const d = randomInt(2, 4 + Math.floor(nivel / 2));
      const options = shuffleArray(gerarDenominadoresProximos(d).map((valor) => `1/${valor}`));
      return makeQuestion({
        prompt: `Uma pizza foi dividida em ${d} pedaços iguais. Que fração representa 1 pedaço?`,
        correctAnswer: `1/${d}`,
        options,
        explicacao: `1 pedaço de ${d} pedaços iguais é a fração 1/${d}.`,
      });
    }

    if (nivel <= 15) {
      const d = randomInt(4, 8);
      const n = randomInt(1, d - 1);
      const options = shuffleArray(gerarFracoesProximas(n, d).map(([num, den]) => `${num}/${den}`));
      return makeQuestion({
        prompt: `De ${d} partes iguais, ${n} estão pintadas. Que fração está pintada?`,
        correctAnswer: `${n}/${d}`,
        options,
        explicacao: `${n} partes pintadas de ${d} partes no total é a fração ${n}/${d}.`,
      });
    }

    const d1 = randomInt(2, 5);
    const d2 = randomInt(d1 + 1, d1 + 5);
    const opcoes = shuffleArray([`1/${d1}`, `1/${d2}`]);
    return makeQuestion({
      prompt: 'Qual fração representa o pedaço MAIOR?',
      correctAnswer: `1/${d1}`,
      options: opcoes,
      explicacao: `Quanto maior o denominador, menores são os pedaços. Por isso 1/${d1} é maior que 1/${d2}.`,
    });
  },

  sequencias: (nivel) => {
    if (nivel <= 6) {
      const alvoPar = Math.random() < 0.5;
      const numeros = new Set();
      while (numeros.size < 4) {
        const candidato = randomInt(1, 40 + nivel * 5);
        const ehPar = candidato % 2 === 0;
        if (numeros.size === 0 || ehPar !== alvoPar || numeros.size < 3) {
          numeros.add(candidato);
        }
      }
      const lista = Array.from(numeros);
      const candidatosCertos = lista.filter((n) => (n % 2 === 0) === alvoPar);
      const correto = candidatosCertos[0] ?? lista[0];
      return makeQuestion({
        prompt: `Qual desses números é ${alvoPar ? 'PAR' : 'ÍMPAR'}?`,
        correctAnswer: correto,
        options: shuffleArray(lista),
        explicacao: `${correto} é ${alvoPar ? 'par' : 'ímpar'} porque ${alvoPar ? 'termina em um algarismo que se divide por 2 sem deixar resto' : 'não se divide por 2 sem deixar resto'}.`,
      });
    }

    const tamanho = nivel <= 14 ? 4 : 5;
    const passo = nivel <= 14 ? randomInt(1, 3 + Math.floor(nivel / 4)) : randomInt(2, 5 + (nivel - 14));
    const decrescente = nivel > 14 && Math.random() < 0.5;
    const inicio = decrescente ? randomInt(60, 60 + nivel * 3) : randomInt(1, 20 + nivel);
    const sequencia = Array.from({ length: tamanho }, (_, i) => inicio + (decrescente ? -passo : passo) * i);
    const proximo = inicio + (decrescente ? -passo : passo) * tamanho;

    return makeQuestion({
      prompt: `Qual é o próximo número: ${sequencia.join(', ')}, ?`,
      correctAnswer: proximo,
      options: buildNumericOptions(proximo, Math.max(2, Math.floor(passo / 2)), passo * 2),
      explicacao: `A sequência ${decrescente ? 'diminui' : 'aumenta'} ${passo} a cada número, então depois de ${sequencia[sequencia.length - 1]} vem ${proximo}.`,
    });
  },

  problemas: (nivel) => {
    const nome = NOMES[randomInt(0, NOMES.length - 1)];
    const objeto = OBJETOS[randomInt(0, OBJETOS.length - 1)];
    const max = 8 + nivel * 3;

    if (nivel <= 5) {
      const a = randomInt(2, max);
      const b = randomInt(2, max);
      const soma = Math.random() < 0.5;
      if (soma) {
        return makeQuestion({
          prompt: `${nome} tinha ${a} ${objeto} e ganhou mais ${b}. Com quantos ${objeto} ${nome} ficou?`,
          correctAnswer: a + b,
          options: buildNumericOptions(a + b),
          explicacao: `${a} + ${b} = ${a + b}`,
        });
      }
      const maior = Math.max(a, b) + 1;
      const menor = randomInt(1, maior - 1);
      return makeQuestion({
        prompt: `${nome} tinha ${maior} ${objeto} e deu ${menor} para um amigo. Quantos ${objeto} sobraram?`,
        correctAnswer: maior - menor,
        options: buildNumericOptions(maior - menor),
        explicacao: `${maior} - ${menor} = ${maior - menor}`,
      });
    }

    if (nivel <= 12) {
      const maxFator = Math.min(2 + Math.ceil(nivel / 2), 10);
      const pacotes = randomInt(2, maxFator);
      const porPacote = randomInt(2, maxFator);
      const multiplicar = Math.random() < 0.5;
      if (multiplicar) {
        return makeQuestion({
          prompt: `${nome} comprou ${pacotes} pacotes com ${porPacote} ${objeto} cada um. Quantos ${objeto} ao todo?`,
          correctAnswer: pacotes * porPacote,
          options: buildNumericOptions(pacotes * porPacote),
          explicacao: `${pacotes} × ${porPacote} = ${pacotes * porPacote}`,
        });
      }
      const total = pacotes * porPacote;
      return makeQuestion({
        prompt: `${nome} tem ${total} ${objeto} para dividir em partes iguais entre ${porPacote} amigos. Quantos ${objeto} cada amigo recebe?`,
        correctAnswer: pacotes,
        options: buildNumericOptions(pacotes, 1, 2, 8),
        explicacao: `${total} ÷ ${porPacote} = ${pacotes}`,
      });
    }

    const a = randomInt(5, max);
    const b = randomInt(2, max);
    const c = randomInt(1, a + b - 1);
    return makeQuestion({
      prompt: `${nome} tinha ${a} reais, ganhou mais ${b} reais e depois gastou ${c} reais. Com quantos reais ${nome} ficou?`,
      correctAnswer: a + b - c,
      options: buildNumericOptions(a + b - c),
      explicacao: `${a} + ${b} - ${c} = ${a + b - c}`,
    });
  },
};

export function getFaseDefinition(faseKey) {
  const fase = FASES.find((f) => f.key === faseKey) || FASES[0];
  return fase;
}

export function buildQuestions(faseKey, nivel, total = 8) {
  const fase = getFaseDefinition(faseKey);
  const nivelSeguro = Math.min(Math.max(Number(nivel) || 1, 1), 20);
  const generator = GENERATORS[fase.key] || GENERATORS.adicao;
  return Array.from({ length: total }, () => generator(nivelSeguro));
}

export function formatAnswer(value) {
  return typeof value === 'number' ? String(value) : value;
}

function makeQuestion({ prompt, correctAnswer, options, explicacao }) {
  return {
    prompt,
    correctAnswer,
    explicacao,
    options: shuffleArray(dedupeKeepCorrect(options, correctAnswer)),
  };
}

function dedupeKeepCorrect(options, correctAnswer) {
  const seen = new Set();
  const result = [];
  [correctAnswer, ...options].forEach((value) => {
    const key = String(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  });
  return result.slice(0, 4);
}

function buildNumericOptions(correctAnswer, varianceMin = 1, varianceMax = 8, minFloor = 0) {
  const options = new Set([correctAnswer]);
  let attempts = 0;
  while (options.size < 4 && attempts < 40) {
    attempts += 1;
    const variance = randomInt(-varianceMax, varianceMax) || varianceMin;
    const candidate = correctAnswer + variance;
    if (candidate > minFloor) {
      options.add(candidate);
    }
  }
  return Array.from(options).slice(0, 4);
}

function gerarDenominadoresProximos(d) {
  const valores = new Set([d]);
  let attempts = 0;
  while (valores.size < 4 && attempts < 40) {
    attempts += 1;
    const candidato = d + randomInt(-3, 3);
    if (candidato >= 2) valores.add(candidato);
  }
  return Array.from(valores).slice(0, 4);
}

function gerarFracoesProximas(n, d) {
  const pares = new Set([`${n}/${d}`]);
  const resultado = [[n, d]];
  let attempts = 0;
  while (pares.size < 4 && attempts < 40) {
    attempts += 1;
    const novoN = Math.max(1, Math.min(d - 1, n + randomInt(-2, 2)));
    const chave = `${novoN}/${d}`;
    if (!pares.has(chave)) {
      pares.add(chave);
      resultado.push([novoN, d]);
    }
  }
  return resultado.slice(0, 4);
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
