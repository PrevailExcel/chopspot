# Cloud save API

One PHP file. Players save with their phone number and a 4-digit PIN and continue on any device.
The save with more lifetime earnings always wins, in both directions.

## Run it on DigitalOcean (or any PHP 8.1+ host)

1. Copy this `server/` folder to the server, e.g. `/var/www/chopspot-api`.
2. Optional: copy `config.example.php` to `config.php` to use MySQL or change the allowed origins.
   Without it, saves go in `data/saves.sqlite` (needs `pdo_sqlite`; the folder is created on first request).
3. Make `data/` writable by PHP: `chown -R www-data:www-data data` (create it first if needed).
4. Point a domain (e.g. `api.chopspot.ng`) at the folder with HTTPS. Apache uses the included `.htaccess`.
   For nginx:

   ```nginx
   location /data/ { deny all; }
   location / { try_files $uri /index.php$is_args$args; }
   location ~ \.php$ { include snippets/fastcgi-php.conf; fastcgi_pass unix:/run/php/php8.3-fpm.sock; }
   ```
5. In Vercel, set the game's environment variable `VITE_SAVE_API=https://api.chopspot.ng` and redeploy.
   With it unset, the game hides cloud save.

Test it: `curl -X POST https://api.chopspot.ng/pull -d '{"token":"x"}'` should answer `{"error":"Please log in again"}`.

## Routes (all POST, JSON)

| Route | Body | Answer |
|---|---|---|
| `/connect` | `phone, pin, save, progress` | `token, phone, save, progress`. New number: makes the account. Known number with the right PIN: keeps the bigger save and returns it. |
| `/sync` | `token, save, progress` | Stores the save if its progress is at least what's on file. |
| `/pull` | `token` | The save on file. |

Five wrong PINs lock a number for 15 minutes. Tokens are signed with `data/secret.key` (or `secret` in `config.php`),
so a number can stay logged in on several phones.

Run locally: `php -S 127.0.0.1:8787 index.php`
