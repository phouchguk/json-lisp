var testEnv = { a: 42 };

function arrp(x) {
  return typeof x === "object" && typeof x.length !== "undefined";
}

function atomp(x) {
  return !(objp(x) || arrp(x));
}

function boolp(x) {
  return typeof x === "boolean";
}

function compoundp(x) {
  return objp(x) && x.clo === true;
}

function dop(x) {
  if (taggedArr(x, "do")) {
    if (x.length === 1) {
      throw new Error("empty do");
    }

    return true;
  }

  return false;
}

function fnp(x) {
  return taggedArr(x, "fn");
}

function ifp(x) {
  if (taggedArr(x, "if")) {
    if (x.length !== 4) {
      throw new Error("bad if");
    }

    return true;
  }

  return false;
}

function jsfnp(x) {
  return typeof x === "function";
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

function primitivep(x) {
  return jsfnp(x);
}

function rawobjp(x) {
  return typeof x === "object" && typeof x.length === "undefined";
}

function selfEvaluating(x) {
  return (
    numberp(x) || boolp(x) || undefinedp(x) || jsfnp(x) || objp(x) || stringp(x)
  );
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
  return x === "" || (rawobjp(x) && x.str === true);
}

function symbolp(x) {
  return typeof x === "string" && x.length > 0;
}

function taggedArr(x, tag) {
  return arrp(x) && x[0] === tag;
}

function undefinedp(x) {
  return typeof x === "undefined";
}

function variablep(x) {
  return symbolp(x);
}

function evl(json, env) {
  while (true) {
    if (selfEvaluating(json)) {
      return json;
    }

    if (variablep(json)) {
      return lookup(json, env);
    }

    if (setp(json)) {
      return set(json[1], evl(json[2], env), env);
    }

    if (ifp(json)) {
      json = evl(json[1], env) === false ? json[3] : json[2];
      continue;
    }

    if (dop(json)) {
      var lastIndex = json.length - 1;

      for (var i = 1; i < lastIndex; i++) {
        evl(json[i], env);
      }

      json = evl(json[lastIndex], env);
      continue;
    }

    if (fnp(json)) {
      var bodyLen = json.length - 2; // trim fn tag and parms
      var body = false;

      if (bodyLen === 1) {
        body = json[2];
      } else {
        body = json.slice(2);
        body.unshift("do");
      }

      return {
        clo: true,
        parms: json[1],
        body: body,
      };
    }

    // application
    if (!arrp(json)) {
      throw new Error("expected list");
    }

    var op = evl(json[0], env);

    var args = [];

    for (var i = 1; i < json.length; i++) {
      args.push(evl(json[i], env));
    }

    if (primitivep(op)) {
      return op.apply(null, args);
    }

    if (compoundp(op)) {
      json = op.body;
      env = { _parent: env };

      if (symbolp(op.parms)) {
        env[op.parms] = args;
      } else {
        if (op.parms.length !== args.length) {
          // should destructure arrs and objs
          throw new Error("bad args");
        }

        for (var i = 0; i < op.parms.length; i++) {
          env[op.parms[i]] = args[i];
        }
      }

      continue;
    }

    throw new Error("bad json");
  }
}

var env = {
  a: 42,
  "+": function (a, b) {
    return a + b;
  },
};

//env["add"] = { clo: true, parms: ["x", "y"], body: ["+", "x", "y"] };

console.log(evl("a", env));
console.log(evl(["set", "b", 99], env));
console.log(evl(["set", "c", "a"], env));
console.log(evl("c", env));
console.log(evl(["if", 0, "b", "c"], env));
console.log(evl(["do", "a", "b", "c"], env));
console.log(evl(["do", 100], env));
console.log(evl(["+", "b", "c"], env));
//console.log(evl(["set", "add", ["fn", ["x", "y"],  ["+", 1, 2], ["+", "x", "y"]]], env));
console.log(evl(["set", "add", ["fn", ["x", "y"], ["+", "x", "y"]]], env));
console.log(evl("add", env));
console.log(evl(["add", 3, 4], env));
