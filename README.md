# pibfwichita.com

Static rebuild of the Primera Iglesia Bautista Fundamental de Wichita website, in plain HTML, CSS and JavaScript, hosted on GitHub Pages. There's no WordPress, no build step and no plugins.

## Structure

```
index.html                  Inicio (home)
sobre-nosotros/             Sobre Nosotros
nuestras-creencias/         Nuestras Creencias
galeria-de-fotos/           Galería de Fotos
boletines-semanales/        Boletines Semanales
calendario/                 Calendario (events from data/eventos.json)
musica/                     Música (hymn player; list in assets/js/himnos.js)
donar/                      Donar (Zelle)
admin/                      Admin panel (not linked, not indexed)
data/eventos.json           Calendar events (also feed the notification bell)
data/boletines.json         Bulletin list, newest first
data/admin.json             Admin panel's GitHub token, encrypted with the master password
contacto/                   Contacto (+ contacto/gracias/ thank-you page)
vbs-2022/                   VBS 2022 photo gallery
politica-de-privacidad/     Política de Privacidad
boletines/                  Weekly bulletin PDFs, named YYYY-MM-DD.pdf
assets/css/style.css        All styles
assets/js/main.js           Shared site script (menu, gallery, bulletins, bell, translation…)
assets/js/calendario.js     Calendar page
assets/js/admin.js          Admin panel
assets/img/                 Images (galeria/ and vbs-2022/ hold the photo galleries)
chat/ noticias/ blog/ pibf-home/   Redirects from old WordPress URLs
CNAME                       Custom domain for GitHub Pages
```

## Admin panel (`/admin/`)

The easiest way to keep the site up to date. Open `https://pibfwichita.com/admin/` and enter the master password.

- **Calendario** – add, edit and delete events: date(s), time, place, description, category, weekly repeats, posters (Spanish first), and whether the event shows in the notification bell until it ends.
- **Boletines** – upload the weekly bulletin PDF; it becomes the current bulletin.
- **Ajustes** – replace the GitHub token (it shows when it expires) or change the master password.

How it works: the site is static, so the panel saves by committing to this repository through the GitHub API, which redeploys the site (1–2 minutes). It uses a fine-grained GitHub token limited to this repository with **Contents: Read and write**. The token is stored only encrypted, in `data/admin.json`, with the master password (PBKDF2-SHA256, 600,000 rounds + AES-GCM, in the browser). The password itself is not stored anywhere. If it's forgotten, delete `data/admin.json` and open `/admin/` to set it up again with a new token.

Data files can also be edited by hand: `data/eventos.json` (events) and `data/boletines.json` (bulletins: `fecha`, `dia`, `archivo`, newest first).

## Adding gallery photos

1. Add a thumbnail (about 600px wide) and a full-size photo (about 1800px wide) to `assets/img/galeria/`.
2. In `galeria-de-fotos/index.html`, copy one `<figure>…</figure>` block and paste it where it should appear (first = newest). Update `data-full`, `src` and the caption.

The page shows 8 photos at a time and builds the page numbers automatically.

## Contact form

The form posts to [Formspree](https://formspree.io) (form `xvkklalp`). Messages go to the email address set on that form in your Formspree dashboard, which is also where you can see past submissions. After sending, visitors are taken to `contacto/gracias/`.

## Deploying (GitHub Pages)

Settings → Pages → Source: *Deploy from a branch* → `main` / root. Then point the domain's DNS at GitHub Pages:

- `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `CNAME` record for `www`: `<your-github-username>.github.io`

After DNS resolves, tick **Enforce HTTPS** in the Pages settings.
