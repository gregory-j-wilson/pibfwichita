# pibfwichita.com

Static rebuild of the Primera Iglesia Bautista Fundamental de Wichita website, in plain HTML, CSS and JavaScript, hosted on GitHub Pages. There's no WordPress, no build step and no plugins.

## Structure

```
index.html                  Inicio (home)
sobre-nosotros/             Sobre Nosotros
nuestras-creencias/         Nuestras Creencias
galeria-de-fotos/           Galería de Fotos
boletines-semanales/        Boletines Semanales
contacto/                   Contacto (+ contacto/gracias/ thank-you page)
vbs-2022/                   VBS 2022 photo gallery
politica-de-privacidad/     Política de Privacidad
boletines/                  Weekly bulletin PDFs, named YYYY-MM-DD.pdf
assets/css/style.css        All styles
assets/js/main.js           Mobile menu, gallery pages and lightbox, bulletin list
assets/js/boletines.js      The bulletin list (edit this weekly)
assets/img/                 Images (galeria/ and vbs-2022/ hold the photo galleries)
chat/ noticias/ blog/ pibf-home/   Redirects from old WordPress URLs
CNAME                       Custom domain for GitHub Pages
```

## Weekly bulletin

1. Upload the PDF to `boletines/`, named by Sunday's date, e.g. `2026-11-08.pdf`.
2. In `assets/js/boletines.js`, add a new line at the **top** of the list:
   ```js
   { fecha: "8 de Noviembre, 2026", dia: "Domingo", archivo: "boletines/2026-11-08.pdf" },
   ```
The first entry is shown as the current bulletin. The rest appear under "Boletines anteriores."

## Adding gallery photos

1. Add a thumbnail (about 600px wide) and a full-size photo (about 1800px wide) to `assets/img/galeria/`.
2. In `galeria-de-fotos/index.html`, copy one `<figure>…</figure>` block and paste it where it should appear (first = newest). Update `data-full`, `src` and the caption.

The page shows 8 photos at a time and builds the page numbers automatically.

## Contact form

The form posts to [FormSubmit](https://formsubmit.co) and is delivered to `iglesiabautista@pibfwichita.com`. The **first** submission sends a one-time activation email to that inbox. Click the link in it, and every message after that is delivered normally.

## Deploying (GitHub Pages)

Settings → Pages → Source: *Deploy from a branch* → `main` / root. Then point the domain's DNS at GitHub Pages:

- `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `CNAME` record for `www`: `<your-github-username>.github.io`

After DNS resolves, tick **Enforce HTTPS** in the Pages settings.
