// CloudFront Function (runtime cloudfront-js-2.0), event type: viewer-request.
//
// Maps clean URLs to the prerendered files in the S3 bucket:
//   /                     -> /index.html
//   /pricing              -> /pricing/index.html
//   /pricing/             -> 301 to /pricing
//   /mystories, /profile, /generated-story/... -> /app.html (client-only app shell)
//   files with an extension (/assets/x.js, /sitemap.xml) pass through unchanged
//
// Keep APP_PREFIXES in sync with APP_SHELL_PREFIXES in client/src/routes.tsx.

var APP_PREFIXES = ["/generated-story", "/mystories", "/profile"];

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.length > 1 && uri.charAt(uri.length - 1) === "/") {
    var target = uri.replace(/\/+$/, "");
    var qs = [];
    for (var key in request.querystring) {
      var param = request.querystring[key];
      if (param.multiValue) {
        for (var i = 0; i < param.multiValue.length; i++) qs.push(key + "=" + param.multiValue[i].value);
      } else {
        qs.push(key + "=" + param.value);
      }
    }
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: target + (qs.length ? "?" + qs.join("&") : "") } },
    };
  }

  if (/\.[a-zA-Z0-9]+$/.test(uri)) return request;

  for (var j = 0; j < APP_PREFIXES.length; j++) {
    var prefix = APP_PREFIXES[j];
    if (uri === prefix || uri.indexOf(prefix + "/") === 0) {
      request.uri = "/app.html";
      return request;
    }
  }

  request.uri = uri === "/" ? "/index.html" : uri + "/index.html";
  return request;
}
