penpot.ui.open("DeepSeek Design Copilot", "?theme=" + encodeURIComponent(penpot.theme), {
  width: 430,
  height: 560,
});

penpot.ui.onMessage(async (event) => {
  const message = event.message;
  if (message?.type === "read_selection") {
    try {
      const budget = { remaining: 200 };
      penpot.ui.sendMessage({ type: "selection_result", selection: penpot.selection.slice(0, 20).map((shape) => serializeShape(shape, 0, budget)) });
    } catch (error) {
      penpot.ui.sendMessage({ type: "selection_result", error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (!message || message.type !== "create_component") return;

  try {
    const root = message.componentTree;
    if (!root || root.type !== "FRAME") {
      throw new Error("模型返回的设计必须以 FRAME 根节点开始。");
    }
    await createNode(root);
    penpot.ui.sendMessage({ type: "generation_result", ok: true });
  } catch (error) {
    penpot.ui.sendMessage({
      type: "generation_result",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function serializeShape(shape, depth = 0, budget = { remaining: 200 }) {
  if (depth >= 8 || budget.remaining <= 0) return { type: shape.type, name: shape.name, truncated: true };
  budget.remaining -= 1;
  const result = {
    id: shape.id,
    type: shape.type,
    name: shape.name,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  };
  if (shape.characters) result.text = String(shape.characters).slice(0, 2000);
  if (Array.isArray(shape.fills)) result.fills = shape.fills.map((fill) => ({ color: fill.fillColor, opacity: fill.fillOpacity }));
  if (Array.isArray(shape.strokes)) result.strokes = shape.strokes.map((stroke) => ({ color: stroke.strokeColor, width: stroke.strokeWidth }));
  if (Array.isArray(shape.children) && shape.children.length) {
    result.children = shape.children.slice(0, 50).map((child) => serializeShape(child, depth + 1, budget));
    if (shape.children.length > 50 || budget.remaining <= 0) result.truncated = true;
  }
  return result;
}

async function createNode(spec, parent) {
  let node;
  switch (spec.type) {
    case "FRAME":
      node = penpot.createBoard();
      break;
    case "RECTANGLE":
      node = penpot.createRectangle();
      break;
    case "TEXT":
      node = penpot.createText(String(spec.characters || "Text"));
      if (!node) return;
      break;
    case "SVG":
      node = penpot.createShapeFromSvg(String(spec.svg || ""));
      if (!node) return;
      break;
    default:
      throw new Error("不支持的图层类型：" + spec.type);
  }

  if (Number.isFinite(spec.x)) node.x = spec.x;
  if (Number.isFinite(spec.y)) node.y = spec.y;
  if (Number.isFinite(spec.width) && Number.isFinite(spec.height)) {
    node.resize(Math.max(1, spec.width), Math.max(1, spec.height));
  }
  if (spec.name) node.name = String(spec.name);

  if (spec.fills) node.fills = await convertFills(spec.fills);
  if (Array.isArray(spec.strokes)) {
    node.strokes = spec.strokes.map((stroke) => ({
      strokeColor: toHex(stroke.color),
      strokeOpacity: clamp(stroke.opacity, 0, 1, 1),
      strokeStyle: "solid",
      strokeWidth: Math.max(0, Number(spec.strokeWeight) || 1),
    }));
  }
  if (Array.isArray(spec.effects)) {
    node.shadows = spec.effects
      .filter((effect) => effect.visible !== false)
      .map((effect) => ({
        style: "drop-shadow",
        offsetX: Number(effect.offset && effect.offset.x) || 0,
        offsetY: Number(effect.offset && effect.offset.y) || 0,
        spread: Number(effect.spread_radius) || 0,
        blur: Math.max(0, Number(effect.blur_radius) || 0),
        hidden: false,
        color: toHex(effect.color),
      }));
  }
  applySharedProperties(spec, node);

  if (parent) parent.appendChild(node);

  if (node.type === "text") {
    if (Number.isFinite(spec.fontSize)) node.fontSize = String(spec.fontSize);
    if (Number.isFinite(spec.letterSpacing)) node.letterSpacing = String(spec.letterSpacing);
    if (spec.textAlignHorizontal) {
      const align = {
        LEFT: "left",
        CENTER: "center",
        RIGHT: "right",
        JUSTIFIED: "justify",
      }[spec.textAlignHorizontal];
      if (align) node.align = align;
    }
    const transform = { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" }[spec.textCase];
    if (transform) node.textTransform = transform;
    const decoration = { underline: "underline", strikethrough: "line-through" }[spec.textDecoration];
    if (decoration) node.textDecoration = decoration;
  }

  if (node.type === "board" && Array.isArray(spec.children)) {
    for (const child of [...spec.children].reverse()) await createNode(child, node);
  }
  return node;
}

async function convertFills(fills) {
  if (!Array.isArray(fills) || fills.length === 0) return [{ fillOpacity: 0 }];
  return Promise.all(fills.map(async (fill) => {
    if (fill.type === "SOLID") {
      return { fillColor: toHex(fill.color), fillOpacity: clamp(fill.opacity, 0, 1, 1) };
    }
    if (fill.type === "IMAGE" && typeof fill.url === "string" && fill.url) {
      return { fillOpacity: 1, fillImage: await penpot.uploadMediaUrl("IMAGE", fill.url) };
    }
    return { fillColor: "#000000", fillOpacity: 1 };
  }));
}

function applySharedProperties(spec, node) {
  const radiusProps = [
    ["topLeftRadius", "borderRadiusTopLeft"],
    ["topRightRadius", "borderRadiusTopRight"],
    ["bottomLeftRadius", "borderRadiusBottomLeft"],
    ["bottomRightRadius", "borderRadiusBottomRight"],
  ];
  for (const [source, target] of radiusProps) {
    if (Number.isFinite(spec[source])) node[target] = Math.max(0, spec[source]);
  }
  if (spec.constraints) {
    if (spec.constraints.horizontal) node.constraintsHorizontal = spec.constraints.horizontal;
    if (spec.constraints.vertical) node.constraintsVertical = spec.constraints.vertical;
  }
}

function toHex(color) {
  if (!color) return "#000000";
  const channel = (value) => Math.round(clamp(Number(value), 0, 255, 0)).toString(16).padStart(2, "0");
  return "#" + channel(color.r) + channel(color.g) + channel(color.b);
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
