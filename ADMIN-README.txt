SK ADMIN: HOW IT WORKS
======================

1. FIRST-TIME SETUP
   Open admin.html. You will see "First-time setup". Enter your email, username and a long password (12+ characters).
   Your browser makes a one-way key from them and gives you a new admin-config.js. Put that file in the website
   folder in place of the old one and upload. Now admin.html shows the login.

2. WHAT IS STORED
   admin-config.js holds only a salted PBKDF2-SHA256 hash (600,000 rounds) made from email + username + password.
   Your password, username and email are not in it and cannot be read back from it. If you forget the password it
   cannot be recovered: put back the original admin-config.js (window.SK_ADMIN=null) and run setup again.

3. EDITING
   Content tab: add, edit, hide, reorder and delete cards on every page. Adding an item to Home > Skills and services
   raises the skills count (5+ becomes 6+) in the hero, the abilities row and the wording on the About page.
   Pages and sections tab: switch pages or home sections off. They vanish from the menu and from every link.
   Settings tab: skills count rules, feedback email, main texts.

4. SAVING AND PUBLISHING
   Press Save on any edit: it only keeps your changes in this browser (no download). Keep editing as long as you like.
   When you are done, press the Publish button at the top right. It downloads site-data.js. Put that file in the
   website folder in place of the old one and upload. A dot on the button means saved changes are not published yet.

5. FILES
   site-data.js     published changes (visitors read this)
   sk-defaults.js   original content of every list
   sk-data.js       reads the two files above on every page
   admin.html/.css/.js, admin-config.js   the admin panel and its key

6. LIMITS (no server)
   The login protects the admin panel in the browser. It cannot stop someone who can change files on your host, so
   protect your hosting account as well. Do not link to admin.html from the site.

RECOVERY (forgot password)
==========================
Log in > Security:
1. "Create a new recovery key": shows a key once. Download the new admin-config.js and upload it. Write the key down.
2. "Email for reset codes": paste your free EmailJS Service ID, Template ID and Public key (template must send to your Gmail and contain {{code}}). Download the new admin-config.js and upload it.
To reset: Login screen > Forgot password? > enter the recovery key first, then the 6-digit code emailed to you, then choose a new login.
Both steps are required. This is a front-end only check; a real server would be stronger.
