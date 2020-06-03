const fs = require('fs');

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
  if (taggedArr(x, "?")) {
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
  for (;;) {
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
  for (;;) {
    if (typeof env[v] !== "undefined" || env._parent === core) {
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
  var env = { _parent: clo.env };

  if (symbolp(clo.parms)) {
    env[clo.parms] = args;
  } else {
    if (clo.parms.length !== args.length) {
      // should destructure arrs and objs
      throw new Error("bad args");
    }

    for (var i = 0; i < clo.parms.length; i++) {
      env[clo.parms[i]] = args[i];
    }
  }

  return env;
}

function evl(json, env) {
  var i;

  for (;;) {
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

      for (i = 1; i < lastIndex; i++) {
        evl(json[i], env);
      }

      json = json[lastIndex];
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

    for (i = 1; i < json.length; i++) {
      args.push(evl(json[i], env));
    }

    if (primitivep(op)) {
      return op.apply(null, args);
    }

    if (opIsObj && op.clo) {
      // compound
      json = op.body;
      env = extendEnv(op, args);
      continue;
    }

    var argl = args.length;

    if (!(argl === 1 || argl === 2)) {
      console.log(json);
      throw new Error("bad application arg count");
    }

    var isAssign = argl === 2;

    if (opIsObj) {
      // obj application
      if (!symbolp(args[0])) {
        throw new Error("bad object application");
      }

      if (isAssign) {
        op[args[0]] = args[1];
        return "ok";
      }

      return op[args[0]];
    }

    if (arrp(op)) {
      if (!numberp(args[0])) {
        throw new Error("bad array application");
      }

      if (isAssign) {
        op[args[0]] = args[1];
        return "ok";
      }

      return op[args[0]];
    }

    if (numberp(op)) {
      if (!arrp(args[0])) {
        throw new Error("bad number application");
      }

      if (isAssign) {
        args[0][op] = args[1];
        return "ok";
      }

      return args[0][op];
    }

    if (symbolp(op)) {
      if (!objp(args[0])) {
        throw new Error("bad symbol application");
      }

      if (isAssign) {
        args[0][op] = args[1];
        return "ok";
      }

      return args[0][op];
    }

    throw new Error("bad json");
  }
}

var core = {
  "+": function (a, b) {
    return a + b;
  },
  arr: function () {
    return Array.prototype.slice.call(arguments);
  },
  concat: function (a, b) {
    return a.concat(b);
  },
  id: function (a, b) {
    return a === b;
  },
  length: function (a) {
    return a.length;
  },
  log: function (x) {
    return console.log(x);
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

var env = { _parent: core };
evl(JSON.parse(fs.readFileSync("test.json")), env);
