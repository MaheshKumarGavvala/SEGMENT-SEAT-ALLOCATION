# Login loop fix

- Login now navigates using absolute server paths.
- Registration now navigates using an absolute dashboard path.
- Express no longer serves the landing page for every unknown URL. Missing pages now return 404, preventing redirect loops.
- Login JS is cache-busted with `?v=3`.

Start backend with `npm start` and open `http://localhost:3000/`.
