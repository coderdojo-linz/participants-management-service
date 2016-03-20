import * as express from "express-serve-static-core";
import * as config from "../config";

const devLoginForm = `<html lang="en">
  <head>
    <meta name="google-signin-scope" content="profile email">
    <meta name="google-signin-client_id" content="${config.GOOGLE_APP_ID}">
    <script src="https://apis.google.com/js/platform.js" async defer></script>
  </head>
  <body>
    <h1>Development Login</h1>
    <p>Use this login page to generate ID tokens for development
       purposes. Look in console for generated ID.</p>
    <div class="g-signin2" data-onsuccess="onSignIn" data-theme="dark"></div>
    <script>
      function onSignIn(googleUser) {
        // Useful data for your client-side scripts:
        var profile = googleUser.getBasicProfile();
        console.log("ID: " + profile.getId()); // Don't send this directly to your server!
        console.log("Name: " + profile.getName());
        console.log("Image URL: " + profile.getImageUrl());
        console.log("Email: " + profile.getEmail());

        // The ID token you need to pass to your backend:
        var id_token = googleUser.getAuthResponse().id_token;
        console.log("ID Token: " + id_token);
      };
    </script>
  </body>
</html>`;

export function google(req: express.Request, res: express.Response, next: express.NextFunction) {
    if(req.path == "/auth/devToken")
    {
        res.send(devLoginForm);
    }
    else {
        next();
    }
}