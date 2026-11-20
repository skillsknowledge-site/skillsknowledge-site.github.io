SK ADMIN
========

Open the admin panel at   your-site/ctl-k7q2x9m4.html   (keep this name private; nothing links to it).
admin.html is now only a "404" page, so the old address shows nothing. Always use the ctl- address.

LOGIN
Same as before: email + username + password from admin-config.js (keep YOUR admin-config.js in the folder; never replace it).
The Users, Orders, Feedback and Analysis tabs read data from Supabase, which only accepts your owner account.
If they ask you to connect, type the owner email and password there (set the password once on your Profile page). No Google needed.

ONE-TIME SQL (Supabase > SQL Editor; never upload these files to GitHub)
1. supabase-owner.sql   - owner protection (run once, if not done yet)
2. supabase-files.sql   - file attachments on comments and complaints (new)
   The free Supabase plan allows 50 MB per file. For 100 MB per file, upgrade to Pro and raise Storage > file size limit.

EMAIL CODE FOR NEW ACCOUNTS
Supabase > Authentication > Email Templates > "Confirm signup": the message must contain {{ .Token }}.

PUBLISHING SITE EDITS
Edit, press Save, then Publish. It downloads site-data.js. Put it in the website folder and upload.
