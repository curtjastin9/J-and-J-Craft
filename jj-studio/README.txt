J&J CRAFT AND PRINT STUDIO — REPAIRED FRONT-END PACKAGE

HOW TO INSTALL
1. Extract this ZIP.
2. Upload/copy the entire JJ_Craft_Print_Studio_Fixed folder contents into your website directory.
3. Keep the folder structure exactly as shown:
   index.html
   order.html
   customize-mug.html
   css/style.css
   js/art.js
   js/mug3d.js
4. Open the site through your local web server (XAMPP/Apache), not by opening files individually.

WHAT WAS FIXED
- Supplied index.html referenced css/style.css and js/art.js, but those complete assets were not included in the upload.
- The uploaded style.css contained only four small CSS rules, not the site's full stylesheet.
- Added a complete responsive stylesheet and homepage product illustrations.
- Added a basic order landing page so homepage order links do not lead to a missing page.

IMPORTANT: 3D MUG EDITOR DEPENDENCIES
The uploaded mug3d.js imports these files which were NOT included in your upload:
- js/vendor/three.module.min.js
- js/vendor/OrbitControls.js
- js/vendor/RoomEnvironment.js
- js/hands.js
It also expects js/cart.js and a global toast() helper. The 3D editor will not fully run until those original dependencies are restored. I have preserved your mug3d.js logic rather than inventing replacements for the missing vendor code. The website homepage styling is repaired independently.

If your actual project already has these missing files, copy them into the exact paths above.
