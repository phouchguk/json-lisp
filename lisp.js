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

function set(v, val, env) {
  while (true) {
    if (typeof env[v] !== "undefined" || typeof env._parent === "undefined") {
      env[v] = val;
      return "ok";
    }

    env = env._parent;
  }
}

function setp(x) {
  if (taggedArr(x, "set")) {
    if (!(x.length === 3 && symbolp(x[1]))) {
      throw new Error("bad set");
    }

    return true;
  }

  return false;
}

function stringp(x) {
  return rawobjp(x) && x.str === true;
}

function symbolp(x) {
  return typeof x === "string";
}

function taggedArr(x, tag) {
  return arrp(x) && x[0] === tag;
}

function variablep(x) {
  return symbolp(x);
}

function evl(json, env) {
  if (selfEvaluating(json)) {
    return json;
  }

  if (variablep(json)) {
    return lookup(json, env);
  }

  if (setp(json)) {
    return set(json[1], evl(json[2], env), env);
  }

  throw new Error("bad json");
}

var env = { a: 42 };
console.log(evl("a", env));
console.log(evl(["set", "b", "a"], env));
console.log(evl("b", env));
