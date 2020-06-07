"use strict";

const {
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
  selfEvaluatingP,
  set,
  setp,
  setEval,
  symbolp,
  taggedArr,
  variablep,
  destruct,
  extendEnv,
  newCall,
  env,
} = require("./core");

function evl(json, env) {
  var i;

  for (;;) {
    if (selfEvaluatingP(json)) {
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
        parml: json[1].indexOf(".") > -1 ? -1 : json[1].length,
      };

      if (fnp(json)) {
        clo.clo = true;
      } else {
        clo.mac = true;
      }

      return clo;
    }

    // application
    if (!arrp(json) || json.length === 0) {
      console.log(json);
      throw new Error("expected array > 0 length");
    }

    var op = evl(json[0], env);
    var opIsObj = objp(op);

    if (opIsObj && op.mac) {
      // don't evaluate args
      json = evl(op.body, extendEnv(op, json.slice(1)));
      //console.log(json);
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

    if (op === ".") {
      if (args[1][0] === "-") {
        // property access
        return args[0][args[1].substring(1)];
      } else {
        // method call
        return args[0][args[1]].apply(args[0], args.slice(2));
      }
    }

    if (op === "new") {
      return newCall.apply(null, args);
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
        console.log(json);
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

setEval(evl);
