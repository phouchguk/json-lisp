function arrp(x) {
  return typeof x === "object" && typeof x.length !== "undefined";
}

function boolp(x) {
  return typeof x === "boolean";
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

function macp(x) {
  return taggedArr(x, "macro");
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

function quotep(x) {
  if (taggedArr(x, "quote")) {
    if (!(x.length === 2)) {
      throw new Error("bad quote");
    }

    return true;
  }

  return false;
}

function rawobjp(x) {
  return typeof x === "object" && typeof x.length === "undefined";
}

function selfEvaluating(x) {
  return (
    x === null ||
    numberp(x) ||
    boolp(x) ||
    undefinedp(x) ||
    jsfnp(x) ||
    objp(x) ||
    stringp(x)
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

function extendEnv(clo, args) {
  env = { _parent: clo.env };

  if (symbolp(clo.parms)) {
    env[clo.parms] = args;
  } else {
    if (clo.parms.length !== args.length) {
      // should destructure arrs and objs
      console.log(clo, args);
      throw new Error("bad args");
    }

    for (var i = 0; i < clo.parms.length; i++) {
      env[clo.parms[i]] = args[i];
    }
  }

  return env;
}

function evl(json, env) {
  while (true) {
    if (selfEvaluating(json)) {
      return json;
    }

    if (quotep(json)) {
      return json[1];
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

    if (fnp(json) || macp(json)) {
      var bodyLen = json.length - 2; // rm fn tag and parms
      var body = false;

      if (bodyLen === 1) {
        body = json[2];
      } else {
        body = json.slice(2);
        body.unshift("do");
      }

      var clo = {
        parms: json[1],
        body: body,
        env: env,
      };

      if (fnp(json)) {
        clo.clo = true;
      } else {
        clo.mac = true;
      }

      return clo;
    }

    // application
    if (!arrp(json)) {
      throw new Error("expected array");
    }

    var op = evl(json[0], env);
    var opIsObj = objp(op);

    if (opIsObj && op.mac) {
      // don't evaluate args
      json = evl(op.body, extendEnv(op, json.slice(1)));

      continue;
    }

    var args = [];

    for (var i = 1; i < json.length; i++) {
      args.push(evl(json[i], env));
    }

    if (primitivep(op)) {
      return op.apply(null, args);
    }

    if (opIsObj) {
      if (op.clo) {
        // compound
        json = op.body;
        env = extendEnv(op, args);
        continue;
      } else {
        // obj application
        if (!(args.length === 1 && symbolp(args[0]))) {
          throw new Error("bad object application");
        }

        return op[args[0]];
      }
    }

    if (numberp(op)) {
      if (!(args.length === 1 && arrp(args[0]))) {
        throw new Error("bad number application");
      }

      return args[0][op];
    }

    if (symbolp(op)) {
      if (!(args.length === 1 && objp(args[0]))) {
        throw new Error("bad symbol application");
      }

      return args[0][op];
    }

    if (arrp(op)) {
      if (!(args.length === 1 && numberp(args[0]))) {
        throw new Error("bad array application");
      }

      return op[args[0]];
    }

    throw new Error("bad json");
  }
}

var env = {
  a: 42,
  "+": function (a, b) {
    return a + b;
  },
  id: function (a, b) {
    return a === b;
  },
  len: function (a) {
    return a.length;
  },
  arr: function () {
    return Array.prototype.slice.call(arguments);
  },
  concat: function (a, b) {
    return a.concat(b);
  },
  slice: function (a, n) {
    return a.slice(n);
  },
  type: function (x) {
    if (x === null) {
      return "null";
    }

    if (rawobjp(x)) {
      return x.clo ? "clo" : x.str ? "string" : "obj";
    }

    if (arrp(x)) {
      return "array";
    }

    if (symbolp(x)) {
      return "symbol";
    }

    return typeof x;
  },
};

evl(
  [
    "set",
    "mac",
    [
      "macro",
      "args",
      [
        "arr",
        ["quote", "set"],
        [0, "args"],
        [
          "concat",
          ["arr", ["quote", "macro"], [1, "args"]],
          ["slice", "args", 2],
        ],
      ],
    ],
  ],
  env
);

console.log(evl("a", env));
console.log(evl(["set", "b", 99], env));
console.log(evl(["set", "c", "a"], env));
console.log(evl("c", env));
console.log(evl(["if", 0, "b", "c"], env));
console.log(evl(["do", "a", "b", "c"], env));
console.log(evl(["do", 100], env));
console.log(evl(["+", "b", "c"], env));
console.log(
  evl(["set", "add", ["fn", ["x", "y"], ["+", 1, 2], ["+", "x", "y"]]], env)
);
//console.log(evl(["set", "add", ["fn", ["x", "y"], ["+", "x", "y"]]], env));
//console.log(evl("add", env));
console.log(evl(["add", 3, 4], env));
console.log(evl(["set", "a1", ["arr", 1, 2, 3]], env));
console.log(evl("a1", env));
console.log(evl([0, "a1"], env));
console.log(evl(["set", "dict", { a: 1, b: 2 }], env));
console.log(evl([["quote", "b"], "dict"], env));
console.log(evl([["quote", [97, 98, 99]], 1], env));
console.log(evl(["dict", ["quote", "b"]], env));
console.log(evl(["set", "first", ["fn", ["x"], [0, "x"]]], env));
console.log(evl(["set", "rest", ["fn", ["x"], ["slice", "x", 1]]], env));
console.log(evl(["set", "copy", ["fn", ["x"], ["slice", "x", 0]]], env));
console.log(evl(["set", "empty", ["fn", ["x"], ["id", ["len", "x"], 0]]], env));
console.log(evl(["set", "not", ["fn", ["x"], ["id", "x", false]]], env));
console.log(evl(["first", "a1"], env));
console.log(evl(["rest", "a1"], env));
console.log(evl(["empty", "a1"], env));
console.log(evl(["not", ["id", ["len", ["copy", "a1"]], 2]], env));
console.log(evl(["type", null], env));

console.log(
  evl(["mac", "double", ["x"], ["arr", ["quote", "+"], "x", "x"]], env)
);

console.log(evl(["double", 3], env));
console.log(evl(["concat", ["quote", [1, 2, 3]], ["quote", [4, 5, 6]]], env));
