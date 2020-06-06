"use strict";

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

function selfEvaluatingP(x) {
  return (
    x === "." ||
    x === "apply" ||
    x === "new" ||
    x === null ||
    numberp(x) ||
    boolp(x) ||
    undefinedp(x) ||
    jsfnp(x) ||
    objp(x)
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

function destruct(env, parm, arg) {
  if (symbolp(parm)) {
    env[parm] = arg;
    return;
  }

  if (arrp(parm)) {
    var argl = arg.length;

    if (parm.length !== argl && parm.indexOf(".") === -1) {
      throw new Error("bad array args");
    }

    for (var i = 0; i < argl; i++) {
      if (parm[i] === ".") {
        destruct(env, parm[i + 1], arg.slice(i));
        return;
      }

      destruct(env, parm[i], arg[i]);
    }

    return;
  }

  if (objp(parm)) {
    for (var k in parm) {
      if (parm.hasOwnProperty(k)) {
        destruct(env, parm[k], arg[k]);
      }
    }
  }
}

function extendEnv(clo, args) {
  var env = { _parent: clo.env };
  destruct(env, clo.parms, args);
  return env;
}

function newCall(cls) {
  return new (cls.bind.apply(cls, arguments))();
}

var core = {
  "+": function (a, b) {
    return a + b;
  },
  "-": function (a, b) {
    return a - b;
  },
  "*": function (a, b) {
    return a * b;
  },
  "/": function (a, b) {
    return a / b;
  },
  "%": function (a, b) {
    return a % b;
  },
  ">": function (a, b) {
    return a > b;
  },
  "<": function (a, b) {
    return a < b;
  },
  ">=": function (a, b) {
    return a >= b;
  },
  "<=": function (a, b) {
    return a <= b;
  },
  "&": function (a, b) {
    return a & b;
  },
  "|": function (a, b) {
    return a | b;
  },
  "~": function (a) {
    return ~a;
  },
  "^": function (a, b) {
    return a ^ b;
  },
  "<<": function (a, b) {
    return a << b;
  },
  ">>": function (a, b) {
    return a >> b;
  },
  ">>>": function (a, b) {
    return a >>> b;
  },
  arr: function () {
    return Array.prototype.slice.call(arguments);
  },
  delete: function (o, p) {
    delete o[p];
    return "ok";
  },
  eval: function (e) {
    return evl(e, env);
  },
  id: function (a, b) {
    return a === b;
  },
  obj: function () {
    var args = Array.prototype.slice.call(arguments);
    var argl = args.length;

    if (argl % 2 !== 0) {
      throw new Error("bad obj");
    }

    var o = {};

    for (var i = 0; i < argl; i += 2) {
      o[args[i]] = args[i + 1];
    }

    return o;
  },
  type: function (x) {
    if (x === null) {
      return "null";
    }

    if (typeof x === "undefined") {
      return "undefined";
    }

    if (rawobjp(x)) {
      return x.clo ? "clo" : "obj";
    }

    if (arrp(x)) {
      return "array";
    }

    if (boolp(x)) {
      return "boolean";
    }

    if (numberp(x)) {
      return "number";
    }

    if (symbolp(x)) {
      return "symbol";
    }

    return typeof x;
  },
};

var env = { _parent: core };

module.exports = {
  arrp,
  boolp,
  dop,
  fnp,
  ifp,
  jsfnp,
  macp,
  numberp,
  objp,
  primitivep,
  quotep,
  rawobjp,
  selfEvaluatingP,
  set,
  setp,
  symbolp,
  taggedArr,
  undefinedp,
  variablep,
  destruct,
  extendEnv,
  newCall,
  env
};
