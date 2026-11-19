SK ADMIN - how it works now
===========================

Open the admin panel at   your-site/ctl-k7q2x9m4.html   (keep this name private; it is not linked from the site).
Nothing in the file is secret: Supabase decides who gets in.

ONE-TIME SETUP
1. Supabase > SQL Editor > paste the whole text of supabase-owner.sql > Run. (Never upload that file to GitHub.)
   It makes skillsknowledge.site@gmail.com the OWNER. Change the email inside the file first if you log in with another one.
2. Delete admin.html and admin-config.js from your GitHub folder. They are no longer used.
3. Open the admin address, press "Continue with Google" and sign in as the owner.

THE OWNER
- Stored on the server. No admin can remove you, block you, change your access, or see your details.
- Other admins see only "SkillsKnowledge, Owner" with a black verified mark.
- Only you can add or remove admins (Owner and admins tab) and hand ownership to someone else.

PUBLISHING SITE EDITS
Edit in the panel, press Save, then Publish. It downloads site-data.js. Put it in the website folder in place of the
old one and upload. Visitors only see changes after that upload.

CREATE ACCOUNT EMAIL CODE
Supabase > Authentication > Email Templates > "Confirm signup": make sure the message contains {{ .Token }}
(for example: Your code is {{ .Token }}). Then sign-up emails carry the 6-digit code the new window asks for.
