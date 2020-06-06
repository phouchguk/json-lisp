"use strict";

function lookup(v, env) {
  for (;;) {
    if (typeof env[v] !== "undefined") {
      return env[v];
    }

    if (typeof env._parent === "undefined") {
      if (typeof window[v] === "undefined") {
        throw new Error("'" + v + "'unbound");
      }

      return window[v];
    }

    env = env._parent;
  }
}

function get(url) {
  return new Promise(function (resolve, reject) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);

    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        resolve(JSON.parse(this.response));
      } else {
        reject(this.status);
      }
    };

    request.onerror = function () {
      reject("request error");
    };

    request.send();
  });
}

get("prelude.json").then(function (prelude) {
  evl(prelude, env);

  return get("test.json").then(function (test) {
    evl(test, env);
    return true;
  });
});
