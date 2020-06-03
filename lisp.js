var testEnv = { a: 42 };

function arrp(x) {
  return typeof x === "object" && typeof x.length !== "undefined";
}

function atomp(x) {
  return !(objp(x) || arrp(x));
}

function lookup(v, env) {
  while (true) {
    if (typeof env[v] !== "undefined") {
      return env[v];
    }

    if (typeof env._parent === "undefined") {
      throw new Error("'" + v + "'unbound");
    }

    env = env._parent;
  }
}

function numberp(x) {
  return typeof x === "number";
}

function objp(x) {
  return rawobjp(x) && typeof x.str === "undefined";
}

function rawobjp(x) {
  return typeof x === "object" && typeof x.length === "undefined";
}

function selfEvaluating(x) {
  return numberp(x) || objp(x) || stringp(x);
}

function stringp(x) {
  return rawobjp(x) && x.str === true;
}

function symbolp(x) {
  return typeof x === "string";
}

function variablep(x) {
  return symbolp(x);
}

function eval(json, env) {
  if (selfEvaluating(json)) {
    return json;
  }

  if (variablep(json)) {
    return lookup(json, env);
  }

  throw new Error("bad json");
}

console.log(eval("a", {a: 42}));