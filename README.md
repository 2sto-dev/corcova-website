# Corcova website

Site React/Vite și API Django, cu baza SQLite și arhiva de documente incluse.
Repository privat: fișierele `backend/.env` și `frontend/.env` sunt incluse intenționat pentru transferul proiectului.

## Conținut

- `frontend/`: surse, resurse publice și versiunea compilată în `dist/`.
- `backend/`: aplicația Django, `db.sqlite3` și documentele din `media/`.
- `dosare/`, `uploads/`: arhiva originală.
- Fișierul `.sql` din rădăcină: export WordPress pentru recuperare/reimport; aplicația folosește SQLite.
- Dependențele instalate și cache-urile nu sunt incluse; se reinstalează.

## Instalare pe Linux

Necesită Python 3.12+ (Django 6), Node.js 22+ și suport pentru instalarea psycopg2 din requirements dacă nu există un wheel compatibil.

```sh
git clone https://github.com/2sto-dev/corcova-website.git
cd corcova-website/backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

În `backend/.env`, păstrează datele administratorului și configurează pentru server:

```dotenv
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<o valoare aleatoare nouă, generată pe server>
DJANGO_ALLOWED_HOSTS=comunacorcova.ro,www.comunacorcova.ro
CSRF_TRUSTED_ORIGINS=https://comunacorcova.ro,https://www.comunacorcova.ro
CORS_ALLOWED_ORIGINS=https://comunacorcova.ro,https://www.comunacorcova.ro
FRONTEND_URL=https://www.comunacorcova.ro/
DB_ENGINE=sqlite
```

Poți genera cheia cu `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
Nu copia marcajul `<...>` ca valoare reală. Fișierele `.env` incluse conțin configurația locală, nu configurația finală de producție.

```sh
python manage.py check --deploy
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 2
```

Configurează Gunicorn ca serviciu persistent (de exemplu systemd). Pe Windows este necesar un server WSGI compatibil; Gunicorn rulează pe Linux.

Pentru frontend, într-un alt terminal:

```sh
cd frontend
npm ci
npm run build
```

Comanda pornește din rădăcina proiectului. Publică numai `frontend/dist` ca rădăcină statică în Nginx/Apache, cu HTTPS. Trimite către Django rutele `/api/`, `/gestionare-primarie/`, `/admin/` și `/administrare-primarie/`. Servește `/static/` din `backend/staticfiles/`. Documentele private sunt livrate prin API, nu printr-un alias public către `backend/media/`.

Nu publica rădăcina repository-ului, `.git`, `.env`, SQLite sau exportul SQL ca fișiere web. Contul serviciului Django trebuie să aibă drept de scriere asupra folderului bazei SQLite, inclusiv pentru jurnalele bazei.

## Administrare și date

Panou: `/gestionare-primarie/`. Datele de conectare sunt în `backend/.env`.
Contul există deja în SQLite; schimbarea `DJANGO_ADMIN_PASSWORD` în `.env` nu îi schimbă automat parola. Pentru resetare folosește `python manage.py changepassword NUME_UTILIZATOR`.

La actualizări, păstrează baza de producție, fișierele încărcate și configurația serverului: nu le suprascrie cu copia inițială din Git. Fă backup SQLite consistent și o copie a documentelor înainte de migrare. Păstrează backupurile separat, cu acces restricționat.
