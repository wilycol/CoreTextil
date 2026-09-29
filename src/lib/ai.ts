// Motor de ADN de prenda (MVP).
// Versión heurística local: infiere despiece, ruta de máquinas y tiempos SAM
// desde el nombre de la prenda. El reemplazo por modelo de visión multimodal
// se conecta aquí sin cambiar el contrato.

export type PartDraft = {
  part_code: string;
  name: string;
  material_type: string;
};

export type OperationDraft = {
  step_order: number;
  operation_name: string;
  machine_type: "plana" | "fileteadora" | "collarin";
  sam_minutes: number;
  base_rate_cop: number;
};

export type MaterialDraft = {
  name: string;
  unit: string;
  quantity_per_garment: number;
  unit_cost_cop: number;
};

export type GarmentDNA = {
  parts: PartDraft[];
  operations: OperationDraft[];
  materials: MaterialDraft[];
  materialsCostCop: number;
  totalSamMinutes: number;
  suggestedRetailPrice: number;
};

type Blueprint = {
  match: RegExp;
  parts: [string, string, string][]; // [código, nombre, material]
  ops: [string, OperationDraft["machine_type"], number][]; // [nombre, máquina, SAM]
  materials: [string, string, number, number][]; // [nombre, unidad, cantidad, costo unitario]
};

const BLUEPRINTS: Blueprint[] = [
  {
    match: /camiset|playera|franela|body\b/i,
    parts: [
      ["FRE", "Frente", "tela principal"],
      ["ESP", "Espalda", "tela principal"],
      ["MNG", "Mangas (par)", "tela principal"],
      ["CLL", "Cuello", "rib"],
    ],
    ops: [
      ["Filetear hombros", "fileteadora", 0.5],
      ["Unir mangas", "fileteadora", 0.6],
      ["Cerrar costados", "fileteadora", 0.8],
      ["Collarín de cuello", "collarin", 0.8],
      ["Dobladillo de manga", "plana", 0.5],
      ["Dobladillo inferior", "plana", 0.6],
    ],
    materials: [
      ["Tela principal (jersey algodón)", "m", 0.45, 8000],
      ["Rib de cuello", "m", 0.08, 6000],
      ["Hilo", "m", 60, 15],
    ],
  },
  {
    match: /pantalon|jean|dril|bogota|bogotana/i,
    parts: [
      ["DEL", "Delanteros (par)", "tela principal"],
      ["ESP", "Espaldas (par)", "tela principal"],
      ["PRE", "Pretina", "entretela"],
      ["BOL", "Bolsillos", "tela forro"],
    ],
    ops: [
      ["Armar bolsillos", "plana", 1.2],
      ["Filetear laterales", "fileteadora", 0.8],
      ["Cerrar entrepierna", "fileteadora", 0.9],
      ["Unir pretina", "plana", 0.9],
      ["Dobladillo de botapierna", "plana", 0.5],
    ],
    materials: [
      ["Dril", "m", 0.7, 12000],
      ["Entretela de pretina", "m", 0.1, 4000],
      ["Cremallera", "unidad", 1, 1500],
      ["Hilo", "m", 100, 15],
    ],
  },
  {
    match: /sudader|hoodie|buso|buzo|chaquet/i,
    parts: [
      ["FRE", "Frente", "tela felpa"],
      ["ESP", "Espalda", "tela felpa"],
      ["MNG", "Mangas (par)", "tela felpa"],
      ["CAP", "Capucha", "tela felpa"],
      ["PUN", "Puños y faldón", "rib"],
    ],
    ops: [
      ["Filetear hombros", "fileteadora", 0.5],
      ["Unir mangas", "fileteadora", 0.6],
      ["Cerrar costados", "fileteadora", 0.8],
      ["Armar capucha", "plana", 1.5],
      ["Collarín de capucha", "collarin", 0.8],
      ["Puños y faldón", "plana", 0.7],
    ],
    materials: [
      ["Tela felpa", "m", 0.8, 12000],
      ["Rib puños y faldón", "m", 0.2, 6000],
      ["Cordón", "unidad", 1, 800],
      ["Hilo", "m", 80, 15],
    ],
  },
  {
    match: /vestido|falda/i,
    parts: [
      ["COR", "Corpiño / cuerpo superior", "tela principal"],
      ["FAL", "Falda / cuerpo inferior", "tela principal"],
      ["CLL", "Cuello o tiras", "rib"],
    ],
    ops: [
      ["Filetear piezas", "fileteadora", 0.8],
      ["Unir corpiño y falda", "plana", 0.9],
      ["Collarín o dobladillo superior", "collarin", 0.8],
      ["Dobladillo inferior", "plana", 0.6],
    ],
    materials: [
      ["Tela principal", "m", 1.2, 9000],
      ["Forro", "m", 0.3, 5000],
      ["Hilo", "m", 70, 15],
    ],
  },
  {
    match: /short|bermuda/i,
    parts: [
      ["DEL", "Delanteros (par)", "tela principal"],
      ["PRE", "Pretina", "entretela"],
    ],
    ops: [
      ["Filetear entrepierna", "fileteadora", 0.7],
      ["Unir pretina", "plana", 0.8],
      ["Dobladillo", "plana", 0.5],
    ],
    materials: [
      ["Dril", "m", 0.5, 12000],
      ["Entretela de pretina", "m", 0.05, 4000],
      ["Hilo", "m", 50, 15],
    ],
  },
];

const DEFAULT_BLUEPRINT: Blueprint = {
  match: /.*/,
  parts: [
    ["FRE", "Frente", "tela principal"],
    ["ESP", "Espalda", "tela principal"],
    ["ACC", "Accesorios / avíos", "avíos"],
  ],
  ops: [
    ["Filetear piezas", "fileteadora", 0.7],
    ["Ensamble principal", "plana", 0.9],
    ["Terminados y revisión", "plana", 0.6],
  ],
  materials: [
    ["Tela principal", "m", 0.6, 8000],
    ["Avíos y acabados", "unidad", 1, 2000],
    ["Hilo", "m", 60, 15],
  ],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function inferGarmentDNA(input: {
  name: string;
  referenceCode: string;
  baseRateCop: number;
}): GarmentDNA {
  const bp =
    BLUEPRINTS.find((b) => b.match.test(normalize(input.name))) ??
    DEFAULT_BLUEPRINT;

  const totalSam = bp.ops.reduce((acc, [, , sam]) => acc + sam, 0);

  const operations: OperationDraft[] = bp.ops.map(
    ([operation_name, machine_type, sam_minutes], i) => ({
      step_order: i + 1,
      operation_name,
      machine_type,
      sam_minutes,
      base_rate_cop: Math.round((input.baseRateCop * sam_minutes) / totalSam),
    })
  );

  const materials: MaterialDraft[] = bp.materials.map(
    ([name, unit, quantity_per_garment, unit_cost_cop]) => ({
      name,
      unit,
      quantity_per_garment,
      unit_cost_cop,
    })
  );
  const materialsCostCop = materials.reduce(
    (a, m) => a + m.quantity_per_garment * m.unit_cost_cop,
    0
  );

  // Referencia de precio: mano de obra + materiales + margen.
  const suggestedRetailPrice =
    Math.round(
      (input.baseRateCop + materialsCostCop) * 1.35 / 100
    ) * 100;

  return {
    parts: bp.parts.map(([part_code, name, material_type]) => ({
      part_code: `${input.referenceCode}-${part_code}`,
      name,
      material_type,
    })),
    operations,
    materials,
    materialsCostCop: Math.round(materialsCostCop),
    totalSamMinutes: Number(totalSam.toFixed(2)),
    suggestedRetailPrice,
  };
}
