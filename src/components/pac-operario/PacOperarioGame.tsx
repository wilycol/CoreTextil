"use client";

// ============================================================
// 🕹️ Pac-Operario: La Ruta del Destajo
// Juego 2D de onboarding para aprender a usar el Cuaderno Digital.
// 4 niveles: Marcación exacta · Dos procesos por prenda · Tope del
// atado · Doble confirmación. Sin backend: todo client-side.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

/* ---------------- Tipos y configuración de niveles ---------------- */

type Dot = { x: number; y: number; color: "blue" | "green"; eaten: boolean };

type LevelConfig = {
  id: number;
  title: string;
  emoji: string;
  intro: string;
  dots: number;
  /** Nivel 3: muro que bloquea la ruta a la mitad */
  cap?: boolean;
  /** Nivel 4: fantasma perseguidor */
  ghost?: boolean;
  processLabel: (dots: Dot) => string;
};

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: "La Marcación Exacta",
    emoji: "📱",
    intro:
      "Eres el operario 👷. Tu ruta tiene mangas por unir con FILETEADORA (chicles azules). Come la mayor cantidad posible… pero ojo: al final está tu celular y te preguntará EXACTAMENTE cuántas uniste. Reportar de más o de menos te delata.",
    dots: 110,
    processLabel: () => "Unir mangas (Fileteadora)",
  },
  {
    id: 2,
    title: "Dos Procesos, Una Prenda",
    emoji: "👕",
    intro:
      "El CUELLO RIB lleva 2 procesos en la misma pieza: primero PEGAR con fileteadora (azules) y luego PISAR con plana (verdes). En tu cuaderno cada proceso se anota POR SEPARADO. Al final tendrás que reportar las dos cantidades.",
    dots: 62,
    processLabel: (d) => (d.color === "blue" ? "Pegar cuello (Fileteadora)" : "Pisar cuello (Plana)"),
  },
  {
    id: 3,
    title: "El Tope del Atado",
    emoji: "🚧",
    intro:
      "Este atado trae un TOPE: no puedes comer más chicles de los que trae el atado, aunque veas más por el camino. La app real tampoco te dejará anotar de más. Corre hasta el tope y reporta lo que comiste.",
    dots: 110,
    cap: true,
    processLabel: () => "Unir mangas (Fileteadora)",
  },
  {
    id: 4,
    title: "El Fantasma y el Jefe",
    emoji: "👻",
    intro:
      "Atención: un FANTASMA del taller persigue tu ruta y hay atajos abiertos en el laberinto. Si te atrapa, reintentas. Evalúa qué camino te deja comer más chicles sin ser atrapado. Pero cuidado: el celular está dañado y puede marcar mal. Si eso pasa, verás al JEFE. En la vida real, corregir una anotación requiere que AMBOS confirmen.",
    dots: 46,
    ghost: true,
    processLabel: () => "Cosir bolsillos (Plana)",
  },
];

const BLUE = "#38bdf8";
const GREEN = "#34d399";

/* ---------------- Generación del laberinto (serpentina + atajos) ---------------- */

type Ghost = {
  cell: { x: number; y: number };
  from: { x: number; y: number };
  to: { x: number; y: number };
  t: number; // 0..1 entre celdas
  dir: { x: number; y: number };
  speed: number; // celdas por segundo
};

type Maze = {
  cols: number;
  rows: number;
  walls: Set<string>;
  dots: Dot[];
  start: { x: number; y: number };
  phone: { x: number; y: number };
  totalDots: number;
  /** Nivel 3: máximo comible por el muro del tope */
  cap: number | null;
  /** Extra loops/atajos conectando la serpentina (niveles 3 y 4) */
  shortcuts: boolean;
  /** ¿El nivel trae fantasma perseguidor? (nivel 4) */
  ghost: boolean;
};

const COLS = 17; // 15 celdas de pasillo
const CELL_CORRIDOR = 15;

function buildMaze(cfg: LevelConfig): Maze {
  const path: { x: number; y: number }[] = [];
  let row = 0;
  let left = true;
  const midLow = 1;
  const midHigh = COLS - 2;

  function pushCorridor() {
    if (left) {
      for (let x = midLow; x <= midHigh; x++) path.push({ x, y: row });
    } else {
      for (let x = midHigh; x >= midLow; x--) path.push({ x, y: row });
    }
    left = !left;
  }

  // Serpentina hasta completar start + dots celdas
  while (path.length < cfg.dots + 1) {
    pushCorridor();
    if (path.length >= cfg.dots + 1) break;
    // Conector vertical hacia la siguiente fila de pasillo
    const turnX = left ? midLow : midHigh;
    path.push({ x: turnX, y: row + 1 });
    row += 2;
  }
  const rows = row + 1;

  // Muro de tope (nivel 3): corta la ruta a la mitad
  let wallIdx = -1;
  if (cfg.cap) {
    wallIdx = Math.floor(path.length / 2);
  }

  const wallSet = new Set<string>();
  for (let y = -1; y <= rows; y++) {
    for (let x = 0; x < COLS; x++) {
      const onPath = path.some((p) => p.x === x && p.y === y);
      if (!onPath) wallSet.add(`${x},${y}`);
    }
  }
  if (wallIdx >= 0) {
    // Todo el tramo posterior al muro se vuelve inalcanzable:
    // los chicles se ven pero no se pueden comer (pedagogía del tope).
    for (let i = wallIdx; i < path.length; i++) {
      wallSet.add(`${path[i].x},${path[i].y}`);
    }
  }

  const start = path[0];
  const phoneIdx = wallIdx >= 0 ? wallIdx - 1 : path.length - 1;
  const phone = path[phoneIdx];

  // Dots sobre TODA la ruta (excepto celda inicial y celda del teléfono).
  // En el nivel 3 los posteriores al muro quedan inalcanzables a propósito.
  const dots: Dot[] = [];
  for (let i = 1; i < path.length; i++) {
    if (i === phoneIdx) continue;
    // Nivel 2: primera mitad azul (filete), segunda verde (plana)
    const half = Math.floor(path.length / 2);
    dots.push({
      x: path[i].x,
      y: path[i].y,
      color: cfg.id === 2 && i >= half ? "green" : "blue",
      eaten: false,
    });
  }  // Niveles 3 y 4: abrir atajos (puertas entre filas vecinas de pasillo).
  // Así el jugador evalúa rutas: «por aquí me alcanza el fantasma, mejor voy por el atajo».
  const gl = cfg.ghost || cfg.cap ? true : false;
  if (gl) {
    // Elegir conectores verticales extra: en la serpentina solo midLow/midHigh
    // conectan filas; abrimos 4-6 posiciones alternas entre pares de filas.
    const pairs: number[][] = [];
    for (let r = 0; r + 2 < rows; r += 2) pairs.push([r, r + 2]);
    const picks = pairs.filter(() => Math.random() < 0.45).slice(0, 6);
    for (const [r1, r2] of picks) {
      // Conectar una columna intermedia entre las dos filas de pasillo
      const x = midLow + 1 + Math.floor(Math.random() * Math.max(1, midHigh - midLow - 1));
      wallSet.delete(`${x},${r1 + 1}`);
    }
  }

  return {
    cols: COLS,
    rows,
    walls: wallSet,
    dots,
    start,

    phone,
    totalDots: dots.length,
    cap: wallIdx >= 0 ? wallIdx - 2 : null, // alcanzables antes del muro y del teléfono
    shortcuts: gl,
    ghost: !!cfg.ghost,
  };
}

/* ---------------- Componente principal ---------------- */

type Phase =
  | "menu"
  | "intro"
  | "playing"
  | "quiz"
  | "result"
  | "certificate"
  | "caught";

const STORAGE_KEY = "coretextil_pac_progress";

export default function PacOperarioGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [levelsDone, setLevelsDone] = useState<number[]>([]);
  const [eaten, setEaten] = useState(0);
  const [eatenByColor, setEatenByColor] = useState({ blue: 0, green: 0 });
  const [attempts, setAttempts] = useState(0);
  const [quizMsg, setQuizMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mazeRef = useRef<Maze | null>(null);
  const pacRef = useRef({
    cell: { x: 0, y: 0 },
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    t: 1, // 0..1 entre celdas
    dir: { x: 1, y: 0 },
    queued: { x: 1, y: 0 },
    moving: false,
  });
  const eatenRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ghostRef = useRef<Ghost | null>(null);
  const [caught, setCaught] = useState(false);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;

  /* Movimiento del fantasma: greedy BFS hacia el Pac (cada llegada de celda) */
  const stepGhost = useCallback(
    (maze: Maze, pacCell: { x: number; y: number }) => {
      const g = ghostRef.current;
      if (!g) return;
      // BFS desde el fantasma hacia el Pac (laberinto pequeño: barato)
      const key = (x: number, y: number) => `${x},${y}`;
      const q: { x: number; y: number; d: Array<{ x: number; y: number }> }[] = [
        { x: g.cell.x, y: g.cell.y, d: [] },
      ];
      const seen = new Set([key(g.cell.x, g.cell.y)]);
      let bestD: { x: number; y: number }[] | null = null;
      while (q.length && !bestD) {
        const cur = q.shift()!;
        for (const [dx, dy] of [
          [1, 0], [-1, 0], [0, 1], [0, -1],
        ] as const) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (seen.has(key(nx, ny)) || maze.walls.has(key(nx, ny))) continue;
          seen.add(key(nx, ny));
          const nd = [...cur.d, { x: dx, y: dy }] as { x: number; y: number }[];
          if (nx === pacCell.x && ny === pacCell.y) {
            bestD = nd;
            break;
          }
          q.push({ x: nx, y: ny, d: nd });
        }
      }
      if (!bestD || bestD.length === 0) {
        // Sin ruta (o ya encima): deambular aleatorio
        const opts = ([
          [1, 0], [-1, 0], [0, 1], [0, -1],
        ] as const).filter(
          ([dx, dy]) => !maze.walls.has(key(g.cell.x + dx, g.cell.y + dy))
        );
        if (opts.length === 0) return;
        const [dx, dy] = opts[Math.floor(Math.random() * opts.length)];
        g.from = { ...g.cell };
        g.to = { x: g.cell.x + dx, y: g.cell.y + dy };
        g.t = 0;
        g.dir = { x: dx, y: dy };
        return;
      }
      const step = bestD[0];
      g.from = { ...g.cell };
      g.to = { x: g.cell.x + step.x, y: g.cell.y + step.y };
      g.t = 0;
      g.dir = step;
    },
    []
  );

  /* Progreso persistente */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLevelsDone(JSON.parse(raw));
    } catch {}
  }, []);

  function saveProgress(done: number[]) {
    setLevelsDone(done);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {}
  }

  /* Sonido minimalista (WebAudio, sin assets) */
  const beep = useCallback((freq: number, dur = 0.07) => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.value = 0.04;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
      setTimeout(() => ctx.close(), (dur + 0.05) * 1000);
    } catch {}
  }, []);

  /* --------- Arranque de nivel --------- */
  const startLevel = useCallback(
    (idx: number) => {
      const cfg = LEVELS[idx];
      const maze = buildMaze(cfg);
      mazeRef.current = maze;
      eatenRef.current = 0;
      setEaten(0);
      setEatenByColor({ blue: 0, green: 0 });
      setAttempts(0);
      setQuizMsg(null);
      pacRef.current = {
        cell: { ...maze.start },
        from: { ...maze.start },
        to: { ...maze.start },
        t: 1,
        dir: { x: 1, y: 0 },
        queued: { x: 1, y: 0 },
        moving: false,
      };
      // Fantasma: aparece lejos (a mitad de ruta) y persigue con velocidad
      // ligeramente inferior a la del Pac para que la huida sea posible.
      if (maze.ghost) {
        const pathCells: { x: number; y: number }[] = [];
        for (let y = 0; y < maze.rows; y++)
          for (let x = 0; x < maze.cols; x++)
            if (!maze.walls.has(`${x},${y}`) && !(x === maze.start.x && y === maze.start.y))
              pathCells.push({ x, y });
        const far = pathCells[Math.floor(pathCells.length * 0.55)] ?? pathCells[0];
        ghostRef.current = far
          ? {
              cell: { ...far },
              from: { ...far },
              to: { ...far },
              t: 1,
              dir: { x: 0, y: 0 },
              speed: 6.4,
            }
          : null;
      } else {
        ghostRef.current = null;
      }
      setCaught(false);
      setLevelIdx(idx);
      setPhase("playing");
    },
    []
  );

  /* --------- Direcciones --------- */
  const setDir = useCallback((dx: number, dy: number) => {
    const p = pacRef.current;
    p.queued = { x: dx, y: dy };
    if (!p.moving) {
      const maze = mazeRef.current;
      if (!maze) return;
      const nx = p.cell.x + dx;
      const ny = p.cell.y + dy;
      if (!maze.walls.has(`${nx},${ny}`)) {
        p.dir = { x: dx, y: dy };
        p.from = { ...p.cell };
        p.to = { x: nx, y: ny };
        p.t = 0;
        p.moving = true;
      }
    }
  }, []);

  /* --------- Teclado --------- */
  useEffect(() => {
    if (phase !== "playing") return;
    function onKey(e: KeyboardEvent) {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      };
      const m = map[e.key];
      if (m) {
        e.preventDefault();
        setDir(m[0], m[1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, setDir]);

  /* --------- Bucle del juego --------- */
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const maze = mazeRef.current;
    if (!canvas || !maze) return;

    const SPEED = 9; // celdas por segundo
    let last = performance.now();
    let cancelled = false;

    function arriveAt(x: number, y: number) {
      const maze2 = mazeRef.current!;
      const pac = pacRef.current;
      pac.cell = { x, y };

      // Comer chicle
      const dot = maze2.dots.find((d) => !d.eaten && d.x === x && d.y === y);
      if (dot) {
        dot.eaten = true;
        eatenRef.current += 1;
        setEaten(eatenRef.current);
        setEatenByColor((prev) => ({
          blue: prev.blue + (dot.color === "blue" ? 1 : 0),
          green: prev.green + (dot.color === "green" ? 1 : 0),
        }));
        beep(dot.color === "green" ? 660 : 440, 0.05);
      }

      // Llegó al teléfono
      if (x === maze2.phone.x && y === maze2.phone.y) {
        beep(880, 0.25);
        setPhase("quiz");
        return;
      }

      // Continuar: giro en cola o seguir
      const q = pac.queued;
      const qn = { x: pac.cell.x + q.x, y: pac.cell.y + q.y };
      if ((q.x !== 0 || q.y !== 0) && !maze2.walls.has(`${qn.x},${qn.y}`)) {
        pac.dir = { ...q };
        pac.from = { ...pac.cell };
        pac.to = qn;
        pac.t = 0;
        pac.moving = true;
      } else {
        const nn = { x: pac.cell.x + pac.dir.x, y: pac.cell.y + pac.dir.y };
        if (!maze2.walls.has(`${nn.x},${nn.y}`)) {
          pac.from = { ...pac.cell };
          pac.to = nn;
          pac.t = 0;
          pac.moving = true;
        } else {
          pac.moving = false;
          pac.t = 1;
        }
      }
    }

    function loop(now: number) {
      if (cancelled) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const pac = pacRef.current;
      const mazeNow = mazeRef.current!;

      // Fantasma: avanza y decide su próxima celda persiguiendo al Pac
      const g = ghostRef.current;
      if (g && mazeNow.ghost) {
        if (g.t >= 1) stepGhost(mazeNow, pac.cell);
        g.t += g.speed * dt;
        if (g.t >= 1) g.cell = { ...g.to };
        // ¿Atrapó al Pac? (distancia entre centros < media celda)
        const gx = g.from.x + (g.to.x - g.from.x) * Math.min(g.t, 1);
        const gy = g.from.y + (g.to.y - g.from.y) * Math.min(g.t, 1);
        const px = pac.from.x + (pac.to.x - pac.from.x) * Math.min(pac.t, 1);
        const py = pac.from.y + (pac.to.y - pac.from.y) * Math.min(pac.t, 1);
        if (Math.hypot(gx - px, gy - py) < 0.75) {
          beep(140, 0.4);
          setCaught(true);
          cancelled = true;
          cancelAnimationFrame(rafRef.current ?? 0);
          setPhase("caught");
          return;
        }
      }

      if (pac.moving) {
        pac.t += SPEED * dt;
        if (pac.t >= 1) {
          arriveAt(pac.to.x, pac.to.y);
          // desbordar t sobrante para suavidad
          const leftover = pac.t - 1;
          if (pacRef.current.moving && phaseRef.current === "playing") {
            pacRef.current.t = leftover;
          }
        }
      }

      draw(canvas!, mazeNow, pacRef.current, ghostRef.current, now);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, beep, stepGhost]);

  /* --------- Swipe táctil --------- */
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  }

  /* --------- Render --------- */
  const cellSize = 26;

  function draw(
    canvas: HTMLCanvasElement,
    maze: Maze,
    pac: { from: { x: number; y: number }; to: { x: number; y: number }; t: number; dir: { x: number; y: number }; moving: boolean },
    ghost: Ghost | null,
    now: number
  ) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = maze.cols * cellSize;
    const h = maze.rows * cellSize;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);

    // Muros
    ctx.fillStyle = "#1e3a8a";
    for (const key of maze.walls) {
      const [x, y] = key.split(",").map(Number);
      if (y < 0 || y >= maze.rows) continue;
      ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }

    // Chicles
    for (const d of maze.dots) {
      if (d.eaten) continue;
      ctx.fillStyle = d.color === "green" ? GREEN : BLUE;
      ctx.beginPath();
      ctx.arc(
        d.x * cellSize + cellSize / 2,
        d.y * cellSize + cellSize / 2,
        cellSize * 0.18,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Teléfono (meta)
    const px = maze.phone.x * cellSize + cellSize / 2;
    const py = maze.phone.y * cellSize + cellSize / 2;
    ctx.font = `${cellSize * 0.9}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📱", px, py);

    // Pac-operario
    const ix = (pac.from.x + (pac.to.x - pac.from.x) * Math.min(pac.t, 1)) * cellSize + cellSize / 2;
    const iy = (pac.from.y + (pac.to.y - pac.from.y) * Math.min(pac.t, 1)) * cellSize + cellSize / 2;
    const mouth = 0.25 + 0.2 * Math.abs(Math.sin(now / 90));
    let angle = 0;
    if (pac.dir.x === 1) angle = 0;
    else if (pac.dir.x === -1) angle = Math.PI;
    else if (pac.dir.y === 1) angle = Math.PI / 2;
    else angle = -Math.PI / 2;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.arc(ix, iy, cellSize * 0.42, angle + mouth, angle - mouth + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    // Gorro de operario
    ctx.fillStyle = "#f97316";
    ctx.fillRect(ix - cellSize * 0.28, iy - cellSize * 0.52, cellSize * 0.56, cellSize * 0.14);

    // Fantasma perseguidor (tiempo del taller ⏱ en el nivel 4)
    if (ghost && maze.ghost) {
      const gx = (ghost.from.x + (ghost.to.x - ghost.from.x) * Math.min(ghost.t, 1)) * cellSize + cellSize / 2;
      const gy = (ghost.from.y + (ghost.to.y - ghost.from.y) * Math.min(ghost.t, 1)) * cellSize + cellSize / 2;
      // Cuerpo clásico de fantasma (onda inferior)
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.arc(gx, gy - cellSize * 0.08, cellSize * 0.34, Math.PI, 0);
      ctx.lineTo(gx + cellSize * 0.34, gy + cellSize * 0.26);
      // Onda inferior con 3 puntas
      for (let i = 2; i >= -2; i--) {
        const px2 = gx + (i / 2) * cellSize * 0.68;
        ctx.lineTo(px2, gy + cellSize * (i % 2 === 0 ? 0.26 : 0.1));
      }
      ctx.closePath();
      ctx.fill();
      // Ojos que miran hacia la dirección del fantasma
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(gx - cellSize * 0.12, gy - cellSize * 0.12, cellSize * 0.09, 0, Math.PI * 2);
      ctx.arc(gx + cellSize * 0.12, gy - cellSize * 0.12, cellSize * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e1b4b";
      const ox = ghost.dir.x * cellSize * 0.04;
      const oy = ghost.dir.y * cellSize * 0.04;
      ctx.beginPath();
      ctx.arc(gx - cellSize * 0.12 + ox, gy - cellSize * 0.12 + oy, cellSize * 0.045, 0, Math.PI * 2);
      ctx.arc(gx + cellSize * 0.12 + ox, gy - cellSize * 0.12 + oy, cellSize * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* --------- Lógica del quiz --------- */
  const cfg = LEVELS[levelIdx];
  const maze = mazeRef.current;

  function submitCount(input: number) {
    const total = eatenRef.current;
    setAttempts((a) => a + 1);
    if (input === total) {
      setQuizMsg(null);
      finishLevel();
    } else if (input > total) {
      setQuizMsg(
        `⚠️ Reportaste ${input} pero comiste ${total}. ¡${input - total} chicles fantasma! En la vida real eso es anotar piezas que no hiciste: el dueño del taller lo detectará al contar. Reporta lo REAL.`
      );
      beep(180, 0.3);
    } else {
      setQuizMsg(
        `⚠️ Reportaste ${input} pero comiste ${total}. Te quedaste ${total - input} chicles sin reportar: ¡sería regalar tu trabajo! Cuenta de nuevo y anota TODO lo que hiciste.`
      );
      beep(180, 0.3);
    }
  }

  function submitTwoOps(inputBlue: number, inputGreen: number) {
    const total = eatenRef.current;
    setAttempts((a) => a + 1);
    if (inputBlue + inputGreen !== total) {
      setQuizMsg(
        `⚠️ La suma de ambos procesos (${inputBlue + inputGreen}) no coincide con lo comido (${total}). En el cuaderno, cada operación se anota aparte pero TODO lo que hiciste debe aparecer.`
      );
      return;
    }
    // La verdad de los conteos sale de los chicles reales del laberinto
    const dotsNow = mazeRef.current?.dots ?? [];
    const expectBlue = dotsNow.filter((d) => d.color === "blue" && d.eaten).length;
    const expectGreen = dotsNow.filter((d) => d.color === "green" && d.eaten).length;
    if (inputBlue === expectBlue && inputGreen === expectGreen) {
      setQuizMsg(null);
      finishLevel();
    } else {
      setQuizMsg(
        `🤔 Casi: cuenta por separado según el COLOR de los chicles que comiste. El tramo azul (${cfg.processLabel({ x: 0, y: 0, color: "blue", eaten: true })}) y el verde fueron procesos distintos en la misma pieza.`
      );
    }
  }

  function finishLevel() {
    const done = Array.from(new Set([...levelsDone, cfg.id]));
    saveProgress(done);
    setPhase("result");
    beep(1040, 0.35);
  }

  /* --------- Render JSX --------- */
  const allDone = levelsDone.length >= LEVELS.length;

  if (phase === "menu") {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-6 text-center">
          <p className="text-5xl">👷🟡</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-100">
            Pac-Operario: La Ruta del Destajo
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            4 niveles de ~1 minuto cada uno. Al terminar sabrás usar tu Cuaderno
            Digital sin que nadie te explique nada. 🎮
          </p>
          <button
            onClick={() => setPhase("intro")}
            className="mt-4 w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-500"
          >
            {allDone ? "🔁 Jugar de nuevo" : "▶ Empezar a jugar"}
          </button>
          {allDone && (
            <p className="mt-3 text-xs font-bold text-emerald-400">
              🎓 Certificado obtenido — ¡puedes retar a un compañero!
            </p>
          )}
        </div>
        <ProgressBadges levelsDone={levelsDone} />
      </div>
    );
  }

  if (phase === "caught") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-purple-500/60 bg-slate-900/90 p-6 text-center">
        <p className="text-5xl">👻</p>
        <h3 className="mt-2 text-xl font-extrabold text-purple-300">
          ¡El fantasma del taller te atrapó!
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          Comiste {eaten} chicles antes de que te alcanzara. En la vida real, si el
          supervisor te ve corriendo con piezas sin reportar, te pide cuenta de todo.
          Igual aquí: intenta de nuevo una ruta con menos riesgo y más chicles.
        </p>
        <button
          onClick={() => startLevel(levelIdx)}
          className="mt-4 w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
        >
          🔁 Reintentar nivel {cfg.id}
        </button>
        <button
          onClick={() => setPhase("menu")}
          className="mt-2 w-full rounded-xl border border-slate-800 py-2 text-xs text-slate-400 hover:text-white"
        >
          ← Menú
        </button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Nivel {cfg.id} de {LEVELS.length}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-100">
          {cfg.emoji} {cfg.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{cfg.intro}</p>
        <div className="mt-4 rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
          🎮 Controles: desliza el dedo sobre el laberinto o usa las flechas.{" "}
          {cfg.ghost && <span className="text-purple-300 font-semibold">
            Nivel con fantasma 👻: hay atajos abiertos, elige bien tu ruta.
          </span>}
        </div>
        <button
          onClick={() => startLevel(levelIdx)}
          className="mt-4 w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
        >
          ¡Vamos!
        </button>
        <button
          onClick={() => setPhase("menu")}
          className="mt-2 w-full rounded-xl border border-slate-800 py-2 text-xs text-slate-400 hover:text-white"
        >
          ← Menú
        </button>
      </div>
    );
  }

  const total = maze?.totalDots ?? 0;
  const capLevel = cfg.cap;
  const capValue = capLevel ? (maze?.cap ?? 0) : 0;
  const hasGhost = !!maze?.ghost;

  return (
    <div className="mx-auto max-w-md space-y-3">
      {/* HUD */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm">
        <span className="font-bold text-cyan-300">
          Nivel {cfg.id}: {cfg.title}
        </span>
        <span className="text-slate-300">
          {capLevel ? `${eaten} / ${capValue} 🚧` : `${eaten} / ${total} 🍬`}
          {hasGhost && <span className="ml-2 text-purple-300">👻 persiguiendo…</span>}
        </span>
      </div>

      {/* Laberinto */}
      <div
        className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} className="block w-full" style={{ touchAction: "none" }} />
      </div>

      {/* D-pad táctil */}
      <div className="mx-auto grid w-40 grid-cols-3 gap-1">
        <span />
        <DPadBtn label="▲" onClick={() => setDir(0, -1)} />
        <span />
        <DPadBtn label="◀" onClick={() => setDir(-1, 0)} />
        <DPadBtn label="●" onClick={() => {}} muted />
        <DPadBtn label="▶" onClick={() => setDir(1, 0)} />
        <span />
        <DPadBtn label="▼" onClick={() => setDir(0, 1)} />
        <span />
      </div>

      {/* Pestañas de nivel para saltar (solo si ya lo superó) */}
      <div className="flex justify-center gap-2 text-xs">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => {
              if (levelsDone.includes(l.id)) {
                setLevelIdx(i);
                setPhase("intro");
              }
            }}
            className={`rounded-full px-3 py-1 ${
              levelsDone.includes(l.id)
                ? "border border-emerald-500/50 text-emerald-400"
                : i === levelIdx
                  ? "bg-slate-800 text-slate-200"
                  : "text-slate-600"
            }`}
          >
            {levelsDone.includes(l.id) ? "✅" : "🔒"} N{l.id}
          </button>
        ))}
      </div>

      {/* QUIZ: teléfono al final de la ruta */}
      {phase === "quiz" && (
        <QuizOverlay
          levelIdx={levelIdx}
          eaten={eaten}
          eatenByColor={eatenByColor}
          total={total}
          capValue={capValue}
          message={quizMsg}
          onSubmitCount={submitCount}
          onSubmitTwoOps={submitTwoOps}
          onResolveL4={(choice) => {
            if (choice === "owner") {
              setQuizMsg("✅ Solicitaste la corrección y el JEFE la aprobó: ambos confirmaron. En la vida real funciona igual: nadie cambia una anotación del taller solo.");
              setTimeout(finishLevel, 400);
            } else {
              setQuizMsg(
                "⚠️ Si lo dejas así, la nómina del taller quedaría mal y el error lo pagaría alguien más. En la app real puedes solicitar una corrección y el dueño debe confirmarla."
              );
            }
          }}
        />
      )}

      {/* RESULTADO: puente con la app real */}
      {phase === "result" && (
        <div className="rounded-2xl border border-emerald-500/50 bg-slate-900/90 p-6 text-center">
          <p className="text-4xl">🎉</p>
          <h3 className="mt-2 text-lg font-extrabold text-emerald-400">
            ¡Nivel {cfg.id} superado!
          </h3>
          <RealAppMock levelIdx={levelIdx} eaten={eaten} eatenByColor={eatenByColor} />
          <a
            href="/dashboard/operario"
            className="mt-4 block w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500"
          >
            👉 Hazlo de verdad ahora en tu Cuaderno
          </a>
          {levelIdx < LEVELS.length - 1 ? (
            <>
              <button
                onClick={() => {
                  setLevelIdx(levelIdx + 1);
                  setPhase("intro");
                }}
                className="mt-2 w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
              >
                ▶ Siguiente nivel: {LEVELS[levelIdx + 1].title}
              </button>
            </>
          ) : (
            <button
              onClick={() => setPhase("certificate")}
              className="mt-2 w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
            >
              🎓 Ver mi certificado
            </button>
          )}
          <button
            onClick={() => setPhase("menu")}
            className="mt-2 w-full rounded-xl border border-slate-800 py-2 text-xs text-slate-400 hover:text-white"
          >
            ← Menú
          </button>
        </div>
      )}

      {/* CERTIFICADO */}
      {phase === "certificate" && (
        <div className="rounded-2xl border border-amber-500/60 bg-slate-900/90 p-6 text-center">
          <p className="text-5xl">🎓</p>
          <h3 className="mt-2 text-xl font-extrabold text-amber-400">
            Operario Certificado en el Cuaderno Digital
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Ya sabes marcar tu producción real, separar los procesos por prenda,
            respetar el tope del atado y corregir errores con doble confirmación.
          </p>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              "¡Ya soy Operario Certificado en el Cuaderno Digital de CoreTextil! 🎮👷 Juega tú también: https://coretextil.vercel.app"
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500"
          >
            📲 Retar a un compañero por WhatsApp
          </a>
          <a
            href="/dashboard/operario"
            className="mt-2 block w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
          >
            👉 Ir a mi Cuaderno Digital
          </a>
        </div>
      )}
    </div>
  );
}

/* ---------------- Subcomponentes ---------------- */

function DPadBtn({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg py-3 text-lg font-bold ${
        muted ? "bg-slate-900 text-slate-700" : "bg-slate-800 text-cyan-300 active:bg-cyan-900"
      }`}
    >
      {label}
    </button>
  );
}

function ProgressBadges({ levelsDone }: { levelsDone: number[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {LEVELS.map((l) => (
        <div
          key={l.id}
          className={`rounded-xl border p-3 text-center text-[11px] ${
            levelsDone.includes(l.id)
              ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
              : "border-slate-800 bg-slate-900/60 text-slate-500"
          }`}
        >
          <p className="text-lg">{l.emoji}</p>
          <p className="mt-1 font-semibold">N{l.id}</p>
          <p className="leading-tight">{l.title}</p>
        </div>
      ))}
    </div>
  );
}

/* Quiz por nivel */
function QuizOverlay({
  levelIdx,
  eaten,
  eatenByColor,
  total,
  capValue,
  message,
  onSubmitCount,
  onSubmitTwoOps,
  onResolveL4,
}: {
  levelIdx: number;
  eaten: number;
  eatenByColor: { blue: number; green: number };
  total: number;
  capValue: number;
  message: string | null;
  onSubmitCount: (n: number) => void;
  onSubmitTwoOps: (b: number, g: number) => void;
  onResolveL4: (choice: "ignore" | "owner") => void;
}) {
  const [val, setVal] = useState("");
  const [valB, setValB] = useState("");
  const [valG, setValG] = useState("");

  // Nivel 4: el celular dañado marca 120 aunque comió menos
  if (levelIdx === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-3">
          <p className="text-4xl">👻</p>
          <h3 className="font-extrabold text-slate-100">¡El JEFE del taller te ve!</h3>
          <p className="text-xs text-slate-400">
            El celular dañado marcó <strong className="text-red-400">120 bolsillos</strong> pero tú
            solo comiste <strong className="text-emerald-400">{eaten}</strong>. La nómina del taller
            quedaría mal.
          </p>
          {message && (
            <p className="rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{message}</p>
          )}
          <button
            onClick={() => onResolveL4("ignore")}
            className="w-full rounded-xl border border-slate-700 py-2.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            a) Bah, no pasa nada
          </button>
          <button
            onClick={() => onResolveL4("owner")}
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
          >
            b) ✅ Pedir corrección al dueño del taller
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-500/50 bg-slate-900 p-6 space-y-4">
        <p className="text-center text-4xl">📱</p>
        <h3 className="text-center font-extrabold text-slate-100">
          Hora de tu marcación en el Cuaderno
        </h3>

        {message && (
          <p className="rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
            {message}
          </p>
        )}

        {levelIdx === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              ¿Cuántas mangas uniste con fileteadora? (cuenta los chicles azules que comiste)
            </p>
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-2xl font-extrabold text-slate-100"
              placeholder="?"
            />
            <button
              onClick={() => onSubmitCount(parseInt(val) || 0)}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
            >
              Anotar mi producción
            </button>
          </div>
        )}

        {levelIdx === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              El cuello rib llevó 2 procesos. Anota cada uno por separado:
            </p>
            <label className="block text-xs">
              <span className="text-blue-400">🔵 Pegar cuello (Fileteadora):</span>
              <input
                type="number"
                value={valB}
                onChange={(e) => setValB(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center text-lg font-bold text-slate-100"
                placeholder="?"
              />
            </label>
            <label className="block text-xs">
              <span className="text-emerald-400">🟢 Pisar cuello (Plana):</span>
              <input
                type="number"
                value={valG}
                onChange={(e) => setValG(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center text-lg font-bold text-slate-100"
                placeholder="?"
              />
            </label>
            <button
              onClick={() => onSubmitTwoOps(parseInt(valB) || 0, parseInt(valG) || 0)}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
            >
              Anotar los 2 procesos
            </button>
          </div>
        )}

        {levelIdx === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              El muro 🚧 te bloqueó en el tope del atado: {capValue} de {total} chicles. ¿Cuántos
              anotas en tu cuaderno?
            </p>
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-2xl font-extrabold text-slate-100"
              placeholder="?"
            />
            <button
              onClick={() => onSubmitCount(parseInt(val) || 0)}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500"
            >
              Anotar mi producción
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-500">
          Chicles comidos: {eaten} (🔵 {eatenByColor.blue} · 🟢 {eatenByColor.green})
        </p>
      </div>
    </div>
  );
}

/* Réplica simplificada del cuaderno real entre niveles */
function RealAppMock({
  levelIdx,
  eaten,
  eatenByColor,
}: {
  levelIdx: number;
  eaten: number;
  eatenByColor: { blue: number; green: number };
}) {
  const rows =
    levelIdx === 1
      ? [
          { op: "Pegar cuello (Fileteadora)", units: eatenByColor.blue, rate: 600 },
          { op: "Pisar cuello (Plana)", units: eatenByColor.green, rate: 450 },
        ].filter((r) => r.units > 0)
      : levelIdx === 3
        ? [{ op: "Corrección aprobada por el dueño ✅", units: eaten, rate: 600 }]
        : [{ op: "Unir mangas (Fileteadora)", units: eaten, rate: 600 }];

  const totalCOP = rows.reduce((acc, r) => acc + r.units * r.rate, 0);

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-left text-xs">
      <p className="mb-2 font-bold text-cyan-300">📖 Así se ve en tu Cuaderno Digital real:</p>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between border-b border-slate-800/60 py-1.5">
          <span className="text-slate-300">{r.op}</span>
          <span className="text-slate-400">
            {r.units} pzs × ${r.rate.toLocaleString("es-CO")}
          </span>
        </div>
      ))}
      <div className="mt-2 flex justify-between font-extrabold">
        <span className="text-slate-200">Total del día</span>
        <span className="text-emerald-400">
          ${totalCOP.toLocaleString("es-CO")} COP
        </span>
      </div>
    </div>
  );
}
