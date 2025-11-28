// engine.js
// Generic JSON → JSON mapper for your mapping DSL

/* ------------------------------------------------------------------ */
/* Path resolution                                                    */
/* ------------------------------------------------------------------ */

function resolvePath(obj, path) {
  if (!path || typeof path !== "string") return undefined;

  return path.split(".").reduce((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, obj);
}

function resolvePathWithAliases(obj, path, aliases = {}) {
  if (!path || typeof path !== "string") return undefined;

  let effectivePath = path;

  for (const [alias, actualPath] of Object.entries(aliases)) {
    if (path === alias) {
      effectivePath = actualPath;
      break;
    }
    if (path.startsWith(alias + ".")) {
      const suffix = path.slice(alias.length + 1);
      effectivePath = actualPath ? `${actualPath}.${suffix}` : suffix;
      break;
    }
  }

  return resolvePath(obj, effectivePath);
}

/* ------------------------------------------------------------------ */
/* Built-in converter functions                                       */
/* ------------------------------------------------------------------ */

function toDecimalStringOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    return val.toFixed(4).replace(/\.?0+$/, "");
  }
  return String(val);
}

function pascalToScreaming(value) {
  if (value === null || value === undefined) return null;
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function now() {
  return new Date().toISOString();
}

function toDecimal(val) {
  if (val === null || val === undefined || val === "") return undefined;
  const num =
    typeof val === "number"
      ? val
      : typeof val === "string"
      ? parseFloat(val)
      : NaN;
  if (Number.isNaN(num)) return undefined;
  return num.toFixed(4).replace(/\.?0+$/, "");
}

const BUILTIN_CONVERTERS = {
  toDecimal,
  toDecimalStringOrNull,
  pascalToScreaming,
  now,
};

/* ------------------------------------------------------------------ */
/* Compute expression evaluation                                      */
/* ------------------------------------------------------------------ */

function evalCompute(expr, src, aliases = {}) {
  if (!expr || typeof expr !== "string") return undefined;

  const get = (path) => resolvePathWithAliases(src, path, aliases);

  const borrower = src.borrower || {};
  const loan = src.loan || {};
  const property = src.property || {};

  const helpers = {
    get,
    borrower,
    loan,
    property,
    ...BUILTIN_CONVERTERS,
    src,
  };

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "helpers",
    `
      const {
        get,
        borrower,
        loan,
        property,
        now,
        toDecimalStringOrNull,
        pascalToScreaming,
        src
      } = helpers;

      return (${expr});
    `
  );

  return fn(helpers);
}

/* ------------------------------------------------------------------ */
/* Rule type check                                                    */
/* ------------------------------------------------------------------ */

function isRuleObject(obj) {
  if (obj == null || typeof obj !== "object") return false;

  const keys = ["from", "static", "compute", "when", "default", "convert", "enum"];

  return keys.some((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

/* ------------------------------------------------------------------ */
/* Rule resolution                                                    */
/* ------------------------------------------------------------------ */

function resolveRule(rule, src, context, fieldPath) {
  const { enums = {}, aliases = {}, customConverters = {}, logs = [] } = context;
  let value;

  const label = fieldPath || "<root>";

  /* ---------------------------- when (conditional) ---------------------------- */
  if (Array.isArray(rule.when)) {
    for (const branch of rule.when) {
      if (branch.if && branch.if.exists) {
        const existsVal = resolvePathWithAliases(src, branch.if.exists, aliases);
        if (existsVal !== undefined && existsVal !== null) {
          logs.push(
            `${label}: when condition exists("${branch.if.exists}") satisfied → using 'then'`
          );
          return resolveRule(branch.then, src, context, fieldPath);
        }
      } else if (Object.prototype.hasOwnProperty.call(branch, "else")) {
        const elseBlock = branch.else;
        logs.push(`${label}: when no conditions matched → using 'else'`);
        if (isRuleObject(elseBlock)) {
          return resolveRule(elseBlock, src, context, fieldPath);
        }
        return elseBlock;
      }
    }
  }

  /* ---------------------------------- static ---------------------------------- */
  if (Object.prototype.hasOwnProperty.call(rule, "static")) {
    logs.push(
      `${label}: static value → ${JSON.stringify(rule.static)}`
    );
    return rule.static;
  }

  /* --------------------------------- compute ---------------------------------- */
  if (typeof rule.compute === "string") {
    value = evalCompute(rule.compute, src, aliases);
    logs.push(
      `${label}: compute("${rule.compute}") → ${JSON.stringify(value)}`
    );
  }

  /* ------------------------------------ from ---------------------------------- */
  if (rule.from && value === undefined) {
    if (Array.isArray(rule.from)) {
      for (const p of rule.from) {
        const v = resolvePathWithAliases(src, p, aliases);
        if (v !== undefined && v !== null) {
          value = v;
          logs.push(
            `${label}: from("${p}") → ${JSON.stringify(value)}`
          );
          break;
        }
      }
    } else {
      value = resolvePathWithAliases(src, rule.from, aliases);
      logs.push(
        `${label}: from("${rule.from}") → ${JSON.stringify(value)}`
      );
    }
  }

  /* ------------------------------------ enum ---------------------------------- */
  if (rule.enum && value !== undefined && value !== null) {
    const enumMap = enums[rule.enum];

    if (enumMap) {
      if (Array.isArray(value)) {
        const before = [...value];

        value = value.map((v) =>
          Object.prototype.hasOwnProperty.call(enumMap, String(v))
            ? enumMap[String(v)]
            : v
        );

        logs.push(
          `${label}: enum("${rule.enum}") mapped array ${JSON.stringify(
            before
          )} → ${JSON.stringify(value)}`
        );
      } else if (Object.prototype.hasOwnProperty.call(enumMap, String(value))) {
        const before = value;
        value = enumMap[String(value)];

        logs.push(
          `${label}: enum("${rule.enum}") mapped ${JSON.stringify(
            before
          )} → ${JSON.stringify(value)}`
        );
      }
    }
  }

  /* ---------------------------------- convert ---------------------------------- */
  if (rule.convert && value !== undefined) {
    const conv =
      BUILTIN_CONVERTERS[rule.convert] || customConverters[rule.convert];
    if (typeof conv === "function") {
      const before = value;
      value = conv(value);
      logs.push(
        `${label}: convert("${rule.convert}") ${JSON.stringify(
          before
        )} → ${JSON.stringify(value)}`
      );
    }
  }

  /* ---------------------------------- default ---------------------------------- */
  if (
    (value === undefined || value === null || value === "") &&
    Object.prototype.hasOwnProperty.call(rule, "default")
  ) {
    value = rule.default;
    logs.push(
      `${label}: default → ${JSON.stringify(value)}`
    );
  }

  /* 
  --------------------------------------------------------------------------
  🔥 CUSTOM VALUES FIX (only change)
  --------------------------------------------------------------------------
  Only include { name, value } items where the source had a real `value`.
  --------------------------------------------------------------------------
  */
  if (fieldPath === "customValues" && Array.isArray(value)) {
    value = value
      .filter(v => v && v.value !== undefined && v.value !== null && v.value !== "")
      .map(v => ({ name: v.name, value: v.value }));
  }

  return value;
}

/* ------------------------------------------------------------------ */
/* Recursive walker                                                   */
/* ------------------------------------------------------------------ */

function mapNode(node, src, context, fieldPath) {
  if (isRuleObject(node)) {
    return resolveRule(node, src, context, fieldPath);
  }

  if (node == null || typeof node !== "object") return node;

  const out = {};
  for (const [key, child] of Object.entries(node)) {
    if (child === undefined) continue;
    const childPath = fieldPath ? `${fieldPath}.${key}` : key;
    out[key] = mapNode(child, src, context, childPath);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

function executeMapping(mappingFile, input, options = {}) {
  if (!mappingFile || typeof mappingFile !== "object") {
    throw new Error("Invalid mapping file");
  }

  const { mapping, enums = {}, paths = {}, overrides = {} } = mappingFile;
  if (!mapping || typeof mapping !== "object") {
    throw new Error("mappingFile.mapping missing or invalid");
  }

  const logs = [];
  logs.push(
    `Starting mapping at ${new Date().toISOString()}`
  );

  const profile = options.profile;

  let effectiveMapping = mapping;
  let effectiveEnums = { ...enums };

  if (profile && overrides[profile]) {
    const ov = overrides[profile];

    if (ov.enums) {
      effectiveEnums = { ...effectiveEnums, ...ov.enums };
      logs.push(`Applied enum overrides for profile="${profile}"`);
    }
    if (ov.mapping) {
      effectiveMapping = { ...effectiveMapping, ...ov.mapping };
      logs.push(`Applied mapping overrides for profile="${profile}"`);
    }
  }

  const context = {
    enums: effectiveEnums,
    aliases: paths,
    customConverters: options.customConverters || {},
    logs,
  };

  const result = mapNode(effectiveMapping, input, context, "");

  logs.push("Mapping complete");

  return { result, log: logs };
}

module.exports = {
  executeMapping,
};
